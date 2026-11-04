import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Check, Copy, MailPlus, RefreshCw, Search, Shield, ShieldCheck,
  UserMinus, Users, X, XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";
import {
  cancelInvitation, createInvitation, getOrgMembers, removeOrgMember,
  resendInvitation, updateOrgMemberRole,
} from "../lib/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { Field, inputClass } from "../components/AuthShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member" };
const ROLE_RANK = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
const ROLE_STYLE = {
  OWNER: "border border-accent/25 bg-accent/10 text-accent",
  ADMIN: "border border-line bg-surface-subtle text-ink",
  MEMBER: "border border-line bg-canvas text-ink-muted",
};

const normalize = (m) => {
  const u = m.user && typeof m.user === "object" ? m.user : {};
  return {
    id: m._id ?? m.id,
    userId: u._id ?? u.id ?? (typeof m.user === "string" ? m.user : null),
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Unknown user",
    email: u.email ?? "",
    image: u.profileImage || "",
    role: m.role,
    joinedAt: m.joinedAt ?? m.createdAt,
  };
};

const fmt = (date) => {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

function RoleBadge({ role }) {
  const Icon = role === "OWNER" ? ShieldCheck : role === "ADMIN" ? Shield : Users;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLE[role] ?? ROLE_STYLE.MEMBER}`}>
      <Icon size={13} /> {ROLE_LABEL[role] ?? role}
    </span>
  );
}

function Avatar({ member }) {
  if (member.image) {
    return <img src={member.image} alt="" className="h-11 w-11 shrink-0 rounded-full border border-line object-cover" />;
  }
  const initials = member.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-subtle text-sm font-semibold text-ink">
      {initials || "?"}
    </span>
  );
}

export default function OrganizationMembersPage() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id ?? null;
  const isOwner = currentOrg?.role === "OWNER";
  const canInvite = isOwner || currentOrg?.role === "ADMIN";
  const myId = user?._id ?? user?.id;

  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState({ key: "", members: [], error: "" });
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [pendingId, setPendingId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [toRemove, setToRemove] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "MEMBER" });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState({ field: "", form: "" });
  const [sent, setSent] = useState([]);
  const [sentBusy, setSentBusy] = useState(null);
  const [copied, setCopied] = useState(null);

  const key = `${orgId}#${reloadKey}`;

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    getOrgMembers(orgId)
      .then((list) => {
        if (!cancelled) setData({ key, members: list.map(normalize), error: "" });
      })
      .catch((err) => {
        if (!cancelled) setData({ key, members: [], error: err.message });
      });
    return () => { cancelled = true; };
  }, [orgId, key]);

  useEffect(() => {
    setSent([]);
    setNotice(null);
  }, [orgId]);

  const status = !orgId ? "idle" : data.key !== key ? "loading" : data.error ? "error" : "ready";
  const members = status === "ready" ? data.members : [];
  const setMembers = (update) => setData((current) => ({
    ...current,
    members: typeof update === "function" ? update(current.members) : update,
  }));

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((member) =>
        (roleFilter === "ALL" || member.role === roleFilter) &&
        (!q || member.name.toLowerCase().includes(q) || member.email.toLowerCase().includes(q))
      )
      .sort((a, b) =>
        (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9) ||
        a.name.localeCompare(b.name)
      );
  }, [members, query, roleFilter]);

  const counts = useMemo(() => ({
    total: members.length,
    admins: members.filter((member) => member.role === "ADMIN").length,
    members: members.filter((member) => member.role === "MEMBER").length,
  }), [members]);

  async function sendInvite() {
    const email = invite.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setInviteError({ field: "Enter a valid email address.", form: "" });
      return;
    }
    setInviteBusy(true);
    setInviteError({ field: "", form: "" });
    try {
      const { invitation, link } = await createInvitation(orgId, email, invite.role);
      setSent((list) => [{
        id: invitation?._id ?? invitation?.id,
        email,
        role: invite.role,
        link,
        expiresAt: invitation?.expiresAt,
      }, ...list]);
      setInvite({ email: "", role: "MEMBER" });
      setInviteOpen(false);
      setNotice({ ok: true, text: `Invitation created for ${email}. Share the link below.` });
    } catch (err) {
      const field = err.fieldErrors?.email ?? "";
      setInviteError({ field, form: field ? "" : err.message });
    } finally {
      setInviteBusy(false);
    }
  }

  async function runInvitationAction(invitation, action, onSuccess) {
    setSentBusy(invitation.id);
    try {
      await action();
      onSuccess();
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally {
      setSentBusy(null);
    }
  }

  function resend(invitation) {
    return runInvitationAction(invitation, async () => {
      const { invitation: updated, link } = await resendInvitation(orgId, invitation.id);
      setSent((list) => list.map((item) => item.id === invitation.id ? {
        ...item,
        link: link || item.link,
        expiresAt: updated?.expiresAt ?? item.expiresAt,
      } : item));
    }, () => setNotice({ ok: true, text: `A fresh invitation link was created for ${invitation.email}. The old link is no longer valid.` }));
  }

  function cancel(invitation) {
    return runInvitationAction(invitation, () => cancelInvitation(orgId, invitation.id), () => {
      setSent((list) => list.filter((item) => item.id !== invitation.id));
      setNotice({ ok: true, text: `Invitation to ${invitation.email} was cancelled.` });
    });
  }

  async function copy(invitation) {
    if (!invitation.link) return;
    try {
      await navigator.clipboard.writeText(invitation.link);
      setCopied(invitation.id);
      window.setTimeout(() => setCopied((value) => value === invitation.id ? null : value), 1800);
    } catch {
      setNotice({ ok: false, text: "Couldn't copy automatically. Select the invitation link and copy it." });
    }
  }

  async function changeRole(member, role) {
    if (role === member.role || pendingId) return;
    setPendingId(member.id);
    setNotice(null);
    try {
      const updated = await updateOrgMemberRole(orgId, member.id, role);
      setMembers((list) => list.map((item) => item.id === member.id
        ? { ...item, role: updated?.role ?? role }
        : item));
      setNotice({ ok: true, text: `${member.name} is now ${ROLE_LABEL[role]}.` });
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally {
      setPendingId(null);
    }
  }

  async function confirmRemove() {
    if (!toRemove) return;
    const member = toRemove;
    setPendingId(member.id);
    try {
      await removeOrgMember(orgId, member.id);
      setMembers((list) => list.filter((item) => item.id !== member.id));
      setNotice({ ok: true, text: `${member.name} was removed from ${currentOrg.name}.` });
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally {
      setPendingId(null);
      setToRemove(null);
    }
  }

  if (!orgId) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-subtle text-ink-muted"><Users size={22} /></div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">No organization selected</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-ink-muted">Create an organization or choose one from your workspace switcher to manage its members.</p>
        <Link to="/organizations/new" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-control bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong">Create organization</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Workspace settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">People</h1>
          <p className="mt-1.5 break-words text-sm text-ink-muted">{currentOrg.name} <span className="px-1 text-ink-faint">/</span> Manage your team and access</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={status === "loading"}
            aria-label="Refresh members"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border border-line bg-surface px-3 text-sm font-medium text-ink transition hover:bg-surface-subtle disabled:opacity-50 sm:flex-none"
          >
            <RefreshCw size={16} className={status === "loading" ? "animate-spin" : ""} /> <span className="sm:hidden">Refresh</span>
          </button>
          {canInvite && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex min-h-11 flex-[2] items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none"
            >
              <MailPlus size={17} /> Invite people
            </button>
          )}
        </div>
      </header>

      <section aria-label="Team summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-muted">Total people</span>
            <Users size={18} className="text-ink-faint" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{status === "ready" ? counts.total : "—"}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-muted">Admins</span>
            <ShieldCheck size={18} className="text-ink-faint" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{status === "ready" ? counts.admins : "—"}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-muted">Members</span>
            <Users size={18} className="text-ink-faint" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{status === "ready" ? counts.members : "—"}</p>
        </div>
      </section>

      {notice && (
        <div role={notice.ok ? "status" : "alert"} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.ok ? "border-line bg-surface" : "border-danger/30 bg-danger/5"}`}>
          {notice.ok ? <Check size={17} className="mt-0.5 shrink-0 text-emerald-700" /> : <XCircle size={17} className="mt-0.5 shrink-0 text-danger" />}
          <p className="min-w-0 flex-1 text-ink">{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message" className="rounded p-1 text-ink-faint hover:bg-surface-subtle"><X size={15} /></button>
        </div>
      )}

      {sent.length > 0 && (
        <section aria-labelledby="invitations-heading" className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-col gap-1 border-b border-line px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <MailPlus size={17} className="text-ink-muted" />
              <h2 id="invitations-heading" className="font-semibold text-ink">Recently invited</h2>
              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-medium text-ink-muted">{sent.length}</span>
            </div>
            <p className="text-xs leading-5 text-ink-muted">Email delivery isn't configured yet. Copy and share these links directly. This temporary list clears when you leave this page.</p>
          </div>
          <ul className="divide-y divide-line">
            {sent.map((invitation) => (
              <li key={invitation.id} className="flex min-w-0 flex-col gap-3 p-4 sm:px-5">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold text-ink">{invitation.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <RoleBadge role={invitation.role} />
                      {invitation.expiresAt && <span className="text-xs text-ink-faint">Expires {fmt(invitation.expiresAt)}</span>}
                    </div>
                  </div>
                  {sentBusy === invitation.id && <span className="text-xs text-ink-muted">Updating…</span>}
                </div>
                {invitation.link ? (
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                    <input
                      readOnly
                      value={invitation.link}
                      onFocus={(event) => event.target.select()}
                      aria-label={`Invitation link for ${invitation.email}`}
                      className="min-h-10 min-w-0 flex-1 rounded-control border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink-muted"
                    />
                    <button type="button" onClick={() => copy(invitation)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line px-3 text-sm font-medium text-ink hover:bg-surface-subtle">
                      {copied === invitation.id ? <Check size={15} /> : <Copy size={15} />}
                      {copied === invitation.id ? "Copied" : "Copy link"}
                    </button>
                  </div>
                ) : <p className="text-xs text-ink-muted">The server didn't return an invitation link.</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => resend(invitation)} disabled={sentBusy === invitation.id} className="inline-flex min-h-9 items-center gap-1.5 rounded-control px-3 text-sm font-medium text-accent-support hover:bg-surface-subtle disabled:opacity-50">
                    <RefreshCw size={14} /> Resend
                  </button>
                  <button type="button" onClick={() => cancel(invitation)} disabled={sentBusy === invitation.id} className="inline-flex min-h-9 items-center gap-1.5 rounded-control px-3 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="members-heading" className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="members-heading" className="font-semibold text-ink">Organization members</h2>
              <p className="mt-1 text-xs text-ink-muted">{status === "ready" ? `${members.length} active ${members.length === 1 ? "person" : "people"} in this organization` : "People who have access to this workspace"}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_160px] lg:w-[430px]">
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search members"
                  placeholder="Search name or email"
                  className={`${inputClass(false)} min-h-10 pl-9`}
                />
              </label>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role" className={`${inputClass(false)} min-h-10`}>
                <option value="ALL">All roles</option>
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admins</option>
                <option value="MEMBER">Members</option>
              </select>
            </div>
          </div>
        </div>

        {status === "loading" && (
          <ul aria-label="Loading members" className="divide-y divide-line">
            {[0, 1, 2, 3].map((item) => (
              <li key={item} className="flex items-center gap-3 p-4 sm:px-5">
                <div className="h-11 w-11 animate-pulse rounded-full bg-surface-subtle motion-reduce:animate-none" />
                <div className="flex-1 space-y-2"><div className="h-3 w-36 animate-pulse rounded bg-surface-subtle" /><div className="h-3 w-48 max-w-full animate-pulse rounded bg-surface-subtle" /></div>
              </li>
            ))}
          </ul>
        )}

        {status === "error" && (
          <div role="alert" className="px-5 py-10 text-center">
            <XCircle size={24} className="mx-auto text-danger" />
            <p className="mt-3 text-sm font-medium text-ink">Couldn't load your members</p>
            <p className="mt-1 text-sm text-ink-muted">{data.error}</p>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line px-4 text-sm font-medium text-ink hover:bg-surface-subtle">
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        )}

        {status === "ready" && shown.length === 0 && (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-surface-subtle text-ink-muted"><Search size={19} /></div>
            <p className="mt-3 text-sm font-semibold text-ink">{members.length ? "No matching people" : "No members yet"}</p>
            <p className="mt-1 text-sm text-ink-muted">{members.length ? "Try a different name or role filter." : "Invite teammates to start collaborating in this organization."}</p>
            {members.length === 0 && canInvite && <button type="button" onClick={() => setInviteOpen(true)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong"><MailPlus size={15} /> Invite your team</button>}
          </div>
        )}

        {status === "ready" && shown.length > 0 && (
          <ul className="divide-y divide-line">
            {shown.map((member) => {
              const editable = isOwner && member.role !== "OWNER";
              const busy = pendingId === member.id;
              return (
                <li key={member.id} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar member={member} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {member.name}
                        {member.userId && String(member.userId) === String(myId) && <span className="ml-1.5 text-xs font-normal text-ink-muted">(you)</span>}
                      </p>
                      <p className="truncate text-sm text-ink-muted">{member.email}</p>
                      <p className="mt-1 text-xs text-ink-faint sm:hidden">{member.joinedAt ? `Joined ${fmt(member.joinedAt)}` : ""}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 sm:ml-auto sm:justify-end">
                    {editable ? (
                      <label className="sr-only" htmlFor={`member-role-${member.id}`}>Role for {member.name}</label>
                    ) : null}
                    {editable ? (
                      <select
                        id={`member-role-${member.id}`}
                        value={member.role}
                        disabled={busy || !!pendingId}
                        onChange={(event) => changeRole(member, event.target.value)}
                        className={`${inputClass(false)} min-h-9 w-32 py-1.5 text-sm`}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                      </select>
                    ) : <RoleBadge role={member.role} />}
                    <span className="hidden w-28 text-right text-xs text-ink-faint md:block">{member.joinedAt ? `Joined ${fmt(member.joinedAt)}` : ""}</span>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => setToRemove(member)}
                        disabled={busy || !!pendingId}
                        aria-label={`Remove ${member.name}`}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-control px-3 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
                      >
                        <UserMinus size={15} /> Remove
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {status === "ready" && !isOwner && (
          <div className="border-t border-line bg-surface-subtle/50 px-4 py-3 text-xs text-ink-muted sm:px-5">
            Only the organization owner can change roles or remove members. Admins can invite teammates.
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!toRemove}
        title={`Remove ${toRemove?.name}?`}
        confirmLabel="Remove member"
        pending={!!toRemove && pendingId === toRemove.id}
        onConfirm={confirmRemove}
        onCancel={() => setToRemove(null)}
      >
        {toRemove?.name} will lose access to {currentOrg.name}.
      </ConfirmDialog>

      <ConfirmDialog
        open={inviteOpen}
        tone="primary"
        title="Invite someone to your team"
        confirmLabel="Send invitation"
        pending={inviteBusy}
        onConfirm={sendInvite}
        onCancel={() => {
          if (inviteBusy) return;
          setInviteOpen(false);
          setInviteError({ field: "", form: "" });
        }}
      >
        <div className="space-y-4">
          <p className="text-sm leading-5 text-ink-muted">Send an invitation link to a teammate. You can copy and share the link after creating it.</p>
          {inviteError.form && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-ink">{inviteError.form}</p>}
          <Field id="invite-email" label="Email address" hint="Use the email address your teammate will sign in with." error={inviteError.field}>
            <input
              id="invite-email"
              data-autofocus
              type="email"
              autoComplete="email"
              value={invite.email}
              onChange={(event) => setInvite((value) => ({ ...value, email: event.target.value }))}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); sendInvite(); } }}
              aria-invalid={!!inviteError.field}
              aria-describedby={inviteError.field ? "invite-email-error" : "invite-email-hint"}
              placeholder="teammate@company.com"
              className={inputClass(!!inviteError.field)}
            />
          </Field>
          <Field id="invite-role" label="Workspace role">
            <select id="invite-role" value={invite.role} onChange={(event) => setInvite((value) => ({ ...value, role: event.target.value }))} className={inputClass(false)}>
              <option value="MEMBER">Member — collaborate on work</option>
              <option value="ADMIN">Admin — help manage the organization</option>
            </select>
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  );
}
