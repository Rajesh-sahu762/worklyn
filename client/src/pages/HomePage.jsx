import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";
import useMyIssues from "../lib/useMyIssues";
import { PRIORITY } from "../lib/issueMeta";
import { FEATURES } from "../lib/features";
import StatTile from "../components/dashboard/StatTile";
import StatusBreakdown from "../components/dashboard/StatusBreakdown";
import ProjectList from "../components/dashboard/ProjectList";
import ForYou from "../components/dashboard/ForYou";

const TAB_INFO = {
  recommended: {
    hint: "Overdue, high priority and in progress, most urgent first.",
    empty: "Nothing needs your attention right now.",
  },
  assigned: {
    hint: "Everything open that's assigned to you.",
    empty: "Nothing is assigned to you right now.",
  },
  worked: {
    hint: "Your assigned issues, most recently updated first.",
    empty: "No recent updates on your issues.",
  },
};

const level = (i) => PRIORITY[i.priority]?.level ?? 0;

export default function HomePage() {
  const { user } = useAuth();
  const { currentOrg, orgStatus, projects, projectsStatus } = useOrganization();
  const [now] = useState(() => new Date());
  const [tab, setTab] = useState("recommended");
  const userId = user?._id ?? user?.id;
  const { issues, status, failed, reload } = useMyIssues(projects, userId);

  const { open, overdue, inProgress, today, lists } = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const isOverdue = (i) => i.dueDate && new Date(i.dueDate) < today;

    const open = issues
      .filter((i) => i.status !== "DONE")
      .sort(
        (a, b) =>
          Number(!!isOverdue(b)) - Number(!!isOverdue(a)) ||
          level(b) - level(a) ||
          new Date(a.dueDate ?? 8.64e15) - new Date(b.dueDate ?? 8.64e15)
      );

    return {
      open,
      overdue: open.filter(isOverdue).length,
      inProgress: issues.filter((i) => i.status === "IN_PROGRESS").length,
      today,
      lists: {
        recommended: open.filter(
          (i) => isOverdue(i) || level(i) >= 4 || i.status === "IN_PROGRESS"
        ),
        assigned: open,
        worked: [...issues].sort(
          (a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0)
        ),
      },
    };
  }, [issues, now]);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (orgStatus === "ready" && !currentOrg) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-[26px] font-semibold tracking-tight">
          Welcome{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-muted">You're not part of an organization yet.</p>
        <Link
          to="/organizations/new"
          className="mt-6 inline-flex rounded-control bg-accent px-4 py-2.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support"
        >
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
          {greeting}
          {user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        {currentOrg && (
          <p className="mt-1 text-[15px] text-ink-muted">
            Here's what's happening in {currentOrg.name}.
          </p>
        )}
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Projects" value={projects.length} loading={projectsStatus === "loading"} tone="bg-brand-lime" />
        <StatTile label="Open, assigned to me" value={open.length} loading={loading} />
        <StatTile label="In progress" value={inProgress} loading={loading} tone="bg-status-progress" />
        <StatTile label="Overdue" value={overdue} loading={loading} tone="bg-danger" />
      </div>

      <ProjectList projects={projects} status={projectsStatus === "idle" ? "ready" : projectsStatus} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ForYou
          tabs={[
            { id: "recommended", label: "Recommended" },
            { id: "assigned", label: "Assigned to me", count: open.length },
            { id: "worked", label: "Worked on" },
            { id: "starred", label: "Starred", soon: !FEATURES.starred },
            { id: "viewed", label: "Viewed", soon: !FEATURES.recent },
          ]}
          tab={tab}
          onTab={setTab}
          {...TAB_INFO[tab]}
          issues={lists[tab]}
          status={status === "idle" ? "ready" : status}
          failed={failed}
          onRetry={reload}
          overdueBefore={today}
        />
        <StatusBreakdown issues={issues} loading={loading} />
      </div>
    </div>
  );
}
