import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, CircleDot, ListFilter, RefreshCw, Search } from "lucide-react";
import { getProject, getProjectIssues, updateIssue } from "../lib/api";

const PRIORITY = {
  LOWEST: "text-ink-faint",
  LOW: "text-priority-low",
  MEDIUM: "text-priority-medium",
  HIGH: "text-priority-high",
  HIGHEST: "text-danger",
};
const label = (value = "") => String(value).toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
const issueId = (issue) => issue._id ?? issue.id;

export default function ProjectBacklogPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [visible, setVisible] = useState(20);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  async function load() {
    setStatus("loading");
    setError("");
    try {
      const [projectResult, issueResult] = await Promise.all([
        getProject(projectId),
        getProjectIssues(projectId, { status: "BACKLOG", limit: 100 }),
      ]);
      setProject(projectResult?.project ?? projectResult);
      setIssues(Array.isArray(issueResult) ? issueResult : []);
      setVisible(20);
      setStatus("ready");
    } catch (err) {
      setError(err.message || "Couldn't load the project backlog.");
      setStatus("error");
    }
  }

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");
    Promise.all([
      getProject(projectId),
      getProjectIssues(projectId, { status: "BACKLOG", limit: 100 }),
    ])
      .then(([projectResult, issueResult]) => {
        if (cancelled) return;
        setProject(projectResult?.project ?? projectResult);
        setIssues(Array.isArray(issueResult) ? issueResult : []);
        setVisible(20);
        setStatus("ready");
      })
      .catch((err) => {
        if (!cancelled) { setError(err.message || "Couldn't load the project backlog."); setStatus("error"); }
      });
    return () => { cancelled = true; };
  }, [projectId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return issues.filter((issue) => {
      const matchesQuery = !needle || [issue.title, issue.issueKey, issue.key, issue.description]
        .some((value) => String(value ?? "").toLowerCase().includes(needle));
      return matchesQuery && (type === "ALL" || issue.type === type);
    });
  }, [issues, query, type]);

  async function moveToTodo(issue) {
    const id = issueId(issue);
    setBusyId(id);
    setActionError("");
    try {
      await updateIssue(projectId, id, { status: "TODO" });
      setIssues((items) => items.filter((item) => issueId(item) !== id));
    } catch (err) {
      setActionError(err.message || "Couldn't move this issue.");
    } finally {
      setBusyId(null);
    }
  }

  const projectName = project?.name ?? "Project";
  const projectKey = project?.key ?? "";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <Link to={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 hover:text-ink"><ArrowLeft size={15} /> {projectName}</Link>
        <span aria-hidden="true">/</span><span className="font-medium text-ink">Backlog</span>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">{projectKey || "Project"} · Work planning</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Backlog</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">A focused list of work that has not moved into the active workflow yet.</p>
        </div>
        <div className="rounded-control border border-line bg-surface px-3 py-2 text-sm"><span className="font-semibold tabular-nums text-ink">{issues.length}</span><span className="ml-1.5 text-ink-muted">backlog issues</span></div>
      </header>

      <section className="overflow-hidden rounded-panel border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input aria-label="Search backlog" value={query} onChange={(event) => { setQuery(event.target.value); setVisible(20); }} placeholder="Search backlog…" className={`${"h-10 w-full rounded-control border border-line bg-surface px-3 pl-9 text-sm text-ink outline-none focus:border-accent-support"}`} />
            </label>
            <label className="relative">
              <ListFilter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <select aria-label="Filter backlog by issue type" value={type} onChange={(event) => { setType(event.target.value); setVisible(20); }} className="h-10 w-full rounded-control border border-line bg-surface pl-9 pr-8 text-sm text-ink outline-none focus:border-accent-support sm:w-44">
                <option value="ALL">All issue types</option><option value="EPIC">Epic</option><option value="STORY">Story</option><option value="TASK">Task</option><option value="BUG">Bug</option><option value="SUB_TASK">Sub-task</option>
              </select>
            </label>
          </div>
          <button type="button" onClick={load} disabled={status === "loading"} className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-line px-3 text-sm font-medium text-ink hover:bg-surface-subtle disabled:opacity-50"><RefreshCw size={14} className={status === "loading" ? "animate-spin" : ""} /> Refresh</button>
        </div>

        {actionError && <p role="alert" className="border-b border-danger/20 bg-danger/5 px-5 py-3 text-sm text-danger">{actionError}</p>}
        {status === "loading" && <div className="space-y-3 p-5" aria-label="Loading backlog">{[0,1,2,3,4].map((item) => <div key={item} className="h-14 animate-pulse rounded-control bg-surface-subtle" />)}</div>}
        {status === "error" && <div className="px-5 py-12 text-center"><p role="alert" className="text-sm text-danger">{error}</p><button type="button" onClick={load} className="mt-3 text-sm font-semibold text-ink underline">Try again</button></div>}
        {status === "ready" && filtered.length === 0 && <div className="px-5 py-14 text-center"><CircleDot size={24} className="mx-auto text-ink-faint" /><p className="mt-3 text-sm font-semibold text-ink">{issues.length ? "No matching issues" : "Your backlog is clear"}</p><p className="mt-1 text-sm text-ink-muted">{issues.length ? "Try another search or issue type." : "New issues created with Backlog status will appear here."}</p></div>}
        {status === "ready" && filtered.length > 0 && <ul className="divide-y divide-line">
          {filtered.slice(0, visible).map((issue) => {
            const id = issueId(issue);
            const assignee = issue.assignee && typeof issue.assignee === "object" ? [issue.assignee.firstName, issue.assignee.lastName].filter(Boolean).join(" ") || issue.assignee.email : issue.assigneeTeam?.name || "Unassigned";
            return <li key={id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <CircleDot size={17} className="mt-0.5 shrink-0 text-ink-faint" />
                <div className="min-w-0">
                  <Link to={`/projects/${projectId}/issues/${id}`} className="break-words text-sm font-semibold text-ink hover:text-accent-support">{issue.title}</Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted"><span className="font-mono">{issue.issueKey ?? issue.key ?? "Issue"}</span><span>{label(issue.type ?? "TASK")}</span><span className={PRIORITY[issue.priority] ?? "text-ink-muted"}>{label(issue.priority ?? "MEDIUM")}</span><span>{assignee}</span>{issue.dueDate && <span>Due {new Date(issue.dueDate).toLocaleDateString()}</span>}</div>
                </div>
              </div>
              <button type="button" onClick={() => moveToTodo(issue)} disabled={busyId === id} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 self-start rounded-control border border-line px-3 text-xs font-semibold text-ink hover:bg-surface-subtle disabled:opacity-50 sm:self-center">{busyId === id ? "Moving…" : "Move to To do"} <ArrowRight size={14} /></button>
            </li>;
          })}
        </ul>}
        {status === "ready" && filtered.length > visible && <div className="border-t border-line p-4 text-center"><button type="button" onClick={() => setVisible((count) => count + 20)} className="rounded-control border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-subtle">Load 20 more</button><p className="mt-2 text-xs text-ink-faint">Showing {Math.min(visible, filtered.length)} of {filtered.length} matching issues</p></div>}
        {status === "ready" && issues.length >= 100 && <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">Showing up to the 100 most recently updated backlog issues. Server-side pagination can extend this view when prioritization is added.</p>}
      </section>
    </div>
  );
}
