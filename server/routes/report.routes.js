const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const projectAccess = require("../middlewares/projectAccess");
const { projectSummaryController } = require("../controllers/report.controller");

router.get(
  "/projects/:projectId/reports/summary",
  authenticate,
  projectAccess,
  projectSummaryController
);

module.exports = router;
