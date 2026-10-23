import { describe, expect, it } from 'vitest';
import { takePostLoginRedirect } from './navigation';

describe('takePostLoginRedirect', () => {
  const store = (path: string) => (document.cookie = `post-login-redirect=${encodeURIComponent(path)}; path=/`);

  it('returns the stored page once', () => {
    store('/admin/users');

    expect(takePostLoginRedirect()).toBe('/admin/users');
    expect(takePostLoginRedirect()).toBe('/chat');
  });

  it.each(['//evil.example.com', '/\\evil.example.com', 'https://evil.example.com', '/login'])(
    'does not return to %s',
    (path) => {
      store(path);

      expect(takePostLoginRedirect()).toBe('/chat');
    },
  );
});
