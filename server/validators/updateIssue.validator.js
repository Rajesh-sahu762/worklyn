const STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const TYPES = ["EPIC", "STORY", "TASK", "BUG", "SUB_TASK"];
const PRIORITIES = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"];
const ALLOWED_FIELDS = ["title", "description", "status", "priority", "type", "assignee", "assigneeTeam", "labels", "dueDate", "estimate"];
const validId = value => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);

const validateUpdateIssue = (body = {}) => {
  const fields = Object.keys(body);
  if (!fields.length || fields.some(field => !ALLOWED_FIELDS.includes(field))) return { error: "Invalid or empty update fields" };
  if (body.title !== undefined && (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.trim().length > 200)) return { error: "Title must be between 3 and 200 characters" };
  if (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 10000)) return { error: "Description must be a string up to 10000 characters" };
  if (body.status !== undefined && !STATUSES.includes(body.status)) return { error: "Invalid issue status" };
  if (body.type !== undefined && !TYPES.includes(body.type)) return { error: "Invalid issue type" };
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) return { error: "Invalid issue priority" };
  if (body.assignee !== undefined && body.assignee !== null && body.assignee !== "" && !validId(body.assignee)) return { error: "Invalid assignee ID" };
  if (body.assigneeTeam !== undefined && body.assigneeTeam !== null && body.assigneeTeam !== "" && !validId(body.assigneeTeam)) return { error: "Invalid team ID" };
  if (body.assignee && body.assigneeTeam) return { error: "Choose an individual or a team, not both" };
  if (body.labels !== undefined && (!Array.isArray(body.labels) || body.labels.length > 20 || body.labels.some(label => typeof label !== "string" || !label.trim() || label.trim().length > 50))) return { error: "Labels must contain up to 20 strings of 1–50 characters" };
  if (body.dueDate !== undefined && body.dueDate !== null && (typeof body.dueDate !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}(T.*)?$/.test(body.dueDate) || Number.isNaN(Date.parse(body.dueDate)))) return { error: "Invalid due date" };
  if (body.estimate !== undefined && body.estimate !== null && (typeof body.estimate !== "number" || !Number.isFinite(body.estimate) || body.estimate < 0 || body.estimate > 100000)) return { error: "Estimate must be a non-negative number or null" };
  return { data: body };
};
module.exports = { validateUpdateIssue };
