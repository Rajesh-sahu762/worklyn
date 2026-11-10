const Notification = require("../models/Notification");
const User = require("../models/user");

let notificationIo = null;
const setNotificationIo = (io) => {
  notificationIo = io;
};

const createNotifications = async (items = []) => {
  const candidates = items.filter((item) =>
    item.recipientId && String(item.recipientId) !== String(item.actorId)
  );
  if (!candidates.length) return;

  try {
    const recipientIds = [...new Set(candidates.map((item) => String(item.recipientId)))];
    const users = await User.find({ _id: { $in: recipientIds } })
      .select("preferences")
      .lean();
    const preferenceByUser = new Map(
      users.map((user) => [String(user._id), user.preferences?.notifications ?? {}])
    );
    const valid = candidates.filter(
      (item) =>
        preferenceByUser.has(String(item.recipientId)) &&
        preferenceByUser.get(String(item.recipientId))?.[item.type] !== false
    );
    if (!valid.length) return;

    // Persist first so live clients never receive a notification missing from the inbox.
    const created = await Notification.insertMany(valid.map((item) => ({
      recipient: item.recipientId,
      actor: item.actorId || null,
      organization: item.organizationId,
      project: item.projectId,
      issue: item.issueId,
      type: item.type,
      message: item.message,
    })), { ordered: false });

    if (notificationIo && created.length) {
      try {
        const populated = await Notification.populate(created, [
          { path: "actor", select: "firstName lastName profileImage" },
          { path: "project", select: "name key" },
          { path: "issue", select: "title issueKey status" },
        ]);

        for (const notification of populated) {
          notificationIo
            .to(`user:${String(notification.recipient)}`)
            .emit("notification:new", notification);
        }
      } catch (emitError) {
        // The database write already succeeded; keep it durable and let the
        // client's REST hydration recover if population or socket delivery fails.
        console.error("Notification delivery failed:", emitError.message);
      }
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
  setNotificationIo,
  createNotifications,
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
};
