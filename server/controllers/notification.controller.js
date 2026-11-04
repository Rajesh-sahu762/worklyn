const {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../services/notification.service");

const listNotificationsController = async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ success: false, message: "Page must be positive and limit must be between 1 and 50" });
  }
  try {
    const result = await listNotifications({ userId: req.user._id, page, limit });
    return res.status(200).json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load notifications" });
  }
};

const unreadCountController = async (req, res) => {
  try {
    const unreadCount = await getUnreadNotificationCount(req.user._id);
    return res.status(200).json({ success: true, data: { unreadCount } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load unread notification count" });
  }
};

const markNotificationReadController = async (req, res) => {
  try {
    const notification = await markNotificationRead({ userId: req.user._id, notificationId: req.params.notificationId });
    return res.status(200).json({ success: true, data: { notification } });
  } catch (error) {
    return res.status(error.message === "Notification not found" ? 404 : 500).json({ success: false, message: error.message || "Failed to update notification" });
  }
};

const markAllNotificationsReadController = async (req, res) => {
  try {
    const updated = await markAllNotificationsRead(req.user._id);
    return res.status(200).json({ success: true, data: { updated } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to mark notifications as read" });
  }
};

module.exports = {
  listNotificationsController,
  unreadCountController,
  markNotificationReadController,
  markAllNotificationsReadController,
};
