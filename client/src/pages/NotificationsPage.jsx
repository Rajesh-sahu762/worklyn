import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Bell, CheckCheck, CircleDot, MessageSquare, RefreshCw, UserRoundCheck } from "lucide-react";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../lib/api";
import { useNotifications } from "../context/NotificationsContext";

const idOf = (item) => item?._id ?? item?.id;
const actorName = (actor) => actor ? [actor.firstName, actor.lastName].filter(Boolean).join(" ") || "A teammate" : "A teammate";
const relativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

function NotificationIcon({ type }) {
  const Icon = type === "ISSUE_ASSIGNED" ? UserRoundCheck : type === "ISSUE_COMMENTED" ? MessageSquare : CircleDot;
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-subtle text-ink-muted"><Icon size={17} /></span>;
}

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1, hasNextPage: false });
  const { unreadCount, setUnreadCount, latestNotification } = useNotifications();
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (page = 1, append = false) => {
    setStatus("loading");
    setError("");
    try {
      const result = await getNotifications(page, 20);
      setItems((current) => append ? [...current, ...result.notifications] : result.notifications);
      setPagination(result.pagination ?? { page, limit: 20, total: result.notifications.length, totalPages: 1, hasNextPage: false });
      setUnreadCount(result.unreadCount);
      setStatus("ready");
    } catch (err) {
      setError(err.message || "Couldn't load notifications.");
      setStatus("error");
    }
  }, [setUnreadCount]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) load(); });
    return () => { active = false; };
  }, [load]);

  // A notification received over Socket.IO appears immediately in the inbox.
  useEffect(() => {
    if (!latestNotification?._id || items.some((item) => idOf(item) === idOf(latestNotification))) return;
    setItems((current) => [latestNotification, ...current]);
    setPagination((current) => ({ ...current, total: current.total + 1 }));
  }, [latestNotification, items]);

  async function markRead(notification) {
    const id = idOf(notification);
    if (notification.readAt || busyId) return;
    setBusyId(id);
    try {
      await markNotificationRead(id);
      setItems((current) => current.map((item) => idOf(item) === id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err.message || "Couldn't mark this notification as read.");
    } finally { setBusyId(null); }
  }

  async function markAllRead() {
    setMarkingAll(true);
    setError("");
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      setUnreadCount(0);
    } catch (err) { setError(err.message || "Couldn't mark notifications as read."); }
    finally { setMarkingAll(false); }
  }

  const hasUnread = unreadCount > 0;

  return <div className="mx-auto max-w-4xl space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">Your activity</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Notifications</h1><p className="mt-2 text-sm text-ink-muted">{unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}</p></div><div className="flex gap-2"><button type="button" onClick={() => load(1)} disabled={status === "loading"} aria-label="Refresh notifications" className="grid h-10 w-10 place-items-center rounded-control border border-line bg-surface text-ink-muted hover:bg-surface-subtle disabled:opacity-50"><RefreshCw size={15} className={status === "loading" ? "animate-spin" : ""} /></button><button type="button" onClick={markAllRead} disabled={!hasUnread || markingAll} className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-line bg-surface px-3 text-xs font-semibold text-ink hover:bg-surface-subtle disabled:opacity-50"><CheckCheck size={15} />{markingAll ? "Updating…" : "Mark all read"}</button></div></header>
    {error && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
    <section className="overflow-hidden rounded-panel border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-4"><div className="flex items-center gap-2"><Bell size={16} className="text-ink-muted" /><h2 className="text-sm font-semibold text-ink">Inbox</h2></div><span className="text-xs text-ink-faint">{pagination.total ?? items.length} total</span></div>
      {status === "loading" && items.length === 0 && <div className="space-y-3 p-5">{[0,1,2,3,4].map((i) => <div key={i} className="h-16 animate-pulse rounded-control bg-surface-subtle" />)}</div>}
      {status === "error" && items.length === 0 && <div className="px-5 py-12 text-center"><p className="text-sm text-ink-muted">Notifications couldn't be loaded.</p><button type="button" onClick={() => load(1)} className="mt-3 text-sm font-semibold underline">Try again</button></div>}
      {status === "ready" && items.length === 0 && <div className="px-5 py-14 text-center"><Bell size={25} className="mx-auto text-ink-faint" /><h3 className="mt-3 text-sm font-semibold text-ink">You're all caught up</h3><p className="mt-1 text-sm text-ink-muted">Issue assignments, status changes and comments will appear here.</p></div>}
      {items.length > 0 && <ul className="divide-y divide-line">{items.map((item) => {
        const projectId = item.project?._id ?? item.project?.id;
        const issueId = item.issue?._id ?? item.issue?.id;
        const href = projectId && issueId ? `/projects/${projectId}/issues/${issueId}` : null;
        const row = <div className="flex items-start gap-3"><NotificationIcon type={item.type} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-sm leading-5 text-ink"><strong>{actorName(item.actor)}</strong> {item.message}</p><span className="shrink-0 whitespace-nowrap text-[10px] text-ink-faint">{relativeTime(item.createdAt)}</span></div><p className="mt-1 truncate text-xs text-ink-muted">{item.project?.name ?? "Project"}{item.project?.key ? ` · ${item.project.key}` : ""}{item.issue?.title ? ` · ${item.issue.title}` : ""}</p></div>{!item.readAt && <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-support" />}</div>;
        return <li key={idOf(item)} className={`px-4 py-4 transition-colors sm:px-5 ${item.readAt ? "bg-surface" : "bg-accent-support/[0.035]"}`}>{href ? <Link to={href} onClick={() => markRead(item)} className="block rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent-support">{row}</Link> : <div>{row}</div>}{!item.readAt && <button type="button" onClick={() => markRead(item)} disabled={busyId === idOf(item)} className="ml-[52px] mt-2 text-[11px] font-semibold text-accent-support hover:underline disabled:opacity-50">{busyId === idOf(item) ? "Updating…" : "Mark as read"}</button>}</li>;
      })}</ul>}
      {pagination.hasNextPage && <div className="border-t border-line p-4 text-center"><button type="button" onClick={() => load(pagination.page + 1, true)} disabled={status === "loading"} className="rounded-control border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-subtle disabled:opacity-50">{status === "loading" ? "Loading…" : "Load more"}</button></div>}
    </section>
  </div>;
}
