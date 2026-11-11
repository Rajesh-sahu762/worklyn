const Sprint = require("../models/Sprint");
const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const Issue = require("../models/Issue");
const { createNotifications } = require("./notification.service");

const ensureScrumProject = async (projectId) => {
  const project = await Project.findOne({ _id: projectId, status: "ACTIVE" });
  if (!project) throw new Error("Project not found");
  if (project.projectType !== "SCRUM") throw new Error("Sprint management is only available for SCRUM projects");
  return project;
};

const notifyProjectMembers = async ({ project, actorId, type, message }) => {
  const members = await ProjectMember.find({
    project: project._id,
    status: "ACTIVE",
  }).select("user").lean();

  await createNotifications(members.map(({ user }) => ({
    recipientId: user,
    actorId,
    organizationId: project.organization,
    projectId: project._id,
    type,
    message,
  })));
};

const listSprints = async (projectId) => Sprint.find({ project: projectId })
  .populate("createdBy", "firstName lastName email")
  .sort({ status: 1, createdAt: -1 })
  .lean();

const createSprint = async ({ projectId, userId, name, goal = "", startDate, endDate }) => {
  const project = await ensureScrumProject(projectId);
  const sprint = await Sprint.create({
    project: projectId,
    createdBy: userId,
    name: name.trim(),
    goal: goal.trim(),
    startDate: startDate || null,
    endDate: endDate || null,
    status: "PLANNED",
  });

  await notifyProjectMembers({
    project,
    actorId: userId,
    type: "SPRINT_CREATED",
    message: `Sprint ${sprint.name} was created`,
  });
  return sprint;
};

const updateSprint = async ({ projectId, sprintId, userId, updates }) => {
  const project = await ensureScrumProject(projectId);
  const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
  if (!sprint) throw new Error("Sprint not found");
  if (sprint.status !== "PLANNED") throw new Error("Only planned sprints can be edited");

  let changed = false;
  if (updates.name !== undefined && updates.name.trim() !== sprint.name) {
    sprint.name = updates.name.trim();
    changed = true;
  }
  if (updates.goal !== undefined && updates.goal.trim() !== sprint.goal) {
    sprint.goal = updates.goal.trim();
    changed = true;
  }
  if (updates.startDate !== undefined) {
    const value = updates.startDate || null;
    if (String(sprint.startDate || "") !== String(value || "")) changed = true;
    sprint.startDate = value;
  }
  if (updates.endDate !== undefined) {
    const value = updates.endDate || null;
    if (String(sprint.endDate || "") !== String(value || "")) changed = true;
    sprint.endDate = value;
  }
  if (sprint.startDate && sprint.endDate && sprint.endDate <= sprint.startDate) {
    throw new Error("Sprint end date must be after its start date");
  }
  await sprint.save();

  if (changed) {
    await notifyProjectMembers({
      project,
      actorId: userId,
      type: "SPRINT_UPDATED",
      message: `Sprint ${sprint.name} was updated`,
    });
  }
  return sprint;
};

const startSprint = async ({ projectId, sprintId, userId }) => {
  const project = await ensureScrumProject(projectId);
  const active = await Sprint.findOne({ project: projectId, status: "ACTIVE" });
  if (active) throw new Error("Another sprint is already active");
  const sprint = await Sprint.findOne({ _id: sprintId, project: projectId, status: "PLANNED" });
  if (!sprint) throw new Error("Planned sprint not found");
  if (sprint.startDate && sprint.endDate && sprint.endDate <= sprint.startDate) {
    throw new Error("Sprint end date must be after its start date");
  }

  await Issue.updateMany(
    { project: projectId, sprint: sprintId, status: "BACKLOG", archivedAt: null },
    { $set: { status: "TODO" } }
  );
  sprint.status = "ACTIVE";
  sprint.startedAt = new Date();
  await sprint.save();

  await notifyProjectMembers({
    project,
    actorId: userId,
    type: "SPRINT_STARTED",
    message: `Sprint ${sprint.name} has started`,
  });
  return sprint;
};

const completeSprint = async ({ projectId, sprintId, userId }) => {
  const project = await ensureScrumProject(projectId);
  const sprint = await Sprint.findOne({ _id: sprintId, project: projectId, status: "ACTIVE" });
  if (!sprint) throw new Error("Active sprint not found");

  await Issue.updateMany(
    { project: projectId, sprint: sprintId, status: { $ne: "DONE" }, archivedAt: null },
    { $set: { status: "BACKLOG", sprint: null } }
  );

  sprint.status = "COMPLETED";
  sprint.completedAt = new Date();
  await sprint.save();

  await notifyProjectMembers({
    project,
    actorId: userId,
    type: "SPRINT_COMPLETED",
    message: `Sprint ${sprint.name} has been completed`,
  });
  return sprint;
};

const assignIssueToSprint = async ({ projectId, issueId, sprintId, userId }) => {
  const project = await ensureScrumProject(projectId);
  const issue = await Issue.findOne({ _id: issueId, project: projectId, archivedAt: null });
  if (!issue) throw new Error("Issue not found");

  const previousSprintId = issue.sprint ? String(issue.sprint) : null;
  let targetSprint = null;

  if (sprintId) {
    targetSprint = await Sprint.findOne({
      _id: sprintId,
      project: projectId,
      status: { $in: ["PLANNED", "ACTIVE"] },
    });
    if (!targetSprint) throw new Error("Target sprint not found or already completed");
    issue.sprint = targetSprint._id;
    if (targetSprint.status === "ACTIVE" && issue.status === "BACKLOG") issue.status = "TODO";
  } else {
    issue.sprint = null;
  }

  await issue.save();

  const nextSprintId = issue.sprint ? String(issue.sprint) : null;
  if (previousSprintId !== nextSprintId) {
    const projectAdmins = await ProjectMember.find({
      project: project._id,
      role: "PROJECT_ADMIN",
      status: "ACTIVE",
    }).select("user").lean();
    const recipients = [...new Set([
      issue.reporter,
      issue.assignee,
      ...projectAdmins.map(member => member.user),
    ].filter(Boolean).map(String))];
    await createNotifications(recipients.map(recipientId => ({
      recipientId,
      actorId: userId,
      organizationId: project.organization,
      projectId: project._id,
      issueId: issue._id,
      type: targetSprint ? "SPRINT_ISSUE_ADDED" : "SPRINT_ISSUE_REMOVED",
      message: targetSprint
        ? `${issue.issueKey} was added to sprint ${targetSprint.name}`
        : `${issue.issueKey} was moved back to the backlog`,
    })));
  }

  return Issue.findById(issue._id)
    .populate("reporter", "firstName lastName email")
    .populate("assignee", "firstName lastName email profileImage")
    .lean();
};

module.exports = {
  listSprints,
  createSprint,
  updateSprint,
  startSprint,
  completeSprint,
  assignIssueToSprint,
};
