
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Search,
  CircleDot,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ListFilter,
} from "lucide-react";
import { getProject, getProjectIssues } from "../lib/api";

const LIMIT = 20;

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
  String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
        STATUS_STYLES[status] || "bg-surface-subtle text-ink-muted"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {formatLabel(status) || "Unknown"}
    </span>
  );
}

function FilterSelect({ value, onChange, options, label }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 min-w-0 rounded-control border border-line bg-surface px-3 text-xs font-medium text-ink outline-none transition focus:border-accent-support"
    >
      <option value="">All {label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function IssueRow({ issue }) {
  const assignee = issue.assignee;
  const assigneeName =
    typeof assignee === "object" && assignee
      ? [assignee.firstName, assignee.lastName].filter(Boolean).join(" ") ||
        assignee.name ||
        assignee.email
      : null;

  const updatedAt = issue.updatedAt
    ? new Date(issue.updatedAt).toLocaleDateString()
    : "—";

  return (
    <article className="grid gap-3 border-b border-line px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 shrink-0 text-ink-faint">
          <CircleDot size={17} strokeWidth={1.8} />
        </span>

        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-ink">
            {issue.title || "Untitled issue"}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
            <span className="font-mono">
              {issue.issueKey || issue.key || "Issue"}
            </span>
            <span>{formatLabel(issue.type || "TASK")}</span>
            <span>{assigneeName || (assignee ? "Assigned" : "Unassigned")}</span>
            <span>Updated {updatedAt}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pl-7 sm:justify-end sm:pl-0">
        <StatusBadge status={issue.status} />
        <span
          className={`min-w-14 text-right text-[11px] font-semibold ${
            PRIORITY_STYLES[issue.priority] || "text-ink-muted"
          }`}
        >
          {formatLabel(issue.priority || "MEDIUM")}
        </span>
      </div>
    </article>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-5">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-surface-subtle" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 animate-pulse rounded bg-surface-subtle" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-surface-subtle" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectIssuesPage() {
  const { projectId } = useParams();

  const [projectState, setProjectState] = useState({
    id: null,
    project: null,
    error: "",
  });

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    priority: "",
  });
  const [page, setPage] = useState(1);

  const [issueState, setIssueState] = useState({
    id: null,
    status: "loading",
    items: [],
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    getProject(projectId)
      .then((result) => {
        if (!cancelled) {
          setProjectState({
            id: projectId,
            project: result?.project ?? result,
            error: "",
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setProjectState({
            id: projectId,
            project: null,
            error: error.message || "Couldn't load project details.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    const params = {
      page: String(page),
      limit: String(LIMIT),
    };

    if (searchInput.trim()) params.search = searchInput.trim();
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    if (filters.priority) params.priority = filters.priority;

    setIssueState((current) => ({
      ...current,
      id: projectId,
      status: "loading",
      error: "",
    }));

    getProjectIssues(projectId, params)
      .then((items) => {
        if (cancelled) return;

        setIssueState({
          id: projectId,
          status: "ready",
          items: Array.isArray(items) ? items : [],
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;

        setIssueState({
          id: projectId,
          status: "error",
          items: [],
          error: error.message || "Couldn't load issues.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, page, searchInput, filters]);

  const project =
    projectState.id === projectId ? projectState.project : null;

  const projectError =
    projectState.id === projectId ? projectState.error : "";

  const issueStatus =
    issueState.id === projectId ? issueState.status : "loading";

  const issues =
    issueState.id === projectId ? issueState.items : [];

  const issueError =
    issueState.id === projectId ? issueState.error : "";

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const hasNextPage = issues.length === LIMIT;

  if (projectError) {
    return (
      <section className="mx-auto flex min-h-[45vh] max-w-xl flex-col items-center justify-center text-center">
        <h1 className="text-lg font-semibold text-ink">Project unavailable</h1>
        <p className="mt-2 text-sm text-ink-muted">{projectError}</p>
        <Link
          to="/projects"
          className="mt-5 text-sm font-semibold text-accent-support hover:underline"
        >
          Back to projects
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div>
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft size={16} />
          Project overview
        </Link>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-accent-support">
              {project?.key || "Project"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              Issues
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {project?.name || "Project issues"} · Manage and track project work
            </p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-panel border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setPage(1);
                }}
                placeholder="Search issues by title..."
                aria-label="Search issues"
                className="h-10 w-full rounded-control border border-line bg-canvas pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-accent-support"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
              <FilterSelect
                label="Status"
                value={filters.status}
                onChange={(value) => updateFilter("status", value)}
                options={[
                  { value: "BACKLOG", label: "Backlog" },
                  { value: "TODO", label: "To do" },
                  { value: "IN_PROGRESS", label: "In progress" },
                  { value: "IN_REVIEW", label: "In review" },
                  { value: "DONE", label: "Done" },
                ]}
              />

              <FilterSelect
                label="Type"
                value={filters.type}
                onChange={(value) => updateFilter("type", value)}
                options={[
                  { value: "TASK", label: "Task" },
                  { value: "BUG", label: "Bug" },
                  { value: "STORY", label: "Story" },
                  { value: "EPIC", label: "Epic" },
                  { value: "SUBTASK", label: "Subtask" },
                ]}
              />

              <FilterSelect
                label="Priority"
                value={filters.priority}
                onChange={(value) => updateFilter("priority", value)}
                options={[
                  { value: "LOWEST", label: "Lowest" },
                  { value: "LOW", label: "Low" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "HIGH", label: "High" },
                  { value: "HIGHEST", label: "Highest" },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <ListFilter size={14} />
              {Object.values(filters).filter(Boolean).length} active filters
            </span>

            {(searchInput || Object.values(filters).some(Boolean)) && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setFilters({ status: "", type: "", priority: "" });
                  setPage(1);
                }}
                className="font-semibold text-accent-support hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {issueStatus === "loading" && <LoadingRows />}

        {issueStatus === "error" && (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <RefreshCw size={22} className="text-ink-faint" />
            <p className="mt-3 text-sm font-semibold text-ink">
              Couldn't load issues
            </p>
            <p role="alert" className="mt-1 text-xs text-ink-muted">
              {issueError}
            </p>
            <button
              type="button"
              onClick={() => setPage((current) => current)}
              className="mt-4 text-sm font-semibold text-accent-support hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {issueStatus === "ready" && issues.length === 0 && (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-subtle text-ink-muted">
              <CircleDot size={21} />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-ink">
              No issues found
            </h2>
            <p className="mt-1 max-w-sm text-xs leading-5 text-ink-muted">
              Try changing your search or filters. Issues created in this
              project will appear here.
            </p>
          </div>
        )}

        {issueStatus === "ready" && issues.length > 0 && (
          <>
            <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-4 py-3 sm:px-5">
              <span className="text-xs font-semibold text-ink-muted">
                Issues on this page
              </span>
              <span className="text-xs tabular-nums text-ink-muted">
                Page {page}
              </span>
            </div>

            <div>
              {issues.map((issue) => (
                <IssueRow
                  key={issue._id || issue.id || issue.issueKey}
                  issue={issue}
                />
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-5">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={15} />
                Previous
              </button>

              <span className="text-xs text-ink-muted">Page {page}</span>

              <button
                type="button"
                disabled={!hasNextPage}
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
