const validateCommentBody = (body) => {
  if (
    typeof body !== "string" ||
    body.trim().length < 1 ||
    body.trim().length > 5000
  ) {
    return {
      error: "Comment must contain 1–5000 characters",
    };
  }

  return { data: body.trim() };
};

const validateCommentPagination = (query) => {
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

  return { data: { page, limit } };
};

module.exports = {
  validateCommentBody,
  validateCommentPagination,
};