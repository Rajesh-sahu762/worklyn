import { useMemo, useState } from "react";
import { useNavigate,Link } from "react-router";
import { FolderKanban, Plus, Search, SlidersHorizontal, X, RefreshCw } from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";
import { createProject } from "../lib/api";


const FILTERS = [
  { value: "ALL", label: "All projects" },
  { value: "SCRUM", label: "Scrum" },
  { value: "KANBAN", label: "Kanban" },
];

const roleLabel = (role) => {
  if (!role) return "Member";
  return role.replace("PROJECT_", "").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};

const slugify = (value) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const keyify = (value) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);

function ProjectCard({ project }) {
  const initials = (project.key || project.name.slice(0, 2)).slice(0, 4).toUpperCase();

  return (
    <Link
  to={`/projects/${project.id}`}
  className="group flex min-h-52 flex-col rounded-panel border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-faint/50 hover:shadow-[0_10px_30px_-22px_rgba(23,35,29,0.35)] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support"
>
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[9px] bg-ink font-mono text-xs font-bold tracking-wide text-brand-lime">
          {initials}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${project.projectType === "SCRUM" ? "bg-status-progress" : "bg-accent-support"}`} />
          {project.projectType || "KANBAN"}
        </span>
      </div>

      <div className="mt-4 min-w-0">
        <h2 className="truncate text-[15px] font-semibold tracking-tight text-ink">{project.name}</h2>
        <p className="mt-1 line-clamp-2 min-h-10 text-[13px] leading-5 text-ink-muted">
          {project.description || "A shared space for planning and tracking work."}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/80 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-control bg-surface-subtle px-2 py-1 font-mono text-[11px] font-semibold tracking-wide text-ink">
            {project.key || "NO KEY"}
          </span>
          <span className="truncate text-xs text-ink-muted">{roleLabel(project.role)}</span>
        </div>
        <span className="shrink-0 text-xs text-ink-faint">Project</span>
      </div>
    </Link>
  );
}

function ProjectSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="min-h-52 animate-pulse rounded-panel border border-line bg-surface p-5 motion-reduce:animate-none">
          <div className="h-11 w-11 rounded-[9px] bg-surface-subtle" />
          <div className="mt-5 h-4 w-2/3 rounded bg-surface-subtle" />
          <div className="mt-3 h-3 w-full rounded bg-surface-subtle" />
          <div className="mt-2 h-3 w-4/5 rounded bg-surface-subtle" />
          <div className="mt-7 h-7 rounded bg-surface-subtle" />
        </div>
      ))}
    </div>
  );
}

function CreateProjectDialog({ organizationId, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("KANBAN");
  const [keyEdited, setKeyEdited] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createProject(organizationId, {
        name: name.trim(),
        key: key.trim().toUpperCase(),
        slug: slug.trim().toLowerCase(),
        description: description.trim(),
        projectType,
      });
      onCreated();
    } catch (err) {
      setError(err.message || "Couldn't create this project. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="create-project-title" className="my-auto w-full max-w-lg rounded-[14px] border border-line bg-surface p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-accent-support">New workspace</p>
            <h2 id="create-project-title" className="mt-1 text-xl font-semibold tracking-tight">Create a project</h2>
            <p className="mt-1 text-sm text-ink-muted">Give this work a name and a home.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close dialog" className="rounded-control p-2 text-ink-muted hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-accent-support">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Project name</span>
            <input
              autoFocus
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                if (!keyEdited) setKey(keyify(value));
                if (!slugEdited) setSlug(slugify(value));
              }}
              placeholder="e.g. Website redesign"
              className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm outline-none transition focus:border-accent-support focus:ring-2 focus:ring-accent-support/15"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Project key</span>
              <input
                required
                minLength={2}
                maxLength={10}
                pattern="[A-Za-z][A-Za-z0-9]*"
                value={key}
                onChange={(event) => { setKey(event.target.value.toUpperCase()); setKeyEdited(true); }}
                placeholder="WEB"
                className="h-10 w-full rounded-control border border-line bg-surface px-3 font-mono text-sm uppercase outline-none focus:border-accent-support focus:ring-2 focus:ring-accent-support/15"
              />
              <span className="mt-1 block text-[11px] text-ink-muted">2–10 letters or numbers</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">URL slug</span>
              <input
                required
                minLength={2}
                value={slug}
                onChange={(event) => { setSlug(slugify(event.target.value)); setSlugEdited(true); }}
                placeholder="website-redesign"
                className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm outline-none focus:border-accent-support focus:ring-2 focus:ring-accent-support/15"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Project type</span>
            <select value={projectType} onChange={(event) => setProjectType(event.target.value)} className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm outline-none focus:border-accent-support focus:ring-2 focus:ring-accent-support/15">
              <option value="KANBAN">Kanban</option>
              <option value="SCRUM">Scrum</option>
            </select>
            <span className="mt-1 block text-[11px] text-ink-muted">This sets the project type. Board and sprint workflows are not enabled yet.</span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Description <span className="font-normal text-ink-faint">(optional)</span></span>
            <textarea
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project about?"
              className="w-full resize-y rounded-control border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent-support focus:ring-2 focus:ring-accent-support/15"
            />
          </label>

          {error && <p role="alert" className="rounded-control bg-danger/8 px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-control px-4 text-sm font-medium text-ink-muted hover:bg-surface-subtle disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving || !name.trim() || key.trim().length < 2 || slug.trim().length < 2} className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Creating…" : "Create project"}
              {!saving && <Plus size={16} />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { currentOrg, orgStatus, projects, projectsStatus, projectsError, reloadProjects } = useOrganization();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = ["OWNER", "ADMIN"].includes(currentOrg?.role);
  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesType = filter === "ALL" || project.projectType === filter;
      const matchesQuery = !normalizedQuery ||
        project.name.toLowerCase().includes(normalizedQuery) ||
        project.key.toLowerCase().includes(normalizedQuery) ||
        project.description.toLowerCase().includes(normalizedQuery);
      return matchesType && matchesQuery;
    });
  }, [projects, query, filter]);

  if (orgStatus === "loading" || (currentOrg && projectsStatus === "loading")) {
    return (
      <div className="mx-auto max-w-6xl space-y-7">
        <div className="space-y-2"><div className="h-3 w-24 animate-pulse rounded bg-surface-subtle" /><div className="h-8 w-52 animate-pulse rounded bg-surface-subtle" /></div>
        <ProjectSkeleton />
      </div>
    );
  }

  if (orgStatus === "error") {
    return <div className="mx-auto max-w-6xl rounded-panel border border-line bg-surface p-6"><p role="alert" className="text-sm text-danger">Couldn't load your organizations.</p></div>;
  }

  if (!currentOrg) {
    return (
      <section className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-subtle text-ink-muted"><FolderKanban size={25} /></span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Start with an organization</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">Projects live inside an organization. Create one first, then bring your team’s work together.</p>
        <button type="button" onClick={() => navigate("/organizations/new")} className="mt-5 rounded-control bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong">Create organization</button>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-support">{currentOrg.name} / Workspace</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[32px]">Projects</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink-muted">A focused home for the work your team is moving forward.</p>
        </div>
        {canCreate && (
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support">
            <Plus size={17} /> Create project
          </button>
        )}
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Project summary">
        <div className="rounded-panel border border-line bg-surface px-4 py-3.5">
          <p className="text-xs text-ink-muted">Your projects</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{projectsStatus === "error" ? "—" : projects.length}</p>
        </div>
        <div className="rounded-panel border border-line bg-surface px-4 py-3.5">
          <p className="text-xs text-ink-muted">Kanban projects</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{projectsStatus === "error" ? "—" : projects.filter((p) => p.projectType === "KANBAN").length}</p>
        </div>
        <div className="rounded-panel border border-line bg-surface px-4 py-3.5">
          <p className="text-xs text-ink-muted">Scrum projects</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{projectsStatus === "error" ? "—" : projects.filter((p) => p.projectType === "SCRUM").length}</p>
        </div>
      </section>

      <section aria-label="Project directory">
        <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Your workspace</h2>
            <p className="mt-0.5 text-xs text-ink-muted">{projects.length} {projects.length === 1 ? "project" : "projects"} in {currentOrg.name}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 sm:w-64">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects…" aria-label="Search projects" className="h-9 w-full rounded-control border border-line bg-surface pl-9 pr-3 text-sm outline-none transition placeholder:text-ink-faint focus:border-accent-support focus:ring-2 focus:ring-accent-support/10" />
            </label>
            <label className="relative">
              <SlidersHorizontal size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <select aria-label="Filter projects by type" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-9 w-full appearance-none rounded-control border border-line bg-surface pl-8 pr-8 text-sm text-ink outline-none focus:border-accent-support sm:w-36">
                {FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {projectsStatus === "error" && (
          <div className="mt-5 flex flex-col items-start gap-3 rounded-panel border border-danger/25 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium">Projects couldn't be loaded</p><p className="mt-1 text-sm text-ink-muted">{projectsError || "Check your connection and try again."}</p></div>
            <button type="button" onClick={reloadProjects} className="inline-flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm font-medium hover:bg-surface-subtle"><RefreshCw size={14} /> Try again</button>
          </div>
        )}

        {projectsStatus === "ready" && projects.length === 0 && (
          <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-panel border border-dashed border-ink-faint/40 bg-surface/70 px-6 py-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-lime/35 text-emerald"><FolderKanban size={23} /></span>
            <h3 className="mt-4 text-base font-semibold">Your first project starts here</h3>
            <p className="mt-1.5 max-w-sm text-sm leading-6 text-ink-muted">Create a project for a product, client, or team initiative. Keep tasks and progress organized in one place.</p>
            {canCreate && <button type="button" onClick={() => setShowCreate(true)} className="mt-5 inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong"><Plus size={16} /> Create your first project</button>}
            {!canCreate && <p className="mt-4 text-xs text-ink-faint">Ask an organization owner or admin to create a project.</p>}
          </div>
        )}

        {projectsStatus === "ready" && projects.length > 0 && visibleProjects.length === 0 && (
          <div className="mt-5 rounded-panel border border-line bg-surface px-5 py-12 text-center">
            <p className="text-sm font-medium">No matching projects</p>
            <p className="mt-1 text-sm text-ink-muted">Try another name, key, or project type.</p>
            <button type="button" onClick={() => { setQuery(""); setFilter("ALL"); }} className="mt-3 text-sm font-semibold text-accent-support hover:underline">Clear filters</button>
          </div>
        )}

        {projectsStatus === "ready" && visibleProjects.length > 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
          </div>
        )}
      </section>

      {showCreate && (
        <CreateProjectDialog
          organizationId={currentOrg.id}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); reloadProjects(); }}
        />
      )}
    </div>
  );
}
