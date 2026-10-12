const {
  createIssue,
} = require("../services/issue.service");

const {
  validateCreateIssue,
} = require("../validators/issue.validator");

const createIssueController = async (req, res) => {
  try {
    const errors = validateCreateIssue(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const issue = await createIssue({
      projectId: req.project._id,
      reporterId: req.user._id,
      title: req.body.title,
      description: req.body.description,
      type: req.body.type || "TASK",
      priority: req.body.priority || "MEDIUM",
      assigneeId: req.body.assigneeId,
      parentIssueId: req.body.parentIssueId,
      labels: req.body.labels,
      dueDate: req.body.dueDate,
      estimate: req.body.estimate,
    });

    return res.status(201).json({
      success: true,
      message: "Issue created successfully",
      data: { issue },
    });
  } catch (error) {
    const clientErrors = [
      "Project not found",
      "Invalid assignee ID",
      "Assignee must be an active project member",
      "Assignee must be an active organization member",
      "Invalid parent issue ID",
      "Only sub-tasks can have a parent issue",
      "Parent issue not found in this project",
      "A sub-task cannot be the parent of another sub-task",
      "A parent issue is required for sub-tasks",
    ];

    if (clientErrors.includes(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Issue key conflict. Please retry.",
      });
    }

    console.error("Create issue error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create issue",
    });
  }
};

module.exports = {
  createIssueController,
};