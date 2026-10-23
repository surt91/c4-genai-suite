/**
 * Default msw handlers for the endpoints the integration tests rely on without overriding them via `server.use(...)`.
 * Tests that need specific responses should register their own handlers (see `src/mock/factory.ts`).
 */
import { faker } from '@faker-js/faker';
import { http, HttpResponse } from 'msw';

faker.seed(1);

const baseURL = `${process.env.VITE_SERVER_URL || ''}/api`;

const noContent = () => new HttpResponse(null, { status: 204 });

const userGroup = (overrides) => ({
  id: faker.string.alphanumeric(8),
  name: faker.company.name(),
  isAdmin: false,
  isBuiltIn: false,
  monthlyTokens: faker.number.int({ max: 100000 }),
  monthlyUserTokens: faker.number.int({ max: 10000 }),
  hideFileUpload: false,
  ...overrides,
});

const user = (overrides) => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  userGroupIds: [],
  hasApiKey: false,
  hasPassword: false,
  ...overrides,
});

export const handlers = [
  http.get(`${baseURL}/auth/settings`, () => HttpResponse.json({ providers: [], enablePasswordAuth: true })),

  http.post(`${baseURL}/user-groups`, async ({ request }) => HttpResponse.json(userGroup(await request.json()))),
  http.put(`${baseURL}/user-groups/:id`, async ({ request, params }) =>
    HttpResponse.json(userGroup({ ...(await request.json()), id: params.id })),
  ),
  http.delete(`${baseURL}/user-groups/:id`, noContent),

  http.put(`${baseURL}/users/:id`, async ({ request, params }) =>
    HttpResponse.json(user({ ...(await request.json()), id: params.id })),
  ),
  http.delete(`${baseURL}/users/:id`, noContent),
];
