import { Link } from "react-router";
import { FEATURES } from "../../lib/features";

const roleLabel = (r) => (r ? r.replace("PROJECT_", "").charAt(0) + r.replace("PROJECT_", "").slice(1).toLowerCase() : "");

export default function ProjectList({ projects, status }) {
  return (
    <section aria-labelledby="projects-h" className="rounded-panel border border-line bg-surface p-5">
      <h2 id="projects-h" className="text-base font-semibold">Your projects</h2>

      {status === "loading" && <div aria-hidden="true" className="mt-4 h-16 animate-pulse rounded-control bg-surface-subtle motion-reduce:animate-none" />}
      {status === "error" && <p role="alert" className="mt-3 text-sm text-danger">Couldn't load projects.</p>}
      {status === "ready" && projects.length === 0 && <p className="mt-3 text-sm text-ink-muted">You aren't a member of any project yet.</p>}

      {status === "ready" && projects.length > 0 && (
        <ul className="mt-3 space-y-1">
          {projects.map((p) => {
            const body = (
              <>
                <span aria-hidden="true" className="grid h-8 min-w-8 place-items-center rounded-control bg-surface-subtle px-1.5 font-mono text-[11px] font-semibold text-ink">
                  {(p.key || p.name.charAt(0)).slice(0, 4).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                  <span className="block text-xs text-ink-muted">{roleLabel(p.role)}</span>
                </span>
              </>
            );
            return (
              <li key={p.id}>
                {FEATURES.projectPages ? (
                  <Link to={`/projects/${p.id}`} className="flex items-center gap-3 rounded-control p-2 hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-accent-support">{body}</Link>
                ) : (
                  <div className="flex items-center gap-3 p-2">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}