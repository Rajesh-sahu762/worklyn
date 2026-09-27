const User = require("../models/User");
const { hashPassword } = require("../utils/hashPassword");
const generateOtp = require("../utils/generateOtp");

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

  const otpExpiresAt = new Date(
    Date.now() + 10 * 60 * 1000
  );

  user.otp = otp;
  user.otpExpiresAt = otpExpiresAt;

  await user.save();

  // Development only
  console.log(`New OTP for ${user.email}: ${otp}`);

  return {
    email: user.email,
  };
};


module.exports = {
  registerUser,
  verifyEmail,
  resendVerificationOtp,
};