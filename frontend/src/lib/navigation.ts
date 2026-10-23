const POST_LOGIN_REDIRECT = 'post-login-redirect';

/** Loads a page of the application from the server, which drops all client state (caches, stores). */
export function loadPage(url: string) {
  window.location.assign(url);
}

/** Only paths of this application, never other origins (`//host`, `/\host`). */
function isSafeRedirectPath(path: string | undefined): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') && !path.startsWith('/login');
}

/**
 * The page to show after the login: the page where the session expired (stored in a cookie when the API returned 401,
 * see `redirectToLogin`) or the chat. The cookie is removed.
 */
export function takePostLoginRedirect() {
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${POST_LOGIN_REDIRECT}=`));

  let path: string | undefined;
  try {
    path = cookie ? decodeURIComponent(cookie.substring(POST_LOGIN_REDIRECT.length + 1)) : undefined;
  } catch {
    path = undefined;
  }

  document.cookie = `${POST_LOGIN_REDIRECT}=; path=/; max-age=0`;
  return isSafeRedirectPath(path) ? path : '/chat';
}
