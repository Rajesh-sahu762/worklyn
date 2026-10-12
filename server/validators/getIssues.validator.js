const ISSUE_STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
];

const ISSUE_TYPES = [
  "EPIC",
  "STORY",
  "TASK",
  "BUG",
  "SUB_TASK",
];

const ISSUE_PRIORITIES = [
  "LOWEST",
  "LOW",
  "MEDIUM",
  "HIGH",
  "HIGHEST",
];

const validateGetIssues = (query) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);

  if (!Number.isInteger(page) || page < 1) {
    return { error: "Page must be a positive integer" };
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    return { error: "Limit must be between 1 and 100" };
  }

  if (
    query.status &&
    !ISSUE_STATUSES.includes(query.status)
  ) {
    return { error: "Invalid issue status" };
  }

  if (
    query.type &&
    !ISSUE_TYPES.includes(query.type)
  ) {
    return { error: "Invalid issue type" };
  }

  if (
    query.priority &&
    !ISSUE_PRIORITIES.includes(query.priority)
  ) {
    return { error: "Invalid issue priority" };
  }

  if (
    query.search !== undefined &&
    (
      typeof query.search !== "string" ||
      query.search.length > 100
    )
  ) {
    return { error: "Search must be a string up to 100 characters" };
  }

  return {
    data: {
      page,
      limit,
      status: query.status,
      type: query.type,
      priority: query.priority,
      assignee: query.assignee,
      search: query.search?.trim(),
    },
  };
};

module.exports = { validateGetIssues };