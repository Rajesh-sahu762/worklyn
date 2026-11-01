import { useRef, useState } from "react";
import useDismiss from "../../lib/useDismiss";

// Icon button + small popover panel (notifications, help, settings).
export default function NavPopover({ icon: Icon, label, title, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support"
      >
        <Icon />
      </button>
      {open && (
        <div role="dialog" aria-label={label} className="absolute right-0 top-full z-50 mt-2 w-72 rounded-panel border border-line bg-surface p-4 shadow-lg">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          <div className="mt-2 text-sm text-ink-muted">{children}</div>
        </div>
      )}
    </div>
  );
}