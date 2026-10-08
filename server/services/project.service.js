const mongoose = require("mongoose");

const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");

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
      throw new Error(
        "Project key already exists in this organization"
      );
    }

    // 2. Check duplicate project slug
    const existingSlug = await Project.findOne({
      organization: organizationId,
      slug: slug.toLowerCase(),
    }).session(session);

    if (existingSlug) {
      throw new Error(
        "Project slug already exists in this organization"
      );
    }

    // 3. Create project
    const project = await Project.create(
      [
        {
          organization: organizationId,

          name: name.trim(),

          key: key.toUpperCase().trim(),

          slug: slug.toLowerCase().trim(),

          description:
            description?.trim() || "",

          projectType:
            projectType || "SCRUM",

          lead: lead || createdBy,

          createdBy,

          status: "ACTIVE",
        },
      ],
      { session }
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
      { session }
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

module.exports = {
  createProject,
};