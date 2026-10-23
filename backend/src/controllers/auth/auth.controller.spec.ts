import { isSafeRedirectPath } from './auth.controller';

describe('isSafeRedirectPath', () => {
  it.each(['/', '/chat/1', '/admin/users?page=2', '/a//b'])('accepts the same-origin path %s', (path) => {
    expect(isSafeRedirectPath(path)).toBe(true);
  });

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'evil.com', '', '/\r\nSet-Cookie:x', undefined, 42])(
    'rejects %p (open redirect)',
    (path) => {
      expect(isSafeRedirectPath(path)).toBe(false);
    },
  );
});
