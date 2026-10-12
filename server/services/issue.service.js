const mongoose = require("mongoose");

const Issue = require("../models/Issue");
const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const OrganizationMember = require("../models/OrganizationMember");

const createIssue = async ({
  projectId,
  reporterId,
  title,
  description,
  type,
  priority,
  assigneeId,
  parentIssueId,
  labels,
  dueDate,
  estimate,
}) => {
  // 1. Verify project exists and is active
  const project = await Project.findOne({
    _id: projectId,
    status: "ACTIVE",
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // 2. Validate assignee if supplied
  if (assigneeId) {
    if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
      throw new Error("Invalid assignee ID");
    }

    const assigneeMembership = await ProjectMember.findOne({
      project: projectId,
      user: assigneeId,
      status: "ACTIVE",
    });

    if (!assigneeMembership) {
      throw new Error("Assignee must be an active project member");
    }

    const organizationMembership = await OrganizationMember.findOne({
      organization: project.organization,
      user: assigneeId,
      status: "ACTIVE",
    });

    if (!organizationMembership) {
      throw new Error("Assignee must be an active organization member");
    }
  }

  // 3. Validate parent issue, if supplied
  if (parentIssueId) {
    if (!mongoose.Types.ObjectId.isValid(parentIssueId)) {
      throw new Error("Invalid parent issue ID");
    }

    if (type !== "SUB_TASK") {
      throw new Error("Only sub-tasks can have a parent issue");
    }

    const parentIssue = await Issue.findOne({
      _id: parentIssueId,
      project: projectId,
      archivedAt: null,
    });

    if (!parentIssue) {
      throw new Error("Parent issue not found in this project");
    }

    if (parentIssue.type === "SUB_TASK") {
      throw new Error("A sub-task cannot be the parent of another sub-task");
    }
  } else if (type === "SUB_TASK") {
    throw new Error("A parent issue is required for sub-tasks");
  }

  // 4. Atomically reserve the next issue number
  const updatedProject = await Project.findOneAndUpdate(
    {
      _id: projectId,
      status: "ACTIVE",
    },
    {
      $inc: { issueCounter: 1 },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedProject) {
    throw new Error("Project not found");
  }

  const issueNumber = updatedProject.issueCounter;
  const issueKey = `${updatedProject.key}-${issueNumber}`;

  // 5. Create issue
  const issue = await Issue.create({
    organization: updatedProject.organization,
    project: updatedProject._id,
    issueNumber,
    issueKey,
    title: title.trim(),
    description: description?.trim() || "",
    type,
    priority: priority || "MEDIUM",
    reporter: reporterId,
    assignee: assigneeId || null,
    parentIssue: parentIssueId || null,
    labels: labels || [],
    dueDate: dueDate || null,
    estimate: estimate ?? null,
  });

  return issue;
};

module.exports = {
  createIssue,
};
