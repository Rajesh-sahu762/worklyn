const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const organizationAccess = require("../middlewares/organizationAccess");
const authorizeOrganization = require("../middlewares/authorizeOrganization");
const teamAccess = require("../middlewares/teamAccess");
const authorizeTeam = require("../middlewares/authorizeTeam");
const {
  listTeamsController,
  getTeamController,
  createTeamController,
  updateTeamController,
  archiveTeamController,
  listTeamMembersController,
  addTeamMemberController,
  updateTeamMemberRoleController,
  removeTeamMemberController,
} = require("../controllers/team.controller");

router.get(
  "/organizations/:organizationId/teams",
  authenticate,
  organizationAccess,
  listTeamsController
);

router.post(
  "/organizations/:organizationId/teams",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER", "ADMIN"),
  createTeamController
);

router.get(
  "/organizations/:organizationId/teams/:teamId",
  authenticate,
  organizationAccess,
  teamAccess,
  getTeamController
);

router.patch(
  "/organizations/:organizationId/teams/:teamId",
  authenticate,
  organizationAccess,
  teamAccess,
  authorizeTeam("TEAM_LEAD"),
  updateTeamController
);

router.delete(
  "/organizations/:organizationId/teams/:teamId",
  authenticate,
  organizationAccess,
  teamAccess,
  authorizeOrganization("OWNER", "ADMIN"),
  archiveTeamController
);

router.get(
  "/organizations/:organizationId/teams/:teamId/members",
  authenticate,
  organizationAccess,
  teamAccess,
  listTeamMembersController
);

router.post(
  "/organizations/:organizationId/teams/:teamId/members",
  authenticate,
  organizationAccess,
  teamAccess,
  authorizeTeam("TEAM_LEAD"),
  addTeamMemberController
);

router.patch(
  "/organizations/:organizationId/teams/:teamId/members/:memberId/role",
  authenticate,
  organizationAccess,
  teamAccess,
  authorizeTeam("TEAM_LEAD"),
  updateTeamMemberRoleController
);

router.delete(
  "/organizations/:organizationId/teams/:teamId/members/:memberId",
  authenticate,
  organizationAccess,
  teamAccess,
  authorizeTeam("TEAM_LEAD"),
  removeTeamMemberController
);

module.exports = router;
