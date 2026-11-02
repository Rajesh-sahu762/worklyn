import { PriorityMark, StatusChip } from "../issues/IssueBadges";

const fmt = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export default function AssignedIssues({ issues, status, failed, onRetry, overdueBefore, limit = 8 }) {
  const shown = issues.slice(0, limit);

  return (
    <section aria-labelledby="assigned-h" className="rounded-panel border border-line bg-surface">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
        <h2 id="assigned-h" className="text-base font-semibold">Assigned to me</h2>
        {status === "ready" && issues.length > 0 && (
          <span className="text-sm text-ink-muted">{issues.length} open</span>
        )}
      </div>

      {status === "loading" && (
        <ul aria-hidden="true" className="divide-y divide-line">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="px-5 py-4"><div className="h-5 animate-pulse rounded-control bg-surface-subtle motion-reduce:animate-none" /></li>
          ))}
        </ul>
      )}

      {status === "error" && (
        <div role="alert" className="px-5 py-6 text-sm">
          <p className="text-ink">Couldn't load your issues.</p>
          <button type="button" onClick={onRetry} className="mt-2 font-medium text-accent-support underline underline-offset-2">Try again</button>
        </div>
      )}

      {status === "ready" && issues.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-ink-muted">Nothing is assigned to you right now.</p>
      )}

      {status === "ready" && shown.length > 0 && (
        <ul className="divide-y divide-line">
          {shown.map((i) => {
            const overdue = i.dueDate && new Date(i.dueDate) < overdueBefore;
            return (
              <li key={i._id ?? i.id ?? i.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3">
                <span className="font-mono text-xs font-medium text-ink-muted">{i.key}</span>
                <span className="min-w-0 flex-1 basis-48 truncate text-[15px] text-ink">{i.title}</span>
                <StatusChip status={i.status} />
                <PriorityMark priority={i.priority} />
                <span className={`w-14 text-right text-xs ${overdue ? "font-medium text-danger" : "text-ink-muted"}`}>
                  {i.dueDate ? fmt(i.dueDate) : ""}
                  {overdue && <span className="sr-only"> (overdue)</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {status === "ready" && failed > 0 && (
        <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">Some projects couldn't be loaded, so this list may be incomplete.</p>
      )}
      {status === "ready" && issues.length > limit && (
        <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">Showing {limit} of {issues.length}, most urgent first.</p>
      )}
    </section>
  );
}