const LAST_ACTIVITY_KEY = 'sessionLastActivity';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const decodePayload = token => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(char => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`).join('')));
  } catch { return null; }
};

export const clearSession = () => {
  const hadSession = !!(sessionStorage.getItem('accessToken') || sessionStorage.getItem('user'));
  ['accessToken', 'refreshToken', 'token', 'user', LAST_ACTIVITY_KEY, 'admin_welcome_shown'].forEach(key => sessionStorage.removeItem(key));
  // Remove credentials created by older versions so they cannot silently restore a session.
  ['accessToken', 'refreshToken', 'token', 'user'].forEach(key => localStorage.removeItem(key));
  if (hadSession) window.dispatchEvent(new Event('auth-session-changed'));
};

export const startSession = ({ accessToken, user }) => {
  clearSession();
  sessionStorage.setItem('accessToken', accessToken);
  // Refresh tokens are intentionally not persisted: this is a login-per-browser-session flow.
  sessionStorage.setItem('user', JSON.stringify(user));
  sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  window.dispatchEvent(new Event('auth-session-changed'));
};

export const getSessionToken = () => sessionStorage.getItem('accessToken') || sessionStorage.getItem('token');
export const getSessionUser = () => {
  try { return JSON.parse(sessionStorage.getItem('user')) || null; } catch { return null; }
};

export const isSessionValid = () => {
  const token = getSessionToken();
  const user = getSessionUser();
  const lastActivity = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY));
  const payload = token && decodePayload(token);
  return !!(token && user && payload?.exp && payload.exp * 1000 > Date.now()
    && lastActivity && Date.now() - lastActivity <= IDLE_TIMEOUT_MS);
};

export const touchSession = () => {
  if (isSessionValid()) sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
};
