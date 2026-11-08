import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { resetPassword } from "../lib/api";
import { AuthShell, Field } from "../components/AuthShell";
import { inputClass, linkClass } from "../components/authStyles";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!token) return setError("This password reset link is missing or invalid.");
    if (password.length < 8 || password.length > 128) return setError("Use a password between 8 and 128 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setPending(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell headline="A fresh start." body="Choose a new password for your Worklyn account.">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">Reset password</h1>
      {done ? (
        <div role="status" className="mt-6 space-y-4">
          <p className="rounded-control border border-line bg-surface-subtle p-4 text-sm leading-6 text-ink">Your password has been reset. All existing sessions have been signed out. Sign in with your new password.</p>
          <Link to="/login" className={linkClass}>Go to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-7 space-y-5">
          {error && <p role="alert" className="rounded-control border border-danger/40 bg-danger/5 px-3.5 py-3 text-sm text-ink">{error}</p>}
          <Field id="new-password" label="New password">
            <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass(false)} />
          </Field>
          <Field id="confirm-password" label="Confirm new password">
            <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass(false)} />
          </Field>
          <button type="submit" disabled={pending} className="w-full rounded-control bg-accent px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-accent-strong disabled:opacity-60">{pending ? "Updating…" : "Update password"}</button>
        </form>
      )}
      {!done && <p className="mt-7 text-sm text-ink-muted"><Link to="/login" className={linkClass}>Back to sign in</Link></p>}
    </AuthShell>
  );
}