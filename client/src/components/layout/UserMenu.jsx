import { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import useDismiss from "../../lib/useDismiss";
import { LogoutIcon } from "./icons";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Account";
  const initials =
    ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase() || (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className="grid h-9 w-9 place-items-center rounded-full bg-accent-support text-sm font-semibold text-white ring-offset-2 transition-shadow hover:ring-2 hover:ring-accent motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support"
      >
        {initials}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-panel border border-line bg-surface p-1.5 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="truncate text-xs text-ink-muted">{user?.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-sm text-ink hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-support"
          >
            <LogoutIcon className="text-ink-muted" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}