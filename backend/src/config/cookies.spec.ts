import { buildSessionCookieOptions } from './cookies';

describe('buildSessionCookieOptions', () => {
  it('uses SameSite=Lax and Secure for https deployments (no cross-site POSTs with the session)', () => {
    expect(buildSessionCookieOptions({ baseUrl: 'https://example.com', trustProxy: false })).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  });

  it('uses SameSite=Lax for http deployments (strict would drop the session on the OAuth callback)', () => {
    expect(buildSessionCookieOptions({ baseUrl: 'http://localhost:3000', trustProxy: false })).toMatchObject({
      sameSite: 'lax',
      secure: false,
    });
  });

  it('keeps a browser-session cookie behind a trusted proxy, but still with SameSite=Lax', () => {
    expect(buildSessionCookieOptions({ baseUrl: 'https://example.com', trustProxy: true })).toEqual({
      httpOnly: true,
      sameSite: 'lax',
    });
  });
});
