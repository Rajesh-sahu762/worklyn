const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const {
  listNotificationsController,
  unreadCountController,
  markNotificationReadController,
  markAllNotificationsReadController,
} = require("../controllers/notification.controller");

router.get("/notifications/unread-count", authenticate, unreadCountController);
router.get("/notifications", authenticate, listNotificationsController);
router.patch("/notifications/read-all", authenticate, markAllNotificationsReadController);
router.patch("/notifications/:notificationId/read", authenticate, markNotificationReadController);

module.exports = router;
