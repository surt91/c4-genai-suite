/**
 * Sends the user to the login page after the session expired (a 401 response). The current page is remembered in the
 * cookie `post-login-redirect`, so the user returns to it after the login.
 */
export function redirectToLogin(navigate: (to: string) => void) {
  if (window.location.pathname.startsWith('/login')) {
    return;
  }

  const secure = window.location.protocol === 'https:';
  const sameSite = secure ? 'None' : 'Strict';
  document.cookie = `post-login-redirect=${encodeURIComponent(window.location.pathname)}; path=/; SameSite=${sameSite}${secure ? '; Secure' : ''}`;
  navigate('/login');
}
