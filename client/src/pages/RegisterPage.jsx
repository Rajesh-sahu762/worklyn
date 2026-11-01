import { useEffect, useId, useRef, useState } from "react";
import { register, verifyEmail, resendVerification } from "../lib/api";
import { AuthShell, Field, inputClass, linkClass } from "../components/AuthShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30; // UI throttle only; the server sets no documented limit

// Real hierarchy from the data model: Organization -> Project -> Issue
const HIERARCHY = [
  { name: "Organization", note: "Your team and its members" },
  { name: "Project", note: "A body of work with its own access" },
  { name: "Issue", note: "A task, bug, story or epic" },
];

function Hierarchy() {
  return (
    <ol aria-label="How work is organized" className="mt-10 space-y-0">
      {HIERARCHY.map((h, i) => (
        <li key={h.name} className="flex gap-3" style={{ paddingLeft: i * 20 }}>
          <div className="flex flex-col items-center">
            <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 rounded-full bg-accent-support" />
            {i < HIERARCHY.length - 1 && <span aria-hidden="true" className="w-px grow bg-ink-faint/50" />}
          </div>
          <div className="pb-5">
            <p className="text-[15px] font-medium text-ink">{h.name}</p>
            <p className="text-sm text-ink-muted">{h.note}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Alert({ children }) {
  return (
    <div role="alert" className="rounded-control border border-danger/40 bg-danger/5 px-3.5 py-3 text-sm text-ink">
      {children}
    </div>
  );
}

function SubmitButton({ pending, idle, busy }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex w-full items-center justify-center gap-2 rounded-control bg-accent px-4 py-2.5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-accent-strong motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink motion-reduce:animate-none" />}
      {pending ? busy : idle}
    </button>
  );
}

/**
 * Props:
 *  onGoToLogin()  – navigate to the login page
 */
export default function RegisterPage({ onGoToLogin }) {
  const uid = useId();
  const id = (n) => `${uid}-${n}`;

  const [step, setStep] = useState("form"); // form | verify | done
  const headingRef = useRef(null);

  // --- step 1: account details ---
  const [values, setValues] = useState({ firstName: "", lastName: "", email: "", password: "", mobile: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);
  const [pending, setPending] = useState(false);
  const firstErrorRef = useRef({});

  // --- step 2: OTP ---
  const [account, setAccount] = useState(null); // { userId, email }
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  useEffect(() => { headingRef.current?.focus(); }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function validate() {
    const e = {};
    const v = values;
    if (!v.firstName.trim()) e.firstName = "Enter your first name.";
    else if (v.firstName.trim().length > 50) e.firstName = "Use 50 characters or fewer.";
    if (!v.lastName.trim()) e.lastName = "Enter your last name.";
    else if (v.lastName.trim().length > 50) e.lastName = "Use 50 characters or fewer.";
    if (!v.email.trim()) e.email = "Enter your email address.";
    else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
    if (!v.password) e.password = "Create a password.";
    return e;
  }

  async function handleRegister(ev) {
    ev.preventDefault();
    if (pending) return;
    setFormError(""); setEmailTaken(false);

    const errs = validate();
    setFieldErrors(errs);
    const firstBad = ["firstName", "lastName", "email", "password"].find((k) => errs[k]);
    if (firstBad) { firstErrorRef.current[firstBad]?.focus(); return; }

    setPending(true);
    try {
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        ...(values.mobile.trim() ? { mobile: values.mobile.trim() } : {}),
      };
      const data = await register(payload);
      setAccount({ userId: data.userId, email: data.email || payload.email });
      setCooldown(RESEND_SECONDS);
      setStep("verify");
    } catch (err) {
      setFieldErrors(err.fieldErrors || {});
      setFormError(err.message);
      if (err.status === 409) setEmailTaken(true);
    } finally {
      setPending(false);
    }
  }

  async function handleVerify(ev) {
    ev.preventDefault();
    if (pending) return;
    setOtpError(""); setNotice("");
    if (!/^\d{6}$/.test(otp)) { setOtpError("Enter the 6-digit code."); return; }

    setPending(true);
    try {
      await verifyEmail(account.userId, otp);
      setStep("done");
    } catch (err) {
      setOtpError(err.fieldErrors?.otp || err.message);
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true); setOtpError(""); setNotice("");
    try {
      await resendVerification(account.email);
      setNotice(`A new code was requested for ${account.email}.`);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setResending(false);
    }
  }

  const pwd = (name, label, extra = {}) => ({
    id: id(name), name, value: values[name], onChange: set(name),
    "aria-invalid": !!fieldErrors[name],
    "aria-describedby": fieldErrors[name] ? `${id(name)}-error` : extra.hint ? `${id(name)}-hint` : undefined,
    ref: (el) => { firstErrorRef.current[name] = el; },
    className: inputClass(!!fieldErrors[name]),
  });

  const shellProps = {
    headline: "Start with an organization. Everything else hangs off it.",
    body: "Create your account, verify your email, then set up an organization for your team.",
    aside: <Hierarchy />,
  };

  /* ---------- Done ---------- */
  if (step === "done") {
    return (
      <AuthShell {...shellProps}>
        <h1 ref={headingRef} tabIndex={-1} className="text-[26px] font-semibold tracking-tight outline-none">Email verified</h1>
        <p role="status" className="mt-1.5 text-[15px] text-ink-muted">
          {account.email} is confirmed. Sign in to create your first organization.
        </p>
        <button
          type="button"
          onClick={onGoToLogin}
          className="mt-8 w-full rounded-control bg-accent px-4 py-2.5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-accent-strong motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Go to sign in
        </button>
      </AuthShell>
    );
  }

  /* ---------- Verify ---------- */
  if (step === "verify") {
    return (
      <AuthShell {...shellProps}>
        <h1 ref={headingRef} tabIndex={-1} className="text-[26px] font-semibold tracking-tight outline-none">Verify your email</h1>
        <p className="mt-1.5 text-[15px] text-ink-muted">
          Enter the 6-digit code for <span className="font-medium text-ink">{account.email}</span>. It expires in 10 minutes.
        </p>

        <form onSubmit={handleVerify} noValidate className="mt-8 space-y-5">
          {notice && <p role="status" className="rounded-control border border-line bg-surface-subtle px-3.5 py-3 text-sm text-ink">{notice}</p>}

          <Field id={id("otp")} label="Verification code" error={otpError}>
            <input
              id={id("otp")}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              aria-invalid={!!otpError}
              aria-describedby={otpError ? `${id("otp")}-error` : undefined}
              className={`${inputClass(!!otpError)} text-center font-mono text-2xl tracking-[0.5em]`}
            />
          </Field>

          <SubmitButton pending={pending} idle="Verify email" busy="Verifying…" />
        </form>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
          <button type="button" onClick={handleResend} disabled={cooldown > 0 || resending} className={linkClass}>
            {resending ? "Requesting code…" : cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
          </button>
          <button type="button" onClick={() => { setStep("form"); setOtp(""); setOtpError(""); setNotice(""); }} className={linkClass}>
            Use a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  /* ---------- Form ---------- */
  return (
    <AuthShell {...shellProps}>
      <h1 ref={headingRef} tabIndex={-1} className="text-[26px] font-semibold tracking-tight outline-none">Create your account</h1>
      <p className="mt-1.5 text-[15px] text-ink-muted">You'll confirm your email with a code in the next step.</p>

      <form onSubmit={handleRegister} noValidate className="mt-8 space-y-5">
        {formError && (
          <Alert>
            <p>{formError}</p>
            {emailTaken && (
              <button type="button" onClick={onGoToLogin} className={`${linkClass} mt-2`}>Sign in instead</button>
            )}
          </Alert>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={id("firstName")} label="First name" error={fieldErrors.firstName}>
            <input {...pwd("firstName")} type="text" autoComplete="given-name" maxLength={50} />
          </Field>
          <Field id={id("lastName")} label="Last name" error={fieldErrors.lastName}>
            <input {...pwd("lastName")} type="text" autoComplete="family-name" maxLength={50} />
          </Field>
        </div>

        <Field id={id("email")} label="Email" error={fieldErrors.email}>
          <input {...pwd("email")} type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" />
        </Field>

        <Field id={id("password")} label="Password" error={fieldErrors.password}>
          <div className="relative">
            <input {...pwd("password")} type={showPassword ? "text" : "password"} autoComplete="new-password" className={`${inputClass(!!fieldErrors.password)} pr-16`} />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 rounded-r-control px-3 text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-support"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        <Field id={id("mobile")} label="Mobile (optional)" error={fieldErrors.mobile}>
          <input {...pwd("mobile")} type="tel" autoComplete="tel" inputMode="tel" />
        </Field>

        <SubmitButton pending={pending} idle="Create account" busy="Creating account…" />
      </form>

      <p className="mt-8 text-sm text-ink-muted">
        Already have an account?{" "}
        <button type="button" onClick={onGoToLogin} className={linkClass}>Sign in</button>
      </p>
    </AuthShell>
  );
}