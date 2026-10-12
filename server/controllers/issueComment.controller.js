const {
  createComment,
  getIssueComments,
  updateComment,
  deleteComment,
} = require("../services/issueComment.service");

const {
  validateCommentBody,
  validateCommentPagination,
} = require("../validators/issueComment.validator");

const handleError = (res, error, label) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error(`${label}:`, error);

  return res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
};

const createCommentController = async (req, res) => {
  try {
    const validation = validateCommentBody(req.body.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const comment = await createComment({
      issueId: req.params.issueId,
      project: req.project,
      authorId: req.user._id,
      body: validation.data,
    });

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error) {
    return handleError(res, error, "Create comment error");
  }
};

const getIssueCommentsController = async (req, res) => {
  try {
    const validation = validateCommentPagination(req.query);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const result = await getIssueComments({
      issueId: req.params.issueId,
      project: req.project,
      ...validation.data,
    });

    return res.status(200).json({
      success: true,
      data: result.comments,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleError(res, error, "Get comments error");
  }
};

const updateCommentController = async (req, res) => {
  try {
    const validation = validateCommentBody(req.body.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const comment = await updateComment({
      commentId: req.params.commentId,
      projectId: req.project._id,
      userId: req.user._id,
      body: validation.data,
    });

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: comment,
    });
  } catch (error) {
    return handleError(res, error, "Update comment error");
  }
};

const deleteCommentController = async (req, res) => {
  try {
    const result = await deleteComment({
      commentId: req.params.commentId,
      projectId: req.project._id,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Delete comment error");
  }
};

module.exports = {
  createCommentController,
  getIssueCommentsController,
  updateCommentController,
  deleteCommentController,
};