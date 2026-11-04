import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useOrganization } from "../../context/OrganizationContext";
import { FEATURES } from "../../lib/features";
import OrgSwitcher from "./OrgSwitcher";
import {
  BellIcon,
  ClockIcon,
  CloseIcon,
  FolderIcon,
  HomeIcon,
  PanelIcon,
  StarIcon,
  TeamIcon,
  UsersIcon,
  ChevronIcon,
} from "./icons";

const GROUPS = [
  {
    label: "Personal",
    items: [
      { label: "Home", to: "/", icon: HomeIcon, ready: true, end: true },
      {
        label: "Recent",
        to: "/recent",
        icon: ClockIcon,
        ready: FEATURES.recent,
      },
      {
        label: "Starred",
        to: "/starred",
        icon: StarIcon,
        ready: FEATURES.starred,
      },
      {
        label: "Notifications",
        to: "/notifications",
        icon: BellIcon,
        ready: FEATURES.notifications,
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Teams", to: "/teams", icon: TeamIcon, ready: FEATURES.teams },
      {
        label: "Members",
        to: "/members",
        icon: UsersIcon,
        ready: FEATURES.members,
      },
    ],
  },
];

const row =
  "flex min-h-10 w-full items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors duration-150";

const activeRow = "bg-brand-lime font-semibold text-black shadow-sm";
const idleRow = "text-white/70 hover:bg-white/10 hover:text-white";

const focusRing =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-lime";

function NavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon;

  const label = (
    <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
  );

  const railStyle = collapsed
    ? "lg:mx-auto lg:h-10 lg:w-11 lg:justify-center lg:gap-0 lg:px-0"
    : "";

  if (!item.ready) {
    return (
      <span
        aria-disabled="true"
        title={collapsed ? item.label : "Coming soon"}
        className={`${row} ${railStyle} cursor-not-allowed text-white/40`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {label}
        <span
          className={`ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/50 ${collapsed ? "lg:hidden" : ""}`}
        >
          Soon
        </span>
      </span>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `${row} ${focusRing} ${railStyle} ${isActive ? activeRow : idleRow}`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </NavLink>
  );
}

function ProjectItem({ project, collapsed, onNavigate }) {
  const projectKey = (project.key || project.name).slice(0, 2).toUpperCase();

  return (
    <NavLink
      to={`/projects/${project.id}`}
      onClick={onNavigate}
      title={collapsed ? project.name : undefined}
      className={({ isActive }) =>
        `group flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors ${
          collapsed ? "lg:mx-auto lg:w-11 lg:justify-center lg:px-0" : ""
        } ${
          isActive
            ? "bg-white/10 text-white ring-1 ring-white/10"
            : "text-white/65 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-[5px] font-mono text-[9px] font-bold ${
          collapsed
            ? "h-8 w-8 bg-brand-lime text-black"
            : "border border-white/15 bg-white/5 text-brand-lime"
        }`}
      >
        {projectKey}
      </span>

      <span
        className={`min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}
      >
        {project.name}
      </span>
    </NavLink>
  );
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) {
  const { projects, projectsStatus, projectsError, currentOrg } =
    useOrganization();

  const [projectsExpanded, setProjectsExpanded] = useState(true);

  const hideOnRail = collapsed ? "lg:hidden" : "";

  const location = useLocation();
  const isProjectsActive =
    location.pathname === "/projects" ||
    location.pathname.startsWith("/projects/");

  // Keep the sidebar list compact.
  const visibleProjects = projects.slice(0, 3);

  return (
    <aside
      aria-label="Primary navigation"
      className={`fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r border-white/10 bg-black transition-[width,transform] duration-200 motion-reduce:transition-none
        ${mobileOpen ? "translate-x-0" : ""}
        lg:static lg:translate-x-0
        ${collapsed ? "lg:w-[76px]" : "lg:w-64"}`}
    >
      {/* Header */}
      <div className="relative flex h-14 shrink-0 items-center justify-between px-3">
        <a
          href="/"
          aria-label="Worklyn home"
          className={collapsed ? "hidden" : "flex min-w-0 items-center"}
        >
          <img
            src="/Dark-expanded-Logo.png"
            alt="Worklyn"
            draggable="false"
            className="h-9 w-[170px] object-contain object-left"
          />
        </a>

        <img
          src="/Dark-icon-logo.png"
          alt="Worklyn"
          draggable="false"
          className={`hidden h-9 w-9 object-contain ${
            collapsed ? "lg:block" : ""
          }`}
        />

        {/* Mobile Close */}
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className={`ml-auto rounded-control p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden ${focusRing}`}
        >
          <CloseIcon />
        </button>

        {/* Floating Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`absolute right-0 top-1/2 z-50 hidden h-8 w-8 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#1B1B1B] text-white/70 shadow-lg transition-all hover:bg-[#303030] hover:text-brand-lime lg:flex ${focusRing}`}
        >
          <PanelIcon className={`h-4 w-4 ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Organization */}
      <div className="px-3 pb-3">
        <OrgSwitcher collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav
        aria-label="Workspace"
        className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 pb-6"
      >
        {GROUPS.map((group) => (
          <div key={group.label}>
            <h2
              className={`px-3 pb-2 text-xs font-medium uppercase tracking-wide text-white/40 ${hideOnRail}`}
            >
              {group.label}
            </h2>

            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.label}>
                  <NavItem
                    item={item}
                    collapsed={collapsed}
                    onNavigate={onCloseMobile}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Projects Parent + Children */}
       
{/* Projects Parent + Children */}
{currentOrg && (
  <div>
    {/* Projects Parent Row */}
    <div
      className={`flex min-h-10 items-center overflow-hidden rounded-control transition-colors ${
        isProjectsActive
          ? "bg-brand-lime text-black shadow-sm"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <NavLink
        to="/projects"
        title={collapsed ? "Projects" : undefined}
        onClick={onCloseMobile}
        className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-sm font-medium ${
          collapsed
            ? "lg:justify-center lg:gap-0 lg:px-0"
            : ""
        }`}
      >
        <FolderIcon className="h-5 w-5 shrink-0" />

        <span className={collapsed ? "lg:hidden" : ""}>
          Projects
        </span>
      </NavLink>

      {/* Chevron inside the same Projects row */}
      <button
        type="button"
        onClick={() => setProjectsExpanded((value) => !value)}
        aria-label={projectsExpanded ? "Collapse projects" : "Expand projects"}
        aria-expanded={projectsExpanded}
        className={`grid h-10 w-9 shrink-0 place-items-center transition-colors ${
  isProjectsActive
    ? "text-black/70 hover:text-black"
    : "text-white/50 hover:text-white"
} ${collapsed ? "lg:hidden" : ""}`}
      >
       <ChevronIcon
  className={`h-4 w-4 transition-transform duration-200 ${
    projectsExpanded ? "rotate-0" : "-rotate-90"
  }`}
/>
      </button>
    </div>

    {/* Child Projects */}
    {projectsExpanded && (
      <div className={collapsed ? "lg:hidden" : ""}>
        <div className="ml-5 mt-2 space-y-1 border-l border-white/15 pl-3">

          {projectsStatus === "loading" && (
            <div className="space-y-2 py-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-7 animate-pulse rounded-md bg-white/10"
                />
              ))}
            </div>
          )}

          {projectsStatus === "error" && (
            <p className="py-2 text-xs text-[#ffad9d]">
              {projectsError || "Couldn't load projects."}
            </p>
          )}

          {projectsStatus === "ready" && projects.length === 0 && (
            <p className="py-2 text-xs text-white/45">
              No projects yet.
            </p>
          )}

          {projectsStatus === "ready" && projects.length > 0 && (
            <>
              {projects.slice(0, 3).map((project) => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  collapsed={false}
                  onNavigate={onCloseMobile}
                />
              ))}

              <NavLink
                to="/projects"
                onClick={onCloseMobile}
                className="flex min-h-8 items-center gap-2 rounded-md px-2 text-xs font-semibold text-brand-lime transition-colors hover:bg-white/10"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center text-base">
                  +
                </span>
                View all projects
              </NavLink>
            </>
          )}
        </div>
      </div>
    )}
  </div>
)}

      </nav>
    </aside>
  );
}
