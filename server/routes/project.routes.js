const express = require("express");

const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const organizationAccess = require("../middlewares/organizationAccess");
const authorizeOrganization = require("../middlewares/authorizeOrganization");
const projectAccess = require("../middlewares/projectAccess");
const authorizeProject = require("../middlewares/authorizeProject");
const {
  getMyProjectsController,
  getProjectDetailsController,
  addProjectMemberController,
  createProjectController,
  updateProjectMemberRoleController,
  removeProjectMemberController
} = require("../controllers/project.controller");

router.post(
  "/organizations/:organizationId/projects",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER", "ADMIN"),
  createProjectController,
);

// Get projects in an organization
router.get(
  "/organizations/:organizationId/projects/my",
  authenticate,
  organizationAccess,
  getMyProjectsController,
);

// Get project details
router.get(
  "/projects/:projectId",
  authenticate,
  projectAccess,
  getProjectDetailsController,
);


router.post(
    "/projects/:projectId/members",
  authenticate,
  projectAccess,
  authorizeProject("PROJECT_ADMIN"),
  addProjectMemberController
);

router.patch(
  "/projects/:projectId/members/:memberId/role",
  authenticate,
  projectAccess,
  authorizeProject("PROJECT_ADMIN"),
  updateProjectMemberRoleController
);

router.delete(
  "/projects/:projectId/members/:memberId",
  authenticate,
  projectAccess,
  authorizeProject("PROJECT_ADMIN"),
  removeProjectMemberController
);


module.exports = router;
