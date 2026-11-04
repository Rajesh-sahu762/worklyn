import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";
import { getOrgMembers, removeOrgMember, updateOrgMemberRole } from "../lib/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { createInvitation, resendInvitation, cancelInvitation } from "../lib/api"; // existing api import me add karo
import { Field, inputClass } from "../components/AuthShell";                       // Field add karo

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const act = "underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support disabled:opacity-60";

const ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member" };
const ROLE_RANK = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
const ROLE_STYLE = { OWNER: "bg-accent text-ink", ADMIN: "bg-surface-subtle text-ink", MEMBER: "border border-line text-ink-muted" };

// Member shape isn't fully documented: { _id, role, joinedAt, user: { firstName, lastName, email, profileImage } }
const normalize = (m) => {
  const u = m.user ?? {};
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

const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

export default function OrganizationMembersPage() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id ?? null;
  const isOwner = currentOrg?.role === "OWNER";
  const myId = user?._id ?? user?.id;

  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState({ key: "", members: [], error: "" });
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [pendingId, setPendingId] = useState(null);
  const [notice, setNotice] = useState(null); // { ok, text }
  const [toRemove, setToRemove] = useState(null);

    const canInvite = isOwner || currentOrg?.role === "ADMIN";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "MEMBER" });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState({ field: "", form: "" });
  const [sent, setSent] = useState([]); // created this session; there is no list endpoint
  const [sentBusy, setSentBusy] = useState(null);
  const [copied, setCopied] = useState(null);

  const closeInvite = () => {
    if (inviteBusy) return;
    setInviteOpen(false);
    setInviteError({ field: "", form: "" });
  };

  async function sendInvite() {
    const email = invite.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return setInviteError({ field: "Enter a valid email address.", form: "" });
    setInviteBusy(true);
    setInviteError({ field: "", form: "" });
    try {
      const { invitation, link } = await createInvitation(orgId, email, invite.role);
      setSent((l) => [{ id: invitation._id ?? invitation.id, email, role: invite.role, link, expiresAt: invitation.expiresAt }, ...l]);
      setInvite({ email: "", role: "MEMBER" });
      setInviteOpen(false);
      setNotice({ ok: true, text: `Invitation created for ${email}. Share the link below with them.` });
    } catch (err) {
      const field = err.fieldErrors?.email ?? "";
      setInviteError({ field, form: field ? "" : err.message });
    } finally {
      setInviteBusy(false);
    }
  }

  async function runSent(inv, fn, onOk) {
    setSentBusy(inv.id);
    try {
      await fn();
    } catch (err) {
      setNotice({ ok: false, text: err.message });
      return setSentBusy(null);
    }
    onOk();
    setSentBusy(null);
  }

  const resend = (inv) =>
    runSent(inv, async () => {
      const { invitation, link } = await resendInvitation(orgId, inv.id);
      setSent((l) => l.map((x) => (x.id === inv.id ? { ...x, link: link || x.link, expiresAt: invitation.expiresAt ?? x.expiresAt } : x)));
    }, () => setNotice({ ok: true, text: `New link created for ${inv.email}. The previous link no longer works.` }));

  const cancel = (inv) =>
    runSent(inv, () => cancelInvitation(orgId, inv.id), () => {
      setSent((l) => l.filter((x) => x.id !== inv.id));
      setNotice({ ok: true, text: `Invitation to ${inv.email} was cancelled.` });
    });

  async function copy(inv) {
    try {
      await navigator.clipboard.writeText(inv.link);
      setCopied(inv.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setNotice({ ok: false, text: "Couldn't copy automatically. Select the link and copy it." });
    }
  }


  const key = `${orgId}#${reloadKey}`;
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    getOrgMembers(orgId)
      .then((list) => !cancelled && setData({ key, members: list.map(normalize), error: "" }))
      .catch((err) => !cancelled && setData({ key, members: [], error: err.message }));
    return () => { cancelled = true; };
  }, [orgId, key]);

  const status = !orgId ? "idle" : data.key !== key ? "loading" : data.error ? "error" : "ready";
  const members = status === "ready" ? data.members : [];
  const setMembers = (fn) => setData((d) => ({ ...d, members: fn(d.members) }));

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => (roleFilter === "ALL" || m.role === roleFilter) && (!q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)))
      .sort((a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9) || a.name.localeCompare(b.name));
  }, [members, query, roleFilter]);

  async function changeRole(m, role) {
    if (role === m.role) return;
    setPendingId(m.id);
    setNotice(null);
    try {
      const updated = await updateOrgMemberRole(orgId, m.id, role);
      setMembers((list) => list.map((x) => (x.id === m.id ? { ...x, role: updated?.role ?? role } : x)));
      setNotice({ ok: true, text: `${m.name} is now ${ROLE_LABEL[role]}.` });
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally {
      setPendingId(null);
    }
  }

  async function confirmRemove() {
    const m = toRemove;
    setPendingId(m.id);
    try {
      await removeOrgMember(orgId, m.id);
      setMembers((list) => list.filter((x) => x.id !== m.id));
      setNotice({ ok: true, text: `${m.name} was removed from ${currentOrg.name}.` });
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally {
      setPendingId(null);
      setToRemove(null);
    }
  }

  if (orgId === null) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-[26px] font-semibold tracking-tight">Members</h1>
        <p className="mt-2 text-sm text-ink-muted">
          You need an organization first. <Link to="/organizations/new" className="font-medium text-accent-support underline underline-offset-2">Create one</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[26px] font-semibold tracking-tight">Members</h1>
      <p className="mt-1.5 text-[15px] text-ink-muted">
        {currentOrg.name}
        {status === "ready" && ` · ${members.length} ${members.length === 1 ? "member" : "members"}`}
      </p>
      {status === "ready" && !isOwner && (
        <p className="mt-1 text-sm text-ink-muted">Only the owner can change roles or remove members.</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search members"
          placeholder="Search by name or email"
          className={`${inputClass(false)} min-w-0 flex-1 basis-56 sm:max-w-sm`}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role" className={`${inputClass(false)} w-auto`}>
          <option value="ALL">All roles</option>
          <option value="OWNER">Owner</option>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
        </select>
      </div>
              {canInvite && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="ml-auto rounded-control bg-accent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Invite member
          </button>
        )}

      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`mt-4 rounded-control border px-3.5 py-3 text-sm text-ink ${notice.ok ? "border-line bg-surface-subtle" : "border-danger/40 bg-danger/5"}`}>
          {notice.text}
        </p>
      )}

            {sent.length > 0 && (
        <section aria-labelledby="sent-h" className="mt-4 rounded-panel border border-line bg-surface">
          <div className="border-b border-line px-5 py-3">
            <h2 id="sent-h" className="text-sm font-semibold text-ink">Invitations sent this session</h2>
            <p className="text-xs text-ink-muted">Email delivery isn't set up yet, so share each link yourself. This list resets when you leave the page.</p>
          </div>
          <ul className="divide-y divide-line">
            {sent.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="truncate text-sm font-medium text-ink">
                    {inv.email} <span className="font-normal text-ink-muted">· {ROLE_LABEL[inv.role]}</span>
                  </p>
                  {inv.link ? (
                    <input readOnly value={inv.link} onFocus={(e) => e.target.select()} aria-label={`Invitation link for ${inv.email}`} className="mt-1 w-full truncate rounded-control border border-line bg-canvas px-2 py-1 font-mono text-xs text-ink-muted" />
                  ) : (
                    <p className="mt-1 text-xs text-ink-muted">The server didn't return a link for this invitation.</p>
                  )}
                  {inv.expiresAt && <p className="mt-1 text-xs text-ink-muted">Expires {fmt(inv.expiresAt)}</p>}
                </div>
                <div className="flex items-center gap-4 text-sm font-medium">
                  {inv.link && <button type="button" onClick={() => copy(inv)} className={`text-accent-support ${act}`}>{copied === inv.id ? "Copied" : "Copy link"}</button>}
                  <button type="button" onClick={() => resend(inv)} disabled={sentBusy === inv.id} className={`text-accent-support ${act}`}>Resend</button>
                  <button type="button" onClick={() => cancel(inv)} disabled={sentBusy === inv.id} className={`text-danger ${act}`}>Cancel</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Organization members" className="mt-4 rounded-panel border border-line bg-surface">
        {status === "loading" && (
          <ul aria-hidden="true" className="divide-y divide-line">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="px-5 py-4"><div className="h-9 animate-pulse rounded-control bg-surface-subtle motion-reduce:animate-none" /></li>
            ))}
          </ul>
        )}

        {status === "error" && (
          <div role="alert" className="px-5 py-8 text-sm">
            <p className="text-ink">{data.error || "Couldn't load members."}</p>
            <button type="button" onClick={() => setReloadKey((n) => n + 1)} className="mt-2 font-medium text-accent-support underline underline-offset-2">Try again</button>
          </div>
        )}

        {status === "ready" && shown.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-ink-muted">No members match your search.</p>
        )}

        {status === "ready" && shown.length > 0 && (
          <ul className="divide-y divide-line">
            {shown.map((m) => {
              const editable = isOwner && m.role !== "OWNER";
              const busy = pendingId === m.id;
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                  {m.image ? (
                    <img src={m.image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-support text-sm font-semibold text-white">
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                  )}

                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate text-[15px] font-medium text-ink">
                      {m.name}
                      {m.userId && m.userId === myId && <span className="ml-2 text-xs font-normal text-ink-muted">(you)</span>}
                    </p>
                    <p className="truncate text-sm text-ink-muted">{m.email}</p>
                  </div>

                  {editable ? (
                    <select
                      value={m.role}
                      disabled={busy}
                      onChange={(e) => changeRole(m, e.target.value)}
                      aria-label={`Role for ${m.name}`}
                      className={`${inputClass(false)} w-32 py-1.5 text-sm`}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                  ) : (
                    <span className={`w-32 text-center rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_STYLE[m.role] ?? ""}`}>{ROLE_LABEL[m.role] ?? m.role}</span>
                  )}

                  <span className="hidden w-28 text-xs text-ink-muted md:block">{m.joinedAt ? `Joined ${fmt(m.joinedAt)}` : ""}</span>

                  <span className="w-16 text-right">
                    {editable && (
                      <button
                        type="button"
                        onClick={() => setToRemove(m)}
                        disabled={busy}
                        aria-label={`Remove ${m.name}`}
                        className="text-sm font-medium text-danger underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-60"
                      >
                        Remove
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
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

            <ConfirmDialog open={inviteOpen} tone="primary" title="Invite a member" confirmLabel="Send invitation" pending={inviteBusy} onConfirm={sendInvite} onCancel={closeInvite}>
        <div className="space-y-4">
          {inviteError.form && <p role="alert" className="rounded-control border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-ink">{inviteError.form}</p>}
          <Field id="invite-email" label="Email" error={inviteError.field}>
            <input
              id="invite-email"
              data-autofocus
              type="email"
              autoComplete="off"
              value={invite.email}
              onChange={(e) => setInvite((v) => ({ ...v, email: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendInvite(); } }}
              aria-invalid={!!inviteError.field}
              aria-describedby={inviteError.field ? "invite-email-error" : undefined}
              placeholder="teammate@company.com"
              className={inputClass(!!inviteError.field)}
            />
          </Field>
          <Field id="invite-role" label="Role">
            <select id="invite-role" value={invite.role} onChange={(e) => setInvite((v) => ({ ...v, role: e.target.value }))} className={inputClass(false)}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  );
}