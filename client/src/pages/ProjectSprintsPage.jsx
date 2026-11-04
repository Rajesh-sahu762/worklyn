import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, CalendarDays, Check, CircleDot, Flag, LoaderCircle, Plus, Rocket } from "lucide-react";
import {
  assignIssueToSprint,
  completeSprint,
  createSprint,
  getProject,
  getProjectIssues,
  getSprints,
  startSprint,
  updateSprint,
} from "../lib/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { Field, inputClass } from "../components/AuthShell";

const idOf = (item) => item?._id ?? item?.id;
const label = (value = "") => String(value).toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
const dateLabel = (value) => value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Not set";

function SprintForm({ initial, onCreate, onCancel, saving }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ? new Date(initial.startDate).toISOString().slice(0, 10) : "");
  const [endDate, setEndDate] = useState(initial?.endDate ? new Date(initial.endDate).toISOString().slice(0, 10) : "");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Sprint name must contain at least 2 characters.");
    if (startDate && endDate && endDate <= startDate) return setError("End date must be after start date.");
    try {
      await onCreate({ name: name.trim(), goal: goal.trim(), startDate: startDate || null, endDate: endDate || null });
      setName(""); setGoal(""); setStartDate(""); setEndDate("");
    } catch (err) { setError(err.message || "Couldn't create sprint."); }
  }

  return <form onSubmit={submit} className="space-y-4 rounded-panel border border-line bg-surface p-5">
    <div><h2 className="font-semibold text-ink">{initial ? "Edit planned sprint" : "Create a sprint"}</h2><p className="mt-1 text-xs text-ink-muted">Plan a focused iteration for this Scrum project.</p></div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Field id="sprint-name" label="Sprint name"><input id="sprint-name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass(false)} placeholder="e.g. Sprint 01" /></Field>
    <Field id="sprint-goal" label="Sprint goal" hint={`Optional · ${goal.length}/500`}><textarea id="sprint-goal" rows={2} maxLength={500} value={goal} onChange={(event) => setGoal(event.target.value)} className={inputClass(false)} placeholder="What should the team achieve?" /></Field>
    <div className="grid gap-3 sm:grid-cols-2"><Field id="sprint-start" label="Start date"><input id="sprint-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass(false)} /></Field><Field id="sprint-end" label="End date"><input id="sprint-end" type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass(false)} /></Field></div>
    <div className="flex justify-end gap-2">{onCancel && <button type="button" onClick={onCancel} disabled={saving} className="rounded-control border border-line px-4 py-2.5 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>}<button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50">{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}{saving ? "Saving…" : initial ? "Save sprint" : "Create sprint"}</button></div>
  </form>;
}

export default function ProjectSprintsPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [role, setRole] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [issuesBySprint, setIssuesBySprint] = useState({});
  const [backlog, setBacklog] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmSprint, setConfirmSprint] = useState(null);

  const canManage = role === "PROJECT_ADMIN";
  const activeSprint = sprints.find((sprint) => sprint.status === "ACTIVE");
  const plannedSprints = sprints.filter((sprint) => sprint.status === "PLANNED");
  const completedSprints = sprints.filter((sprint) => sprint.status === "COMPLETED");

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const [projectResult, sprintList] = await Promise.all([getProject(projectId), getSprints(projectId)]);
      const currentProject = projectResult?.project ?? projectResult;
      setProject(currentProject);
      setRole(projectResult?.role ?? null);
      const issueResults = await Promise.all([
        ...sprintList.map((sprint) => getProjectIssues(projectId, { sprint: idOf(sprint), limit: 100 })),
        getProjectIssues(projectId, { status: "BACKLOG", sprint: "none", limit: 100 }),
      ]);
      setSprints(sprintList);
      setIssuesBySprint(Object.fromEntries(sprintList.map((sprint, index) => [idOf(sprint), issueResults[index]])));
      setBacklog(issueResults[issueResults.length - 1] ?? []);
      setStatus("ready");
    } catch (err) {
      setError(err.message || "Couldn't load sprint planning.");
      setStatus("error");
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function saveSprint(payload) {
    setSaving(true);
    try {
      if (editingSprint) {
        await updateSprint(projectId, idOf(editingSprint), payload);
        setEditingSprint(null);
        setNotice("Planned sprint updated.");
      } else {
        await createSprint(projectId, payload);
        setShowCreate(false);
        setNotice("Sprint created. Add backlog issues, then start it when the team is ready.");
      }
      await load();
    } finally { setSaving(false); }
  }


  async function start(sprint) {
    setBusyId(idOf(sprint));
    setError("");
    try {
      await startSprint(projectId, idOf(sprint));
      await load();
      setNotice(`${sprint.name} is now active.`);
    } catch (err) { setError(err.message || "Couldn't start this sprint."); }
    finally { setBusyId(null); }
  }

  async function finishSprint() {
    if (!confirmSprint) return;
    const sprint = confirmSprint;
    setBusyId(idOf(sprint));
    try {
      await completeSprint(projectId, idOf(sprint));
      setConfirmSprint(null);
      await load();
      setNotice("Sprint completed. Unfinished work was returned to the backlog.");
    } catch (err) { setError(err.message || "Couldn't complete this sprint."); setConfirmSprint(null); }
    finally { setBusyId(null); }
  }

  async function assign(issue, sprintId) {
    setBusyId(idOf(issue));
    setError("");
    try {
      await assignIssueToSprint(projectId, idOf(issue), sprintId || null);
      await load();
      setNotice(`${issue.issueKey ?? "Issue"} sprint assignment updated.`);
    } catch (err) { setError(err.message || "Couldn't update sprint assignment."); }
    finally { setBusyId(null); }
  }

  const totalPlanned = useMemo(() => plannedSprints.reduce((sum, sprint) => sum + (issuesBySprint[idOf(sprint)]?.length ?? 0), 0), [plannedSprints, issuesBySprint]);

  if (status === "loading") return <div className="mx-auto max-w-5xl space-y-4"><div className="h-8 w-56 animate-pulse rounded bg-surface-subtle" /><div className="h-52 animate-pulse rounded-panel bg-surface-subtle" /><div className="h-72 animate-pulse rounded-panel bg-surface-subtle" /></div>;
  if (status === "error") return <div className="mx-auto max-w-xl rounded-panel border border-line bg-surface p-8 text-center"><p role="alert" className="text-sm text-danger">{error}</p><button type="button" onClick={load} className="mt-4 text-sm font-semibold underline">Try again</button></div>;
  if (project?.projectType !== "SCRUM") return <div className="mx-auto max-w-xl rounded-panel border border-line bg-surface p-8 text-center"><Flag size={26} className="mx-auto text-ink-faint" /><h1 className="mt-3 text-xl font-semibold text-ink">Sprints are for Scrum projects</h1><p className="mt-2 text-sm text-ink-muted">This project uses a Kanban workflow. You can still manage work on its board.</p><Link to={`/projects/${projectId}/board`} className="mt-4 inline-flex text-sm font-semibold text-accent-support hover:underline">Open project board</Link></div>;

  const sprintIssues = activeSprint ? issuesBySprint[idOf(activeSprint)] ?? [] : [];

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm text-ink-muted"><Link to={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 hover:text-ink"><ArrowLeft size={15} />{project?.name ?? "Project"}</Link><span>/</span><span className="font-medium text-ink">Sprints</span></div><div className="flex gap-2"><Link to={`/projects/${projectId}/backlog`} className="rounded-control border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle">Backlog</Link><Link to={`/projects/${projectId}/board`} className="rounded-control border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle">Board</Link></div></div>
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">{project?.key ?? "Project"} · Scrum planning</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Sprint planning</h1><p className="mt-2 text-sm text-ink-muted">Plan iterations, commit backlog work and review completed delivery.</p></div>{canManage && <button type="button" onClick={() => { setEditingSprint(null); setShowCreate((value) => !value); }} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-control bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong"><Plus size={15} /> Plan sprint</button>}</header>
    {error && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
    {notice && <p role="status" className="flex items-center gap-2 rounded-control border border-line bg-surface px-4 py-3 text-sm text-ink-muted"><Check size={15} />{notice}</p>}
    {(showCreate || editingSprint) && <SprintForm initial={editingSprint} onCreate={saveSprint} onCancel={() => { setShowCreate(false); setEditingSprint(null); }} saving={saving} />}

    {activeSprint ? <section className="overflow-hidden rounded-panel border border-accent-support/30 bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-status-progress" /><span className="text-xs font-semibold uppercase tracking-[0.14em] text-status-progress">Active sprint</span></div>{canManage && <button type="button" onClick={() => setConfirmSprint(activeSprint)} disabled={busyId === idOf(activeSprint)} className="rounded-control border border-danger/25 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/5 disabled:opacity-50">Complete sprint</button>}</div>
      <div className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-ink">{activeSprint.name}</h2><p className="mt-1 max-w-2xl text-sm text-ink-muted">{activeSprint.goal || "No sprint goal added."}</p></div><span className="rounded-full bg-status-progress/10 px-3 py-1 text-xs font-semibold text-status-progress">{sprintIssues.length} issues</span></div><div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-muted"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{dateLabel(activeSprint.startDate)} – {dateLabel(activeSprint.endDate)}</span><span>{sprintIssues.filter((issue) => issue.status === "DONE").length} completed</span><span>{sprintIssues.filter((issue) => issue.status !== "DONE").length} remaining</span></div>
        {sprintIssues.length === 0 ? <div className="mt-5 rounded-control border border-dashed border-line p-6 text-center text-sm text-ink-muted">No issues in this sprint yet. Assign planned work from the backlog below.</div> : <ul className="mt-5 divide-y divide-line rounded-control border border-line">{sprintIssues.map((issue) => <li key={idOf(issue)} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"><Link to={`/projects/${projectId}/issues/${idOf(issue)}`} className="min-w-0"><span className="font-mono text-[10px] text-ink-faint">{issue.issueKey}</span><span className="ml-2 text-sm font-medium text-ink hover:text-accent-support">{issue.title}</span></Link><div className="flex items-center gap-3"><span className="text-xs text-ink-muted">{label(issue.status)}</span>{canManage && <button type="button" onClick={() => assign(issue, "")} disabled={busyId === idOf(issue)} className="text-xs font-semibold text-danger hover:underline">Remove from sprint</button>}</div></li>)}</ul>}
      </div>
    </section> : <section className="rounded-panel border border-dashed border-line bg-surface p-6 text-center"><Rocket size={25} className="mx-auto text-ink-faint" /><h2 className="mt-3 font-semibold text-ink">No active sprint</h2><p className="mt-1 text-sm text-ink-muted">Start a planned sprint when the team is ready to begin an iteration.</p></section>}

    <section className="overflow-hidden rounded-panel border border-line bg-surface"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h2 className="font-semibold text-ink">Backlog ready for sprint</h2><p className="mt-0.5 text-xs text-ink-muted">{backlog.length} unassigned backlog issues</p></div><span className="text-xs text-ink-faint">{canManage ? "Assign issues to a planned or active sprint" : "Only project admins can plan sprint work"}</span></div>{backlog.length === 0 ? <p className="px-5 py-10 text-center text-sm text-ink-muted">No unassigned backlog issues. Add work from the project backlog.</p> : <ul className="divide-y divide-line">{backlog.map((issue) => <li key={idOf(issue)} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><span className="font-mono text-[10px] text-ink-faint">{issue.issueKey}</span><Link to={`/projects/${projectId}/issues/${idOf(issue)}`} className="ml-2 text-sm font-semibold text-ink hover:text-accent-support">{issue.title}</Link></div>{canManage && <label className="flex items-center gap-2 text-xs text-ink-muted"><span className="sr-only">Assign {issue.issueKey} to sprint</span><select aria-label={`Assign ${issue.issueKey} to sprint`} disabled={busyId === idOf(issue) || (!activeSprint && plannedSprints.length === 0)} value="" onChange={(event) => event.target.value && assign(issue, event.target.value)} className="h-9 min-w-44 rounded-control border border-line bg-surface px-2.5 text-xs text-ink"><option value="">Add to sprint…</option>{activeSprint && <option value={idOf(activeSprint)}>{activeSprint.name} (Active)</option>}{plannedSprints.map((sprint) => <option key={idOf(sprint)} value={idOf(sprint)}>{sprint.name}</option>)}</select></label>}</li>)}</ul>}</section>

    <section className="space-y-3"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-ink">Planned sprints</h2><p className="mt-0.5 text-xs text-ink-muted">{plannedSprints.length} planned · {totalPlanned} assigned issues</p></div></div>{plannedSprints.length === 0 ? <div className="rounded-panel border border-line bg-surface px-5 py-8 text-center text-sm text-ink-muted">No planned sprints yet.</div> : plannedSprints.map((sprint) => <article key={idOf(sprint)} className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="min-w-0"><h3 className="font-semibold text-ink">{sprint.name}</h3><p className="mt-1 line-clamp-2 text-sm text-ink-muted">{sprint.goal || "No sprint goal added."}</p><p className="mt-2 text-xs text-ink-faint">{dateLabel(sprint.startDate)} – {dateLabel(sprint.endDate)} · {issuesBySprint[idOf(sprint)]?.length ?? 0} issues</p></div>{canManage && <div className="flex shrink-0 gap-2"><button type="button" onClick={() => { setShowCreate(false); setEditingSprint(sprint); }} className="rounded-control border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle">Edit</button><button type="button" onClick={() => start(sprint)} disabled={!!busyId || (activeSprint && activeSprint._id !== sprint._id)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-control border border-line px-3 text-xs font-semibold text-ink hover:bg-surface-subtle disabled:opacity-50"><Rocket size={14} />{busyId === idOf(sprint) ? "Starting…" : "Start sprint"}</button></div>}</article>)}</section>

    {completedSprints.length > 0 && <section className="space-y-3"><h2 className="font-semibold text-ink">Completed sprints</h2>{completedSprints.map((sprint) => <article key={idOf(sprint)} className="flex items-center justify-between gap-3 rounded-panel border border-line bg-surface p-4"><div><h3 className="text-sm font-semibold text-ink">{sprint.name}</h3><p className="mt-1 text-xs text-ink-muted">Completed {dateLabel(sprint.completedAt)}</p></div><span className="rounded-full bg-status-done/10 px-2.5 py-1 text-xs font-semibold text-status-done">Completed</span></article>)}</section>}

    {!canManage && <p className="text-xs text-ink-faint">You have read-only sprint planning access. Project admins can create, start, complete and assign sprint work.</p>}
    <ConfirmDialog open={!!confirmSprint} title={`Complete ${confirmSprint?.name ?? "sprint"}?`} confirmLabel="Complete sprint" pending={!!busyId} onConfirm={finishSprint} onCancel={() => !busyId && setConfirmSprint(null)}>Unfinished issues will be moved back to the backlog. Completed issues remain associated with this sprint for historical reporting.</ConfirmDialog>
  </div>;
}
