// Single switchboard for UI that exists before its page/backend does.
// Flip a flag to true when the feature ships; "Soon" disappears everywhere.
export const FEATURES = {
  recent: false,
  starred: false,
  notifications: false,
  projectsList: true,
  projectPages: true,   // routes: /projects/:projectId
  teams: false,
  members: true,
  createIssue: false,
  createProject: false,
  createOrganization: true,
  settings: true,
};