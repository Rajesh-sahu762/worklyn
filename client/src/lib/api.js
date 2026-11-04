// API client. The access token lives in memory only; the refresh token is the
// HttpOnly cookie (credentials: "include"). On a 401 for an authenticated
// request we refresh once and retry, so pages never deal with token expiry.
const API_ORIGIN =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

const BASE = `${API_ORIGIN}/api`;
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

// POST /api/organizations/:organizationId/projects -> { data: { project } }
export const createProject = (organizationId, payload) =>
  request(`/organizations/${organizationId}/projects`, { method: "POST", body: payload }).then((r) => r.data.project);

// GET /api/organization/:orgId -> { data: { organization, role } }
export const getOrganization = (orgId) =>
  request(`/organization/${orgId}`).then((r) => r.data);

// PUT /api/organization/:orgId (owner/admin)
export const updateOrganization = (orgId, payload) =>
  request(`/organization/${orgId}`, { method: "PUT", body: payload }).then((r) => r.data.organization);

// PATCH /api/organization/:orgId/transfer-ownership (owner only)
export const transferOrganizationOwnership = (orgId, newOwnerMemberId) =>
  request(`/organization/${orgId}/transfer-ownership`, {
    method: "PATCH",
    body: { newOwnerMemberId },
  }).then((r) => r.data);

// DELETE /api/organization/:orgId/leave
export const leaveOrganization = (orgId) =>
  request(`/organization/${orgId}/leave`, { method: "DELETE" });

// POST /api/organization -> { data: { organization } }  (creator becomes OWNER)
export const createOrganization = (payload) =>
  request("/organization", { method: "POST", body: payload }).then((r) => r.data.organization);

// PATCH /api/projects/:projectId (project admin)
export const updateProject = (projectId, payload) =>
  request(`/projects/${projectId}`, { method: "PATCH", body: payload }).then((r) => r.data.project);

// Project membership
export const getProjectMembers = (projectId) =>
  request(`/projects/${projectId}/members`).then((r) => r.data.members ?? []);

export const addProjectMember = (projectId, userId, role = "MEMBER") =>
  request(`/projects/${projectId}/members`, {
    method: "POST",
    body: { userId, role },
  }).then((r) => r.data.membership ?? r.data);

export const updateProjectMemberRole = (projectId, memberId, role) =>
  request(`/projects/${projectId}/members/${memberId}/role`, {
    method: "PATCH",
    body: { role },
  }).then((r) => r.data.membership ?? r.data);

export const removeProjectMember = (projectId, memberId) =>
  request(`/projects/${projectId}/members/${memberId}`, { method: "DELETE" });

// Project reporting
export const getProjectReport = (projectId) =>
  request(`/projects/${projectId}/reports/summary`).then((r) => r.data.summary);

// Notifications
export const getNotifications = (page = 1, limit = 20) =>
  request(`/notifications?page=${page}&limit=${limit}`).then((r) => ({
    notifications: r.data ?? [],
    unreadCount: r.unreadCount ?? 0,
    pagination: r.pagination,
  }));

export const getUnreadNotificationCount = () =>
  request("/notifications/unread-count").then((r) => r.data.unreadCount ?? 0);

export const markNotificationRead = (notificationId) =>
  request(`/notifications/${notificationId}/read`, { method: "PATCH" });

export const markAllNotificationsRead = () =>
  request("/notifications/read-all", { method: "PATCH" }).then((r) => r.data.updated ?? 0);

// Project sprint planning
export const getSprints = (projectId) =>
  request(`/projects/${projectId}/sprints`).then((r) => r.data.sprints ?? []);

export const createSprint = (projectId, payload) =>
  request(`/projects/${projectId}/sprints`, { method: "POST", body: payload }).then((r) => r.data.sprint);

export const updateSprint = (projectId, sprintId, payload) =>
  request(`/projects/${projectId}/sprints/${sprintId}`, { method: "PATCH", body: payload }).then((r) => r.data.sprint);

export const startSprint = (projectId, sprintId) =>
  request(`/projects/${projectId}/sprints/${sprintId}/start`, { method: "POST" }).then((r) => r.data.sprint);

export const completeSprint = (projectId, sprintId) =>
  request(`/projects/${projectId}/sprints/${sprintId}/complete`, { method: "POST" }).then((r) => r.data.sprint);

export const assignIssueToSprint = (projectId, issueId, sprintId) =>
  request(`/projects/${projectId}/issues/${issueId}/sprint`, { method: "PATCH", body: { sprintId } }).then((r) => r.data.issue);

// Organization teams
export const getTeams = (organizationId) =>
  request(`/organizations/${organizationId}/teams`).then((r) => r.data.teams ?? []);

export const createTeam = (organizationId, payload) =>
  request(`/organizations/${organizationId}/teams`, { method: "POST", body: payload }).then((r) => r.data.team);

export const getTeam = (organizationId, teamId) =>
  request(`/organizations/${organizationId}/teams/${teamId}`).then((r) => r.data);

export const updateTeam = (organizationId, teamId, payload) =>
  request(`/organizations/${organizationId}/teams/${teamId}`, { method: "PATCH", body: payload }).then((r) => r.data.team);

export const archiveTeam = (organizationId, teamId) =>
  request(`/organizations/${organizationId}/teams/${teamId}`, { method: "DELETE" });

export const getTeamMembers = (organizationId, teamId) =>
  request(`/organizations/${organizationId}/teams/${teamId}/members`).then((r) => r.data.members ?? []);

export const addTeamMember = (organizationId, teamId, userId, role = "MEMBER") =>
  request(`/organizations/${organizationId}/teams/${teamId}/members`, { method: "POST", body: { userId, role } }).then((r) => r.data.member);

export const updateTeamMemberRole = (organizationId, teamId, memberId, role) =>
  request(`/organizations/${organizationId}/teams/${teamId}/members/${memberId}/role`, { method: "PATCH", body: { role } }).then((r) => r.data.member);

export const removeTeamMember = (organizationId, teamId, memberId) =>
  request(`/organizations/${organizationId}/teams/${teamId}/members/${memberId}`, { method: "DELETE" });

// GET /api/projects/:projectId/issues?assignee=&limit=&status=...
// Response key for the array isn't documented; accept the common shapes.
export const getProjectIssues = (projectId, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/projects/${projectId}/issues${qs ? `?${qs}` : ""}`).then((r) => {
    const d = r.data;
    return Array.isArray(d) ? d : d?.issues ?? d?.items ?? [];
  });
};

// GET /api/projects/:projectId
// Response: { data: { project, role } }
export const getProject = (projectId) =>
  request(`/projects/${projectId}`).then((r) => r.data);



// Get one issue
export const getIssue = (issueId) =>
  request(`/issues/${issueId}`).then((r) => r.data);

// Update issue fields
export const updateIssue = (projectId, issueId, payload) =>
  request(`/projects/${projectId}/issues/${issueId}`, {
    method: "PATCH",
    body: payload,
  }).then((r) => r.data);

// Get issue comments
export const getIssueComments = (projectId, issueId, params = {}) => {
  const qs = new URLSearchParams(params).toString();

  return request(
    `/projects/${projectId}/issues/${issueId}/comments${qs ? `?${qs}` : ""}`
  ).then((r) => ({
    items: r.data ?? [],
    pagination: r.pagination ?? null,
  }));
};

// Add a comment
export const createIssueComment = (projectId, issueId, body) =>
  request(`/projects/${projectId}/issues/${issueId}/comments`, {
    method: "POST",
    body: { body },
  }).then((r) => r.data);

// Edit a comment
export const updateIssueComment = (
  projectId,
  issueId,
  commentId,
  body
) =>
  request(
    `/projects/${projectId}/issues/${issueId}/comments/${commentId}`,
    {
      method: "PATCH",
      body: { body },
    }
  ).then((r) => r.data);

// Delete a comment
export const deleteIssueComment = (projectId, issueId, commentId) =>
  request(
    `/projects/${projectId}/issues/${issueId}/comments/${commentId}`,
    { method: "DELETE" }
  ).then((r) => r.data);

// Get issue activity history
export const getIssueActivities = (issueId) =>
  request(`/issues/${issueId}/activities`).then((r) => r.data ?? []);


export const createIssue = (projectId, payload) =>
  request(`/projects/${projectId}/issues`, {
    method: "POST",
    body: payload,
  }).then((r) => r.data?.issue ?? r.data);

// GET /api/organization/:orgId/members -> { data: { members: [...] } }
export const getOrgMembers = (orgId) =>
  request(`/organization/${orgId}/members`).then((r) => r.data.members ?? []);

// PATCH /api/organization/:orgId/members/:memberId/role  body: { role: "ADMIN" | "MEMBER" } (owner only)
export const updateOrgMemberRole = (orgId, memberId, role) =>
  request(`/organization/${orgId}/members/${memberId}/role`, { method: "PATCH", body: { role } })
    .then((r) => r.data.member ?? r.data);

// DELETE /api/organization/:orgId/members/:memberId (owner only)
export const removeOrgMember = (orgId, memberId) =>
  request(`/organization/${orgId}/members/${memberId}`, { method: "DELETE" });

// The dev invitation link's key isn't documented; take the first link/url-like string.
const linkOf = (d = {}) =>
  d.invitationLink ?? d.inviteLink ?? d.link ?? d.url ??
  Object.entries(d).find(([k, v]) => /link|url/i.test(k) && typeof v === "string")?.[1] ?? "";
const invitationResult = (r) => ({ invitation: r.data.invitation ?? r.data, link: linkOf(r.data) });

// GET /api/organization/:orgId/invitations?page=&limit= (owner/admin)
export const getOrgInvitations = (orgId, page = 1, limit = 5) =>
  request(`/organization/${orgId}/invitations?page=${page}&limit=${limit}`).then((r) => ({
    invitations: r.data.invitations ?? [],
    pagination: r.data.pagination ?? { page, limit, total: 0, totalPages: 1 },
  }));

// POST /api/organization/:orgId/invitations  (owner/admin)
export const createInvitation = (orgId, email, role) =>
  request(`/organization/${orgId}/invitations`, { method: "POST", body: { email, role } }).then(invitationResult);

// POST /api/organization/:orgId/invitations/:id/resend  (rotates token + expiry)
export const resendInvitation = (orgId, id) =>
  request(`/organization/${orgId}/invitations/${id}/resend`, { method: "POST" }).then(invitationResult);

// DELETE /api/organization/:orgId/invitations/:id  (cancel pending)
export const cancelInvitation = (orgId, id) =>
  request(`/organization/${orgId}/invitations/${id}`, { method: "DELETE" });

// POST /api/invitations/accept  body: { token }  (invitee must be signed in with the invited email)
export const acceptInvitation = (token) =>
  request("/invitations/accept", { method: "POST", body: { token } }).then((r) => ({
    organization: r.data.organization ?? r.data,
    role: r.data.role ?? r.data.membership?.role ?? "MEMBER",
  }));




