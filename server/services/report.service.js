const Issue = require("../models/Issue");

const reportProjectSummary = async (projectId) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const filter = { project: projectId, archivedAt: null };

  const [total, overdue, completedLast7Days, statusGroups, priorityGroups] = await Promise.all([
    Issue.countDocuments(filter),
    Issue.countDocuments({ ...filter, status: { $ne: "DONE" }, dueDate: { $lt: now } }),
    Issue.countDocuments({ ...filter, status: "DONE", updatedAt: { $gte: weekAgo } }),
    Issue.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Issue.aggregate([
      { $match: filter },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
  ]);

  const statuses = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
  const priorities = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"];
  const toBreakdown = (keys, groups) => Object.fromEntries(
    keys.map((key) => [key, groups.find((item) => item._id === key)?.count ?? 0])
  );

  return {
    total,
    overdue,
    completedLast7Days,
    statusBreakdown: toBreakdown(statuses, statusGroups),
    priorityBreakdown: toBreakdown(priorities, priorityGroups),
    generatedAt: now,
  };
};

module.exports = { reportProjectSummary };
