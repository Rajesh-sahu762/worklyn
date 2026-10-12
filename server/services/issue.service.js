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

const getProjectIssues = async ({
  projectId,
  page = 1,
  limit = 10,
  status,
  type,
  priority,
  assignee,
  search,
}) => {
  const filter = {
    project: projectId,
    archivedAt: null,
  };

  // Allowlisted filters only
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (priority) filter.priority = priority;

  if (assignee === "unassigned") {
    filter.assignee = null;
  } else if (assignee) {
    if (!mongoose.isValidObjectId(assignee)) {
      throw new Error("Invalid assignee ID");
    }

    filter.assignee = assignee;
  }

  // Search by title or issue key
  if (search) {
    const escapedSearch = search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const searchRegex = new RegExp(escapedSearch, "i");

    filter.$or = [
      { title: searchRegex },
      { issueKey: searchRegex },
    ];
  }

  const skip = (page - 1) * limit;

  const [issues, total] = await Promise.all([
    Issue.find(filter)
      .populate("reporter", "firstName lastName email")
      .populate("assignee", "firstName lastName email profileImage")
      .populate("parentIssue", "issueKey title")
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Issue.countDocuments(filter),
  ]);

  return {
    issues,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

const getIssueById = async ({ issueId, userId }) => {
  if (!mongoose.isValidObjectId(issueId)) {
    const error = new Error("Invalid issue ID");
    error.statusCode = 400;
    throw error;
  }

  const issue = await Issue.findOne({
    _id: issueId,
    archivedAt: null,
  })
    .populate("reporter", "firstName lastName email profileImage")
    .populate("assignee", "firstName lastName email profileImage")
    .populate("parentIssue", "issueKey title type status")
    .lean();

  if (!issue) {
    const error = new Error("Issue not found");
    error.statusCode = 404;
    throw error;
  }

  const [projectMembership, organizationMembership] =
    await Promise.all([
      ProjectMember.findOne({
        project: issue.project,
        user: userId,
        status: "ACTIVE",
      }).lean(),

      OrganizationMember.findOne({
        organization: issue.organization,
        user: userId,
        status: "ACTIVE",
      }).lean(),
    ]);

  if (!projectMembership || !organizationMembership) {
    const error = new Error("You do not have access to this issue");
    error.statusCode = 403;
    throw error;
  }

  return issue;
};

const STATUS_TRANSITIONS = {
  BACKLOG: ["TODO"],
  TODO: ["BACKLOG", "IN_PROGRESS"],
  IN_PROGRESS: ["TODO", "IN_REVIEW"],
  IN_REVIEW: ["IN_PROGRESS", "DONE"],
  DONE: ["IN_REVIEW"],
};

const updateIssue = async ({
  issueId,
  projectId,
  userId,
  userRole,
  updates,
}) => {
  const allowedFields = [
    "title",
    "description",
    "status",
    "priority",
    "type",
    "assignee",
    "labels",
    "dueDate",
    "estimate",
  ];

  // 1. Permission check
  if (userRole === "VIEWER") {
    const error = new Error("Viewers cannot update issues");
    error.statusCode = 403;
    throw error;
  }

  // 2. Validate requested fields
  const fields = Object.keys(updates);

  if (
    fields.length === 0 ||
    fields.some((field) => !allowedFields.includes(field))
  ) {
    const error = new Error("Invalid or empty update fields");
    error.statusCode = 400;
    throw error;
  }

  // 3. Find issue inside the authorized project
  const issue = await Issue.findOne({
    _id: issueId,
    project: projectId,
    archivedAt: null,
  });

  if (!issue) {
    const error = new Error("Issue not found");
    error.statusCode = 404;
    throw error;
  }

  // 4. Validate status transition
  if (
    updates.status !== undefined &&
    updates.status !== issue.status &&
    !STATUS_TRANSITIONS[issue.status]?.includes(updates.status)
  ) {
    const error = new Error(
      `Cannot change status from ${issue.status} to ${updates.status}`
    );

    error.statusCode = 400;
    throw error;
  }

  // 5. Validate assignee without modifying the issue yet
  if (updates.assignee !== undefined) {
    if (updates.assignee !== null && updates.assignee !== "") {
      if (!mongoose.isValidObjectId(updates.assignee)) {
        const error = new Error("Invalid assignee ID");
        error.statusCode = 400;
        throw error;
      }

      const membership = await ProjectMember.findOne({
        project: projectId,
        user: updates.assignee,
        status: "ACTIVE",
      });

      if (!membership) {
        const error = new Error(
          "Assignee must be an active project member"
        );
        error.statusCode = 400;
        throw error;
      }

      const organizationMembership =
        await OrganizationMember.findOne({
          organization: issue.organization,
          user: updates.assignee,
          status: "ACTIVE",
        });

      if (!organizationMembership) {
        const error = new Error(
          "Assignee is not an active organization member"
        );
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // 6. Normalize values for accurate activity comparison
  const normalize = (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map(normalize);
    }

    if (typeof value === "object" && value.toHexString) {
      return value.toHexString();
    }

    return value;
  };

  const changes = [];

  // Capture old values BEFORE modifying the issue
  for (const field of fields) {
    let newValue = updates[field];

    if (field === "assignee" && (newValue === "" || newValue === null)) {
      newValue = null;
    }

    if (field === "dueDate" && newValue !== null) {
      newValue = new Date(newValue);
    }

    const oldValue = issue[field];

    if (
      JSON.stringify(normalize(oldValue)) !==
      JSON.stringify(normalize(newValue))
    ) {
      changes.push({
        field,
        from: normalize(oldValue),
        to: normalize(newValue),
      });
    }
  }

  // 7. Apply changes only after capturing history
  for (const field of fields) {
    let value = updates[field];

    if (field === "assignee" && (value === "" || value === null)) {
      value = null;
    }

    if (field === "dueDate" && value !== null) {
      value = new Date(value);
    }

    issue[field] = value;
  }

  await issue.save();

  // 8. Record activity only when something actually changed
  if (changes.length > 0) {
    const IssueActivity = require("../models/IssueActivity");

    await IssueActivity.create({
      organization: issue.organization,
      project: issue.project,
      issue: issue._id,
      actor: userId,
      action: changes.some(
        (change) => change.field === "status"
      )
        ? "STATUS_CHANGED"
        : "ISSUE_UPDATED",
      changes,
    });
  }

  // 9. Return populated issue
  return Issue.findById(issue._id)
    .populate("reporter", "firstName lastName email")
    .populate("assignee", "firstName lastName email profileImage")
    .populate("parentIssue", "issueKey title type status")
    .lean();
};

module.exports = {
  createIssue,
  getProjectIssues,
  getIssueById,
  updateIssue,
};
