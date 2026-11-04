const mongoose = require("mongoose");

const Issue = require("../models/Issue");
const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const OrganizationMember = require("../models/OrganizationMember");
const Team = require("../models/Team");
const TeamMember = require("../models/TeamMember");
const Sprint = require("../models/Sprint");
const { createNotifications } = require("./notification.service");

const createIssue = async ({
  projectId, reporterId, title, description, type, priority, status,
  assigneeId, assigneeTeamId, sprintId, parentIssueId, labels, dueDate, estimate,
}) => {
  const project = await Project.findOne({ _id: projectId, status: "ACTIVE" });
  if (!project) throw new Error("Project not found");

  let teamRecipients = [];
  if (assigneeId) {
    if (!mongoose.isValidObjectId(assigneeId)) throw new Error("Invalid assignee ID");
    const [projectMembership, organizationMembership] = await Promise.all([
      ProjectMember.findOne({ project: projectId, user: assigneeId, status: "ACTIVE" }),
      OrganizationMember.findOne({ organization: project.organization, user: assigneeId, status: "ACTIVE" }),
    ]);
    if (!projectMembership || !organizationMembership) throw new Error("Assignee must be an active project and organization member");
  }
  if (assigneeTeamId) {
    if (!mongoose.isValidObjectId(assigneeTeamId)) throw new Error("Invalid team ID");
    const attached = (project.teams || []).some(id => String(id) === String(assigneeTeamId));
    const team = await Team.findOne({ _id: assigneeTeamId, organization: project.organization, isActive: true });
    if (!attached || !team) throw new Error("Team must be active and assigned to this project");
    const members = await TeamMember.find({ team: assigneeTeamId, status: "ACTIVE" }).select("user").lean();
    const ids = members.map(m => m.user);
    const memberships = ids.length ? await ProjectMember.find({
      project: projectId, user: { $in: ids }, status: "ACTIVE",
    }).select("user").lean() : [];
    teamRecipients = memberships.map(m => m.user);
    if (!teamRecipients.length) throw new Error("Selected team has no active project members");
  }
  if (assigneeId && assigneeTeamId) throw new Error("Choose an individual or a team, not both");

  if (sprintId) {
    if (!mongoose.isValidObjectId(sprintId)) throw new Error("Invalid sprint ID");
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId, status: { $ne: "COMPLETED" } });
    if (!sprint) throw new Error("Sprint must belong to this project and be active or planned");
  }

  if (parentIssueId) {
    if (!mongoose.isValidObjectId(parentIssueId)) throw new Error("Invalid parent issue ID");
    if (type !== "SUB_TASK") throw new Error("Only sub-tasks can have a parent issue");
    const parentIssue = await Issue.findOne({ _id: parentIssueId, project: projectId, archivedAt: null });
    if (!parentIssue) throw new Error("Parent issue not found in this project");
    if (parentIssue.type === "SUB_TASK") throw new Error("A sub-task cannot be the parent of another sub-task");
  } else if (type === "SUB_TASK") {
    throw new Error("A parent issue is required for sub-tasks");
  }

  const updatedProject = await Project.findOneAndUpdate(
    { _id: projectId, status: "ACTIVE" }, { $inc: { issueCounter: 1 } },
    { new: true, runValidators: true },
  );
  if (!updatedProject) throw new Error("Project not found");

  const [issue] = await Issue.create([{
    organization: updatedProject.organization, project: updatedProject._id,
    issueNumber: updatedProject.issueCounter, issueKey: `${updatedProject.key}-${updatedProject.issueCounter}`,
    title: title.trim(), description: description?.trim() || "", type,
    priority: priority || "MEDIUM", status: status || "TODO", reporter: reporterId,
    assignee: assigneeId || null, assigneeTeam: assigneeTeamId || null,
    sprint: sprintId || null, parentIssue: parentIssueId || null,
    labels: (labels || []).map(label => label.trim()), dueDate: dueDate || null,
    estimate: estimate ?? null,
  }]);

  const recipients = assigneeId ? [assigneeId] : teamRecipients;
  if (recipients.length) await createNotifications(recipients.map(recipientId => ({
    recipientId, actorId: reporterId, organizationId: issue.organization,
    projectId: issue.project, issueId: issue._id, type: "ISSUE_ASSIGNED",
    message: `${issue.issueKey} was assigned to ${assigneeId ? "you" : "your team"}`,
  })));
  return Issue.findById(issue._id)
    .populate("reporter", "firstName lastName email profileImage")
    .populate("assignee", "firstName lastName email profileImage")
    .populate("assigneeTeam", "name")
    .populate("sprint", "name status")
    .lean();
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
  sprint,
}) => {
  const filter = {
    project: projectId,
    archivedAt: null,
  };

  // Allowlisted filters only
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (priority) filter.priority = priority;

  if (sprint === "none") {
    filter.sprint = null;
  } else if (sprint) {
    if (!mongoose.isValidObjectId(sprint)) throw new Error("Invalid sprint ID");
    filter.sprint = sprint;
  }

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
      .populate("assigneeTeam", "name")
      .populate("sprint", "name status")
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
    .populate("assigneeTeam", "name")
    .populate("sprint", "name status")
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
    "assigneeTeam",
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

  if (updates.assigneeTeam !== undefined && updates.assigneeTeam !== null && updates.assigneeTeam !== "") {
    if (!mongoose.isValidObjectId(updates.assigneeTeam)) {
      const error = new Error("Invalid team ID"); error.statusCode = 400; throw error;
    }
    const project = await Project.findOne({ _id: projectId, status: "ACTIVE" }).select("organization teams").lean();
    const attached = (project?.teams || []).some(id => String(id) === String(updates.assigneeTeam));
    const team = await Team.findOne({ _id: updates.assigneeTeam, organization: issue.organization, isActive: true });
    if (!attached || !team) {
      const error = new Error("Team must be active and assigned to this project"); error.statusCode = 400; throw error;
    }
    const members = await TeamMember.find({ team: updates.assigneeTeam, status: "ACTIVE" }).select("user").lean();
    const memberIds = members.map(member => member.user);
    const eligible = memberIds.length ? await ProjectMember.countDocuments({ project: projectId, user: { $in: memberIds }, status: "ACTIVE" }) : 0;
    if (!eligible) {
      const error = new Error("Selected team has no active project members"); error.statusCode = 400; throw error;
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

    if ((field === "assignee" || field === "assigneeTeam") && (newValue === "" || newValue === null)) {
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

    if ((field === "assignee" || field === "assigneeTeam") && (value === "" || value === null)) {
      value = null;
    }

    if (field === "dueDate" && value !== null) {
      value = new Date(value);
    }

    issue[field] = value;
    if (field === "assignee" && value) issue.assigneeTeam = null;
    if (field === "assigneeTeam" && value) issue.assignee = null;
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

  const notifications = [];
  if (changes.some((change) => change.field === "status")) {
    for (const recipientId of [issue.assignee, issue.reporter]) {
      notifications.push({
        recipientId,
        actorId: userId,
        organizationId: issue.organization,
        projectId: issue.project,
        issueId: issue._id,
        type: "ISSUE_STATUS_CHANGED",
        message: `${issue.issueKey} moved to ${issue.status.replaceAll("_", " ").toLowerCase()}`,
      });
    }
  }
  if (changes.some((change) => change.field === "assigneeTeam") && issue.assigneeTeam) {
    const members = await TeamMember.find({ team: issue.assigneeTeam, status: "ACTIVE" }).select("user").lean();
    const ids = members.map(member => member.user);
    const projectMembers = ids.length ? await ProjectMember.find({ project: projectId, user: { $in: ids }, status: "ACTIVE" }).select("user").lean() : [];
    for (const member of projectMembers) notifications.push({ recipientId: member.user, actorId: userId, organizationId: issue.organization, projectId: issue.project, issueId: issue._id, type: "ISSUE_ASSIGNED", message: `Your team was assigned ${issue.issueKey}` });
  }
  if (changes.some((change) => change.field === "assignee") && issue.assignee) {
    notifications.push({
      recipientId: issue.assignee,
      actorId: userId,
      organizationId: issue.organization,
      projectId: issue.project,
      issueId: issue._id,
      type: "ISSUE_ASSIGNED",
      message: `You were assigned ${issue.issueKey}`,
    });
  }
  await createNotifications(notifications);

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
