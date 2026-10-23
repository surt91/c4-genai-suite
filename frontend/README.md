# Frontend

## Run the app

Make sure the backend runs under `localhost:3000`. The vite development server will proxy requests to `/api-proxy` to the backend.

Run the app in development mode using

```bash
npm run dev
```
## Testing

For now, we have ui unit and integration tests.
Following tech is used by our tests:
- React Testing Library (RTL)
- Vitest
- js-dom Matcher
- Mock Service Worker (msw)

For other types of tests, e.g. pure unit tests without ui and external connection, feel free to add them to vite.config.ts

### UI Unit Tests

marked as *componentName.ui-unit.spec.tsx*

For those tests we provide a custom render method that wraps the render function from RTL and provides all necessary context providers. If there is one missing, feel free to add it.

Please try to use, where ever possible, the *ByRole() method from RTL to query elements from the UI. With this approach we can be confident to ensure some kind of accessibility in our UI.

Also, we enabled the recommended eslint rules for testing with RTL. Please follow them ;)

### Integration Tests

marked as *componentName.integration.spec.tsx*

Like UI Unit Tests, but we're using msw to mock the API. With this approach we're testing the complete chain from UI until network layer.
For start, clear and stop the server use this commands on top of the describe block:
```
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
```

The default handlers in `mock/handlers.js` are hand-written and only cover the endpoints that tests use without
registering their own handlers. Prefer test-specific handlers via `server.use(...)` or `mockedAPI` (`src/mock/factory.ts`).

## Description

The frontend is based on [vite](https://vitejs.dev/).
