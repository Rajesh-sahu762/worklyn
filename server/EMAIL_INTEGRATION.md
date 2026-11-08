# Worklyn email integration

Worklyn sends transactional email through Gmail SMTP using Nodemailer. SMTP credentials are used only by the backend and must never be committed to Git or exposed to the Vite frontend.

## 1. Configure a Gmail account

1. Use a Gmail account dedicated to this learning project if possible.
2. Enable 2-Step Verification on that Google account.
3. Open Google Account -> Security -> App passwords.
4. Create an app password (Google displays a 16-character password).
5. Copy the generated password. Do not use your normal Gmail account password.

Google may not show App passwords for some account types or security configurations. If the option is unavailable, check the account's Google security eligibility.

## 2. Configure backend environment

Copy `.env.example` to `.env` inside `server` and set:

```env
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_PASS=your_16_character_google_app_password
FRONTEND_URL=http://localhost:5173
```

Use the 16-character App Password as `EMAIL_PASS` (spaces shown by Google can be omitted). Keep these values only in the backend environment. For Render deployment, add both variables in the backend service's Environment settings.

## 3. SMTP configuration

- Host: `smtp.gmail.com`
- Port: `465`
- TLS: implicit TLS (`secure: true`)
- Authentication: `EMAIL_USER` and `EMAIL_PASS`

Nodemailer is initialized lazily by the centralized `services/email.service.js`. Email templates remain in `services/emailTemplates.service.js`; controllers and business services continue calling the same email helper functions.

## 4. Supported email flows

- Account registration and resend verification: six-digit OTP, 10-minute expiry, HMAC-hashed at rest, maximum five incorrect attempts, and a 30-second resend cooldown.
- Successful email verification: welcome email.
- Forgot/reset password: generic forgot-password response to avoid account enumeration; single-use random reset token, 15-minute expiry, 60-second per-account request cooldown, password hash update, and immediate invalidation of existing access and refresh sessions.
- Organization invitation create/resend: sends the invitation link by email. Raw invitation tokens are not returned in API responses.
- Project/team membership: sends an access notification when an existing organization member is added.
- Issue assignment, team assignment, comments and status changes: sends notifications to eligible recipients using their existing notification preferences.

Email delivery is a best-effort side effect for collaboration events. A provider failure is logged without exposing credentials or causing the underlying membership, issue, or comment write to fail. Registration and resend responses expose an `emailSent` boolean so the UI can tell the user when delivery did not succeed.

## 5. Local verification

From the `server` directory:

```bash
npm install
npm test
npm start
```

Register using an email address you can access, verify the OTP, and test organization invitations, project/team membership, issue assignment/comment/status notifications, and forgot/reset password.

Gmail applies sending and abuse limits. This setup is suitable for a learning project and low-volume testing, not a high-volume production email system. If Gmail rejects authentication, confirm that 2-Step Verification is enabled and that `EMAIL_PASS` is an App Password, not the normal Gmail password.
