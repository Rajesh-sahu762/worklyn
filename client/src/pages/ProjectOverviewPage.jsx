
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  CalendarDays,
  CircleDot,
  FolderKanban,
  Layers3,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";

import { getProject, getProjectIssues } from "../lib/api";
import { useOrganization } from "../context/OrganizationContext";

const STATUS_STYLES = {
  BACKLOG: "bg-status-backlog/10 text-status-backlog",
  TODO: "bg-status-todo/10 text-status-todo",
  IN_PROGRESS: "bg-status-progress/10 text-status-progress",
  IN_REVIEW: "bg-status-review/10 text-status-review",
  DONE: "bg-status-done/10 text-status-done",
};

const PRIORITY_STYLES = {
  LOWEST: "text-ink-faint",
  LOW: "text-priority-low",
  MEDIUM: "text-priority-medium",
  HIGH: "text-priority-high",
  HIGHEST: "text-danger",
};

const formatLabel = (value = "") =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());

function StatusLabel({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        STATUS_STYLES[status] ||
        "bg-surface-subtle text-ink-muted"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {formatLabel(status)}
    </span>
  );
}

function IssueRow({ issue }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 text-ink-faint">
          <CircleDot size={16} strokeWidth={1.8} />
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">
            {issue.title}
          </p>

          <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
            {issue.issueKey || "Issue"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-7 sm:pl-0">
        <StatusLabel status={issue.status} />

        <span
          className={`min-w-16 text-right text-[11px] font-medium ${
            PRIORITY_STYLES[issue.priority] ||
            "text-ink-muted"
          }`}
        >
          {formatLabel(issue.priority)}
        </span>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-6"
      aria-label="Loading project"
    >
      <div className="h-4 w-24 animate-pulse rounded bg-surface-subtle" />

      <div className="rounded-panel border border-line bg-surface p-6">
        <div className="h-3 w-28 animate-pulse rounded bg-surface-subtle" />

        <div className="mt-4 h-8 w-64 max-w-full animate-pulse rounded bg-surface-subtle" />

        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-surface-subtle" />
      </div>

      <div className="h-64 animate-pulse rounded-panel border border-line bg-surface" />
    </div>
  );
}

export default function ProjectOverviewPage() {
  const { projectId } = useParams();
  const { currentOrg } = useOrganization();

  const [projectState, setProjectState] = useState({
    id: null,
    status: "loading",
    project: null,
    role: null,
    error: "",
  });

  const [issueState, setIssueState] = useState({
    id: null,
    status: "loading",
    items: [],
  });

  useEffect(() => {
    let cancelled = false;

    // Load project details
    getProject(projectId)
      .then((result) => {
        if (cancelled) return;

        setProjectState({
          id: projectId,
          status: "ready",
          project: result?.project ?? result,
          role: result?.role ?? null,
          error: "",
        });
      })
      .catch((err) => {
        if (cancelled) return;

        setProjectState({
          id: projectId,
          status: "error",
          project: null,
          role: null,
          error: err.message || "Couldn't load this project.",
        });
      });

    // Load latest 8 issues independently
    getProjectIssues(projectId, { limit: 8 })
      .then((result) => {
        if (!cancelled) {
          setIssueState({
            id: projectId,
            status: "ready",
            items: Array.isArray(result)
              ? result.slice(0, 8)
              : [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIssueState({
            id: projectId,
            status: "error",
            items: [],
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Prevent showing previous project's data during navigation.
  const projectStatus =
    projectState.id === projectId
      ? projectState.status
      : "loading";

  const issuesStatus =
    issueState.id === projectId
      ? issueState.status
      : "loading";

  const project =
    projectState.id === projectId
      ? projectState.project
      : null;

  const projectRole =
    projectState.id === projectId
      ? projectState.role
      : null;

  const issues =
    issueState.id === projectId
      ? issueState.items
      : [];

  if (projectStatus === "loading") {
    return <LoadingState />;
  }

  if (projectStatus === "error") {
    return (
      <section className="mx-auto flex min-h-[45vh] max-w-xl flex-col items-center justify-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-surface-subtle text-ink-muted">
          <FolderKanban size={22} />
        </span>

        <h1 className="mt-4 text-lg font-semibold">
          Project unavailable
        </h1>

        <p role="alert" className="mt-1 max-w-sm text-sm leading-6 text-ink-muted">
          {projectState.error}
        </p>

        <Link
          to="/projects"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent-support hover:underline"
        >
          <ArrowLeft size={15} />
          Back to projects
        </Link>
      </section>
    );
  }

  const projectName = project?.name || "Untitled project";
  const projectKey = project?.key || "";

  const projectDescription =
    project?.description ||
    "No project description has been added yet.";

  const role = projectRole || project?.role || null;

  const lead = project?.lead;

  const leadName =
    lead && typeof lead === "object"
      ? [lead.firstName, lead.lastName]
          .filter(Boolean)
          .join(" ")
      : "";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">

      {/* Back navigation */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-support"
      >
        <ArrowLeft size={16} />
        All projects
      </Link>

      {/* Project header */}
      <section className="overflow-hidden rounded-panel border border-line bg-surface">
        <div className="h-1 bg-brand-lime" />

        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

            <div className="flex min-w-0 items-start gap-4">

              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink font-mono text-sm font-bold tracking-wide text-brand-lime">
                {(projectKey || projectName.slice(0, 2))
                  .slice(0, 4)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.13em] text-accent-support">
                    Project overview
                  </span>

                  <span className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    {formatLabel(project?.projectType || "KANBAN")}
                  </span>
                </div>

                <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-ink sm:text-[30px]">
                  {projectName}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                  {projectDescription}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {projectKey && (
                    <span className="rounded-control bg-surface-subtle px-2.5 py-1.5 font-mono text-xs font-semibold text-ink">
                      {projectKey}
                    </span>
                  )}

                  {role && (
                    <span className="rounded-control border border-line px-2.5 py-1.5 text-xs text-ink-muted">
                      {formatLabel(role)}
                    </span>
                  )}

                  {project?.status && (
                    <span className="rounded-control border border-line px-2.5 py-1.5 text-xs text-ink-muted">
                      {formatLabel(project.status)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-xs text-ink-muted sm:pt-1">
              <Layers3 size={15} />
              <span>{currentOrg?.name || "Current organization"}</span>
            </div>

          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">

        {/* Recent issues */}
       {/* Recent issues */}
<section className="min-w-0 overflow-hidden rounded-panel border border-line bg-surface">
  <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div>
      <h2 className="text-sm font-semibold text-ink">
        Recent issues
      </h2>
      <p className="mt-0.5 text-xs text-ink-muted">
        Latest updated work in this project
      </p>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
      <Link
        to={`/projects/${projectId}/issues`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-support transition hover:underline"
      >
        View all issues
        <ArrowUpRight size={14} />
      </Link>

      <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-[11px] font-medium text-ink-muted">
        Latest 8
      </span>
    </div>
  </div>

  {issuesStatus === "loading" && (
    <div className="space-y-4 p-5" aria-label="Loading issues">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-10 animate-pulse rounded bg-surface-subtle"
        />
      ))}
    </div>
  )}

  {issuesStatus === "error" && (
    <div className="flex items-center gap-3 px-5 py-8 text-sm text-ink-muted">
      <RefreshCw size={16} />
      Issues couldn't be loaded. The project itself is available.
    </div>
  )}

  {issuesStatus === "ready" && issues.length === 0 && (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-8 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-subtle text-ink-muted">
        <CircleDot size={19} />
      </span>

      <p className="mt-3 text-sm font-medium text-ink">
        No issues yet
      </p>

      <p className="mt-1 max-w-xs text-xs leading-5 text-ink-muted">
        When work is added to this project, the latest issues will appear here.
      </p>
    </div>
  )}

  {issuesStatus === "ready" && issues.length > 0 && (
    <div>
      {issues.map((issue) => (
        <IssueRow
          key={issue._id || issue.id}
          issue={issue}
        />
      ))}
    </div>
  )}
</section>

        {/* Project details */}
        <aside className="space-y-4">

          <section className="rounded-panel border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">
              Project details
            </h2>

            <dl className="mt-4 space-y-4">

              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Project type
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {formatLabel(project?.projectType || "KANBAN")}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Project lead
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {leadName || "Not specified"}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Your access
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {formatLabel(role || "Member")}
                </dd>
              </div>

              {project?.createdAt && (
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    Created
                  </dt>

                  <dd className="mt-1 flex items-center gap-2 text-sm text-ink">
                    <CalendarDays size={14} className="text-ink-faint" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              )}

            </dl>
          </section>

          <section className="rounded-panel border border-line bg-surface-subtle p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-support">
              A note about project type
            </p>

            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Scrum and Kanban currently describe this project's setup.
              Board views and sprint planning will arrive as their workflows are implemented.
            </p>
          </section>

        </aside>
      </div>
    </div>
  );
}
