const crypto = require("crypto");

const hashOtp = (otp) => {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET or a strong JWT_ACCESS_SECRET must be configured");
  }
  return crypto.createHmac("sha256", secret).update(String(otp)).digest("hex");
};

module.exports = hashOtp;
