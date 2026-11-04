const {
  createProject,
  getProjectById,
  updateProject,
  getUserProjects,
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember
} = require("../services/project.service");

const { validateCreateProject } = require("../validators/project.validator");

const createProjectController = async (req, res) => {
  try {
    const errors = validateCreateProject(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const { name, key, slug, description, projectType, lead, teamIds = [] } = req.body;

    const project = await createProject({
      organizationId: req.params.organizationId,

      name,
      key,
      slug,
      description,

      projectType: projectType || "SCRUM",

      lead: lead || req.user._id,
      teamIds,

      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully",

      data: {
        project,
      },
    });
  } catch (error) {
    if (
      error.message === "Project key already exists in this organization" ||
      error.message === "Project slug already exists in this organization" ||
      error.message === "Project lead must be an active organization member" ||
      error.message === "One or more selected teams are not active in this organization" ||
      error.message === "Project creator must be an active organization member"
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Create project error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create project",
    });
  }
};

const getMyProjectsController = async (req, res) => {
  try {
    const projects = await getUserProjects(
      req.user._id,
      req.params.organizationId,
    );

    return res.status(200).json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
};

const getProjectDetailsController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        project: req.project,
        role: req.projectMembership.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch project details",
    });
  }
};

const updateProjectController = async (req, res) => {
  const allowed = ["name", "description", "avatar"];
  const fields = Object.keys(req.body ?? {});
  const errors = {};

  if (!fields.length || fields.some((field) => !allowed.includes(field))) {
    return res.status(400).json({
      success: false,
      message: "Provide valid project fields to update",
    });
  }
  if (req.body.name !== undefined && (typeof req.body.name !== "string" || req.body.name.trim().length < 2 || req.body.name.trim().length > 100)) {
    errors.name = "Project name must be between 2 and 100 characters";
  }
  if (req.body.description !== undefined && (typeof req.body.description !== "string" || req.body.description.length > 1000)) {
    errors.description = "Description cannot exceed 1000 characters";
  }
  if (req.body.avatar !== undefined && typeof req.body.avatar !== "string") {
    errors.avatar = "Avatar must be a URL string";
  }
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  try {
    const project = await updateProject({
      projectId: req.project._id,
      updates: req.body,
    });
    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: { project },
    });
  } catch (error) {
    return res.status(error.message === "Project not found" ? 404 : 500).json({
      success: false,
      message: error.message || "Failed to update project",
    });
  }
};

const getProjectMembersController = async (req, res) => {
  try {
    const members = await getProjectMembers(req.project._id);
    return res.status(200).json({
      success: true,
      data: { members },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch project members",
    });
  }
};

const addProjectMemberController = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!["MEMBER", "VIEWER"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be MEMBER or VIEWER",
      });
    }

    const membership = await addProjectMember({
      projectId: req.project._id,
      userId,
      role,
    });

    return res.status(201).json({
      success: true,
      message: "Project member added successfully",
      data: { membership },
    });
  } catch (error) {
    const clientErrors = [
      "Project not found",
      "User is not an active member of this organization",
      "User is already a member of this project",
      "Invalid project role",
    ];

    if (clientErrors.includes(error.message)) {
      const status = error.message === "Project not found" ? 404 : 400;

      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Project membership already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add project member",
    });
  }
};

const updateProjectMemberRoleController = async (
  req,
  res
) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    const membership = await updateProjectMemberRole({
      projectId: req.project._id,
      memberId: req.params.memberId,
      role,
    });

    return res.status(200).json({
      success: true,
      message: "Project member role updated successfully",
      data: { membership },
    });
  } catch (error) {
    const clientErrors = [
      "Invalid project role",
      "Project member not found",
    ];

    if (clientErrors.includes(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update project member role",
    });
  }
};

const removeProjectMemberController = async (req, res) => {
  try {
    const membership = await removeProjectMember({
      projectId: req.project._id,
      memberId: req.params.memberId,
      currentUserId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Project member removed successfully",
      data: { membership },
    });
  } catch (error) {
    const clientErrors = [
      "Project member not found",
      "Cannot remove the last project admin",
    ];

    if (clientErrors.includes(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to remove project member",
    });
  }
};

module.exports = {
  createProjectController,
  getProjectDetailsController,
  updateProjectController,
  getMyProjectsController,
  getProjectMembersController,
  addProjectMemberController,
  updateProjectMemberRoleController,
  removeProjectMemberController
};
