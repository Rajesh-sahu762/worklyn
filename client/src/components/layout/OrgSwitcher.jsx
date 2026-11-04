
import { useRef, useState } from "react";
import { Link } from "react-router";
import { useOrganization } from "../../context/OrganizationContext";
import useDismiss from "../../lib/useDismiss";
import { CheckIcon, ChevronIcon } from "./icons";

const roleLabel = (role) =>
  role
    ? role.charAt(0) + role.slice(1).toLowerCase()
    : "";

export default function OrgSwitcher({ collapsed }) {
  const {
    orgs,
    orgStatus,
    orgError,
    currentOrg,
    switchOrg,
    reloadOrgs,
  } = useOrganization();

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useDismiss(ref, open, () => setOpen(false));

  const hideOnRail = collapsed ? "lg:hidden" : "";

  if (orgStatus === "loading") {
    return (
      <div
        aria-hidden="true"
        className={`h-[52px] animate-pulse rounded-panel bg-white/10 motion-reduce:animate-none ${
          collapsed ? "lg:mx-auto lg:h-11 lg:w-11" : ""
        }`}
      />
    );
  }

  if (orgStatus === "error") {
    return (
      <div
        role="alert"
        className={`rounded-panel border border-white/15 bg-white/5 p-3 text-sm ${hideOnRail}`}
      >
        <p className="text-white">
          {orgError || "Couldn't load organizations."}
        </p>

        <button
          type="button"
          onClick={reloadOrgs}
          className="mt-1 font-medium text-brand-lime underline underline-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div
        className={`rounded-panel border border-dashed border-white/25 px-3 py-3 text-sm text-white/70 ${hideOnRail}`}
      >
        <p>No organization yet</p>

        <Link
          to="/organizations/new"
          className="mt-1 inline-block font-medium text-brand-lime underline underline-offset-2"
        >
          Create one
        </Link>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      {/* Organization Button */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Current organization: ${currentOrg.name}`}
        title={collapsed ? currentOrg.name : undefined}
        className={`flex w-full items-center gap-3 rounded-panel border border-white/15 bg-white/5 p-2 text-left shadow-sm transition-colors hover:border-white/30 hover:bg-white/10 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-lime ${
          collapsed
            ? "lg:mx-auto lg:h-11 lg:w-11 lg:justify-center lg:gap-0 lg:p-1"
            : ""
        }`}
      >
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-brand-lime font-mono text-sm font-bold text-black"
        >
          {currentOrg.name.charAt(0).toUpperCase()}
        </span>

        <span className={`min-w-0 flex-1 ${hideOnRail}`}>
          <span className="block truncate text-sm font-semibold text-white">
            {currentOrg.name}
          </span>

          <span className="block truncate text-xs text-white/60">
            {roleLabel(currentOrg.role) || "Organization"}
          </span>
        </span>

        <ChevronIcon
          className={`shrink-0 text-white/60 ${hideOnRail}`}
        />
      </button>

      {/* Organization Dropdown */}
      {open && (
        <ul
          role="listbox"
          aria-label="Switch organization"
          className={`absolute z-50 mt-2 max-h-72 w-64 overflow-y-auto rounded-panel border border-line bg-surface p-1.5 text-ink shadow-xl ${
            collapsed
              ? "left-0 top-full lg:left-full lg:top-0 lg:ml-2 lg:mt-0"
              : "left-0 top-full"
          }`}
        >
          {orgs.map((org) => {
            const selected = org.id === currentOrg.id;

            return (
              <li
                key={org.id}
                role="option"
                aria-selected={selected}
              >
                <button
                  type="button"
                  onClick={() => {
                    switchOrg(org.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-control px-2 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-support ${
                    selected
                      ? "bg-brand-lime/35"
                      : "hover:bg-surface-subtle"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-control bg-surface-subtle font-mono text-xs font-bold text-ink"
                  >
                    {org.name.charAt(0).toUpperCase()}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">
                      {org.name}
                    </span>

                    <span className="block text-xs text-ink-muted">
                      {roleLabel(org.role)}
                    </span>
                  </span>

                  {selected && (
                    <CheckIcon className="text-emerald" />
                  )}
                </button>
              </li>
            );
          })}

          <li
            role="presentation"
            className="mt-1 border-t border-line pt-1"
          >
            <Link
              to="/organizations/new"
              onClick={() => setOpen(false)}
              className="block rounded-control px-2 py-2 text-sm font-medium text-emerald hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald"
            >
              + Create organization
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
