import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Clock3,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  X,
  Activity,
  CircleDot,
} from "lucide-react";

import {
  getIssue,
  getProject,
  updateIssue,
  getIssueComments,
  createIssueComment,
  updateIssueComment,
  deleteIssueComment,
  getIssueActivities,
  getProjectMembers,
  getTeams,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";

const STATUS_TRANSITIONS = {
  BACKLOG: ["TODO"],
  TODO: ["BACKLOG", "IN_PROGRESS"],
  IN_PROGRESS: ["TODO", "IN_REVIEW"],
  IN_REVIEW: ["IN_PROGRESS", "DONE"],
  DONE: ["IN_REVIEW"],
};

const STATUS_OPTIONS = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

const STATUS_STYLES = {
  BACKLOG: "bg-status-backlog/10 text-status-backlog",
  TODO: "bg-status-todo/10 text-status-todo",
  IN_PROGRESS: "bg-status-progress/10 text-status-progress",
  IN_REVIEW: "bg-status-review/10 text-status-review",
  DONE: "bg-status-done/10 text-status-done",
};

const PRIORITIES = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"];
const TYPES = ["EPIC", "STORY", "TASK", "BUG", "SUB_TASK"];

const formatLabel = (value = "") =>
  String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());

const getId = (value) =>
  typeof value === "object" ? (value?._id ?? value?.id) : value;

const getPersonName = (person) => {
  if (!person || typeof person !== "object") return "Unknown user";

  return (
    [person.firstName, person.lastName].filter(Boolean).join(" ") ||
    person.name ||
    person.email ||
    "Unknown user"
  );
};

const getDate = (value) => (value ? new Date(value).toLocaleString() : "—");

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
        STATUS_STYLES[status] || "bg-surface-subtle text-ink-muted"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {formatLabel(status)}
    </span>
  );
}

function SectionHeading({ icon: Icon, children, count }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={17} className="text-ink-muted" />
      <h2 className="text-sm font-semibold text-ink">{children}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
          {count}
        </span>
      )}
    </div>
  );
}


function Field({ label, children }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}



const inputClass =
  "box-border h-10 w-full min-w-0 max-w-full rounded-control border border-line bg-surface px-3 text-sm text-ink outline-none transition focus:border-accent-support";

function CommentItem({ comment, currentUserId, onUpdate, onDelete, busy }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body || "");

  const commentId = getId(comment.author);
  const isAuthor = currentUserId && commentId && currentUserId === commentId;

  const isDeleted = Boolean(comment.deletedAt);

  const save = async () => {
    if (!body.trim()) return;

    try {
      await onUpdate(comment._id || comment.id, body.trim());
      setEditing(false);
    } catch {
      // Keep the editor open; the parent displays the API error.
    }
  };

  return (
    <article className="flex gap-3 py-4">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-subtle text-xs font-semibold text-ink-muted">
        {getPersonName(comment.author).charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-semibold text-ink">
            {getPersonName(comment.author)}
          </span>
          <span className="text-[10px] text-ink-faint">
            {getDate(comment.createdAt)}
          </span>
          {comment.editedAt && !isDeleted && (
            <span className="text-[10px] text-ink-faint">Edited</span>
          )}
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              maxLength={5000}
              className="w-full resize-y rounded-control border border-line bg-canvas p-3 text-sm text-ink outline-none focus:border-accent-support"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || !body.trim()}
                onClick={save}
                className="rounded-control bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent-strong disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setBody(comment.body || "");
                  setEditing(false);
                }}
                className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className={`mt-1 whitespace-pre-wrap break-words text-sm leading-6 ${
              isDeleted ? "italic text-ink-faint" : "text-ink-muted"
            }`}
          >
            {isDeleted ? "This comment was deleted." : comment.body}
          </p>
        )}

        {!editing && isAuthor && !isDeleted && (
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[11px] font-semibold text-ink-muted hover:text-ink"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDelete(comment._id || comment.id)}
              className="text-[11px] font-semibold text-danger hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function IssueDetailPage() {
  const { projectId, issueId } = useParams();
  const { user } = useAuth();
  const [showAllActivities, setShowAllActivities] = useState(false);

  const currentUserId = getId(user);

  const [project, setProject] = useState(null);
  const [projectRole, setProjectRole] = useState(null);
  const [issue, setIssue] = useState(null);

  const [pageStatus, setPageStatus] = useState("loading");
  const [pageError, setPageError] = useState("");

  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [commentText, setCommentText] = useState("");

  const [commentStatus, setCommentStatus] = useState("loading");
  const [activityStatus, setActivityStatus] = useState("loading");
  const [commentError, setCommentError] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const [editingIssue, setEditingIssue] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    type: "TASK",
    priority: "MEDIUM",
    assignmentType: "none",
    assigneeId: "",
    assigneeTeamId: "",
  });
  const [assignmentOptions, setAssignmentOptions] = useState({ members: [], teams: [] });

  const [savingIssue, setSavingIssue] = useState(false);
  const [issueActionError, setIssueActionError] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);

  const canEdit = projectRole === "PROJECT_ADMIN" || projectRole === "MEMBER";

  const loadIssue = useCallback(async () => {
    setPageStatus("loading");
    setPageError("");

    try {
      const [projectResult, issueResult, memberRows] = await Promise.all([
        getProject(projectId),
        getIssue(issueId),
        getProjectMembers(projectId),
      ]);

      const projectData = projectResult?.project ?? projectResult;
      const issueData = issueResult?.issue ?? issueResult;
      const teamRows = projectData.organization ? await getTeams(projectData.organization).catch(() => []) : [];
      const attachedTeamIds = (projectData.teams || []).map(team => String(typeof team === "object" ? team._id : team));
      setAssignmentOptions({
        members: (memberRows || []).filter(item => item.status === "ACTIVE" && item.user).map(item => item.user),
        teams: (teamRows || []).filter(team => team.isActive && attachedTeamIds.includes(String(team._id || team.id))),
      });


      setProject(projectData);
      setProjectRole(projectResult?.role ?? null);
      setIssue(issueData);

      setEditForm({
        title: issueData.title || "",
        description: issueData.description || "",
        type: issueData.type || "TASK",
        priority: issueData.priority || "MEDIUM",
        assignmentType: issueData.assignee ? "user" : issueData.assigneeTeam ? "team" : "none",
        assigneeId: getId(issueData.assignee) || "",
        assigneeTeamId: getId(issueData.assigneeTeam) || "",
      });

      setPageStatus("ready");
    } catch (error) {
      setPageError(error.message || "Couldn't load this issue.");
      setPageStatus("error");
    }
  }, [projectId, issueId]);

  const loadComments = useCallback(async () => {
    setCommentStatus("loading");
    setCommentError("");

    try {
      const result = await getIssueComments(projectId, issueId, {
        page: "1",
        limit: "100",
      });

      setComments(result.items);
      setCommentStatus("ready");
    } catch (error) {
      setCommentError(error.message || "Couldn't load comments.");
      setCommentStatus("error");
    }
  }, [projectId, issueId]);

  const loadActivities = useCallback(async () => {
    setActivityStatus("loading");

    try {
      const result = await getIssueActivities(issueId);
      setActivities(Array.isArray(result) ? result : []);
      setActivityStatus("ready");
    } catch {
      setActivityStatus("error");
    }
  }, [issueId]);

  useEffect(() => {
    loadIssue();
  }, [loadIssue]);

  useEffect(() => {
    loadComments();
    loadActivities();
  }, [loadComments, loadActivities]);

  const handleIssueSave = async (event) => {
    event.preventDefault();
    if (!canEdit || !editForm.title.trim()) return;

    setSavingIssue(true);
    setIssueActionError("");

    try {
      const updated = await updateIssue(projectId, issueId, {
        title: editForm.title.trim(),
        description: editForm.description,
        type: editForm.type,
        priority: editForm.priority,
        assignee: editForm.assignmentType === "user" ? editForm.assigneeId || null : null,
        assigneeTeam: editForm.assignmentType === "team" ? editForm.assigneeTeamId || null : null,
      });

      const updatedIssue = updated?.issue ?? updated;
      setIssue(updatedIssue);
      setEditingIssue(false);
      await loadActivities();
    } catch (error) {
      setIssueActionError(error.message || "Couldn't update this issue.");
    } finally {
      setSavingIssue(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (!canEdit || !status) return;

    setStatusBusy(true);
    setIssueActionError("");

    try {
      const updated = await updateIssue(projectId, issueId, { status });
      setIssue(updated?.issue ?? updated);
      await loadActivities();
    } catch (error) {
      setIssueActionError(error.message || "Couldn't change issue status.");
    } finally {
      setStatusBusy(false);
    }
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;

    setCommentBusy(true);
    setCommentError("");

    try {
      await createIssueComment(projectId, issueId, commentText.trim());
      setCommentText("");
      await loadComments();
    } catch (error) {
      setCommentError(error.message || "Couldn't post your comment.");
    } finally {
      setCommentBusy(false);
    }
  };

  const handleCommentUpdate = async (commentId, body) => {
    setCommentBusy(true);
    setCommentError("");

    try {
      await updateIssueComment(projectId, issueId, commentId, body);
      await loadComments();
    } catch (error) {
      setCommentError(error.message || "Couldn't update comment.");
      throw error;
    } finally {
      setCommentBusy(false);
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;

    setCommentBusy(true);
    setCommentError("");

    try {
      await deleteIssueComment(projectId, issueId, commentId);
      await loadComments();
    } catch (error) {
      setCommentError(error.message || "Couldn't delete comment.");
    } finally {
      setCommentBusy(false);
    }
  };

  if (pageStatus === "loading") {
    return (
      <div className="mx-auto max-w-6xl animate-pulse space-y-5">
        <div className="h-4 w-32 rounded bg-surface-subtle" />
        <div className="h-8 w-2/3 rounded bg-surface-subtle" />
        <div className="h-48 rounded-panel bg-surface-subtle" />
      </div>
    );
  }

  if (pageStatus === "error") {
    return (
      <section className="mx-auto flex min-h-[45vh] max-w-xl flex-col items-center justify-center text-center">
        <h1 className="text-lg font-semibold text-ink">Issue unavailable</h1>
        <p role="alert" className="mt-2 text-sm text-ink-muted">
          {pageError}
        </p>
        <button
          type="button"
          onClick={loadIssue}
          className="mt-4 rounded-control bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent-strong"
        >
          Try again
        </button>
      </section>
    );
  }

  const nextStatuses = STATUS_TRANSITIONS[issue.status] || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div>
        <Link
          to={`/projects/${projectId}/issues`}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={16} />
          Back to issues
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <Link
            to={`/projects/${projectId}`}
            className="font-semibold hover:text-ink"
          >
            {project?.key || "Project"}
          </Link>
          <span>/</span>
          <span>{issue.issueKey || issue.key || "Issue"}</span>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-ink">
              {issue.title}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              {formatLabel(issue.type)} · Created {getDate(issue.createdAt)}
            </p>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setEditingIssue((current) => !current)}
              className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 self-end rounded-control border border-line bg-surface px-4 text-xs font-semibold text-ink transition hover:bg-surface-subtle sm:self-center"
            >
              {editingIssue ? <X size={15} /> : <Pencil size={15} />}
              {editingIssue ? "Cancel edit" : "Edit issue"}
            </button>
          )}
        </div>
      </div>

      {issueActionError && (
        <p
          role="alert"
          className="rounded-control bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {issueActionError}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-panel border border-line bg-surface p-4 sm:p-5">
            {editingIssue ? (
              <form onSubmit={handleIssueSave} className="space-y-4">
                <Field label="Issue title">
                  <input
                    required
                    minLength={3}
                    maxLength={200}
                    value={editForm.title}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    rows={6}
                    maxLength={10000}
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="w-full rounded-control border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-accent-support"
                    placeholder="Add details about this issue..."
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Type">
                    <select
                      value={editForm.type}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          type: event.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      {TYPES.map((type) => (
                        <option key={type} value={type}>
                          {formatLabel(type)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Priority">
                    <select
                      value={editForm.priority}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          priority: event.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {formatLabel(priority)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Assignment type">
                    <select value={editForm.assignmentType} onChange={event => setEditForm(current => ({ ...current, assignmentType: event.target.value, assigneeId: "", assigneeTeamId: "" }))} className={inputClass}>
                      <option value="none">Unassigned</option><option value="user">Individual user</option><option value="team">Team</option>
                    </select>
                  </Field>
                  {editForm.assignmentType === "user" && <Field label="Assignee">
                    <select value={editForm.assigneeId} onChange={event => setEditForm(current => ({ ...current, assigneeId: event.target.value }))} className={inputClass}>
                      <option value="">Select project member</option>
                      {assignmentOptions.members.map(member => <option key={member._id} value={member._id}>{getPersonName(member)}</option>)}
                    </select>
                  </Field>}
                  {editForm.assignmentType === "team" && <Field label="Assign team">
                    <select value={editForm.assigneeTeamId} onChange={event => setEditForm(current => ({ ...current, assigneeTeamId: event.target.value }))} className={inputClass}>
                      <option value="">Select project team</option>
                      {assignmentOptions.teams.map(team => <option key={team._id || team.id} value={team._id || team.id}>{team.name}</option>)}
                    </select>
                  </Field>}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingIssue(false)}
                    className="rounded-control border border-line px-4 py-2 text-xs font-semibold text-ink-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingIssue || !editForm.title.trim()}
                    className="rounded-control bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent-strong disabled:opacity-50"
                  >
                    {savingIssue ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <SectionHeading icon={CircleDot}>Description</SectionHeading>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-ink-muted">
                  {issue.description?.trim() ||
                    "No description has been added."}
                </p>
              </>
            )}
          </section>

          <section className="rounded-panel border border-line bg-surface p-4 sm:p-5">
            <SectionHeading icon={MessageSquare} count={comments.length}>
              Comments
            </SectionHeading>

            <form onSubmit={handleCommentSubmit} className="mt-4 space-y-3">
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                rows={3}
                maxLength={5000}
                placeholder="Write a comment..."
                className="w-full resize-y rounded-control border border-line bg-canvas p-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent-support"
              />

              {commentError && (
                <p role="alert" className="text-xs text-danger">
                  {commentError}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={commentBusy || !commentText.trim()}
                  className="inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-accent-strong disabled:opacity-50"
                >
                  <Send size={14} />
                  {commentBusy ? "Sending..." : "Add comment"}
                </button>
              </div>
            </form>

            <div className="mt-3 divide-y divide-line border-t border-line">
              {commentStatus === "loading" && (
                <p className="py-5 text-xs text-ink-muted">
                  Loading comments...
                </p>
              )}

              {commentStatus === "error" && (
                <div className="py-5">
                  <p className="text-xs text-danger">{commentError}</p>
                  <button
                    type="button"
                    onClick={loadComments}
                    className="mt-2 text-xs font-semibold text-accent-support"
                  >
                    Try again
                  </button>
                </div>
              )}

              {commentStatus === "ready" && comments.length === 0 && (
                <p className="py-6 text-center text-xs text-ink-muted">
                  No comments yet. Start the conversation.
                </p>
              )}

              {commentStatus === "ready" &&
                comments.map((comment) => (
                  <CommentItem
                    key={comment._id || comment.id}
                    comment={comment}
                    currentUserId={currentUserId}
                    onUpdate={handleCommentUpdate}
                    onDelete={handleCommentDelete}
                    busy={commentBusy}
                  />
                ))}
            </div>
          </section>

         
<section className="rounded-panel border border-line bg-surface p-4 sm:p-5">
  <div className="flex items-center justify-between gap-3">
    <SectionHeading icon={Activity} count={activities.length}>
      Activity
    </SectionHeading>

    {activities.length > 5 && (
      <button
        type="button"
        onClick={() => setShowAllActivities((current) => !current)}
        className="shrink-0 text-xs font-semibold text-accent-support hover:underline"
      >
        {showAllActivities ? "Show less" : "Show all"}
      </button>
    )}
  </div>

  {activityStatus === "loading" && (
    <p className="mt-4 text-xs text-ink-muted">
      Loading activity...
    </p>
  )}

  {activityStatus === "error" && (
    <p className="mt-4 text-xs text-ink-muted">
      Activity history is currently unavailable.
    </p>
  )}

  {activityStatus === "ready" && activities.length === 0 && (
    <p className="mt-4 text-xs text-ink-muted">
      No activity has been recorded yet.
    </p>
  )}

  {activityStatus === "ready" && activities.length > 0 && (
    <div className="mt-4 space-y-3">
      {(showAllActivities ? activities : activities.slice(0, 5)).map(
        (activity) => (
          <div
            key={activity._id || activity.id}
            className="flex min-w-0 gap-3"
          >
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-subtle text-ink-muted">
              <Clock3 size={13} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-xs font-semibold text-ink">
                  {formatLabel(activity.action)}
                </p>

                <span className="text-[10px] text-ink-faint">
                  {getDate(activity.createdAt)}
                </span>
              </div>

              <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                {getPersonName(activity.actor)}
              </p>

              {activity.changes?.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {activity.changes.map((change, index) => (
                    <p
                      key={`${change.field}-${index}`}
                      className="break-words text-[11px] leading-4 text-ink-muted"
                    >
                      <span className="font-medium text-ink">
                        {formatLabel(change.field)}
                      </span>
                      : {formatLabel(String(change.from ?? "Empty"))}
                      {" → "}
                      {formatLabel(String(change.to ?? "Empty"))}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  )}

  {activityStatus === "ready" && activities.length > 5 && (
    <button
      type="button"
      onClick={() => setShowAllActivities((current) => !current)}
      className="mt-4 w-full border-t border-line pt-3 text-center text-xs font-semibold text-accent-support hover:underline"
    >
      {showAllActivities
        ? "Show less activity"
        : `View all ${activities.length} activities`}
    </button>
  )}
</section>

        </div>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-panel border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">Properties</h2>

            <div className="mt-4 space-y-4">
              <Field label="Status">
                <StatusBadge status={issue.status} />

                {canEdit && (
                  <select
                    disabled={statusBusy}
                    value=""
                    onChange={(event) => handleStatusChange(event.target.value)}
                    className={`${inputClass} mt-2 block w-full min-w-0 max-w-full`}
                  >
                    <option value="" disabled>
                      {statusBusy ? "Updating..." : "Move to..."}
                    </option>

                    {STATUS_OPTIONS.map((status) => {
                      const isCurrent = status === issue.status;
                      const isAllowed = nextStatuses.includes(status);

                      return (
                        <option
                          key={status}
                          value={status}
                          disabled={isCurrent || !isAllowed}
                        >
                          {formatLabel(status)}
                          {isCurrent ? " (Current)" : ""}
                        </option>
                      );
                    })}
                  </select>
                )}

                {!canEdit && (
                  <p className="mt-2 text-[11px] text-ink-faint">
                    Viewers cannot change issue status.
                  </p>
                )}
              </Field>

              <Field label="Priority">
                <span
                  className={`text-sm font-semibold ${
                    issue.priority === "HIGHEST" || issue.priority === "HIGH"
                      ? "text-priority-high"
                      : issue.priority === "LOW" || issue.priority === "LOWEST"
                        ? "text-priority-low"
                        : "text-ink"
                  }`}
                >
                  {formatLabel(issue.priority)}
                </span>
              </Field>

              <Field label="Type">
                <span className="text-sm text-ink">
                  {formatLabel(issue.type)}
                </span>
              </Field>

              <Field label="Assignee">
                <span className="text-sm text-ink">
                  {issue.assigneeTeam?.name || (issue.assignee ? getPersonName(issue.assignee) : "Unassigned")}
                </span>
              </Field>

              <Field label="Reporter">
                <span className="text-sm text-ink">
                  {getPersonName(issue.reporter)}
                </span>
              </Field>

              <Field label="Estimate">
                <span className="text-sm text-ink">
                  {issue.estimate ?? "Not set"}
                </span>
              </Field>

              <Field label="Due date">
                <span className="text-sm text-ink">
                  {issue.dueDate
                    ? new Date(issue.dueDate).toLocaleDateString()
                    : "Not set"}
                </span>
              </Field>
            </div>
          </section>

          <section className="rounded-panel border border-line bg-surface p-4">
            <h2 className="text-xs font-semibold text-ink">Project</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {project?.name || "Project"}
            </p>
            <Link
              to={`/projects/${projectId}`}
              className="mt-3 inline-block text-xs font-semibold text-accent-support hover:underline"
            >
              View project
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
