const nodemailer = require("nodemailer");
const templates = require("./emailTemplates.service");

let transporter;

const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      auth: { user, pass },
    });
  }

  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.warn("Email delivery skipped: EMAIL_USER or EMAIL_PASS is not configured.");
    return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };
  }

  try {
    const info = await mailer.sendMail({
      from: `Worklyn <${process.env.EMAIL_USER}>`,
      to,
      subject: String(subject || "").replace(/[\r\n]+/g, " ").slice(0, 200),
      html,
      text,
    });

    return { sent: true, messageId: info.messageId || null };
  } catch (error) {
    console.error("Gmail SMTP delivery failed:", {
      name: error?.name || "Error",
      code: error?.code || null,
      responseCode: error?.responseCode || null,
    });
    return { sent: false, reason: "EMAIL_PROVIDER_ERROR" };
  }
};

const buildFrontendUrl = (path, params = {}) => {
  const configuredUrl = process.env.FRONTEND_URL;
  if (!configuredUrl) return null;

  try {
    const base = new URL(configuredUrl);
    if (!["http:", "https:"].includes(base.protocol)) return null;
    const url = new URL(path, base);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  } catch {
    return null;
  }
};

const sendVerificationOtpEmail = async ({ to, firstName, otp }) =>
  sendEmail({ to, ...templates.verificationOtpEmail({ firstName, otp }) });

const sendWelcomeEmail = async ({ to, firstName }) =>
  sendEmail({ to, ...templates.welcomeEmail({ firstName }) });

const sendOrganizationInvitationEmail = async ({
  to, organizationName, inviterName, role, token,
}) => {
  const invitationUrl = buildFrontendUrl("/accept-invitation", { token });
  if (!invitationUrl) {
    console.error("Organization invitation email skipped: FRONTEND_URL is missing or invalid.");
    return { sent: false, reason: "FRONTEND_URL_NOT_CONFIGURED" };
  }
  return sendEmail({
    to,
    ...templates.organizationInvitationEmail({ organizationName, inviterName, role, invitationUrl }),
  });
};

const sendPasswordResetEmail = async ({ to, firstName, token }) => {
  const resetUrl = buildFrontendUrl("/reset-password", { token });
  if (!resetUrl) {
    console.error("Password reset email skipped: FRONTEND_URL is missing or invalid.");
    return { sent: false, reason: "FRONTEND_URL_NOT_CONFIGURED" };
  }
  return sendEmail({ to, ...templates.passwordResetEmail({ firstName, resetUrl }) });
};

const sendIssueNotificationEmail = async ({
  to, firstName, actorName, issueKey, issueTitle, projectName, type, status, projectId, issueId,
}) => {
  const issueUrl = buildFrontendUrl(`/projects/${encodeURIComponent(projectId)}/issues/${encodeURIComponent(issueId)}`);
  if (!issueUrl) return { sent: false, reason: "FRONTEND_URL_NOT_CONFIGURED" };
  return sendEmail({
    to,
    ...templates.issueNotificationEmail({
      firstName, actorName, issueKey, issueTitle, projectName, type, status, issueUrl,
    }),
  });
};


const sendProjectAccessEmail = async ({ to, firstName, projectName, projectKey, role, projectId }) => {
  const projectUrl = buildFrontendUrl(`/projects/${encodeURIComponent(projectId)}`);
  if (!projectUrl) return { sent: false, reason: "FRONTEND_URL_NOT_CONFIGURED" };
  return sendEmail({
    to,
    ...templates.projectAccessEmail({ firstName, projectName, projectKey, role, projectUrl }),
  });
};

const sendTeamAddedEmail = async ({ to, firstName, teamName, role, teamId }) => {
  const teamUrl = buildFrontendUrl(`/teams/${encodeURIComponent(teamId)}`);
  if (!teamUrl) return { sent: false, reason: "FRONTEND_URL_NOT_CONFIGURED" };
  return sendEmail({
    to,
    ...templates.teamAddedEmail({ firstName, teamName, role, teamUrl }),
  });
};

module.exports = {
  sendEmail,
  sendVerificationOtpEmail,
  sendWelcomeEmail,
  sendOrganizationInvitationEmail,
  sendPasswordResetEmail,
  sendIssueNotificationEmail,
  sendProjectAccessEmail,
  sendTeamAddedEmail,
};