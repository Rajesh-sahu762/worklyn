const {
  getTeamById,
  listOrganizationTeams,
  createTeam,
  updateTeam,
  archiveTeam,
  listTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
} = require("../services/team.service");

const handleError = (res, error, fallback = "Team request failed") => {
  const clientErrors = [
    "Team not found",
    "User must be an active organization member",
    "User is already a team member",
    "Invalid team role",
    "Team member not found",
    "A team must have at least one team lead",
  ];
  const status = error.code === 11000 ? 409 : clientErrors.includes(error.message) ? 400 : 500;
  return res.status(status).json({
    success: false,
    message: error.code === 11000 ? "A team with this name already exists" : error.message || fallback,
  });
};

const listTeamsController = async (req, res) => {
  try {
    const teams = await listOrganizationTeams(req.params.organizationId);
    return res.status(200).json({ success: true, data: { teams } });
  } catch (error) { return handleError(res, error, "Failed to load teams"); }
};

const getTeamController = async (req, res) => {
  try {
    const team = await getTeamById(req.team._id);
    const members = await listTeamMembers(req.team._id);
    return res.status(200).json({
      success: true,
      data: { team, members, organizationRole: req.organizationMembership.role },
    });
  } catch (error) { return handleError(res, error, "Failed to load team"); }
};

const createTeamController = async (req, res) => {
  const { name, description = "", avatar = "" } = req.body ?? {};
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ success: false, message: "Team name must be between 2 and 100 characters" });
  }
  if (typeof description !== "string" || description.length > 500) {
    return res.status(400).json({ success: false, message: "Description cannot exceed 500 characters" });
  }
  if (typeof avatar !== "string") {
    return res.status(400).json({ success: false, message: "Avatar must be a URL string" });
  }
  try {
    const team = await createTeam({
      organizationId: req.params.organizationId,
      userId: req.user._id,
      name,
      description,
      avatar,
    });
    return res.status(201).json({ success: true, message: "Team created successfully", data: { team } });
  } catch (error) { return handleError(res, error, "Failed to create team"); }
};

const updateTeamController = async (req, res) => {
  const allowed = ["name", "description", "avatar"];
  const keys = Object.keys(req.body ?? {});
  if (!keys.length || keys.some((key) => !allowed.includes(key))) {
    return res.status(400).json({ success: false, message: "Provide valid team fields to update" });
  }
  if (req.body.name !== undefined && (typeof req.body.name !== "string" || req.body.name.trim().length < 2 || req.body.name.trim().length > 100)) {
    return res.status(400).json({ success: false, message: "Team name must be between 2 and 100 characters" });
  }
  if (req.body.description !== undefined && (typeof req.body.description !== "string" || req.body.description.length > 500)) {
    return res.status(400).json({ success: false, message: "Description cannot exceed 500 characters" });
  }
  if (req.body.avatar !== undefined && typeof req.body.avatar !== "string") {
    return res.status(400).json({ success: false, message: "Avatar must be a URL string" });
  }
  try {
    const team = await updateTeam({ teamId: req.team._id, updates: req.body });
    return res.status(200).json({ success: true, message: "Team updated successfully", data: { team } });
  } catch (error) { return handleError(res, error, "Failed to update team"); }
};

const archiveTeamController = async (req, res) => {
  try {
    await archiveTeam(req.team._id);
    return res.status(200).json({ success: true, message: "Team archived successfully" });
  } catch (error) { return handleError(res, error, "Failed to archive team"); }
};

const listTeamMembersController = async (req, res) => {
  try {
    const members = await listTeamMembers(req.team._id);
    return res.status(200).json({ success: true, data: { members } });
  } catch (error) { return handleError(res, error, "Failed to load team members"); }
};

const addTeamMemberController = async (req, res) => {
  const { userId, role = "MEMBER" } = req.body ?? {};
  if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });
  try {
    const member = await addTeamMember({
      organizationId: req.params.organizationId,
      teamId: req.team._id,
      userId,
      actorId: req.user._id,
      role,
    });
    return res.status(201).json({ success: true, message: "Team member added successfully", data: { member } });
  } catch (error) { return handleError(res, error, "Failed to add team member"); }
};

const updateTeamMemberRoleController = async (req, res) => {
  try {
    const member = await updateTeamMemberRole({
      teamId: req.team._id,
      memberId: req.params.memberId,
      role: req.body?.role,
    });
    return res.status(200).json({ success: true, message: "Team member role updated", data: { member } });
  } catch (error) { return handleError(res, error, "Failed to update team member"); }
};

const removeTeamMemberController = async (req, res) => {
  try {
    await removeTeamMember({ teamId: req.team._id, memberId: req.params.memberId });
    return res.status(200).json({ success: true, message: "Team member removed successfully" });
  } catch (error) { return handleError(res, error, "Failed to remove team member"); }
};

module.exports = {
  listTeamsController,
  getTeamController,
  createTeamController,
  updateTeamController,
  archiveTeamController,
  listTeamMembersController,
  addTeamMemberController,
  updateTeamMemberRoleController,
  removeTeamMemberController,
};
