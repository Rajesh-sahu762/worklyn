const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const projectAccess = require("../middlewares/projectAccess");
const authorizeProject = require("../middlewares/authorizeProject");
const {
  listSprintsController,
  createSprintController,
  updateSprintController,
  startSprintController,
  completeSprintController,
  assignIssueToSprintController,
} = require("../controllers/sprint.controller");

router.get("/projects/:projectId/sprints", authenticate, projectAccess, listSprintsController);
router.post("/projects/:projectId/sprints", authenticate, projectAccess, authorizeProject("PROJECT_ADMIN"), createSprintController);
router.patch("/projects/:projectId/sprints/:sprintId", authenticate, projectAccess, authorizeProject("PROJECT_ADMIN"), updateSprintController);
router.post("/projects/:projectId/sprints/:sprintId/start", authenticate, projectAccess, authorizeProject("PROJECT_ADMIN"), startSprintController);
router.post("/projects/:projectId/sprints/:sprintId/complete", authenticate, projectAccess, authorizeProject("PROJECT_ADMIN"), completeSprintController);
router.patch("/projects/:projectId/issues/:issueId/sprint", authenticate, projectAccess, authorizeProject("PROJECT_ADMIN"), assignIssueToSprintController);

module.exports = router;
