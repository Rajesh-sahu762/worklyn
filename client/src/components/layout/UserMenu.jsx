
import { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { FEATURES } from "../../lib/features";
import { isMac } from "../../lib/platform";
import useDismiss from "../../lib/useDismiss";
import {
  LogoutIcon,
  HelpIcon,
  SettingsIcon,
} from "./icons";

const MOD = isMac ? "⌘" : "Ctrl";

export default function UserMenu() {
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(null);

  const ref = useRef(null);

  useDismiss(ref, open, () => {
    setOpen(false);
    setMobilePanel(null);
  });

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Account";

  const initials =
    (
      (user?.firstName?.[0] ?? "") +
      (user?.lastName?.[0] ?? "")
    ).toUpperCase() ||
    (user?.email?.[0] ?? "?").toUpperCase();

  const menuItem =
    "flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-support";

  const togglePanel = (panel) => {
    setMobilePanel((current) =>
      current === panel ? null : panel
    );
  };

  return (
    <div ref={ref} className="relative">

      {/* Profile trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setMobilePanel(null);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-semibold text-accent ring-offset-2 transition-all hover:ring-2 hover:ring-accent motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support"
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-panel border border-line bg-surface p-1.5 shadow-xl"
        >

          {/* Account information */}
          <div className="flex items-center gap-3 px-3 py-3">

            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-accent">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {name}
              </p>

              <p className="truncate text-xs text-ink-muted">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="my-1 h-px bg-line" />

          {/* Mobile only: Help */}
          <div className="lg:hidden">

            <button
              type="button"
              role="menuitem"
              aria-expanded={mobilePanel === "help"}
              onClick={() => togglePanel("help")}
              className={menuItem}
            >
              <HelpIcon className="shrink-0 text-ink-muted" />

              <span className="flex-1 text-left">
                Help & shortcuts
              </span>

              <span className="text-xs text-ink-faint">
                {mobilePanel === "help" ? "−" : "+"}
              </span>
            </button>

            {mobilePanel === "help" && (
              <div className="mx-3 mb-2 space-y-3 rounded-control bg-surface-subtle p-3">

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink-muted">
                    Search or jump to
                  </span>

                  <kbd className="rounded-control border border-line bg-surface px-1.5 py-1 font-mono text-[10px] text-ink">
                    {MOD} K
                  </kbd>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink-muted">
                    Close dialog or menu
                  </span>

                  <kbd className="rounded-control border border-line bg-surface px-1.5 py-1 font-mono text-[10px] text-ink">
                    Esc
                  </kbd>
                </div>

              </div>
            )}

            {/* Mobile only: Settings */}
            <button
              type="button"
              role="menuitem"
              aria-expanded={mobilePanel === "settings"}
              onClick={() => togglePanel("settings")}
              className={menuItem}
            >
              <SettingsIcon className="shrink-0 text-ink-muted" />

              <span className="flex-1 text-left">
                Settings
              </span>

              <span className="text-xs text-ink-faint">
                {mobilePanel === "settings" ? "−" : "+"}
              </span>
            </button>

            {mobilePanel === "settings" && (
              <div className="mx-3 mb-2 rounded-control bg-surface-subtle p-3">
                <p className="text-xs leading-relaxed text-ink-muted">
                  {FEATURES.settings
                    ? "Settings are available."
                    : "Personal and organization settings are not available yet."}
                </p>
              </div>
            )}

            <div className="my-1 h-px bg-line" />

          </div>

          {/* Sign out */}
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className={`${menuItem} text-danger hover:bg-danger/5`}
          >
            <LogoutIcon className="shrink-0" />
            Sign out
          </button>

        </div>
      )}
    </div>
  );
}
