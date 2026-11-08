const jwt = require("jsonwebtoken");
const User = require("../models/user");
const generateOtp = require("../utils/generateOtp");
const RefreshToken = require("../models/RefreshToken");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");
const hashToken = require("../utils/hashToken");
const crypto = require("crypto");
const { sendVerificationOtpEmail, sendWelcomeEmail, sendPasswordResetEmail } = require("./email.service");

const registerUser = async ({
  firstName,
  lastName,
  email,
  mobile,
  password,
}) => {
  // 1. Check existing email
  const existingUser = await User.findOne({
    email: email.toLowerCase(),
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // 2. Hash password
  const passwordHash = await hashPassword(password);

  // 3. Generate OTP
  const otp = generateOtp();

  // 4. OTP expires in 10 minutes
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // 5. Create user
  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.toLowerCase().trim(),
    mobile: mobile?.trim() || undefined,

    passwordHash,

    isVerified: false,

    otp: hashToken(otp),
    otpExpiresAt,
    otpAttempts: 0,
    otpLastSentAt: new Date(),

    provider: "local",
  });

  const delivery = await sendVerificationOtpEmail({ to: user.email, firstName: user.firstName, otp });

  return {
    userId: user._id,
    email: user.email,
    emailSent: delivery.sent,
  };
};

const verifyEmail = async ({ userId, otp }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isDeleted) {
    throw new Error("User account has been deleted");
  }

  if (user.isVerified) {
    throw new Error("Email is already verified");
  }

  if (!user.otp || !user.otpExpiresAt) {
    throw new Error("Verification OTP not found");
  }

  if (user.otpExpiresAt < new Date()) {
    throw new Error("OTP has expired");
  }

  if ((user.otpAttempts || 0) >= 5) {
    throw new Error("OTP_ATTEMPTS_EXCEEDED");
  }

  if (user.otp !== hashToken(otp) && user.otp !== otp) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    if (user.otpAttempts >= 5) {
      user.otp = null;
      user.otpExpiresAt = null;
    }
    await user.save();
    throw new Error(user.otpAttempts >= 5 ? "OTP_ATTEMPTS_EXCEEDED" : "Invalid OTP");
  }

  user.isVerified = true;

  // OTP ko use hone ke baad remove kar denge
  user.otp = null;
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  user.otpLastSentAt = null;

  await user.save();
  await sendWelcomeEmail({ to: user.email, firstName: user.firstName });

  return {
    userId: user._id,
    email: user.email,
    isVerified: user.isVerified,
  };
};

const resendVerificationOtp = async ({ email }) => {
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isDeleted) {
    throw new Error("User account has been deleted");
  }

  if (user.isVerified) {
    throw new Error("Email is already verified");
  }

  if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < 30_000) {
    throw new Error("Please wait before requesting another verification code");
  }

  const otp = generateOtp();
  user.otp = hashToken(otp);
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();

  const delivery = await sendVerificationOtpEmail({ to: user.email, firstName: user.firstName, otp });
  return { email: user.email, emailSent: delivery.sent };
};


const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail, isDeleted: false, deactivatedAt: null });
  if (user && user.isVerified && user.passwordHash) {
    if (user.passwordResetRequestedAt && Date.now() - user.passwordResetRequestedAt.getTime() < 60_000) {
      return { accepted: true };
    }
    const token = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = hashToken(token);
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.passwordResetRequestedAt = new Date();
    await user.save();
    const delivery = await sendPasswordResetEmail({ to: user.email, firstName: user.firstName, token });
    if (!delivery.sent) {
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      await user.save();
    }
  }
  // Keep the response identical whether or not an account exists.
  return { accepted: true };
};

const resetPassword = async ({ token, password }) => {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    throw new Error("Invalid or expired password reset link");
  }
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
    isDeleted: false,
    deactivatedAt: null,
  });
  if (!user) throw new Error("Invalid or expired password reset link");

  user.passwordHash = await hashPassword(password);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  await RefreshToken.updateMany(
    { user: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  return { email: user.email };
};

const loginUser = async ({ email, password, userAgent, ipAddress }) => {
  // 1. Find user
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // 2. Deleted account
  if (user.isDeleted) {
    throw new Error("Account has been deleted");
  }

  // 3. Deactivated account
  if (user.deactivatedAt) {
    throw new Error("Account is deactivated");
  }

  // 4. Email verification
  if (!user.isVerified) {
    throw new Error("Please verify your email first");
  }

  // 5. Password
  if (!user.passwordHash) {
    throw new Error("This account does not use password login");
  }

  const isPasswordCorrect = await comparePassword(password, user.passwordHash);

  if (!isPasswordCorrect) {
    throw new Error("Invalid email or password");
  }

  // 6. Generate tokens
  const accessToken = generateAccessToken(user._id, user.tokenVersion || 0);

  const refreshToken = generateRefreshToken(user._id);

  // 7. Hash refresh token before storing
  const tokenHash = hashToken(refreshToken);

  // 8. Calculate expiry
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 9. Save refresh token
  await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
    userAgent: userAgent || "",
    ipAddress: ipAddress || "",
  });

  // 10. Update last login
  user.lastLoginAt = new Date();

  await user.save();

  return {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile || "",
      profileImage: user.profileImage,
      preferences: user.preferences,
      isVerified: user.isVerified,
    },
    accessToken,
    refreshToken,
  };
};


const refreshAccessToken = async ({
  refreshToken,
  userAgent,
  ipAddress,
}) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  // 1. Verify refresh token JWT
  let decoded;

  try {
    decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN
    );
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }

  // 2. Hash incoming refresh token
  const tokenHash = hashToken(refreshToken);

  // 3. Find token in DB
  const storedToken = await RefreshToken.findOne({
    tokenHash,
    user: decoded.userId,
  });

  if (!storedToken) {
    throw new Error("Refresh token not found");
  }

  // 4. Prevent reuse of revoked token
  if (storedToken.revokedAt) {
    throw new Error("Refresh token has been revoked");
  }

  // 5. Check DB expiry
  if (storedToken.expiresAt < new Date()) {
    throw new Error("Refresh token has expired");
  }

  // 6. Find user
  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isDeleted) {
    throw new Error("User account has been deleted");
  }

  if (user.deactivatedAt) {
    throw new Error("User account is deactivated");
  }

  if (!user.isVerified) {
    throw new Error("Email is not verified");
  }

  // 7. Revoke OLD refresh token
  storedToken.revokedAt = new Date();
  await storedToken.save();

  // 8. Generate NEW tokens
  const newAccessToken = generateAccessToken(user._id, user.tokenVersion || 0);

  const newRefreshToken = generateRefreshToken(user._id);

  // 9. Hash NEW refresh token
  const newTokenHash = hashToken(newRefreshToken);

  // 10. Store NEW refresh token
  const newRefreshTokenDoc = await RefreshToken.create({
    user: user._id,
    tokenHash: newTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    userAgent: userAgent || "",
    ipAddress: ipAddress || "",
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    refreshTokenId: newRefreshTokenDoc._id,
  };
};


const logoutUser = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  const tokenHash = hashToken(refreshToken);

  const storedToken = await RefreshToken.findOne({
    tokenHash,
  });

  if (!storedToken) {
    return;
  }

  if (!storedToken.revokedAt) {
    storedToken.revokedAt = new Date();
    await storedToken.save();
  }
};


module.exports = {
  registerUser,
  verifyEmail,
  resendVerificationOtp,
  requestPasswordReset,
  resetPassword,
  loginUser,
  refreshAccessToken,
  logoutUser
};
