const mongoose = require("mongoose");

const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const OrganizationMember = require("../models/OrganizationMember");
const createProject = async ({
  organizationId,
  name,
  key,
  slug,
  description,
  projectType,
  lead,
  createdBy,
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Check duplicate project key
    const existingKey = await Project.findOne({
      organization: organizationId,
      key: key.toUpperCase(),
    }).session(session);

    if (existingKey) {
      throw new Error("Project key already exists in this organization");
    }

    // 2. Check duplicate project slug
    const existingSlug = await Project.findOne({
      organization: organizationId,
      slug: slug.toLowerCase(),
    }).session(session);

    if (existingSlug) {
      throw new Error("Project slug already exists in this organization");
    }

    // 3. Create project
    const project = await Project.create(
      [
        {
          organization: organizationId,

          name: name.trim(),

          key: key.toUpperCase().trim(),

          slug: slug.toLowerCase().trim(),

          description: description?.trim() || "",

          projectType: projectType || "SCRUM",

          lead: lead || createdBy,

          createdBy,

          status: "ACTIVE",
        },
      ],
      { session },
    );

    const createdProject = project[0];

    // 4. Creator automatically becomes project admin
    await ProjectMember.create(
      [
        {
          project: createdProject._id,

          user: createdBy,

          role: "PROJECT_ADMIN",

          status: "ACTIVE",

          joinedAt: new Date(),
        },
      ],
      { session },
    );

    // 5. Commit
    await session.commitTransaction();

    return createdProject;
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    await session.endSession();
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
    return membership;
  }

  membership = await ProjectMember.create({
    project: projectId,
    user: userId,
    role,
    status: "ACTIVE",
    invitedBy: null,
    joinedAt: new Date(),
  });

  return membership;
};

module.exports = {
  createProject,
  getUserProjects,
  getProjectById,
  addProjectMember,
};
