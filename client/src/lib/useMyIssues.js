import { useEffect, useState } from "react";
import { getProjectIssues } from "./api";

const MAX_PROJECTS = 10; // one request per project, so keep it bounded

// Issues assigned to the user across their projects.
export default function useMyIssues(projects, userId) {
  const key = userId && projects.length ? `${userId}:${projects.map((p) => p.id).join(",")}` : "";
  const [reload, setReload] = useState(0);
  const stamp = `${key}#${reload}`;
  const [state, setState] = useState({ stamp: "", issues: [], failed: 0, total: 0 });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const scoped = projects.slice(0, MAX_PROJECTS);
    Promise.allSettled(
      scoped.map((p) => getProjectIssues(p.id, { assignee: userId, limit: 100 }))
    ).then((results) => {
      if (cancelled) return;
      const issues = [];
      let failed = 0;
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          r.value.forEach((x) => issues.push({ ...x, projectKey: scoped[i].key }));
        } else failed += 1;
      });
      setState({ stamp, issues, failed, total: scoped.length });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);

  const loaded = state.stamp === stamp;
  const status = !key ? "idle" : !loaded ? "loading" : state.failed === state.total ? "error" : "ready";
  return {
    issues: loaded ? state.issues : [],
    failed: loaded ? state.failed : 0,
    status,
    reload: () => setReload((n) => n + 1),
  };
}