import type { Client } from 'src/api/generated/client';
import { i18next } from 'src/texts/i18n';
import { ResponseError } from './errors';

/**
 * Sets up a generated client like all our clients are used: with cookies and the UI language, calling `onUnauthorized`
 * on 401 responses and throwing a `ResponseError` (with status and server message) on error responses.
 */
export function configureClient(client: Client, onUnauthorized: () => void) {
  client.setConfig({ credentials: 'include', throwOnError: true });
  client.interceptors.request.use((request) => {
    request.headers.set('Accept-Language', i18next.language);
    return request;
  });
  client.interceptors.response.use((response) => {
    if (response.status === 401) {
      onUnauthorized();
    }
    return response;
  });
  // The client throws the parsed body of error responses; network errors (without a response) are thrown as they are.
  client.interceptors.error.use((error, response) => (response && !response.ok ? new ResponseError(response, error) : error));
  return client;
}

function dropNull(this: unknown, key: string, value: unknown) {
  return value === null && key !== '' && !Array.isArray(this) ? undefined : value;
}

/**
 * Removes the properties with `null` values from the JSON responses. The backend sends `null` for optional properties,
 * which its OpenAPI specification declares as `T | undefined` (the old generated client converted them as well).
 */
export function dropNullProperties(client: Client) {
  client.interceptors.response.use(async (response) => {
    if (!response.ok || !response.headers.get('content-type')?.startsWith('application/json')) {
      return response;
    }
    const text = await response.text();
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    const body = text ? JSON.stringify(JSON.parse(text, dropNull)) : null;
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  });
  return client;
}
