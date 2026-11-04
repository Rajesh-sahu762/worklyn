const Team = require("../models/Team");
const TeamMember = require("../models/TeamMember");
const OrganizationMember = require("../models/OrganizationMember");

const getTeamById = async (teamId) => {
  const team = await Team.findOne({ _id: teamId, isActive: true })
    .populate("createdBy", "firstName lastName email profileImage")
    .lean();
  if (!team) throw new Error("Team not found");
  return team;
};

const listOrganizationTeams = async (organizationId) => {
  const teams = await Team.find({ organization: organizationId, isActive: true })
    .populate("createdBy", "firstName lastName email profileImage")
    .sort({ name: 1 })
    .lean();

  return Promise.all(teams.map(async (team) => ({
    ...team,
    memberCount: await TeamMember.countDocuments({ team: team._id, status: "ACTIVE" }),
  })));
};

const createTeam = async ({ organizationId, userId, name, description = "", avatar = "" }) => {
  const team = await Team.create({
    organization: organizationId,
    name: name.trim(),
    description: description.trim(),
    avatar: avatar.trim(),
    createdBy: userId,
  });

  await TeamMember.create({
    team: team._id,
    user: userId,
    role: "TEAM_LEAD",
    status: "ACTIVE",
    joinedAt: new Date(),
  });

  return getTeamById(team._id);
};

const updateTeam = async ({ teamId, updates }) => {
  const team = await Team.findOne({ _id: teamId, isActive: true });
  if (!team) throw new Error("Team not found");
  if (updates.name !== undefined) team.name = updates.name.trim();
  if (updates.description !== undefined) team.description = updates.description.trim();
  if (updates.avatar !== undefined) team.avatar = updates.avatar.trim();
  await team.save();
  return getTeamById(teamId);
};

const archiveTeam = async (teamId) => {
  const team = await Team.findOne({ _id: teamId, isActive: true });
  if (!team) throw new Error("Team not found");
  team.isActive = false;
  await team.save();
  return team;
};

const listTeamMembers = async (teamId) => TeamMember.find({
  team: teamId,
  status: "ACTIVE",
})
  .populate({ path: "user", select: "firstName lastName email profileImage" })
  .sort({ role: 1, createdAt: 1 })
  .lean();

const addTeamMember = async ({ organizationId, teamId, userId, role = "MEMBER" }) => {
  if (!["TEAM_LEAD", "MEMBER"].includes(role)) throw new Error("Invalid team role");

  const organizationMember = await OrganizationMember.findOne({
    organization: organizationId,
    user: userId,
    status: "ACTIVE",
  });
  if (!organizationMember) throw new Error("User must be an active organization member");

  let membership = await TeamMember.findOne({ team: teamId, user: userId });
  if (membership?.status === "ACTIVE") throw new Error("User is already a team member");

  if (membership) {
    membership.role = role;
    membership.status = "ACTIVE";
    membership.joinedAt = new Date();
    await membership.save();
  } else {
    membership = await TeamMember.create({
      team: teamId,
      user: userId,
      role,
      status: "ACTIVE",
      joinedAt: new Date(),
    });
  }

  return TeamMember.findById(membership._id)
    .populate({ path: "user", select: "firstName lastName email profileImage" });
};

const updateTeamMemberRole = async ({ teamId, memberId, role }) => {
  if (!["TEAM_LEAD", "MEMBER"].includes(role)) throw new Error("Invalid team role");
  const member = await TeamMember.findOne({ _id: memberId, team: teamId, status: "ACTIVE" });
  if (!member) throw new Error("Team member not found");

  if (member.role === "TEAM_LEAD" && role !== "TEAM_LEAD") {
    const leads = await TeamMember.countDocuments({ team: teamId, status: "ACTIVE", role: "TEAM_LEAD" });
    if (leads <= 1) throw new Error("A team must have at least one team lead");
  }

  member.role = role;
  await member.save();
  return TeamMember.findById(member._id)
    .populate({ path: "user", select: "firstName lastName email profileImage" });
};

const removeTeamMember = async ({ teamId, memberId }) => {
  const member = await TeamMember.findOne({ _id: memberId, team: teamId, status: "ACTIVE" });
  if (!member) throw new Error("Team member not found");

  if (member.role === "TEAM_LEAD") {
    const leads = await TeamMember.countDocuments({ team: teamId, status: "ACTIVE", role: "TEAM_LEAD" });
    if (leads <= 1) throw new Error("A team must have at least one team lead");
  }

  member.status = "REMOVED";
  await member.save();
  return member;
};

module.exports = {
  getTeamById,
  listOrganizationTeams,
  createTeam,
  updateTeam,
  archiveTeam,
  listTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
};
