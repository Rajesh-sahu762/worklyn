const { updateProfile, updatePreferences } = require("../services/profile.service");

const updateProfileController = async (req, res) => {
  const { firstName, lastName, mobile, profileImage } = req.body ?? {};
  if (firstName !== undefined && (typeof firstName !== "string" || firstName.trim().length < 1 || firstName.trim().length > 50)) {
    return res.status(400).json({ success: false, message: "First name must be between 1 and 50 characters" });
  }
  if (lastName !== undefined && (typeof lastName !== "string" || lastName.trim().length < 1 || lastName.trim().length > 50)) {
    return res.status(400).json({ success: false, message: "Last name must be between 1 and 50 characters" });
  }
  if (mobile !== undefined && (typeof mobile !== "string" || mobile.length > 20 || (mobile && !/^\+?[0-9 ()-]{7,20}$/.test(mobile)))) {
    return res.status(400).json({ success: false, message: "Enter a valid mobile number" });
  }
  if (profileImage !== undefined) {
    if (typeof profileImage !== "string" || profileImage.length > 2048) {
      return res.status(400).json({ success: false, message: "Profile image URL is invalid" });
    }
    if (profileImage && !/^https:\/\//i.test(profileImage)) {
      return res.status(400).json({ success: false, message: "Profile image must use a secure HTTPS URL" });
    }
  }
  if (![firstName, lastName, mobile, profileImage].some((value) => value !== undefined)) {
    return res.status(400).json({ success: false, message: "No profile fields were provided" });
  }
  try {
    const user = await updateProfile({ userId: req.user._id, firstName, lastName, mobile, profileImage });
    return res.status(200).json({ success: true, message: "Profile updated successfully", data: { user } });
  } catch (error) {
    const duplicateMobile = error.code === 11000 && error.keyPattern?.mobile;
    return res.status(duplicateMobile ? 409 : error.message === "User not found" ? 404 : 500).json({
      success: false,
      message: duplicateMobile ? "This mobile number is already in use" : error.message || "Failed to update profile",
    });
  }
};

const updatePreferencesController = async (req, res) => {
  const notifications = req.body?.notifications;
  const allowed = ["ISSUE_ASSIGNED", "ISSUE_STATUS_CHANGED", "ISSUE_COMMENTED"];
  if (!notifications || typeof notifications !== "object" || Array.isArray(notifications)) {
    return res.status(400).json({ success: false, message: "Notification preferences are required" });
  }
  const keys = Object.keys(notifications);
  if (!keys.length || keys.some((key) => !allowed.includes(key)) || keys.some((key) => typeof notifications[key] !== "boolean")) {
    return res.status(400).json({ success: false, message: "Provide valid boolean notification preferences" });
  }
  try {
    const preferences = await updatePreferences({ userId: req.user._id, notifications });
    return res.status(200).json({ success: true, message: "Preferences saved", data: { preferences } });
  } catch (error) {
    return res.status(error.message === "User not found" ? 404 : 500).json({ success: false, message: error.message || "Failed to update preferences" });
  }
};

module.exports = { updateProfileController, updatePreferencesController };
