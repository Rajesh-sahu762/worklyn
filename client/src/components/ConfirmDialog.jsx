import { useEffect, useRef } from "react";

export default function ConfirmDialog({ open, title, children, confirmLabel = "Confirm", tone = "danger", pending, onConfirm, onCancel }) {  const ref = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    (ref.current?.querySelector("[data-autofocus]") ?? cancelRef.current)?.focus();
    return () => prev?.focus?.();
  }, [open]);

  if (!open) return null;

  function onKeyDown(e) {
    if (e.key === "Escape" && !pending) return onCancel();
    if (e.key !== "Tab") return;
    const f = ref.current.querySelectorAll("button:not([disabled])");
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 px-4" onMouseDown={(e) => e.target === e.currentTarget && !pending && onCancel()}>
      <div
        ref={ref}
        role={tone === "danger" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-[14px] border border-line bg-surface p-6 shadow-2xl"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-ink">{title}</h2>
        <div id="confirm-body" className="mt-2 text-sm text-ink-muted">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={pending} className="rounded-control border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} aria-busy={pending} className={`rounded-control px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${
  tone === "danger"
    ? "bg-danger text-white hover:opacity-90 focus-visible:outline-danger"
    : "bg-accent text-ink hover:bg-accent-strong focus-visible:outline-ink"
}`}>
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}