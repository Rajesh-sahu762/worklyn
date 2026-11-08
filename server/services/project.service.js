const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const OrganizationMember = require("../models/OrganizationMember");
const Team = require("../models/Team");
const TeamMember = require("../models/TeamMember");
const User = require("../models/user");
const { sendProjectAccessEmail } = require("./email.service");
const createProject = async ({
  organizationId, name, key, slug, description, projectType, lead, teamIds = [], createdBy,
}) => {
  const normalizedLead = lead || createdBy;
  const leadMembership = await OrganizationMember.findOne({
    organization: organizationId, user: normalizedLead, status: "ACTIVE",
  });
  if (!leadMembership) throw new Error("Project lead must be an active organization member");

  const creatorMembership = await OrganizationMember.findOne({
    organization: organizationId, user: createdBy, status: "ACTIVE",
  });
  if (!creatorMembership) throw new Error("Project creator must be an active organization member");

  const selectedTeams = [...new Set((teamIds || []).map(String))];
  const teams = selectedTeams.length ? await Team.find({
    _id: { $in: selectedTeams }, organization: organizationId, isActive: true,
  }).lean() : [];
  if (teams.length !== selectedTeams.length) throw new Error("One or more selected teams are not active in this organization");

  const [existingKey, existingSlug] = await Promise.all([
    Project.findOne({ organization: organizationId, key: key.toUpperCase() }),
    Project.findOne({ organization: organizationId, slug: slug.toLowerCase() }),
  ]);
  if (existingKey) throw new Error("Project key already exists in this organization");
  if (existingSlug) throw new Error("Project slug already exists in this organization");

  let createdProject;
  try {
    createdProject = await Project.create({
      organization: organizationId, name: name.trim(), key: key.toUpperCase().trim(),
      slug: slug.toLowerCase().trim(), description: description?.trim() || "",
      projectType: projectType || "SCRUM", lead: normalizedLead, teams: teams.map(t => t._id),
      createdBy, status: "ACTIVE",
    });

    const teamMemberships = selectedTeams.length ? await TeamMember.find({
      team: { $in: selectedTeams }, status: "ACTIVE",
    }).select("user").lean() : [];
    const participantIds = new Set([String(createdBy), String(normalizedLead)]);
    teamMemberships.forEach(member => participantIds.add(String(member.user)));

    const organizationMembers = await OrganizationMember.find({
      organization: organizationId, user: { $in: [...participantIds] }, status: "ACTIVE",
    }).select("user").lean();
    const activeUserIds = new Set(organizationMembers.map(m => String(m.user)));
    const projectMembers = [...participantIds].filter(id => activeUserIds.has(id)).map(userId => ({
      project: createdProject._id, user: userId,
      role: (userId === String(createdBy) || userId === String(normalizedLead)) ? "PROJECT_ADMIN" : "MEMBER",
      status: "ACTIVE", joinedAt: new Date(),
    }));

    await ProjectMember.insertMany(projectMembers);
    return createdProject;
  } catch (error) {
    // Compensating cleanup keeps failed creates from leaving an orphan project.
    // This also works with standalone local MongoDB, where multi-document
    // transactions are not supported.
    if (createdProject?._id) {
      await Promise.all([
        ProjectMember.deleteMany({ project: createdProject._id }).catch(cleanupError =>
          console.error("Project membership rollback failed:", cleanupError.message)
        ),
        Project.deleteOne({ _id: createdProject._id }).catch(cleanupError =>
          console.error("Project rollback failed:", cleanupError.message)
        ),
      ]);
    }
    throw error;
  }
};

const getUserProjects = async (userId, organizationId) => {
  const memberships = await ProjectMember.find({
    user: userId,
    status: "ACTIVE",
  })
    .populate({
      path: "project",
      match: {
        organization: organizationId,
        status: "ACTIVE",
      },
    })
    .sort({ createdAt: -1 });

  return memberships
    .filter((membership) => membership.project)
    .map((membership) => ({
      project: membership.project,
      role: membership.role,
      membershipId: membership._id,
    }));
};

const getProjectById = async (projectId) => {
  const project = await Project.findById(projectId).select("-__v");

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
};

const updateProject = async ({ projectId, updates }) => {
  const project = await Project.findOne({ _id: projectId, status: "ACTIVE" });
  if (!project) throw new Error("Project not found");

  if (updates.name !== undefined) project.name = updates.name.trim();
  if (updates.description !== undefined) project.description = updates.description.trim();
  if (updates.avatar !== undefined) project.avatar = updates.avatar.trim();

  await project.save();
  return project;
};

const getProjectMembers = async (projectId) => {
  return ProjectMember.find({
    project: projectId,
    status: "ACTIVE",
  })
    .populate({
      path: "user",
      select: "firstName lastName email profileImage",
    })
    .sort({ createdAt: 1 })
    .lean();
};

const addProjectMember = async ({ projectId, userId, role }) => {
  const project = await Project.findOne({
    _id: projectId,
    status: "ACTIVE",
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const organizationMembership = await OrganizationMember.findOne({
    organization: project.organization,
    user: userId,
    status: "ACTIVE",
  });

  if (!organizationMembership) {
    throw new Error("User is not an active member of this organization");
  }

  if (!["MEMBER", "VIEWER"].includes(role)) {
    throw new Error("Invalid project role");
  }

  let membership = await ProjectMember.findOne({
    project: projectId,
    user: userId,
  });

  if (membership?.status === "ACTIVE") {
    throw new Error("User is already a member of this project");
  }

  if (membership) {
    membership.role = role;
    membership.status = "ACTIVE";
    membership.invitedBy = null;
    membership.joinedAt = new Date();

    await membership.save();
  } else {
    membership = await ProjectMember.create({
    project: projectId,
    user: userId,
    role,
    status: "ACTIVE",
    invitedBy: null,
    joinedAt: new Date(),
    });
  }

  const user = await User.findById(userId).select("firstName email").lean();
  if (user?.email) {
    await sendProjectAccessEmail({
      to: user.email,
      firstName: user.firstName,
      projectName: project.name,
      projectKey: project.key,
      role,
      projectId: project._id,
    });
  }

  return membership;
};

const updateProjectMemberRole = async ({
  projectId,
  memberId,
  role,
}) => {
  if (!["MEMBER", "VIEWER"].includes(role)) {
    throw new Error("Invalid project role");
  }

  const membership = await ProjectMember.findOne({
    _id: memberId,
    project: projectId,
    status: "ACTIVE",
  });

  if (!membership) {
    throw new Error("Project member not found");
  }

  membership.role = role;
  await membership.save();

  return membership;
};

const removeProjectMember = async ({
  projectId,
  memberId,
  currentUserId,
}) => {
  const membership = await ProjectMember.findOne({
    _id: memberId,
    project: projectId,
    status: "ACTIVE",
  });

  if (!membership) {
    throw new Error("Project member not found");
  }

  // Do not allow removing the last active project admin
  if (membership.role === "PROJECT_ADMIN") {
    const activeAdmins = await ProjectMember.countDocuments({
      project: projectId,
      role: "PROJECT_ADMIN",
      status: "ACTIVE",
    });

    if (activeAdmins <= 1) {
      throw new Error(
        "Cannot remove the last project admin"
      );
    }
  }

  membership.status = "REMOVED";
  await membership.save();

  return membership;
};


module.exports = {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember
};
