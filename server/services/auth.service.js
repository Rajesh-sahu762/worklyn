const jwt = require("jsonwebtoken");
const User = require("../models/User");
const generateOtp = require("../utils/generateOtp");
const RefreshToken = require("../models/RefreshToken");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");
const hashToken = require("../utils/hashToken");

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

    otp,
    otpExpiresAt,

    provider: "local",
  });

  // Development only
  console.log(`OTP for ${user.email}: ${otp}`);

  return {
    userId: user._id,
    email: user.email,
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

  if (user.otp !== otp) {
    throw new Error("Invalid OTP");
  }

  user.isVerified = true;

  // OTP ko use hone ke baad remove kar denge
  user.otp = null;
  user.otpExpiresAt = null;

  await user.save();

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

  const otp = generateOtp();

  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  user.otp = otp;
  user.otpExpiresAt = otpExpiresAt;

  await user.save();

  // Development only
  console.log(`New OTP for ${user.email}: ${otp}`);

  return {
    email: user.email,
  };
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
  const accessToken = generateAccessToken(user._id);

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
      profileImage: user.profileImage,
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
      process.env.JWT_REFRESH_SECRET
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
  const newAccessToken = generateAccessToken(user._id);

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
  loginUser,
  refreshAccessToken,
  logoutUser
};
