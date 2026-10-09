const {
  createProject,
  getProjectById,
  getUserProjects,
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

    const { name, key, slug, description, projectType, lead } = req.body;

    const project = await createProject({
      organizationId: req.params.organizationId,

      name,
      key,
      slug,
      description,

      projectType: projectType || "SCRUM",

      lead: lead || req.user._id,

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
      error.message === "Project slug already exists in this organization"
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
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
  getMyProjectsController,
  addProjectMemberController,
  updateProjectMemberRoleController,
  removeProjectMemberController
};
