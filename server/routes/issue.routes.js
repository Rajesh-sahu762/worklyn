const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const projectAccess = require("../middlewares/projectAccess");

const {
  createIssueController,
  getProjectIssuesController,
  getIssueByIdController,
} = require("../controllers/issue.controller");

router.post(
  "/projects/:projectId/issues",
  authenticate,
  projectAccess,
  createIssueController
);

router.get(
  "/projects/:projectId/issues",
  authenticate,
  projectAccess,
  getProjectIssuesController
);

router.get(
  "/issues/:issueId",
  authenticate,
  getIssueByIdController
);

module.exports = router;