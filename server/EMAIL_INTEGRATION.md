# Worklyn email integration

Worklyn uses the Resend Node.js SDK from the backend only. The Resend API key must never be added to the Vite client environment or committed to Git.

## 1. Configure Resend

1. Verify a sending domain in the Resend dashboard.
2. Add the DNS records Resend provides and wait until the domain is verified.
3. Create an API key with permission to send email.
4. Copy `.env.example` to `.env` inside the `server` directory.
5. Set the values below:

```env
RESEND_API_KEY=re_your_real_api_key
RESEND_FROM_EMAIL="Worklyn <no-reply@your-verified-domain.com>"
EMAIL_REPLY_TO=support@your-verified-domain.com
FRONTEND_URL=http://localhost:5173
```

Use a sender address on the verified domain. For production, set `FRONTEND_URL` to the exact public frontend origin (for example, `https://app.example.com`). Keep `RESEND_API_KEY` only in the server's environment settings.

## 2. Install the SDK

From the server directory:

```bash
npm install
```

This updates `server/package-lock.json` for the Resend dependency declared in `server/package.json`. Commit the updated lockfile before deploying or using `npm ci`.

## 3. Email flows

- Account registration and resend verification: six-digit OTP, 10-minute expiry, hashed at rest, maximum five incorrect attempts, and a 30-second resend cooldown.
- Successful email verification: welcome email.
- Forgot/reset password: generic forgot-password response to avoid account enumeration; single-use random reset token, 15-minute expiry, 60-second per-account request cooldown, password hash update, and immediate invalidation of existing access and refresh sessions.
- Organization invitation create/resend: sends the invitation link by email. Raw invitation tokens are not returned in API responses.
- Project/team membership: sends an access notification when an existing organization member is added.
- Issue assignment, team assignment, comments and status changes: sends notifications to eligible recipients using their existing notification preferences.

Email delivery is a best-effort side effect for collaboration events. A provider failure is logged without exposing credentials or causing the underlying membership, issue, or comment write to fail. Registration and resend responses expose an `emailSent` boolean so the UI can tell the user when delivery did not succeed.

## 4. Local verification

After installing dependencies and setting environment variables:

```bash
npm test
npm start
```

Register with an email address you can access, inspect the Resend email logs, verify the OTP, then test organization invitation, project/team membership, issue assignment/comment/status notifications, and forgot/reset password.

If the sender domain is not verified or the API key/from address is missing, email delivery will not occur. Check the backend logs and Resend dashboard; never paste the API key into chat, frontend code, or Git commits.
