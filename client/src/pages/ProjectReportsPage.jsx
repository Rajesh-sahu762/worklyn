import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, BarChart3, CalendarClock, CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";
import { getProject, getProjectReport } from "../lib/api";

const STATUS_META = [
  { id: "BACKLOG", label: "Backlog", color: "bg-status-backlog" },
  { id: "TODO", label: "To do", color: "bg-status-todo" },
  { id: "IN_PROGRESS", label: "In progress", color: "bg-status-progress" },
  { id: "IN_REVIEW", label: "In review", color: "bg-status-review" },
  { id: "DONE", label: "Done", color: "bg-status-done" },
];
const PRIORITY_META = [
  { id: "LOWEST", label: "Lowest" },
  { id: "LOW", label: "Low" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HIGH", label: "High" },
  { id: "HIGHEST", label: "Highest" },
];

function Metric({ label, value, icon: Icon, tone = "text-ink" }) {
  return <article className="rounded-panel border border-line bg-surface p-5"><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-ink-muted">{label}</p><Icon size={17} className="text-ink-faint" /></div><p className={`mt-3 text-3xl font-semibold tracking-tight tabular-nums ${tone}`}>{value}</p></article>;
}

export default function ProjectReportsPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  async function load() {
    setStatus("loading");
    setError("");
    try {
      const [projectResult, report] = await Promise.all([getProject(projectId), getProjectReport(projectId)]);
      setProject(projectResult?.project ?? projectResult);
      setSummary(report);
      setStatus("ready");
    } catch (err) {
      setError(err.message || "Couldn't load project reports.");
      setStatus("error");
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return null;
      setStatus("loading");
      return Promise.all([getProject(projectId), getProjectReport(projectId)]);
    }).then((result) => {
      if (cancelled || !result) return;
      const [projectResult, report] = result;
        setProject(projectResult?.project ?? projectResult);
        setSummary(report);
        setStatus("ready");
      })
      .catch((err) => {
        if (!cancelled) { setError(err.message || "Couldn't load project reports."); setStatus("error"); }
      });
    return () => { cancelled = true; };
  }, [projectId]);

  const maxStatus = useMemo(() => Math.max(1, ...STATUS_META.map((item) => summary?.statusBreakdown?.[item.id] ?? 0)), [summary]);
  const maxPriority = useMemo(() => Math.max(1, ...PRIORITY_META.map((item) => summary?.priorityBreakdown?.[item.id] ?? 0)), [summary]);

  if (status === "loading") return <div className="mx-auto max-w-5xl space-y-4"><div className="h-8 w-64 animate-pulse rounded bg-surface-subtle" /><div className="grid gap-4 sm:grid-cols-3"><div className="h-28 animate-pulse rounded-panel bg-surface-subtle" /><div className="h-28 animate-pulse rounded-panel bg-surface-subtle" /><div className="h-28 animate-pulse rounded-panel bg-surface-subtle" /></div><div className="h-72 animate-pulse rounded-panel bg-surface-subtle" /></div>;
  if (status === "error") return <div className="mx-auto max-w-xl rounded-panel border border-line bg-surface p-8 text-center"><p role="alert" className="text-sm text-danger">{error}</p><button type="button" onClick={load} className="mt-4 text-sm font-semibold underline">Try again</button></div>;

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted"><Link to={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 hover:text-ink"><ArrowLeft size={15} />{project?.name ?? "Project"}</Link><span>/</span><span className="font-medium text-ink">Reports</span></div>
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">{project?.key ?? "Project"} · Insights</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Project reports</h1><p className="mt-2 text-sm text-ink-muted">A live snapshot of issue distribution and delivery activity.</p></div><button type="button" onClick={load} className="inline-flex h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-xs font-semibold text-ink hover:bg-surface-subtle"><RefreshCw size={14} /> Refresh</button></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total issues" value={summary.total} icon={BarChart3} /><Metric label="Completed in last 7 days" value={summary.completedLast7Days} icon={CheckCircle2} tone="text-status-done" /><Metric label="Overdue open issues" value={summary.overdue} icon={CircleAlert} tone={summary.overdue ? "text-danger" : "text-ink"} /><Metric label="Workflow stages" value={STATUS_META.length} icon={CalendarClock} /></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-panel border border-line bg-surface p-5 sm:p-6"><div className="mb-5"><h2 className="font-semibold text-ink">Work by status</h2><p className="mt-1 text-xs text-ink-muted">Current distribution of active and completed issues.</p></div><div className="space-y-4">{STATUS_META.map((item) => { const value = summary.statusBreakdown?.[item.id] ?? 0; return <div key={item.id}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-ink">{item.label}</span><span className="tabular-nums text-ink-muted">{value} · {summary.total ? Math.round(value / summary.total * 100) : 0}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-surface-subtle"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${value / maxStatus * 100}%` }} /></div></div>; })}</div></section>
      <section className="rounded-panel border border-line bg-surface p-5 sm:p-6"><div className="mb-5"><h2 className="font-semibold text-ink">Work by priority</h2><p className="mt-1 text-xs text-ink-muted">Understand how work is distributed by urgency.</p></div><div className="space-y-4">{PRIORITY_META.map((item) => { const value = summary.priorityBreakdown?.[item.id] ?? 0; return <div key={item.id}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-ink">{item.label}</span><span className="tabular-nums text-ink-muted">{value}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-brand-lime" style={{ width: `${value / maxPriority * 100}%` }} /></div></div>; })}</div></section>
    </div>
    <p className="text-xs text-ink-faint">Generated {summary.generatedAt ? new Date(summary.generatedAt).toLocaleString() : "just now"}. Completed in the last 7 days is based on issue updatedAt; reopened and re-completed issues may affect this count.</p>
  </div>;
}
