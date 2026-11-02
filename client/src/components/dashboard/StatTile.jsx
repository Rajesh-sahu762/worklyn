export default function StatTile({ label, value, loading, tone = "bg-accent" }) {
  return (
    <div className="relative overflow-hidden rounded-panel border border-line bg-surface p-4">
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${tone}`} />
      <p className="text-sm text-ink-muted">{label}</p>
      {loading ? (
        <div aria-hidden="true" className="mt-2 h-9 w-12 animate-pulse rounded-control bg-surface-subtle motion-reduce:animate-none" />
      ) : (
        <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-ink">{value}</p>
      )}
    </div>
  );
}