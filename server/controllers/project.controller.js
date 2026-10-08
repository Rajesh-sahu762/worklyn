const {
  createProject,
} = require("../services/project.service");

const {
  validateCreateProject,
} = require("../validators/project.validator");

const createProjectController = async (req, res) => {
  try {
    const errors = validateCreateProject(
      req.body
    );

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const {
      name,
      key,
      slug,
      description,
      projectType,
      lead,
    } = req.body;

    const project = await createProject({
      organizationId:
        req.params.organizationId,

      name,
      key,
      slug,
      description,

      projectType:
        projectType || "SCRUM",

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
      error.message ===
        "Project key already exists in this organization" ||
      error.message ===
        "Project slug already exists in this organization"
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

module.exports = {
  createProjectController,
};