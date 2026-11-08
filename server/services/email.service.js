const { Resend } = require("resend");
const templates = require("./emailTemplates.service");

let resendClient;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const from = process.env.RESEND_FROM_EMAIL;
  let client;
  try {
    client = getResendClient();
  } catch (error) {
    console.error("Resend client initialization failed:", { name: error?.name || "Error" });
    return { sent: false, reason: "EMAIL_PROVIDER_ERROR" };
  }

  if (!client || !from) {
    console.warn("Email delivery skipped: RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.");
    return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };
  }

  try {
    const { data, error } = await client.emails.send({
      from,
      to: [to],
      subject: String(subject || "").replace(/[\\r\\n]+/g, " ").slice(0, 200),
      html,
      text,
      ...(process.env.EMAIL_REPLY_TO ? { replyTo: process.env.EMAIL_REPLY_TO } : {}),
    });

    if (error) {
      console.error("Resend delivery failed:", {
        name: error.name,
        statusCode: error.statusCode,
      });
      return { sent: false, reason: "EMAIL_PROVIDER_ERROR" };
    }

    return { sent: true, messageId: data?.id || null };
  } catch (error) {
    console.error("Email delivery failed:", {
      name: error?.name || "Error",
      statusCode: error?.statusCode || null,
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