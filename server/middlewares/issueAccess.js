const mongoose = require("mongoose");
const Issue = require("../models/Issue");
const ProjectMember = require("../models/ProjectMember");
const OrganizationMember = require("../models/OrganizationMember");

const issueAccess = async (req, res, next) => {
  try {
    const { issueId } = req.params;

    if (!mongoose.isValidObjectId(issueId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue ID",
      });
    }

    const issue = await Issue.findOne({
      _id: issueId,
      archivedAt: null,
    }).lean();

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const [projectMembership, organizationMembership] =
      await Promise.all([
        ProjectMember.findOne({
          project: issue.project,
          user: req.user._id,
          status: "ACTIVE",
        }),
        OrganizationMember.findOne({
          organization: issue.organization,
          user: req.user._id,
          status: "ACTIVE",
        }),
      ]);

    if (!projectMembership || !organizationMembership) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this issue",
      });
    }

    req.issue = issue;
    next();
  } catch (error) {
    console.error("Issue access error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify issue access",
    });
  }
};

module.exports = issueAccess;