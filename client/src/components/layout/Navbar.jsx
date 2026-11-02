import { useLocation } from "react-router";
import { useOrganization } from "../../context/OrganizationContext";
import { FEATURES } from "../../lib/features";
import CreateMenu from "./CreateMenu";
import NavPopover from "./NavPopover";
import UserMenu from "./UserMenu";
import { isMac } from "../../lib/platform";
import { BellIcon, HelpIcon, MenuIcon, SearchIcon, SettingsIcon } from "./icons";

const TITLES = { "/": "Home", "/organizations/new": "New organization" };
const MOD = isMac ? "⌘" : "Ctrl";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support";

export default function Navbar({ onOpenMenu, onOpenSearch }) {
  const { pathname } = useLocation();
  const { currentOrg } = useOrganization();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line border-t-[3px] border-t-accent bg-surface px-4 lg:px-8">
      {/* left: nav toggle + breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button type="button" onClick={onOpenMenu} aria-label="Open navigation" className={`rounded-control p-1.5 text-ink-muted hover:text-ink lg:hidden ${focusRing}`}>
          <MenuIcon />
        </button>
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-2 text-sm">
            {currentOrg && (
              <>
                <li className="hidden max-w-[30vw] truncate text-ink-muted sm:block">{currentOrg.name}</li>
                <li aria-hidden="true" className="hidden text-ink-faint sm:block">/</li>
              </>
            )}
            <li aria-current="page" className="truncate font-medium text-ink">{TITLES[pathname] ?? ""}</li>
          </ol>
        </nav>
      </div>

      {/* center: command bar */}
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Search"
        className={`hidden h-10 w-full max-w-md items-center gap-2.5 rounded-full border border-line bg-canvas px-4 text-sm text-ink-muted transition-colors hover:border-ink-faint hover:bg-surface motion-reduce:transition-none md:flex ${focusRing}`}
      >
        <SearchIcon className="shrink-0" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded-control border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px]">{MOD} K</kbd>
      </button>

      {/* right: actions */}
      <div className="flex flex-1 items-center justify-end gap-1">
        <button type="button" onClick={onOpenSearch} aria-label="Search" className={`grid h-9 w-9 place-items-center rounded-control text-ink-muted hover:bg-surface-subtle hover:text-ink md:hidden ${focusRing}`}>
          <SearchIcon />
        </button>
        <div className="mr-1"><CreateMenu /></div>

        <NavPopover icon={BellIcon} label="Notifications" title="Notifications">
          {FEATURES.notifications ? null : <p>Mentions and assignment changes will show up here once notifications are available.</p>}
        </NavPopover>

        <NavPopover icon={HelpIcon} label="Help and shortcuts" title="Shortcuts">
          <dl className="space-y-2">
            <div className="flex items-center justify-between"><dt>Search or jump to</dt><dd><kbd className="rounded-control border border-line px-1.5 py-0.5 font-mono text-[11px]">{MOD} K</kbd></dd></div>
            <div className="flex items-center justify-between"><dt>Close dialog or menu</dt><dd><kbd className="rounded-control border border-line px-1.5 py-0.5 font-mono text-[11px]">Esc</kbd></dd></div>
          </dl>
        </NavPopover>

        <NavPopover icon={SettingsIcon} label="Settings" title="Settings">
          {FEATURES.settings ? null : <p>Personal and organization settings are not available yet.</p>}
        </NavPopover>

        <div className="ml-2"><UserMenu /></div>
      </div>
    </header>
  );
}