import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";
import useMyIssues from "../lib/useMyIssues";
import { PRIORITY } from "../lib/issueMeta";
import StatTile from "../components/dashboard/StatTile";
import AssignedIssues from "../components/dashboard/AssignedIssues";
import StatusBreakdown from "../components/dashboard/StatusBreakdown";
import ProjectList from "../components/dashboard/ProjectList";

export default function HomePage() {
  const { user } = useAuth();
  const { currentOrg, orgStatus, projects, projectsStatus } = useOrganization();
  const [now] = useState(() => new Date());
  const userId = user?._id ?? user?.id;
  const { issues, status, failed, reload } = useMyIssues(projects, userId);

  const { open, overdue, inProgress, today } = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const isOverdue = (i) => i.dueDate && new Date(i.dueDate) < today;
    const open = issues
      .filter((i) => i.status !== "DONE")
      .sort((a, b) =>
        Number(!!isOverdue(b)) - Number(!!isOverdue(a)) ||
        (PRIORITY[b.priority]?.level ?? 0) - (PRIORITY[a.priority]?.level ?? 0) ||
        new Date(a.dueDate ?? 8.64e15) - new Date(b.dueDate ?? 8.64e15)
      );
    return {
      open,
      overdue: open.filter(isOverdue).length,
      inProgress: issues.filter((i) => i.status === "IN_PROGRESS").length,
      today,
    };
  }, [issues, now]);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (orgStatus === "ready" && !currentOrg) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-[26px] font-semibold tracking-tight">Welcome{user?.firstName ? `, ${user.firstName}` : ""}</h1>
        <p className="mt-1.5 text-[15px] text-ink-muted">You're not part of an organization yet.</p>
        <Link to="/organizations/new" className="mt-6 inline-flex rounded-control bg-accent px-4 py-2.5 text-[15px] font-semibold text-ink transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
          Create your first organization
        </Link>
      </div>
    );
  }

  const loading = status === "loading" || projectsStatus === "loading";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-sm text-ink-muted">
          {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
          {greeting}{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        {currentOrg && <p className="mt-1 text-[15px] text-ink-muted">Here's what's happening in {currentOrg.name}.</p>}
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Projects" value={projects.length} loading={projectsStatus === "loading"} tone="bg-accent-support" />
        <StatTile label="Open, assigned to me" value={open.length} loading={loading} />
        <StatTile label="In progress" value={inProgress} loading={loading} tone="bg-status-progress" />
        <StatTile label="Overdue" value={overdue} loading={loading} tone="bg-danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <AssignedIssues issues={open} status={status === "idle" ? "ready" : status} failed={failed} onRetry={reload} overdueBefore={today} />
        <div className="space-y-6">
          <StatusBreakdown issues={issues} loading={loading} />
          <ProjectList projects={projects} status={projectsStatus === "idle" ? "ready" : projectsStatus} />
        </div>
      </div>
    </div>
  );
}