import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, CircleDot, Plus, RefreshCw } from "lucide-react";
import { getProject, getProjectIssues, updateIssue } from "../lib/api";

const COLUMNS = [
  { id: "TODO", title: "To do", color: "bg-status-todo" },
  { id: "IN_PROGRESS", title: "In progress", color: "bg-status-progress" },
  { id: "IN_REVIEW", title: "In review", color: "bg-status-review" },
  { id: "DONE", title: "Done", color: "bg-status-done" },
];
const TRANSITIONS = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["TODO", "IN_REVIEW"],
  IN_REVIEW: ["IN_PROGRESS", "DONE"],
  DONE: ["IN_REVIEW"],
};
const PRIORITY = {
  LOWEST: "text-ink-faint",
  LOW: "text-priority-low",
  MEDIUM: "text-priority-medium",
  HIGH: "text-priority-high",
  HIGHEST: "text-danger",
};
const issueId = (issue) => issue._id ?? issue.id;
const label = (value = "") => String(value).toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());

function IssueCard({ issue, projectId, onMove, moving, onDragStart, canMove }) {
  const assignee = issue.assignee && typeof issue.assignee === "object"
    ? [issue.assignee.firstName, issue.assignee.lastName].filter(Boolean).join(" ") || issue.assignee.email
    : "Unassigned";
  const available = TRANSITIONS[issue.status] ?? [];
  return <article draggable={canMove} onDragStart={(event) => onDragStart(event, issue)} className="group rounded-xl border border-line bg-surface p-3.5 shadow-sm transition hover:border-ink-faint/60 hover:shadow-md active:cursor-grabbing">
    <div className="flex items-start justify-between gap-2"><span className="font-mono text-[10px] font-semibold tracking-wide text-ink-faint">{issue.issueKey ?? "ISSUE"}</span><span className={`text-[10px] font-semibold ${PRIORITY[issue.priority] ?? "text-ink-muted"}`}>{label(issue.priority ?? "MEDIUM")}</span></div>
    <Link to={`/projects/${projectId}/issues/${issueId(issue)}`} className="mt-2 block text-sm font-semibold leading-5 text-ink hover:text-accent-support">{issue.title}</Link>
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3"><span className="max-w-[65%] truncate text-[11px] text-ink-muted">{assignee}</span><span className="text-[10px] text-ink-faint">{label(issue.type ?? "TASK")}</span></div>
    {canMove && available.length > 0 && <label className="mt-3 block"><span className="sr-only">Move {issue.issueKey} to another status</span><select aria-label={`Move ${issue.issueKey} to status`} value="" disabled={moving} onChange={(event) => event.target.value && onMove(issue, event.target.value)} className="h-8 w-full rounded-control border border-line bg-canvas px-2 text-[11px] text-ink-muted outline-none focus:border-accent-support disabled:opacity-50"><option value="">Move to…</option>{available.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>}
  </article>;
}

export default function ProjectBoardPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [projectRole, setProjectRole] = useState(null);
  const [issues, setIssues] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [movingId, setMovingId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const [projectResult, ...columns] = await Promise.all([
        getProject(projectId),
        ...COLUMNS.map((column) => getProjectIssues(projectId, { status: column.id, limit: 100 })),
      ]);
      setProject(projectResult?.project ?? projectResult);
      setProjectRole(projectResult?.role ?? null);
      setIssues(columns.flat().filter((issue) => issue && issue.status !== "BACKLOG"));
      setStatus("ready");
    } catch (err) {
      setError(err.message || "Couldn't load this board.");
      setStatus("error");
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const canMove = projectRole !== "VIEWER";

  const grouped = useMemo(() => Object.fromEntries(COLUMNS.map((column) => [column.id, issues.filter((issue) => issue.status === column.id)])), [issues]);

  async function moveIssue(issue, nextStatus) {
    const id = issueId(issue);
    if (!TRANSITIONS[issue.status]?.includes(nextStatus) || movingId) return;
    const previous = issue.status;
    setMovingId(id);
    setNotice("");
    setError("");
    setIssues((items) => items.map((item) => issueId(item) === id ? { ...item, status: nextStatus } : item));
    try {
      const updated = await updateIssue(projectId, id, { status: nextStatus });
      setIssues((items) => items.map((item) => issueId(item) === id ? { ...item, ...updated, status: updated.status ?? nextStatus } : item));
      setNotice(`${issue.issueKey ?? "Issue"} moved to ${label(nextStatus)}.`);
    } catch (err) {
      setIssues((items) => items.map((item) => issueId(item) === id ? { ...item, status: previous } : item));
      setError(err.message || "Couldn't move this issue.");
    } finally { setMovingId(null); setDraggedId(null); setDragOver(null); }
  }

  function onDragStart(event, issue) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(issueId(issue)));
    setDraggedId(issueId(issue));
  }

  function onDrop(event, targetStatus) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggedId;
    const issue = issues.find((item) => String(issueId(item)) === String(id));
    setDragOver(null);
    if (issue) moveIssue(issue, targetStatus);
  }

  if (status === "loading") return <div className="mx-auto max-w-[1400px] space-y-5"><div className="h-8 w-56 animate-pulse rounded bg-surface-subtle" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((item) => <div key={item} className="h-96 animate-pulse rounded-panel border border-line bg-surface" />)}</div></div>;
  if (status === "error") return <div className="mx-auto max-w-xl rounded-panel border border-line bg-surface p-8 text-center"><p role="alert" className="text-sm text-danger">{error}</p><button type="button" onClick={load} className="mt-4 text-sm font-semibold underline">Try again</button></div>;

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted"><Link to={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 hover:text-ink"><ArrowLeft size={15} />{project?.name ?? "Project"}</Link><span>/</span><span className="font-medium text-ink">Board</span></div><div className="flex flex-wrap gap-2"><Link to={`/projects/${projectId}/backlog`} className="inline-flex h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-xs font-semibold text-ink hover:bg-surface-subtle">Backlog</Link><Link to={`/projects/${projectId}/issues`} className="inline-flex h-9 items-center gap-2 rounded-control bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-strong"><Plus size={14} /> Create / view issues</Link><button type="button" onClick={load} className="grid h-9 w-9 place-items-center rounded-control border border-line bg-surface text-ink-muted hover:bg-surface-subtle" aria-label="Refresh board"><RefreshCw size={15} /></button></div></div>
    <header><p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">{project?.key ?? "Project"} · {project?.projectType ?? "KANBAN"}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Board</h1><p className="mt-2 text-sm text-ink-muted">Move issues through your workflow. Drag a card between adjacent stages or use its status menu.</p></header>
    {error && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
    {notice && <p role="status" className="rounded-control border border-line bg-surface px-4 py-2.5 text-sm text-ink-muted">{notice}</p>}
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((column) => <section key={column.id} onDragOver={(event) => { event.preventDefault(); setDragOver(column.id); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(null); }} onDrop={(event) => onDrop(event, column.id)} className={`min-h-[420px] rounded-panel border p-3 transition-colors ${dragOver === column.id ? "border-accent-support bg-accent-support/5" : "border-line bg-canvas"}`}>
        <header className="mb-3 flex items-center justify-between gap-2 px-1"><div className="flex min-w-0 items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${column.color}`} /><h2 className="truncate text-sm font-semibold text-ink">{column.title}</h2><span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold tabular-nums text-ink-muted">{grouped[column.id].length}</span></div><CircleDot size={15} className="text-ink-faint" /></header>
        <div className="space-y-2.5">{grouped[column.id].length === 0 ? <div className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-xs text-ink-faint">Drop an issue here</div> : grouped[column.id].map((issue) => <IssueCard key={issueId(issue)} issue={issue} projectId={projectId} onMove={moveIssue} moving={movingId === issueId(issue)} onDragStart={onDragStart} canMove={canMove} />)}</div>
      </section>)}
    </div>
    {!canMove && <p className="text-xs text-ink-faint">You have viewer access. Issue movement is disabled.</p>}
    <p className="text-xs text-ink-faint">Showing up to 100 issues per workflow column. Backlog issues are managed separately. Status transitions follow the project's configured workflow rules.</p>
  </div>;
}
