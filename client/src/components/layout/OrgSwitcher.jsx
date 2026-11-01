import { useRef, useState } from "react";
import { useOrganization } from "../../context/OrganizationContext";
import useDismiss from "../../lib/useDismiss";
import { CheckIcon, ChevronIcon } from "./icons";

const roleLabel = (r) => (r ? r.charAt(0) + r.slice(1).toLowerCase() : "");

export default function OrgSwitcher({ collapsed }) {
  const { orgs, orgStatus, orgError, currentOrg, switchOrg, reloadOrgs } = useOrganization();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));
  const hideOnRail = collapsed ? "lg:hidden" : "";

  if (orgStatus === "loading") {
    return <div aria-hidden="true" className="h-[52px] animate-pulse rounded-panel bg-surface/70 motion-reduce:animate-none" />;
  }
  if (orgStatus === "error") {
    return (
      <div role="alert" className={`rounded-panel border border-danger/40 bg-surface p-3 text-sm ${hideOnRail}`}>
        <p className="text-ink">{orgError || "Couldn't load organizations."}</p>
        <button type="button" onClick={reloadOrgs} className="mt-1 font-medium text-accent-support underline underline-offset-2">Retry</button>
      </div>
    );
  }
  if (!currentOrg) {
    return (
      <div className={`rounded-panel border border-dashed border-ink-faint/60 px-3 py-3 text-sm text-ink-muted ${hideOnRail}`}>
        No organization yet
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={collapsed ? currentOrg.name : undefined}
        className="flex w-full items-center gap-3 rounded-panel border border-line bg-surface p-2 text-left shadow-sm transition-colors hover:border-ink-faint motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support"
      >
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-accent font-mono text-sm font-bold text-ink">
          {currentOrg.name.charAt(0).toUpperCase()}
        </span>
        <span className={`min-w-0 flex-1 ${hideOnRail}`}>
          <span className="block truncate text-sm font-semibold text-ink">{currentOrg.name}</span>
          <span className="block truncate text-xs text-ink-muted">{roleLabel(currentOrg.role) || "Organization"}</span>
        </span>
        <ChevronIcon className={`shrink-0 text-ink-muted ${hideOnRail}`} />
      </button>

      {open && (
        <ul role="listbox" aria-label="Switch organization" className="absolute left-0 top-full z-50 mt-2 max-h-72 w-64 overflow-y-auto rounded-panel border border-line bg-surface p-1.5 shadow-lg">
          {orgs.map((o) => {
            const selected = o.id === currentOrg.id;
            return (
              <li key={o.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => { switchOrg(o.id); setOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-support"
                >
                  <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-control bg-surface-subtle font-mono text-xs font-bold text-ink">
                    {o.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{o.name}</span>
                    <span className="block text-xs text-ink-muted">{roleLabel(o.role)}</span>
                  </span>
                  {selected && <CheckIcon className="text-accent-support" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}