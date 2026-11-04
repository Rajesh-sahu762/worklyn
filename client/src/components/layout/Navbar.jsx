
import { useLocation } from "react-router";
import { useOrganization } from "../../context/OrganizationContext";
import { FEATURES } from "../../lib/features";
import CreateMenu from "./CreateMenu";
import NavPopover from "./NavPopover";
import UserMenu from "./UserMenu";
import { isMac } from "../../lib/platform";
import {
  BellIcon,
  HelpIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
} from "./icons";

const TITLES = {
  "/": "Home",
  "/organizations/new": "New organization",
  "/projects": "Projects",
  "/members": "Members",
  "/projects/:projectId/backlog": "Project backlog",
  "/settings/organization": "Organization settings",
  "/invitations/accept": "Accept invitation"
};

const MOD = isMac ? "⌘" : "Ctrl";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support";

export default function Navbar({ onOpenMenu, onOpenSearch }) {
  const { pathname } = useLocation();
  const { currentOrg } = useOrganization();

  const pageTitle =
  TITLES[pathname] ??
  (pathname.endsWith("/issues")
    ? "Project issues"
    : pathname.endsWith("/backlog")
      ? "Project backlog"
      : pathname.endsWith("/members")
        ? "Project members"
        : pathname.endsWith("/settings")
          ? "Project settings"
          : pathname.startsWith("/projects/")
      ? "Project overview"
      : "");

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line border-t-[3px] border-t-brand-lime bg-surface px-3 sm:px-4 lg:gap-3 lg:px-8">

      {/* Left: Navigation + Brand + Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2">

        {/* Mobile navigation */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface-subtle hover:text-ink lg:hidden ${focusRing}`}
        >
          <MenuIcon />
        </button>

        {/* Mobile brand */}
        <img
          src="/light-icon-logo.png"
          alt="Worklyn"
          draggable="false"
          className="h-7 w-7 shrink-0 object-contain lg:hidden"
        />

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-2 text-sm">

            {currentOrg && (
              <>
                <li className="hidden max-w-[30vw] truncate text-ink-muted sm:block">
                  {currentOrg.name}
                </li>

                <li aria-hidden="true" className="hidden text-ink-faint sm:block">
                  /
                </li>
              </>
            )}

            <li
              aria-current="page"
              className="truncate font-medium text-ink"
            >
              {pageTitle}
            </li>
          </ol>
        </nav>
      </div>

      {/* Desktop command bar */}
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Search"
        className={`hidden h-10 w-full max-w-md items-center gap-2.5 rounded-full border border-line bg-canvas px-4 text-sm text-ink-muted transition-colors hover:border-ink-faint hover:bg-surface motion-reduce:transition-none md:flex ${focusRing}`}
      >
        <SearchIcon className="shrink-0" />

        <span className="flex-1 text-left">
          Search or jump to…
        </span>

        <kbd className="rounded-control border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px]">
          {MOD} K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1">

        {/* Mobile search */}
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className={`grid h-9 w-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink md:hidden ${focusRing}`}
        >
          <SearchIcon />
        </button>

        {/* Create */}
        <div className="shrink-0">
          <CreateMenu />
        </div>

        {/* Notifications */}
        <NavPopover
          icon={BellIcon}
          label="Notifications"
          title="Notifications"
        >
          {FEATURES.notifications ? null : (
            <p>
              Mentions and assignment changes will show up here once
              notifications are available.
            </p>
          )}
        </NavPopover>

        {/* Desktop only: Help */}
        <div className="hidden lg:block">
          <NavPopover
            icon={HelpIcon}
            label="Help and shortcuts"
            title="Shortcuts"
          >
            <dl className="space-y-2">
              <div className="flex items-center justify-between">
                <dt>Search or jump to</dt>
                <dd>
                  <kbd className="rounded-control border border-line px-1.5 py-0.5 font-mono text-[11px]">
                    {MOD} K
                  </kbd>
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt>Close dialog or menu</dt>
                <dd>
                  <kbd className="rounded-control border border-line px-1.5 py-0.5 font-mono text-[11px]">
                    Esc
                  </kbd>
                </dd>
              </div>
            </dl>
          </NavPopover>
        </div>

        {/* Desktop only: Settings */}
        <div className="hidden lg:block">
          <NavPopover
            icon={SettingsIcon}
            label="Settings"
            title="Settings"
          >
            {FEATURES.settings ? null : (
              <p>
                Personal and organization settings are not available yet.
              </p>
            )}
          </NavPopover>
        </div>

        {/* Profile */}
        <div className="ml-1 shrink-0 sm:ml-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
