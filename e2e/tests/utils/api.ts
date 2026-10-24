import { APIRequestContext, expect, request } from '@playwright/test';
import { config } from './config';
import { uniqueName } from './helper';

/**
 * Thin helpers around the backend REST API, used to set up test data quickly and independently of the UI.
 * All of them require an API context that is logged in as an admin (see `newAdminApiContext`).
 */

export interface TestUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

export const INITIAL_ADMIN = { email: 'admin@example.com', password: 'secret' };

export const BUILTIN_GROUP_ADMIN = 'admin';
export const BUILTIN_GROUP_DEFAULT = 'default';

export async function newAdminApiContext(user: { email: string; password: string } = INITIAL_ADMIN) {
  const context = await request.newContext({ baseURL: config.URL });
  const response = await context.post('/api/auth/login', { data: { email: user.email, password: user.password } });
  expect(response.ok(), `login of ${user.email} via API failed: ${response.status()}`).toBeTruthy();
  return context;
}

async function ok<T>(response: Awaited<ReturnType<APIRequestContext['get']>>, what: string): Promise<T> {
  expect(response.ok(), `${what} failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Creates a user with a unique name/email. By default the user is an admin. */
export async function createUserViaApi(
  api: APIRequestContext,
  options: { prefix?: string; userGroupIds?: string[]; password?: string } = {},
): Promise<TestUser> {
  const name = uniqueName(options.prefix ?? 'e2e-user');
  const email = `${name.toLowerCase()}@example.com`;
  const password = options.password ?? 'test-secret';
  const created = await ok<{ id: string }>(
    await api.post('/api/users', {
      data: { name, email, password, userGroupIds: options.userGroupIds ?? [BUILTIN_GROUP_ADMIN] },
    }),
    `creating user ${email}`,
  );
  return { id: created.id, name, email, password };
}

export async function createUserGroupViaApi(api: APIRequestContext, name: string): Promise<{ id: string; name: string }> {
  return ok(await api.post('/api/user-groups', { data: { name } }), `creating user group ${name}`);
}

interface BucketDto {
  id: number;
  name: string;
  endpoint: string;
  indexName?: string;
  headers?: string;
  isDefault: boolean;
  perUserQuota: number;
  allowedFileNameExtensions?: string[];
  type: 'general' | 'user' | 'conversation';
  fileSizeLimits: Record<string, number>;
}

/**
 * The backend allows only one bucket of type `user` and one of type `conversation`, so these are shared by all tests.
 * Creates the bucket if it does not exist yet. If `fileSizeLimits` is given, they are enforced on an existing bucket.
 */
export async function ensureBucketViaApi(
  api: APIRequestContext,
  bucket: { name: string; type: 'user' | 'conversation'; endpoint: string; fileSizeLimits: Record<string, number> },
  enforceLimits: boolean,
) {
  const { items } = await ok<{ items: BucketDto[] }>(await api.get('/api/buckets'), 'listing buckets');
  const existing = items.find((x) => x.type === bucket.type);

  if (!existing) {
    await ok(
      await api.post('/api/buckets', {
        data: {
          name: bucket.name,
          endpoint: bucket.endpoint,
          indexName: '',
          isDefault: false,
          perUserQuota: 20,
          allowedFileNameExtensions: [],
          type: bucket.type,
          fileSizeLimits: bucket.fileSizeLimits,
        },
      }),
      `creating ${bucket.type} bucket`,
    );
    return;
  }

  expect(existing.name, `the ${bucket.type} bucket has an unexpected name`).toBe(bucket.name);
  if (enforceLimits) {
    const { id: _, ...values } = existing;
    await ok(
      await api.put(`/api/buckets/${existing.id}`, {
        data: {
          ...values,
          allowedFileNameExtensions: values.allowedFileNameExtensions ?? [],
          fileSizeLimits: bucket.fileSizeLimits,
        },
      }),
      `updating ${bucket.type} bucket`,
    );
  }
}

/** Removes all global chat suggestions (theme settings). */
export async function resetGlobalSuggestionsViaApi(api: APIRequestContext) {
  await ok(await api.post('/api/settings', { data: { chatSuggestions: [] } }), 'resetting global suggestions');
}

/** Creates an (enabled) assistant without extensions, unless one with this name exists. */
export async function ensureAssistantViaApi(api: APIRequestContext, name: string) {
  const { items } = await ok<{ items: { name: string }[] }>(await api.get('/api/configurations'), 'listing assistants');
  if (!items.some((x) => x.name === name)) {
    await ok(
      await api.post('/api/configurations', { data: { name, description: 'Default assistant of the E2E tests', enabled: true } }),
      `creating assistant ${name}`,
    );
  }
}

/** Creates an (enabled) assistant without extensions. */
export async function createAssistantViaApi(api: APIRequestContext, name: string, description = `Description of ${name}`) {
  return ok<{ id: number; name: string }>(
    await api.post('/api/configurations', { data: { name, description, enabled: true } }),
    `creating assistant ${name}`,
  );
}

/** Adds an (enabled) extension, e.g. `custom-prompt` with `{ title, text }`, to an assistant. */
export async function addExtensionViaApi(
  api: APIRequestContext,
  assistant: { id: number; name: string },
  name: string,
  values: Record<string, unknown>,
) {
  await ok(
    await api.post(`/api/configurations/${assistant.id}/extensions`, { data: { name, enabled: true, values } }),
    `adding the extension ${name} to assistant ${assistant.name}`,
  );
}

/** Creates an (enabled) assistant that uses the mock LLM server of the worker. */
export async function createMockAssistantViaApi(
  api: APIRequestContext,
  name: string,
  mockServerUrl: string,
  description?: string,
) {
  const assistant = await createAssistantViaApi(api, name, description);
  await addExtensionViaApi(api, assistant, 'open-ai-compatible-model', {
    apiKey: 'mock-api-key',
    baseUrl: mockServerUrl,
    modelName: 'mock-gpt-4',
  });
  return assistant;
}
