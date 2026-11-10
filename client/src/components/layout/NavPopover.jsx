import { useRef, useState } from "react";
import { Link } from "react-router";
import useDismiss from "../../lib/useDismiss";
import { useNotifications } from "../../context/NotificationsContext";

// Icon button + small popover panel (notifications, help, settings).
export default function NavPopover({ icon: Icon, label, title, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));
  const { items, unreadCount } = useNotifications();
  const isNotifications = label === "Notifications";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount > 0 && isNotifications ? `${label}, ${unreadCount} unread` : label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support"
      >
        <Icon />
        {isNotifications && unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-accent-support px-1 text-[9px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-panel border border-line bg-surface p-4 shadow-lg"
        >
          <div className="flex items-center justify-between gap-3">
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {isNotifications && <span className="text-xs text-ink-faint">{unreadCount} unread</span>}
          </div>

          {isNotifications ? (
            <>
              <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
                {items.length ? items.slice(0, 4).map((item) => {
                  const projectId = item.project?._id ?? item.project?.id;
                  const issueId = item.issue?._id ?? item.issue?.id;
                  const href = projectId && issueId
                    ? `/projects/${projectId}/issues/${issueId}`
                    : "/notifications";

                  return (
                    <Link
                      key={item._id ?? item.id}
                      to={href}
                      onClick={() => setOpen(false)}
                      className={`block rounded-control px-3 py-2.5 text-left transition-colors hover:bg-surface-subtle ${item.readAt ? "" : "bg-accent-support/[0.04]"}`}
                    >
                      <p className="line-clamp-2 text-xs leading-5 text-ink">{item.message}</p>
                      <p className="mt-1 text-[10px] text-ink-faint">
                        {item.project?.name ?? "Worklyn"} · {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </Link>
                  );
                }) : (
                  <p className="py-5 text-center text-xs text-ink-muted">You're all caught up.</p>
                )}
              </div>
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex w-full justify-center rounded-control border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle"
              >
                View all notifications
              </Link>
            </>
          ) : (
            <div className="mt-2 text-sm text-ink-muted">{children}</div>
          )}
        </div>
      )}
    </div>
  );
}
