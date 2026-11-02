import { useId, useRef, useState } from "react";
import { login, resendVerification } from "../lib/api";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
// Real status enum + the forward path allowed by the backend transitions.
const FLOW = [
  { label: "Backlog", dot: "bg-status-backlog" },
  { label: "To do", dot: "bg-status-todo" },
  { label: "In progress", dot: "bg-status-progress" },
  { label: "In review", dot: "bg-status-review" },
  { label: "Done", dot: "bg-status-done" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
function Field({ id, label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (hasError) =>
  `w-full rounded-control border bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-faint
   outline-none transition-colors duration-150 motion-reduce:transition-none
   focus-visible:ring-2 focus-visible:ring-accent-support focus-visible:ring-offset-1
   ${hasError ? "border-danger" : "border-line hover:border-ink-faint"}`;

/**
 * Props:
 *  onLoggedIn(user, accessToken)  – called after a successful login
 *  onCreateAccount()              – navigate to registration (no router yet)
 */
export default function LoginPage() {
  const { login: setSession } = useAuth();
  const uid = useId();
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const emailRef = useRef(null);

  function validate() {
    const errs = {};
    if (!email.trim()) errs.email = "Enter your email address.";
    else if (!EMAIL_RE.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Enter your password.";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (pending) return;
    setFormError("");
    setNotice("");
    setNeedsVerification(false);

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      if (errs.email) emailRef.current?.focus();
      return;
    }

    setPending(true);
    try {
      const { user, accessToken } = await login(email.trim().toLowerCase(), password);
      setSession(user, accessToken); // PublicOnlyRoute redirects once the status flips
    } catch (err) {
      // Keep what the user typed; only surface the problem.
      setFieldErrors(err.fieldErrors || {});
      setFormError(err.message);
      if (/verif/i.test(err.message)) setNeedsVerification(true);
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    if (!EMAIL_RE.test(email.trim())) {
      setFieldErrors({ email: "Enter your email above, then request a new code." });
      emailRef.current?.focus();
      return;
    }
    setResending(true);
    setNotice("");
    try {
      await resendVerification(email.trim().toLowerCase());
      setNotice("A new verification code has been requested for this email.");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Context panel */}
      <aside className="hidden border-r border-line bg-surface-subtle lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="flex items-center gap-0">
  <img
    src="/light-expanded-logo.png"
    alt="Worklyn"
    draggable="false"
    className="h-20 w-auto max-w-[190px] object-contain object-left"
  />
</div>

        <div className="max-w-md">
          <h2 className="text-[34px] font-semibold leading-[1.15] tracking-tight text-ink">
            Know who has what, and where it stands.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">
            Organizations, projects and issues in one calm place, with every change on the record.
          </p>

          <ol
            aria-label="Issue status path"
            className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-3"
          >
            {FLOW.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-control border border-line bg-surface px-2.5 py-1.5 text-sm text-ink">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
                {i < FLOW.length - 1 && (
                  <span aria-hidden="true" className="h-px w-3 bg-ink-faint" />
                )}
              </li>
            ))}
          </ol>
        </div>

        <p className="text-sm text-ink-muted">Built for developers, designers, QA and product teams.</p>
      </aside>

      {/* Form */}
      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:min-h-0">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center justify-center">
  <img
    src="/light-expanded-logo.png"
    alt="Worklyn"
    draggable="false"
    className="h-20 w-auto max-w-[170px] object-contain object-left"
  />
</div>

          <h1 className="text-[26px] font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">Pick up where your team left off.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {formError && (
              <div
                role="alert"
                className="rounded-control border border-danger/40 bg-danger/5 px-3.5 py-3 text-sm text-ink"
              >
                <p>{formError}</p>
                {needsVerification && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="mt-2 font-medium text-accent-support underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support disabled:opacity-60"
                  >
                    {resending ? "Requesting code…" : "Send a new verification code"}
                  </button>
                )}
              </div>
            )}
            {notice && (
              <p role="status" className="rounded-control border border-line bg-surface-subtle px-3.5 py-3 text-sm text-ink">
                {notice}
              </p>
            )}

            <Field id={emailId} label="Email" error={fieldErrors.email}>
              <input
                ref={emailRef}
                id={emailId}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
                className={inputClass(!!fieldErrors.email)}
              />
            </Field>

            <Field id={passwordId} label="Password" error={fieldErrors.password}>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? `${passwordId}-error` : undefined}
                  className={`${inputClass(!!fieldErrors.password)} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 rounded-r-control px-3 text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-support"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="flex w-full items-center justify-center gap-2 rounded-control bg-accent px-4 py-2.5 text-[15px] font-semibold text-white shadow-sm
                         transition-colors duration-150 hover:bg-accent-strong motion-reduce:transition-none
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink
                         disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink motion-reduce:animate-none"
                />
              )}
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-sm text-ink-muted">
            New to Worklyn?{" "}
          <Link
  to="/register"
  className="font-medium text-accent-support underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support"
>
  Create an account
</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
