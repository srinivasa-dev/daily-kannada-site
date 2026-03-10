const SESSION_KEY = "dailyKannadaAdminSession";

export function loadSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.token || !parsed.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAdminUser(user) {
  return user && typeof user.role === "string" && user.role.toLowerCase() === "admin";
}

export function getAuthToken() {
  const session = loadSession();
  return session ? session.token : "";
}

export function redirectToLogin() {
  window.location.href = "login.html";
}

export function requireAdminSession() {
  const session = loadSession();
  if (!session || !isAdminUser(session.user)) {
    clearSession();
    redirectToLogin();
    return null;
  }

  return session;
}

export function logout() {
  clearSession();
  redirectToLogin();
}
