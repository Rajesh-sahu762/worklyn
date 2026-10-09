const mongoose = require("mongoose");

const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const OrganizationMember = require("../models/OrganizationMember");

const projectAccess = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      status: "ACTIVE",
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Verify organization membership as well
    const organizationMembership = await OrganizationMember.findOne({
      organization: project.organization,
      user: req.user._id,
      status: "ACTIVE",
    });

    if (!organizationMembership) {
      return res.status(403).json({
        success: false,
        message: "Organization access denied",
      });
    }

    const membership = await ProjectMember.findOne({
      project: project._id,
      user: req.user._id,
      status: "ACTIVE",
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this project",
      });
    }

    req.project = project;
    req.projectMembership = membership;
    req.organizationMembership = organizationMembership;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify project access",
    });
  }
};

module.exports = projectAccess;
