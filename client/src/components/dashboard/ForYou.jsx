import { PriorityMark, StatusChip } from "../issues/IssueBadges";
import { useRef, useState } from "react";
import useDismiss from "../../lib/useDismiss";
import { CheckIcon, ChevronIcon } from "../layout/icons";

const fmt = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const Count = ({ n }) =>
  n == null ? null : <span className="rounded-full bg-brand-lime/45 px-1.5 text-xs font-semibold text-emerald">{n}</span>;

export default function ForYou({
  tabs,
  tab,
  onTab,
  hint,
  empty,
  issues,
  status,
  failed,
  onRetry,
  overdueBefore,
  limit = 8,
}) {
  const shown = issues.slice(0, limit);
  const enabled = tabs.filter((t) => !t.soon);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useDismiss(menuRef, menuOpen, () => setMenuOpen(false));
  const current = tabs.find((t) => t.id === tab);

  function onKey(e) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = enabled.findIndex((t) => t.id === tab);
    const next = enabled[(i + step + enabled.length) % enabled.length];
    onTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }

  return (
    <section aria-labelledby="foryou-h" className="rounded-panel border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id="foryou-h" className="text-base font-semibold">For you</h2>
                <div ref={menuRef} className="relative sm:hidden">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-control border border-line bg-surface-subtle px-3 py-1.5 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support"
          >
            {current?.label}
            <Count n={current?.count} />
            <ChevronIcon className={`h-4 w-4 transition-transform motion-reduce:transition-none ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <ul role="listbox" aria-label="For you views" className="absolute right-0 top-full z-20 mt-2 w-56 rounded-panel border border-line bg-surface p-1.5 shadow-lg">
              {tabs.map((t) => (
                <li key={t.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={t.id === tab}
                    aria-disabled={t.soon || undefined}
                    onClick={() => {
                      if (t.soon) return;
                      onTab(t.id);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-support ${
                      t.id === tab ? "bg-brand-lime font-medium text-emerald" : t.soon ? "cursor-not-allowed text-ink-faint" : "text-ink hover:bg-surface-subtle"
                    }`}
                  >
                    <span className="flex-1">{t.label}</span>
                    <Count n={t.count} />
                    {t.soon && <span className="text-[10px] uppercase tracking-wide">Soon</span>}
                    {t.id === tab && <CheckIcon className="h-4 w-4 text-accent-support" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          role="tablist"
          aria-labelledby="foryou-h"
          onKeyDown={onKey}
          className="hidden max-w-full gap-1 overflow-x-auto rounded-panel bg-surface-subtle p-1 sm:flex"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={t.id === tab}
              aria-controls="foryou-panel"
              aria-disabled={t.soon || undefined}
              tabIndex={t.id === tab ? 0 : -1}
              onClick={() => !t.soon && onTab(t.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-control px-3 py-1.5 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-support ${
                t.id === tab
                  ? "bg-brand-lime font-medium text-emerald shadow-sm"
                  : t.soon
                    ? "cursor-not-allowed text-ink-faint"
                    : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
                           <Count n={t.count} />
              {t.soon && <span className="text-[10px] uppercase tracking-wide">Soon</span>}
            </button>
          ))}
        </div>
      </div>

      <div id="foryou-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {status === "ready" && <p className="px-5 pt-3 text-xs text-ink-muted">{hint}</p>}

        {status === "loading" && (
          <ul aria-hidden="true" className="divide-y divide-line">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="px-5 py-4">
                <div className="h-5 animate-pulse rounded-control bg-surface-subtle motion-reduce:animate-none" />
              </li>
            ))}
          </ul>
        )}

        {status === "error" && (
          <div role="alert" className="px-5 py-6 text-sm">
            <p className="text-ink">Couldn't load your issues.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 font-medium text-accent-support underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && issues.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-ink-muted">{empty}</p>
        )}

        {status === "ready" && shown.length > 0 && (
          <ul className="divide-y divide-line">
            {shown.map((i) => {
              const overdue = i.dueDate && i.status !== "DONE" && new Date(i.dueDate) < overdueBefore;
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
          <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
            Some projects couldn't be loaded, so this list may be incomplete.
          </p>
        )}
        {status === "ready" && issues.length > limit && (
          <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
            Showing {limit} of {issues.length}.
          </p>
        )}
      </div>
    </section>
  );
}
