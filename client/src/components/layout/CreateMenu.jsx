import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { FEATURES } from "../../lib/features";
import useDismiss from "../../lib/useDismiss";
import { ChevronIcon, FolderIcon, IssueIcon, PlusIcon, UsersIcon } from "./icons";

const ITEMS = [
  { label: "Issue", note: "Task, bug, story or epic", icon: IssueIcon, ready: FEATURES.createIssue },
  { label: "Project", note: "Browse and create projects", icon: FolderIcon, ready: FEATURES.projectsList, to: "/projects" },
  { label: "Organization", note: "A new team space", icon: UsersIcon, ready: FEATURES.createOrganization, to: "/organizations/new" },
];

export default function CreateMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Create"
        className="inline-flex h-9 items-center gap-1.5 rounded-control bg-accent px-3 text-sm font-semibold text-ink transition-colors hover:bg-accent-strong motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <PlusIcon />
        <span className="hidden sm:inline">Create</span>
        <ChevronIcon className="hidden h-4 w-4 sm:block" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 rounded-panel border border-line bg-surface p-1.5 shadow-lg">
          {ITEMS.map(({ label, note, icon: Icon, ready, to }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              aria-disabled={!ready}
              onClick={() => { if (!ready) return; setOpen(false); if (to) navigate(to); }}
              className={`flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-support ${ready ? "hover:bg-surface-subtle" : "cursor-not-allowed"}`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-control ${ready ? "bg-accent text-ink" : "bg-surface-subtle text-ink-faint"}`}><Icon /></span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-medium ${ready ? "text-ink" : "text-ink-muted"}`}>{label}</span>
                <span className="block truncate text-xs text-ink-muted">{note}</span>
              </span>
              {!ready && <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-ink-muted">Soon</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}