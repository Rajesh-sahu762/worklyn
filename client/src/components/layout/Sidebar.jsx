import { NavLink } from "react-router";
import { useOrganization } from "../../context/OrganizationContext";
import { FEATURES } from "../../lib/features";
import OrgSwitcher from "./OrgSwitcher";
import { BellIcon, ClockIcon, CloseIcon, FolderIcon, HomeIcon, PanelIcon, StarIcon, TeamIcon, UsersIcon } from "./icons";

const GROUPS = [
  {
    label: "Personal",
    items: [
      { label: "Home", to: "/", icon: HomeIcon, ready: true, end: true },
      { label: "Recent", to: "/recent", icon: ClockIcon, ready: FEATURES.recent },
      { label: "Starred", to: "/starred", icon: StarIcon, ready: FEATURES.starred },
      { label: "Notifications", to: "/notifications", icon: BellIcon, ready: FEATURES.notifications },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Projects", to: "/projects", icon: FolderIcon, ready: FEATURES.projectsList },
      { label: "Teams", to: "/teams", icon: TeamIcon, ready: FEATURES.teams },
      { label: "Members", to: "/members", icon: UsersIcon, ready: FEATURES.members },
    ],
  },
];

const row = "flex items-center gap-3 rounded-control px-3 py-2 text-[15px]";
const activeRow = "bg-surface font-medium text-ink shadow-[inset_3px_0_0_0_var(--color-accent-strong)]";
const idleRow = "text-ink-muted hover:bg-surface/70 hover:text-ink";
const focusRing = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-support";

function NavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon;
  const label = <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>;

  if (!item.ready) {
    return (
      <span aria-disabled="true" title="Coming soon" className={`${row} cursor-not-allowed text-ink-faint`}>
        <Icon className="shrink-0" />
        {label}
        <span className={`ml-auto rounded-full bg-surface px-2 py-0.5 text-[11px] text-ink-muted ${collapsed ? "lg:hidden" : ""}`}>Soon</span>
      </span>
    );
  }
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => `${row} ${focusRing} ${isActive ? activeRow : idleRow}`}
    >
      <Icon className="shrink-0" />
      {label}
    </NavLink>
  );
}

function ProjectItem({ project, collapsed, onNavigate }) {
  const chip = (
    <span aria-hidden="true" className="grid h-6 min-w-6 shrink-0 place-items-center rounded-[5px] border border-line bg-surface px-1 font-mono text-[10px] font-semibold text-ink">
      {(project.key || project.name.charAt(0)).slice(0, 4).toUpperCase()}
    </span>
  );
  const name = <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>{project.name}</span>;

  if (!FEATURES.projectPages) {
    return (
      <span aria-disabled="true" title={collapsed ? project.name : "Project pages are coming next"} className={`${row} cursor-not-allowed py-1.5 text-ink-muted`}>
        {chip}{name}
      </span>
    );
  }
  return (
    <NavLink
      to={`/projects/${project.id}`}
      onClick={onNavigate}
      title={collapsed ? project.name : undefined}
      className={({ isActive }) => `${row} py-1.5 ${focusRing} ${isActive ? activeRow : idleRow}`}
    >
      {chip}{name}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { projects, projectsStatus, projectsError, currentOrg } = useOrganization();
  const hideOnRail = collapsed ? "lg:hidden" : "";

  return (
    <aside
      aria-label="Primary"
      className={`fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r border-line bg-surface-subtle transition-transform duration-200 motion-reduce:transition-none
        ${mobileOpen ? "translate-x-0" : ""} lg:static lg:translate-x-0 ${collapsed ? "lg:w-[76px]" : "lg:w-64"}`}
    >
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
  {/* Expanded Logo */}
  <a
    href="/"
    aria-label="Worklyn home"
    className={`flex min-w-0 items-center ${collapsed ? "lg:hidden" : ""}`}
  >
    <img
      src="/light-expanded-logo.png"
      alt="Worklyn"
      draggable="false"
      className="h-15 w-[198px] shrink-0 object-contain object-left"
    />
  </a>

  {/* Collapsed Logo - Desktop */}
  <img
    src="/light-icon-logo.png"
    alt="Worklyn"
    draggable="false"
    className={`hidden h-15 w-15 shrink-0 object-contain ${
      collapsed ? "lg:block" : ""
    }`}
  />

  {/* Mobile Close */}
  <button
    type="button"
    onClick={onCloseMobile}
    aria-label="Close navigation"
    className={`ml-auto rounded-control p-1.5 text-ink-muted hover:text-ink lg:hidden ${focusRing}`}
  >
    <CloseIcon />
  </button>

  {/* Desktop Collapse */}
  <button
    type="button"
    onClick={onToggleCollapse}
    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    aria-pressed={collapsed}
    className={`ml-auto hidden rounded-control p-1.5 text-ink-muted hover:bg-surface hover:text-ink lg:block ${
      collapsed ? "lg:hidden" : ""
    } ${focusRing}`}
  >
    <PanelIcon />
  </button>
</div>

      <div className="px-3 pb-3">
        <OrgSwitcher collapsed={collapsed} />
        {collapsed && (
          <button type="button" onClick={onToggleCollapse} aria-label="Expand sidebar" className={`mt-3 hidden w-full justify-center rounded-control p-2 text-ink-muted hover:bg-surface hover:text-ink lg:flex ${focusRing}`}>
            <PanelIcon />
          </button>
        )}
      </div>

      <nav aria-label="Workspace" className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <h2 className={`px-3 pb-2 text-xs font-medium uppercase tracking-wide text-ink-muted ${hideOnRail}`}>{g.label}</h2>
            <ul className="space-y-0.5">
              {g.items.map((item) => (
                <li key={item.label}><NavItem item={item} collapsed={collapsed} onNavigate={onCloseMobile} /></li>
              ))}
            </ul>
          </div>
        ))}

        {currentOrg && (
          <div>
            <h2 className={`px-3 pb-2 text-xs font-medium uppercase tracking-wide text-ink-muted ${hideOnRail}`}>Your projects</h2>
            {projectsStatus === "loading" && (
              <div aria-hidden="true" className="space-y-2 px-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-6 animate-pulse rounded-control bg-surface/70 motion-reduce:animate-none" />)}
              </div>
            )}
            {projectsStatus === "error" && <p role="alert" className={`px-3 text-sm text-danger ${hideOnRail}`}>{projectsError || "Couldn't load projects."}</p>}
            {projectsStatus === "ready" && projects.length === 0 && (
              <p className={`px-3 text-sm text-ink-muted ${hideOnRail}`}>No projects yet.</p>
            )}
            {projectsStatus === "ready" && projects.length > 0 && (
              <ul className="space-y-0.5">
                {projects.map((p) => (
                  <li key={p.id}><ProjectItem project={p} collapsed={collapsed} onNavigate={onCloseMobile} /></li>
                ))}
              </ul>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}