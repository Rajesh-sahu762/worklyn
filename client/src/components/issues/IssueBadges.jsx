import { PRIORITY, STATUS } from "../../lib/issueMeta";

export function StatusChip({ status }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2 py-0.5 text-xs text-ink">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s?.dot ?? "bg-ink-faint"}`} />
      {s?.label ?? status}
    </span>
  );
}

export function PriorityMark({ priority }) {
  const p = PRIORITY[priority];
  if (!p) return null;
  return (
    <span className={`inline-flex items-end gap-0.5 ${p.color}`} title={`${p.label} priority`}>
      <span className="sr-only">{p.label} priority</span>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden="true" style={{ height: 4 + i * 2 }} className={`w-1 rounded-full ${i <= p.level ? "bg-current" : "bg-line"}`} />
      ))}
    </span>
  );
}