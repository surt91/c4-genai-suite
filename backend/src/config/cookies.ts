import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { AuthConfig, AuthService, SessionStorage } from '../domain/auth/index.js';

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getSecret() {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }
  if (!IS_PRODUCTION) {
    return 'secret';
  }
  throw new Error('SESSION_SECRET must be defined for production');
}

/**
 * `SameSite=Lax` keeps the cookie on top-level navigations (needed for the OAuth callbacks, which are cross-site
 * redirects that must carry the session with the OAuth state) but not on cross-site POST/PUT/DELETE requests,
 * which protects the cookie-authenticated API against CSRF (the API also accepts url-encoded form bodies).
 */
export function buildSessionCookieOptions(config: Pick<AuthConfig, 'baseUrl' | 'trustProxy'>): session.CookieOptions {
  if (config.trustProxy) {
    // Unchanged legacy behavior with AUTH_TRUST_PROXY: browser-session cookie, no `Secure` flag (the proxy
    // might not forward `X-Forwarded-Proto`, then express-session would never send a secure cookie).
    return { httpOnly: true, sameSite: 'lax' };
  }
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: !!config.baseUrl?.startsWith('https'),
    maxAge: SEVEN_DAYS_IN_MS,
  };
}

export function configureSession(app: NestExpressApplication): void {
  const authService = app.get(AuthService);

  const secret = getSecret();

  app.use(
    session({
      cookie: buildSessionCookieOptions(authService.config),
      proxy: true,
      saveUninitialized: false,
      secret,
      store: app.get(SessionStorage),
      resave: false,
    }),
  );
}

export function configureCookies(app: NestExpressApplication): void {
  app.use(cookieParser());
}
