const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

const layout = ({ preheader, heading, content }) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px 12px;background:#f5f6f8;font-family:Inter,Arial,sans-serif;color:#171923">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6e8ec;border-radius:16px">
    <tr><td style="padding:28px 32px 12px">
      <div style="font-size:22px;font-weight:800;letter-spacing:-.6px;color:#171923">worklyn<span style="color:#a3d934">.</span></div>
    </td></tr>
    <tr><td style="padding:18px 32px 32px">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;letter-spacing:-.5px">${heading}</h1>
      ${content}
      <p style="margin:28px 0 0;color:#7b8190;font-size:12px;line-height:1.6">This is an automated message from Worklyn. If you weren't expecting it, you can safely ignore this email.</p>
    </td></tr>
  </table>
  <p style="max-width:560px;margin:16px auto 0;text-align:center;color:#9298a5;font-size:11px">© ${new Date().getFullYear()} Worklyn</p>
</body></html>`;

const button = (url, label) => `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;border-radius:9px;background:#20242d;color:#fff;text-decoration:none;font-weight:700;font-size:14px">${escapeHtml(label)}</a></p>`;

const verificationOtpEmail = ({ firstName, otp }) => ({
  subject: "Verify your Worklyn email",
  preheader: "Your Worklyn verification code is ready.",
  html: layout({
    preheader: "Your Worklyn verification code is ready.",
    heading: "Verify your email",
    content: `<p style="color:#5f6673;font-size:14px;line-height:1.7">Hi ${escapeHtml(firstName || "there")}, use this code to finish creating your Worklyn account.</p>
      <div style="margin:22px 0;padding:18px;border:1px solid #e6e8ec;border-radius:12px;background:#fafbfc;text-align:center;font-size:32px;font-weight:800;letter-spacing:9px">${escapeHtml(otp)}</div>
      <p style="color:#5f6673;font-size:13px;line-height:1.7">This code expires in <strong>10 minutes</strong>. Never share it with anyone.</p>`,
  }),
  text: `Hi ${firstName || "there"}, your Worklyn verification code is ${otp}. It expires in 10 minutes. Never share this code.`,
});

const welcomeEmail = ({ firstName }) => ({
  subject: "Welcome to Worklyn",
  preheader: "Your workspace is ready.",
  html: layout({
    preheader: "Your workspace is ready.",
    heading: "Welcome to Worklyn",
    content: `<p style="color:#5f6673;font-size:14px;line-height:1.7">Hi ${escapeHtml(firstName || "there")}, your email is verified and your Worklyn account is ready. You can now create an organization, invite teammates and organize projects in one place.</p>`,
  }),
  text: `Hi ${firstName || "there"}, your email is verified. Welcome to Worklyn!`,
});

const organizationInvitationEmail = ({ organizationName, inviterName, role, invitationUrl }) => ({
  subject: `You're invited to join ${organizationName} on Worklyn`,
  preheader: `${inviterName || "Your teammate"} invited you to Worklyn.`,
  html: layout({
    preheader: `${inviterName || "Your teammate"} invited you to Worklyn.`,
    heading: "You're invited",
    content: `<p style="color:#5f6673;font-size:14px;line-height:1.7"><strong>${escapeHtml(inviterName || "A teammate")}</strong> invited you to join <strong>${escapeHtml(organizationName)}</strong> on Worklyn as an <strong>${escapeHtml(role.toLowerCase())}</strong>.</p>
      ${button(invitationUrl, "Accept invitation")}
      <p style="color:#5f6673;font-size:13px;line-height:1.7">This invitation expires in 7 days and can only be accepted by signing in with the email address this message was sent to.</p>`,
  }),
  text: `${inviterName || "A teammate"} invited you to join ${organizationName} on Worklyn as an ${role.toLowerCase()}. Accept it here: ${invitationUrl}. This invitation expires in 7 days.`,
});

const passwordResetEmail = ({ firstName, resetUrl }) => ({
  subject: "Reset your Worklyn password",
  preheader: "Use this secure link to reset your password.",
  html: layout({
    preheader: "Use this secure link to reset your password.",
    heading: "Reset your password",
    content: `<p style="color:#5f6673;font-size:14px;line-height:1.7">Hi ${escapeHtml(firstName || "there")}, we received a request to reset your Worklyn password.</p>
      ${button(resetUrl, "Reset password")}
      <p style="color:#5f6673;font-size:13px;line-height:1.7">This link expires in 15 minutes. If you didn't request a reset, ignore this email. Your password won't change.</p>`,
  }),
  text: `Hi ${firstName || "there"}, reset your Worklyn password using this link: ${resetUrl}. The link expires in 15 minutes.`,
});

const issueNotificationEmail = ({ firstName, actorName, issueKey, issueTitle, projectName, type, status, issueUrl }) => {
  const isComment = type === "ISSUE_COMMENTED";
  const isStatus = type === "ISSUE_STATUS_CHANGED";
  const action = isComment ? "commented on" : isStatus ? "updated the status of" : "assigned";
  return {
    subject: `${issueKey}: ${isComment ? "New comment" : isStatus ? "Status updated" : "Issue assigned to you"}`,
    preheader: `${actorName || "A teammate"} ${action} ${issueKey}.`,
    html: layout({
      preheader: `${actorName || "A teammate"} ${action} ${issueKey}.`,
      heading: isComment ? "New issue comment" : isStatus ? "Issue status updated" : "An issue was assigned to you",
      content: `<p style="color:#5f6673;font-size:14px;line-height:1.7">Hi ${escapeHtml(firstName || "there")}, <strong>${escapeHtml(actorName || "A teammate")}</strong> ${action} <strong>${escapeHtml(issueKey)}</strong> in ${escapeHtml(projectName || "your project")}.</p>
        <div style="padding:16px;border:1px solid #e6e8ec;border-radius:10px;background:#fafbfc"><div style="font-size:11px;color:#858b98;font-weight:700">${escapeHtml(issueKey)}</div><div style="margin-top:6px;font-size:15px;font-weight:700">${escapeHtml(issueTitle)}</div></div>
        ${button(issueUrl, "Open issue")}`,
    }),
    text: `Hi ${firstName || "there"}, ${actorName || "A teammate"} ${action} ${issueKey} in ${projectName || "your project"}: ${issueTitle}. Open it: ${issueUrl}`,
  };
};


const projectAccessEmail = ({ firstName, projectName, projectKey, role, projectUrl }) => ({
  subject: `You've been added to ${projectName} on Worklyn`,
  preheader: `You now have access to ${projectName}.`,
  html: layout({
    preheader: `You now have access to ${projectName}.`,
    heading: "Project access granted",
    content: `<p style="color:#5f6673;font-size:14px;line-height:1.7">Hi ${escapeHtml(firstName || "there")}, you've been added to <strong>${escapeHtml(projectName)}</strong> (${escapeHtml(projectKey)}) as a <strong>${escapeHtml(role.toLowerCase())}</strong>.</p>
      ${button(projectUrl, "Open project")}`,
  }),
  text: `Hi ${firstName || "there"}, you've been added to ${projectName} (${projectKey}) as a ${role.toLowerCase()}. Open it: ${projectUrl}`,
});

const teamAddedEmail = ({ firstName, teamName, role, teamUrl }) => ({
  subject: `You've joined the ${teamName} team on Worklyn`,
  preheader: `You are now a member of ${teamName}.`,
  html: layout({
    preheader: `You are now a member of ${teamName}.`,
    heading: "Welcome to the team",
    content: `<p style="color:#5f6673;font-size:14px;line-height:1.7">Hi ${escapeHtml(firstName || "there")}, you've been added to <strong>${escapeHtml(teamName)}</strong> as a <strong>${escapeHtml(role.toLowerCase().replaceAll("_", " "))}</strong>.</p>
      ${button(teamUrl, "Open teams")}`,
  }),
  text: `Hi ${firstName || "there"}, you've been added to ${teamName} as a ${role.toLowerCase()}. Open teams: ${teamUrl}`,
});

module.exports = {
  verificationOtpEmail,
  welcomeEmail,
  organizationInvitationEmail,
  passwordResetEmail,
  issueNotificationEmail,
  projectAccessEmail,
  teamAddedEmail,
};