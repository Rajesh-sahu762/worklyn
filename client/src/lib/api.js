// Minimal API client. Keeps the access token in memory only;
// the refresh token stays in the HttpOnly cookie (credentials: "include").
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

async function request(path, { method = "GET", body, token } = {}) {
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

// POST /api/auth/login -> { data: { user, accessToken } }
export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: { email, password } }).then((r) => r.data);

// POST /api/auth/resend-verification -> { data: { email } }
export const resendVerification = (email) =>
  request("/auth/resend-verification", { method: "POST", body: { email } });

// POST /api/auth/register -> { data: { userId, email } }
export const register = (payload) =>
  request("/auth/register", { method: "POST", body: payload }).then((r) => r.data);

// POST /api/auth/verify-email  body: { userId, otp }
export const verifyEmail = (userId, otp) =>
  request("/auth/verify-email", { method: "POST", body: { userId, otp } });

// POST /api/auth/refresh (cookie) -> { data: { accessToken } }
export const refresh = () =>
  request("/auth/refresh", { method: "POST" }).then((r) => r.data);

// GET /api/auth/me -> { data: { user } }
export const getMe = (token) =>
  request("/auth/me", { token }).then((r) => r.data);

// POST /api/auth/logout (cookie, no bearer needed)
export const logout = () => request("/auth/logout", { method: "POST" });