import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useOrganization } from "../../context/OrganizationContext";
import { FEATURES } from "../../lib/features";
import { getProjectIssues } from "../../lib/api";
import { SearchIcon } from "./icons";

// Searches things that exist today: pages, your projects, your organizations,
// account actions. Issue search arrives with the project pages.
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { projects, orgs, currentOrg, switchOrg } = useOrganization();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [issueResults, setIssueResults] = useState([]);
  const [searchingIssues, setSearchingIssues] = useState(false);
  const inputRef = useRef(null);
  const returnFocus = useRef(null);

  const items = useMemo(() => {
    const list = [{ id: "home", group: "Go to", label: "Home", enabled: true, run: () => navigate("/") }];
    projects.forEach((p) =>
      list.push({ id: `p-${p.id}`, group: "Projects", label: p.name, hint: p.key, enabled: FEATURES.projectPages, run: () => navigate(`/projects/${p.id}`) })
    );
    orgs.filter((o) => o.id !== currentOrg?.id).forEach((o) =>
      list.push({ id: `o-${o.id}`, group: "Switch organization", label: o.name, enabled: true, run: () => switchOrg(o.id) })
    );
    list.push({ id: "new-org", group: "Create", label: "Create organization", enabled: FEATURES.createOrganization, run: () => navigate("/organizations/new") });
    list.push({ id: "signout", group: "Account", label: "Sign out", enabled: true, run: logout });
    list.push({ id: "notifications", group: "Go to", label: "Notifications", enabled: FEATURES.notifications, run: () => navigate("/notifications") });
    list.push(...issueResults);
    return list;
  }, [projects, orgs, currentOrg, navigate, switchOrg, logout, issueResults]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2 || !projects.length) {
      setIssueResults([]);
      setSearchingIssues(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchingIssues(true);
      const results = await Promise.allSettled(
        projects.map(async (project) => {
          const issues = await getProjectIssues(project.id, { search: q, limit: 5 });
          return issues.map((issue) => ({
            id: `i-${issue._id ?? issue.id}`,
            group: "Issues",
            label: issue.title,
            hint: issue.issueKey,
            subhint: project.name,
            enabled: true,
            run: () => navigate(`/projects/${project.id}/issues/${issue._id ?? issue.id}`),
          }));
        })
      );
      if (!cancelled) {
        setIssueResults(results.flatMap((result) => result.status === "fulfilled" ? result.value : []));
        setSearchingIssues(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, projects, navigate]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q)) : items;
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement;
    inputRef.current?.focus();
    return () => returnFocus.current?.focus?.();
  }, [open]);

  if (!open) return null;

  const close = () => { setQuery(""); setActive(0); onClose(); };
  const run = (item) => { if (!item?.enabled) return; close(); item.run(); };

  function onKeyDown(e) {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") e.preventDefault(); // keep focus in the dialog
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); run(results[active]); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/40 px-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Search" onKeyDown={onKeyDown} className="w-full max-w-xl overflow-hidden rounded-[14px] border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchIcon className="shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
            placeholder="Search projects, issues, switch organization…"
            className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="rounded-control border border-line px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">Esc</kbd>
        </div>

        <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-muted">No matches for “{query}”.</li>}
          {results.map((item, i) => (
            <li key={item.id} role="presentation">
              {(i === 0 || results[i - 1].group !== item.group) && (
                <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-ink-muted">{item.group}</p>
              )}
              <div
                id={`palette-${item.id}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={!item.enabled}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(item)}
                className={`flex items-center gap-3 rounded-control px-3 py-2 text-sm ${i === active ? "bg-brand-lime/35" : ""} ${item.enabled ? "cursor-pointer text-ink" : "cursor-not-allowed text-ink-muted"}`}
              >
                {item.hint && <span className="rounded-[5px] border border-line bg-surface px-1.5 font-mono text-[10px] font-semibold">{item.hint.toUpperCase()}</span>}
                <span className="min-w-0 flex-1 truncate">{item.label}{item.subhint && <span className="ml-2 text-xs text-ink-faint">· {item.subhint}</span>}</span>
                {!item.enabled && <span className="ml-auto rounded-full bg-surface-subtle px-2 py-0.5 text-[11px]">Soon</span>}
              </div>
            </li>
          ))}
        </ul>

        <p className="border-t border-line bg-canvas px-4 py-2 text-xs text-ink-muted">{searchingIssues ? "Searching issues…" : "Search across your projects by issue title or key."}</p>
      </div>
    </div>
  );
}
