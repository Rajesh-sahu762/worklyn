const mongoose = require("mongoose");
const Issue = require("../models/Issue");
const IssueComment = require("../models/IssueComment");

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureIssueExists = async (issueId, projectId) => {
  if (!mongoose.isValidObjectId(issueId)) {
    throw createHttpError("Invalid issue ID", 400);
  }

  const issue = await Issue.findOne({
    _id: issueId,
    project: projectId,
    archivedAt: null,
  }).select("_id organization project");

  if (!issue) {
    throw createHttpError("Issue not found", 404);
  }

  return issue;
};

const createComment = async ({
  issueId,
  project,
  authorId,
  body,
}) => {
  const issue = await ensureIssueExists(issueId, project._id);

  const comment = await IssueComment.create({
    organization: issue.organization,
    project: issue.project,
    issue: issue._id,
    author: authorId,
    body,
  });

  return IssueComment.findById(comment._id)
    .populate("author", "firstName lastName profileImage")
    .lean();
};

const getIssueComments = async ({
  issueId,
  project,
  page,
  limit,
}) => {
  const issue = await ensureIssueExists(issueId, project._id);
  const filter = {
    issue: issue._id,
    deletedAt: null,
  };

  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    IssueComment.find(filter)
      .populate("author", "firstName lastName profileImage")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    IssueComment.countDocuments(filter),
  ]);

  return {
    comments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

const updateComment = async ({
  commentId,
  projectId,
  userId,
  body,
}) => {
  if (!mongoose.isValidObjectId(commentId)) {
    throw createHttpError("Invalid comment ID", 400);
  }

  const comment = await IssueComment.findOne({
    _id: commentId,
    project: projectId,
    deletedAt: null,
  });

  if (!comment) {
    throw createHttpError("Comment not found", 404);
  }

  if (comment.author.toString() !== userId.toString()) {
    throw createHttpError(
      "You can only edit your own comments",
      403
    );
  }

  comment.body = body;
  comment.editedAt = new Date();

  await comment.save();

  return IssueComment.findById(comment._id)
    .populate("author", "firstName lastName profileImage")
    .lean();
};

const deleteComment = async ({
  commentId,
  projectId,
  userId,
}) => {
  if (!mongoose.isValidObjectId(commentId)) {
    throw createHttpError("Invalid comment ID", 400);
  }

  const comment = await IssueComment.findOne({
    _id: commentId,
    project: projectId,
    deletedAt: null,
  });

  if (!comment) {
    throw createHttpError("Comment not found", 404);
  }

  if (comment.author.toString() !== userId.toString()) {
    throw createHttpError(
      "You can only delete your own comments",
      403
    );
  }

  comment.deletedAt = new Date();
  comment.body = "[deleted]";

  await comment.save();

  return { commentId: comment._id };
};

module.exports = {
  createComment,
  getIssueComments,
  updateComment,
  deleteComment,
};