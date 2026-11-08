const Notification = require("../models/Notification");
const User = require("../models/user");
const Issue = require("../models/Issue");
const Project = require("../models/Project");
const { sendIssueNotificationEmail } = require("./email.service");

const createNotifications = async (items = []) => {
  const candidates = items.filter((item) =>
    item.recipientId && String(item.recipientId) !== String(item.actorId)
  );
  if (!candidates.length) return;

  try {
    const recipientIds = [...new Set(candidates.map((item) => String(item.recipientId)))];
    const users = await User.find({ _id: { $in: recipientIds } })
      .select("preferences email firstName lastName")
      .lean();
    const preferenceByUser = new Map(
      users.map((user) => [String(user._id), user.preferences?.notifications ?? {}])
    );
    const valid = candidates.filter(
      (item) => preferenceByUser.get(String(item.recipientId))?.[item.type] !== false
    );
    if (!valid.length) return;

    await Notification.insertMany(valid.map((item) => ({
      recipient: item.recipientId,
      actor: item.actorId || null,
      organization: item.organizationId,
      project: item.projectId,
      issue: item.issueId,
      type: item.type,
      message: item.message,
    })), { ordered: false });

    const emailItems = valid.filter((item) =>
      ["ISSUE_ASSIGNED", "ISSUE_COMMENTED"].includes(item.type)
    );
    if (emailItems.length) {
      const [issues, projects, actors] = await Promise.all([
        Issue.find({ _id: { $in: emailItems.map((item) => item.issueId) } })
          .select("issueKey title project").lean(),
        Project.find({ _id: { $in: emailItems.map((item) => item.projectId) } })
          .select("name").lean(),
        User.find({ _id: { $in: emailItems.map((item) => item.actorId).filter(Boolean) } })
          .select("firstName lastName").lean(),
      ]);
      const issueById = new Map(issues.map((issue) => [String(issue._id), issue]));
      const projectById = new Map(projects.map((project) => [String(project._id), project]));
      const actorById = new Map(actors.map((actor) => [String(actor._id), actor]));
      const userById = new Map(users.map((user) => [String(user._id), user]));
      await Promise.allSettled(emailItems.map((item) => {
        const recipient = userById.get(String(item.recipientId));
        const issue = issueById.get(String(item.issueId));
        const project = projectById.get(String(item.projectId));
        const actor = actorById.get(String(item.actorId));
        if (!recipient?.email || !issue) return Promise.resolve();
        return sendIssueNotificationEmail({
          to: recipient.email,
          firstName: recipient.firstName,
          actorName: actor ? `${actor.firstName} ${actor.lastName}`.trim() : "A teammate",
          issueKey: issue.issueKey,
          issueTitle: issue.title,
          projectName: project?.name || "your project",
          type: item.type,
          projectId: item.projectId,
          issueId: item.issueId,
        });
      }));
    }
  } catch (error) {
    // Notifications are best-effort side effects; never fail issue/comment writes.
    console.error("Notification creation failed:", error.message);
  }
};

const listNotifications = async ({ userId, page = 1, limit = 20 }) => {
  const filter = { recipient: userId };
  const skip = (page - 1) * limit;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate("actor", "firstName lastName profileImage")
      .populate("project", "name key")
      .populate("issue", "title issueKey status")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, readAt: null }),
  ]);
  return {
    notifications,
    unreadCount,
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

const getUnreadNotificationCount = (userId) =>
  Notification.countDocuments({ recipient: userId, readAt: null });

const markNotificationRead = async ({ userId, notificationId }) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!notification) {
    const existing = await Notification.exists({ _id: notificationId, recipient: userId });
    if (!existing) throw new Error("Notification not found");
  }
  return notification;
};

const markAllNotificationsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return result.modifiedCount ?? result.nModified ?? 0;
};

module.exports = {
  createNotifications,
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
};
