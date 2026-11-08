import { useState } from "react";
import { Link } from "react-router";
import { forgotPassword } from "../lib/api";
import { AuthShell, Field } from "../components/AuthShell";
import { inputClass, linkClass } from "../components/authStyles";

const EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setPending(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell headline="Get back to work." subheadline="We'll help you securely reset your password.">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">Forgot password?</h1>
      <p className="mt-1.5 text-[15px] text-ink-muted">Enter the email address associated with your Worklyn account.</p>
      {sent ? (
        <div role="status" className="mt-6 rounded-control border border-line bg-surface-subtle p-4 text-sm leading-6 text-ink">
          If an eligible account exists for this email, a password reset link will arrive shortly. Check your inbox and spam folder.
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-7 space-y-5">
          {error && <p role="alert" className="rounded-control border border-danger/40 bg-danger/5 px-3.5 py-3 text-sm text-ink">{error}</p>}
          <Field id="reset-email" label="Email address">
            <input id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass(!!error)} placeholder="you@company.com" />
          </Field>
          <button type="submit" disabled={pending} className="w-full rounded-control bg-accent px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-accent-strong disabled:opacity-60">{pending ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
      <p className="mt-7 text-sm text-ink-muted"><Link to="/login" className={linkClass}>Back to sign in</Link></p>
    </AuthShell>
  );
}