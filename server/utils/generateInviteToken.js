const crypto = require("crypto");

const generateInviteToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = generateInviteToken;