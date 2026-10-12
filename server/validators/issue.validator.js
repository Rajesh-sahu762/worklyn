const mongoose = require("mongoose");

const validateCreateIssue = ({
  title,
  description,
  type,
  priority,
  assigneeId,
  parentIssueId,
  labels,
  dueDate,
  estimate,
}) => {
  const errors = {};

  if (typeof title !== "string" || title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters";
  } else if (title.trim().length > 200) {
    errors.title = "Title cannot exceed 200 characters";
  }

  if (
    description !== undefined &&
    (typeof description !== "string" ||
      description.length > 10000)
  ) {
    errors.description = "Description cannot exceed 10000 characters";
  }

  if (
    type !== undefined &&
    !["EPIC", "STORY", "TASK", "BUG", "SUB_TASK"].includes(type)
  ) {
    errors.type = "Invalid issue type";
  }

  if (
    priority !== undefined &&
    !["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"].includes(priority)
  ) {
    errors.priority = "Invalid priority";
  }

  if (
    assigneeId !== undefined &&
    assigneeId !== null &&
    !mongoose.Types.ObjectId.isValid(assigneeId)
  ) {
    errors.assigneeId = "Invalid assignee ID";
  }

  if (
    parentIssueId !== undefined &&
    parentIssueId !== null &&
    !mongoose.Types.ObjectId.isValid(parentIssueId)
  ) {
    errors.parentIssueId = "Invalid parent issue ID";
  }

  if (
    labels !== undefined &&
    (!Array.isArray(labels) ||
      labels.some(
        (label) =>
          typeof label !== "string" ||
          !label.trim() ||
          label.length > 50
      ) ||
      labels.length > 20)
  ) {
    errors.labels = "Provide up to 20 valid labels";
  }

  if (
    dueDate !== undefined &&
    dueDate !== null &&
    (typeof dueDate !== "string" ||
      Number.isNaN(Date.parse(dueDate)))
  ) {
    errors.dueDate = "Invalid due date";
  }

  if (
    estimate !== undefined &&
    estimate !== null &&
    (!Number.isFinite(estimate) || estimate < 0)
  ) {
    errors.estimate = "Estimate must be a non-negative number";
  }

  return errors;
};

module.exports = {
  validateCreateIssue,
};