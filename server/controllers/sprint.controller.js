const {
  listSprints,
  createSprint,
  updateSprint,
  startSprint,
  completeSprint,
  assignIssueToSprint,
} = require("../services/sprint.service");

const clientErrors = [
  "Project not found",
  "Sprint management is only available for SCRUM projects",
  "Sprint not found",
  "Only planned sprints can be edited",
  "Another sprint is already active",
  "Planned sprint not found",
  "Active sprint not found",
  "Sprint end date must be after its start date",
  "Issue not found",
  "Target sprint not found or already completed",
];

const fail = (res, error) => res.status(
  error.code === 11000 ? 409 : clientErrors.includes(error.message) ? 400 : 500
).json({
  success: false,
  message: error.code === 11000 ? "Another sprint is already active" : error.message || "Sprint request failed",
});

const listSprintsController = async (req, res) => {
  try {
    const sprints = await listSprints(req.project._id);
    return res.status(200).json({ success: true, data: { sprints } });
  } catch (error) { return fail(res, error); }
};

const createSprintController = async (req, res) => {
  const { name, goal = "", startDate, endDate } = req.body ?? {};
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ success: false, message: "Sprint name must be between 2 and 100 characters" });
  }
  if (typeof goal !== "string" || goal.length > 500) {
    return res.status(400).json({ success: false, message: "Sprint goal cannot exceed 500 characters" });
  }
  const validDate = (value) => value === undefined || value === null || value === "" || (typeof value === "string" && !Number.isNaN(Date.parse(value)));
  if (!validDate(startDate) || !validDate(endDate)) {
    return res.status(400).json({ success: false, message: "Invalid sprint dates" });
  }
  if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
    return res.status(400).json({ success: false, message: "Sprint end date must be after its start date" });
  }
  try {
    const sprint = await createSprint({ projectId: req.project._id, userId: req.user._id, name, goal, startDate, endDate });
    return res.status(201).json({ success: true, data: { sprint } });
  } catch (error) { return fail(res, error); }
};

const updateSprintController = async (req, res) => {
  const allowed = ["name", "goal", "startDate", "endDate"];
  const keys = Object.keys(req.body ?? {});
  if (!keys.length || keys.some((key) => !allowed.includes(key))) {
    return res.status(400).json({ success: false, message: "Provide valid sprint fields to update" });
  }
  if (req.body.name !== undefined && (typeof req.body.name !== "string" || req.body.name.trim().length < 2 || req.body.name.trim().length > 100)) {
    return res.status(400).json({ success: false, message: "Sprint name must be between 2 and 100 characters" });
  }
  if (req.body.goal !== undefined && (typeof req.body.goal !== "string" || req.body.goal.length > 500)) {
    return res.status(400).json({ success: false, message: "Sprint goal cannot exceed 500 characters" });
  }
  const validDate = (value) => value === null || value === "" || (typeof value === "string" && !Number.isNaN(Date.parse(value)));
  if (req.body.startDate !== undefined && !validDate(req.body.startDate)) return res.status(400).json({ success: false, message: "Invalid sprint start date" });
  if (req.body.endDate !== undefined && !validDate(req.body.endDate)) return res.status(400).json({ success: false, message: "Invalid sprint end date" });
  const start = req.body.startDate ?? null;
  const end = req.body.endDate ?? null;
  if (start && end && new Date(end) <= new Date(start)) return res.status(400).json({ success: false, message: "Sprint end date must be after its start date" });
  try {
    const sprint = await updateSprint({ projectId: req.project._id, sprintId: req.params.sprintId, updates: req.body });
    return res.status(200).json({ success: true, data: { sprint } });
  } catch (error) { return fail(res, error); }
};

const startSprintController = async (req, res) => {
  try {
    const sprint = await startSprint({ projectId: req.project._id, sprintId: req.params.sprintId });
    return res.status(200).json({ success: true, data: { sprint } });
  } catch (error) { return fail(res, error); }
};

const completeSprintController = async (req, res) => {
  try {
    const sprint = await completeSprint({ projectId: req.project._id, sprintId: req.params.sprintId });
    return res.status(200).json({ success: true, data: { sprint } });
  } catch (error) { return fail(res, error); }
};

const assignIssueToSprintController = async (req, res) => {
  const { sprintId = null } = req.body ?? {};
  if (sprintId !== null && (typeof sprintId !== "string" || !/^[a-f\d]{24}$/i.test(sprintId))) {
    return res.status(400).json({ success: false, message: "Invalid sprint ID" });
  }
  try {
    const issue = await assignIssueToSprint({ projectId: req.project._id, issueId: req.params.issueId, sprintId });
    return res.status(200).json({ success: true, data: { issue } });
  } catch (error) { return fail(res, error); }
};

module.exports = {
  listSprintsController,
  createSprintController,
  updateSprintController,
  startSprintController,
  completeSprintController,
  assignIssueToSprintController,
};
