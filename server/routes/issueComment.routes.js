const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const projectAccess = require("../middlewares/projectAccess");

const {
  createCommentController,
  getIssueCommentsController,
  updateCommentController,
  deleteCommentController,
} = require("../controllers/issueComment.controller");

router.post(
  "/projects/:projectId/issues/:issueId/comments",
  authenticate,
  projectAccess,
  createCommentController
);

router.get(
  "/projects/:projectId/issues/:issueId/comments",
  authenticate,
  projectAccess,
  getIssueCommentsController
);

router.patch(
  "/projects/:projectId/issues/:issueId/comments/:commentId",
  authenticate,
  projectAccess,
  updateCommentController
);

router.delete(
  "/projects/:projectId/issues/:issueId/comments/:commentId",
  authenticate,
  projectAccess,
  deleteCommentController
);

module.exports = router;