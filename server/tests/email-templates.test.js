const test = require("node:test");
const assert = require("node:assert/strict");
const {
  verificationOtpEmail,
  organizationInvitationEmail,
  passwordResetEmail,
  issueNotificationEmail,
  projectAccessEmail,
  teamAddedEmail,
} = require("../services/emailTemplates.service");

test("verification email escapes user-controlled values and includes expiry guidance", () => {
  const email = verificationOtpEmail({ firstName: "<img src=x>", otp: "123456" });
  assert.match(email.html, /&lt;img src=x&gt;/);
  assert.match(email.html, /123456/);
  assert.match(email.text, /10 minutes/);
});

test("organization invitation email escapes organization details and link", () => {
  const email = organizationInvitationEmail({
    organizationName: "R&D <team>",
    inviterName: "A & B",
    role: "MEMBER",
    invitationUrl: "https://worklyn.example/accept?token=abc&next=home",
  });
  assert.match(email.html, /R&amp;D &lt;team&gt;/);
  assert.match(email.html, /A &amp; B/);
  assert.match(email.html, /token=abc&amp;next=home/);
});

test("password reset email escapes the reset URL", () => {
  const email = passwordResetEmail({ firstName: "Sam", resetUrl: "https://example.test/reset?token=a&x=1" });
  assert.match(email.html, /token=a&amp;x=1/);
  assert.match(email.text, /token=a&x=1/);
});

test("issue status email identifies the updated status", () => {
  const email = issueNotificationEmail({
    firstName: "Sam",
    actorName: "Alex",
    issueKey: "WL-42",
    issueTitle: "Fix login",
    projectName: "Platform",
    type: "ISSUE_STATUS_CHANGED",
    status: "IN_REVIEW",
    issueUrl: "https://worklyn.example/projects/p/issues/i",
  });
  assert.match(email.html, /Issue status updated/);
  assert.match(email.html, /in review/);
});

test("project and team access emails include their destination", () => {
  const project = projectAccessEmail({
    firstName: "Sam", projectName: "Platform", projectKey: "PLT",
    role: "MEMBER", projectUrl: "https://worklyn.example/projects/p",
  });
  const team = teamAddedEmail({
    firstName: "Sam", teamName: "Frontend", role: "TEAM_LEAD",
    teamUrl: "https://worklyn.example/teams/t",
  });
  assert.match(project.html, /Open project/);
  assert.match(team.html, /Open teams/);
});
