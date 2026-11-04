const mongoose = require("mongoose");

const validateCreateIssue = (body = {}) => {
  const errors = {};
  const { title, description, type, priority, status, assigneeId, assigneeTeamId, sprintId, parentIssueId, labels, dueDate, estimate } = body;
  const validId = value => value === null || value === undefined || (typeof value === "string" && mongoose.isValidObjectId(value));

  if (typeof title !== "string" || title.trim().length < 3 || title.trim().length > 200) errors.title = "Title must be between 3 and 200 characters";
  if (description !== undefined && (typeof description !== "string" || description.length > 10000)) errors.description = "Description cannot exceed 10000 characters";
  if (type !== undefined && !["EPIC", "STORY", "TASK", "BUG", "SUB_TASK"].includes(type)) errors.type = "Invalid issue type";
  if (priority !== undefined && !["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"].includes(priority)) errors.priority = "Invalid priority";
  if (status !== undefined && !["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(status)) errors.status = "Invalid issue status";
  if (!validId(assigneeId)) errors.assigneeId = "Invalid assignee ID";
  if (!validId(assigneeTeamId)) errors.assigneeTeamId = "Invalid team ID";
  if (!validId(sprintId)) errors.sprintId = "Invalid sprint ID";
  if (!validId(parentIssueId)) errors.parentIssueId = "Invalid parent issue ID";
  if (assigneeId && assigneeTeamId) errors.assignee = "Choose an individual or a team, not both";
  if (labels !== undefined && (!Array.isArray(labels) || labels.length > 20 || labels.some(label => typeof label !== "string" || !label.trim() || label.trim().length > 50))) errors.labels = "Provide up to 20 valid labels";
  if (dueDate !== undefined && dueDate !== null && (typeof dueDate !== "string" || !/^\\d{4}-\\d{2}-\\d{2}(T.*)?$/.test(dueDate) || Number.isNaN(Date.parse(dueDate)))) errors.dueDate = "Invalid due date";
  if (estimate !== undefined && estimate !== null && (typeof estimate !== "number" || !Number.isFinite(estimate) || estimate < 0 || estimate > 100000)) errors.estimate = "Estimate must be a non-negative number up to 100000";
  return errors;
};

module.exports = { validateCreateIssue };
