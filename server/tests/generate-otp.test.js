const test = require("node:test");
const assert = require("node:assert/strict");
const generateOtp = require("../utils/generateOtp");

test("OTP generator returns a six-digit numeric code", () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    assert.match(generateOtp(), /^\d{6}$/);
  }
});
