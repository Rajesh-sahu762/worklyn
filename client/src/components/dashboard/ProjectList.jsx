import { Link } from "react-router";
import { FEATURES } from "../../lib/features";

const roleLabel = (r) => {
  const v = r?.replace("PROJECT_", "") ?? "";
  return v.charAt(0) + v.slice(1).toLowerCase();
};

const card = "flex items-center gap-3 rounded-panel border border-line bg-surface p-4";

export default function ProjectList({ projects, status }) {
  return (
    <section aria-labelledby="projects-h">
      <h2 id="projects-h" className="text-base font-semibold">Your projects</h2>

      {status === "loading" && (
        <div aria-hidden="true" className="mt-3 h-20 animate-pulse rounded-panel bg-surface-subtle motion-reduce:animate-none" />
      )}
      {status === "error" && <p role="alert" className="mt-3 text-sm text-danger">Couldn't load projects.</p>}
      {status === "ready" && projects.length === 0 && (
        <p className="mt-3 text-sm text-ink-muted">You aren't a member of any project yet.</p>
      )}

      {status === "ready" && projects.length > 0 && (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.slice(0, 6).map((p) => {
            const body = (
              <>
                <span
                  aria-hidden="true"
                  className="grid h-11 min-w-11 place-items-center rounded-control bg-ink px-1.5 font-mono text-xs font-bold text-accent"
                >
                  {(p.key || p.name.charAt(0)).slice(0, 4).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                  <span className="block text-xs text-ink-muted">{roleLabel(p.role)}</span>
                </span>
              </>
            );
            return (
              <li key={p.id}>
                {FEATURES.projectPages ? (
                  <Link
                    to={`/projects/${p.id}`}
                    className={`${card} transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent-support`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={card}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}