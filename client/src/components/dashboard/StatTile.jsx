export default function StatTile({ label, value, loading, tone = "bg-emerald" }) {
  return (
    <div className="rounded-panel border border-line bg-surface p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${tone}`} />
        {label}
      </p>
      {loading ? (
        <div aria-hidden="true" className="mt-2 h-9 w-12 animate-pulse rounded-control bg-surface-subtle motion-reduce:animate-none" />
      ) : (
        <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-ink">{value}</p>
      )}
    </div>
  );
}
