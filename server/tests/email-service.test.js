const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");

test("email service sends through Gmail SMTP with the configured App Password", async () => {
  const originalCreateTransport = nodemailer.createTransport;
  const previousUser = process.env.EMAIL_USER;
  const previousPass = process.env.EMAIL_PASS;
  let transportOptions;
  let message;

  process.env.EMAIL_USER = "worklyn.test@gmail.com";
  process.env.EMAIL_PASS = "test-app-password";
  nodemailer.createTransport = (options) => {
    transportOptions = options;
    return { sendMail: async (mail) => { message = mail; return { messageId: "test-message-id" }; } };
  };

  try {
    const { sendEmail } = require("../services/email.service");
    const result = await sendEmail({
      to: "recipient@example.com",
      subject: "Worklyn test",
      html: "<p>Test</p>",
      text: "Test",
    });

    assert.equal(result.sent, true);
    assert.equal(result.messageId, "test-message-id");
    assert.equal(transportOptions.host, "smtp.gmail.com");
    assert.equal(transportOptions.port, 465);
    assert.equal(transportOptions.secure, true);
    assert.equal(transportOptions.auth.user, "worklyn.test@gmail.com");
    assert.equal(transportOptions.auth.pass, "test-app-password");
    assert.equal(message.from, "Worklyn <worklyn.test@gmail.com>");
    assert.equal(message.to, "recipient@example.com");
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    if (previousUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = previousUser;
    if (previousPass === undefined) delete process.env.EMAIL_PASS;
    else process.env.EMAIL_PASS = previousPass;
  }
});
