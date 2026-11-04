const User = require("../models/user");

const DEFAULT_NOTIFICATION_PREFERENCES = {
  ISSUE_ASSIGNED: true,
  ISSUE_STATUS_CHANGED: true,
  ISSUE_COMMENTED: true,
};

const updateProfile = async ({ userId, firstName, lastName, mobile, profileImage }) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) throw new Error("User not found");

  if (firstName !== undefined) user.firstName = firstName.trim();
  if (lastName !== undefined) user.lastName = lastName.trim();
  if (mobile !== undefined) user.mobile = mobile.trim() || undefined;
  if (profileImage !== undefined) user.profileImage = profileImage.trim();

  await user.save();
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    mobile: user.mobile || "",
    profileImage: user.profileImage || "",
    isVerified: user.isVerified,
    preferences: user.preferences || { notifications: DEFAULT_NOTIFICATION_PREFERENCES },
  };
};

const updatePreferences = async ({ userId, notifications }) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) throw new Error("User not found");
  const current = user.preferences?.notifications?.toObject?.() ?? user.preferences?.notifications ?? {};
  user.preferences = {
    ...(user.preferences?.toObject?.() ?? user.preferences ?? {}),
    notifications: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...current,
      ...notifications,
    },
  };
  await user.save();
  return {
    notifications: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(user.preferences?.notifications?.toObject?.() ?? user.preferences?.notifications ?? {}),
    },
  };
};

module.exports = { updateProfile, updatePreferences };
