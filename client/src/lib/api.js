// API client. The access token lives in memory only; the refresh token is the
// HttpOnly cookie (credentials: "include"). On a 401 for an authenticated
// request we refresh once and retry, so pages never deal with token expiry.
const BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Backend sometimes returns `errors`; its exact shape isn't documented,
// so accept an array of { field|path, message|msg } or a plain object.
function normalizeErrors(errors) {
  const out = {};
  if (Array.isArray(errors)) {
    errors.forEach((e) => {
      if (typeof e === "string") return;
      const key = e.field || e.path || e.param;
      if (key) out[key] = e.message || e.msg || "Invalid value";
    });
  } else if (errors && typeof errors === "object") {
    Object.entries(errors).forEach(([k, v]) => {
      out[k] = Array.isArray(v) ? v[0] : String(v);
    });
  }
  return out;
}

/* ---------- session wiring (AuthContext configures this) ---------- */
let accessToken = null;
let handlers = { onTokenRefreshed: () => {}, onSessionExpired: () => {} };

export const setAccessToken = (t) => {
  accessToken = t;
};
export const configureApi = (h) => {
  handlers = { ...handlers, ...h };
};

// A 401 on these means bad credentials / bad cookie, not an expired access token.
const NO_REFRESH = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/refresh",
  "/auth/logout",
]);

async function send(path, { method = "GET", body, token }) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: "include",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new ApiError(
      data.message || "Something went wrong on our side. Try again in a moment.",
      res.status,
      normalizeErrors(data.errors)
    );
  }
  return data;
}

// Refresh tokens rotate, so parallel 401s must share ONE refresh call.
let refreshing = null;
function refreshOnce() {
  if (!refreshing) {
    refreshing = refresh()
      .then(({ accessToken: fresh }) => {
        accessToken = fresh;
        handlers.onTokenRefreshed(fresh);
        return fresh;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

// `token` is only passed explicitly during session restore (getMe); every other
// call uses the stored token and gets the refresh-and-retry behaviour.
async function request(path, { method = "GET", body, token } = {}) {
  const explicit = token !== undefined;
  const bearer = explicit ? token : accessToken;

  try {
    return await send(path, { method, body, token: bearer });
  } catch (err) {
    const canRefresh = err.status === 401 && !explicit && bearer && !NO_REFRESH.has(path);
    if (!canRefresh) throw err;

    // Another request already refreshed while this one was in flight.
    if (accessToken && accessToken !== bearer) {
      return send(path, { method, body, token: accessToken });
    }

    let fresh;
    try {
      fresh = await refreshOnce();
    } catch {
      handlers.onSessionExpired();
      throw err;
    }
    return send(path, { method, body, token: fresh });
  }
}

/* ---------- auth ---------- */
// POST /api/auth/login -> { data: { user, accessToken } }
export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: { email, password } }).then((r) => r.data);

// POST /api/auth/register -> { data: { userId, email } }
export const register = (payload) =>
  request("/auth/register", { method: "POST", body: payload }).then((r) => r.data);

// POST /api/auth/verify-email  body: { userId, otp }
export const verifyEmail = (userId, otp) =>
  request("/auth/verify-email", { method: "POST", body: { userId, otp } });

// POST /api/auth/resend-verification -> { data: { email } }
export const resendVerification = (email) =>
  request("/auth/resend-verification", { method: "POST", body: { email } });

// POST /api/auth/refresh (cookie) -> { data: { accessToken } }
export const refresh = () =>
  request("/auth/refresh", { method: "POST" }).then((r) => r.data);

// GET /api/auth/me -> { data: { user } }   (explicit token during restore)
export const getMe = (token) =>
  request("/auth/me", { token }).then((r) => r.data);

// POST /api/auth/logout (cookie, no bearer needed)
export const logout = () => request("/auth/logout", { method: "POST" });

/* ---------- organizations & projects ---------- */
// GET /api/organization/my -> { data: { organizations: [...] } }
export const getMyOrganizations = () =>
  request("/organization/my").then((r) => r.data.organizations ?? []);

// GET /api/organizations/:orgId/projects/my -> { data: { projects: [...] } }
export const getMyProjects = (orgId) =>
  request(`/organizations/${orgId}/projects/my`).then((r) => r.data.projects ?? []);