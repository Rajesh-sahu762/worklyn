// Shared layout + form primitives for auth pages (same look as LoginPage).
export const inputClass = (hasError) =>
  `w-full rounded-control border bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-faint
   outline-none transition-colors duration-150 motion-reduce:transition-none
   focus-visible:ring-2 focus-visible:ring-accent-support focus-visible:ring-offset-1
   ${hasError ? "border-danger" : "border-line hover:border-ink-faint"}`;

export const linkClass =
  "font-medium text-accent-support underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support disabled:opacity-60 disabled:no-underline";

export function Field({ id, label, hint, error, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-sm text-ink-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-control bg-accent font-mono text-sm font-bold text-ink">W</span>
      <span className="text-lg font-semibold tracking-tight">Worklyn</span>
    </div>
  );
}

export function AuthShell({ headline, body, aside, children }) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden border-r border-line bg-surface-subtle lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo />
        <div className="max-w-md">
          <h2 className="text-[34px] font-semibold leading-[1.15] tracking-tight text-ink">{headline}</h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">{body}</p>
          {aside}
        </div>
        <p className="text-sm text-ink-muted">Built for developers, designers, QA and product teams.</p>
      </aside>
      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:min-h-0">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden"><Logo /></div>
          {children}
        </div>
      </main>
    </div>
  );
}