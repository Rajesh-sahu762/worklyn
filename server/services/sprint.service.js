const Sprint = require("../models/Sprint");
const Project = require("../models/Project");
const Issue = require("../models/Issue");

const ensureScrumProject = async (projectId) => {
  const project = await Project.findOne({ _id: projectId, status: "ACTIVE" });
  if (!project) throw new Error("Project not found");
  if (project.projectType !== "SCRUM") throw new Error("Sprint management is only available for SCRUM projects");
  return project;
};

const listSprints = async (projectId) => Sprint.find({ project: projectId })
  .populate("createdBy", "firstName lastName email")
  .sort({ status: 1, createdAt: -1 })
  .lean();

const createSprint = async ({ projectId, userId, name, goal = "", startDate, endDate }) => {
  await ensureScrumProject(projectId);
  return Sprint.create({
    project: projectId,
    createdBy: userId,
    name: name.trim(),
    goal: goal.trim(),
    startDate: startDate || null,
    endDate: endDate || null,
    status: "PLANNED",
  });
};

const updateSprint = async ({ projectId, sprintId, updates }) => {
  const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
  if (!sprint) throw new Error("Sprint not found");
  if (sprint.status !== "PLANNED") throw new Error("Only planned sprints can be edited");
  if (updates.name !== undefined) sprint.name = updates.name.trim();
  if (updates.goal !== undefined) sprint.goal = updates.goal.trim();
  if (updates.startDate !== undefined) sprint.startDate = updates.startDate || null;
  if (updates.endDate !== undefined) sprint.endDate = updates.endDate || null;
  await sprint.save();
  return sprint;
};

const startSprint = async ({ projectId, sprintId }) => {
  await ensureScrumProject(projectId);
  const active = await Sprint.findOne({ project: projectId, status: "ACTIVE" });
  if (active) throw new Error("Another sprint is already active");
  const sprint = await Sprint.findOne({ _id: sprintId, project: projectId, status: "PLANNED" });
  if (!sprint) throw new Error("Planned sprint not found");
  if (sprint.startDate && sprint.endDate && sprint.endDate <= sprint.startDate) {
    throw new Error("Sprint end date must be after its start date");
  }
  sprint.status = "ACTIVE";
  sprint.startedAt = new Date();
  await sprint.save();
  return sprint;
};

const completeSprint = async ({ projectId, sprintId }) => {
  const sprint = await Sprint.findOne({ _id: sprintId, project: projectId, status: "ACTIVE" });
  if (!sprint) throw new Error("Active sprint not found");

  await Issue.updateMany(
    { project: projectId, sprint: sprintId, status: { $ne: "DONE" }, archivedAt: null },
    { $set: { status: "BACKLOG", sprint: null } }
  );

  sprint.status = "COMPLETED";
  sprint.completedAt = new Date();
  await sprint.save();
  return sprint;
};

const assignIssueToSprint = async ({ projectId, issueId, sprintId }) => {
  const issue = await Issue.findOne({ _id: issueId, project: projectId, archivedAt: null });
  if (!issue) throw new Error("Issue not found");

  if (sprintId) {
    const sprint = await Sprint.findOne({
      _id: sprintId,
      project: projectId,
      status: { $in: ["PLANNED", "ACTIVE"] },
    });
    if (!sprint) throw new Error("Target sprint not found or already completed");
    issue.sprint = sprint._id;
  } else {
    issue.sprint = null;
  }

  await issue.save();
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
