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

module.exports = {
  registerUser,
};