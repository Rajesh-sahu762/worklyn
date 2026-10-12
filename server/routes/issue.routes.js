const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const projectAccess = require("../middlewares/projectAccess");

const {
  createIssueController,
} = require("../controllers/issue.controller");

router.post(
  "/projects/:projectId/issues",
  authenticate,
  projectAccess,
  createIssueController
);

module.exports = router;