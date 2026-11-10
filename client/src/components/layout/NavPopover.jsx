import { useRef, useState } from "react";
import useDismiss from "../../lib/useDismiss";

// Icon button + small popover panel (notifications, help, settings).
export default function NavPopover({ icon: Icon, label, title, children, badgeCount = 0 }) {
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
        {badgeCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white" aria-label={`${badgeCount} unread notifications`}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
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