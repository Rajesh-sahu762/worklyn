import { STATUS, STATUS_ORDER } from "../../lib/issueMeta";

export default function StatusBreakdown({ issues, loading }) {
  const counts = STATUS_ORDER.map((s) => ({ s, n: issues.filter((i) => i.status === s).length }));
  const total = counts.reduce((a, c) => a + c.n, 0);

  return (
    <section aria-labelledby="status-h" className="rounded-panel border border-line bg-surface p-5">
      <h2 id="status-h" className="text-base font-semibold">Work by status</h2>

      {loading ? (
        <div aria-hidden="true" className="mt-4 h-3 animate-pulse rounded-full bg-surface-subtle motion-reduce:animate-none" />
      ) : total === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No assigned issues yet.</p>
      ) : (
        <>
          <div role="img" aria-label="Assigned issues by status" className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-subtle">
            {counts.filter((c) => c.n).map((c) => (
              <span key={c.s} style={{ width: `${(c.n / total) * 100}%` }} className={STATUS[c.s].dot} />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {counts.map((c) => (
              <li key={c.s} className="flex items-center gap-2 text-sm">
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${STATUS[c.s].dot}`} />
                <span className="text-ink">{STATUS[c.s].label}</span>
                <span className="ml-auto font-mono text-ink-muted">{c.n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-muted">Based on issues assigned to you (up to 100 per project, first 10 projects).</p>
        </>
      )}
    </section>
  );
}