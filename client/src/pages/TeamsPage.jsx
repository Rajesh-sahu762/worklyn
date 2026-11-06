import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Archive, Check, ChevronRight, CircleUserRound, LoaderCircle, Plus, RefreshCw, Search, Shield, UserMinus, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";
import {
  addTeamMember, archiveTeam, createTeam, getOrgMembers, getTeam, getTeams, removeTeamMember, updateTeam, updateTeamMemberRole, } from "../lib/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { Field } from "../components/AuthShell";
import { inputClass } from "../components/authStyles";

const idOf = (item) => item?._id ?? item?.id;
const userOf = (member) => member?.user && typeof member.user === "object" ? member.user : {};
const nameOf = (member) => {
  const user = userOf(member);
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Unknown member";
};

function Avatar({ member, size = "h-10 w-10" }) {
  const user = userOf(member);
  const initials = nameOf(member).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface-subtle text-xs font-semibold text-ink-muted`}>{user.profileImage ? <img src={user.profileImage} alt="" className="h-full w-full object-cover" /> : initials || "?"}</span>;
}

function TeamForm({ initial, saving, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [avatar, setAvatar] = useState(initial?.avatar ?? "");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (name.trim().length < 2 || name.trim().length > 100) return setError("Team name must be between 2 and 100 characters.");
    if (description.length > 500) return setError("Description cannot exceed 500 characters.");
    if (avatar.trim()) {
      try {
        const parsed = new URL(avatar.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch { return setError("Avatar must be a valid HTTP or HTTPS URL."); }
    }
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), avatar: avatar.trim() });
    } catch (err) {
      setError(err.message || "Couldn't save team details.");
    }
  }

  return <form onSubmit={submit} className="space-y-4 rounded-panel border border-line bg-surface p-5">
    <div><h2 className="font-semibold text-ink">{initial ? "Edit team details" : "Create a team"}</h2><p className="mt-1 text-xs text-ink-muted">Give this team a clear name and purpose.</p></div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Field id="team-name" label="Team name"><input id="team-name" autoFocus required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass(false)} placeholder="e.g. Product Design" /></Field>
    <Field id="team-description" label="Description" hint={`Optional · ${description.length}/500`}><textarea id="team-description" rows={3} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass(false)} placeholder="What does this team focus on?" /></Field>
    <Field id="team-avatar" label="Avatar image URL"><input id="team-avatar" value={avatar} onChange={(event) => setAvatar(event.target.value)} className={inputClass(false)} placeholder="https://example.com/team.png" /></Field>
    <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} disabled={saving} className="rounded-control border border-line px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50">{saving && <LoaderCircle size={15} className="animate-spin" />}{saving ? "Saving…" : initial ? "Save changes" : "Create team"}</button></div>
  </form>;
}

export default function TeamsPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const organizationId = currentOrg?.id;
  const myId = String(user?._id ?? user?.id ?? "");
  const isOrgAdmin = ["OWNER", "ADMIN"].includes(currentOrg?.role);

  const [teams, setTeams] = useState([]);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("MEMBER");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const myMembership = members.find((member) => String(idOf(userOf(member))) === myId);
  const isTeamLead = myMembership?.role === "TEAM_LEAD";
  const canManage = isOrgAdmin || isTeamLead;
  const canCreate = isOrgAdmin;
  const candidates = useMemo(() => {
    const existing = new Set(members.map((member) => String(idOf(userOf(member)))));
    return orgMembers.filter((member) => !existing.has(String(idOf(userOf(member)) ?? idOf(member))));
  }, [members, orgMembers]);

  useEffect(() => {
    if (!organizationId) {
      setTeams([]);
      setTeam(null);
      setStatus("ready");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setError("");
    if (teamId) {
      Promise.all([getTeam(organizationId, teamId), getOrgMembers(organizationId)])
        .then(([result, organizationMembers]) => {
          if (cancelled) return;
          setTeam(result.team);
          setMembers(result.members ?? []);
          setOrgMembers(organizationMembers);
          setStatus("ready");
        })
        .catch((err) => {
          if (!cancelled) { setError(err.message || "Couldn't load this team."); setStatus("error"); }
        });
    } else {
      getTeams(organizationId)
        .then((items) => {
          if (!cancelled) { setTeams(items); setStatus("ready"); }
        })
        .catch((err) => {
          if (!cancelled) { setError(err.message || "Couldn't load teams."); setStatus("error"); }
        });
    }
    return () => { cancelled = true; };
  }, [organizationId, teamId]);

  const filteredTeams = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return teams.filter((item) => [item.name, item.description].some((value) => String(value ?? "").toLowerCase().includes(needle)));
  }, [teams, query]);

  async function refreshTeam() {
    const result = await getTeam(organizationId, teamId);
    setTeam(result.team);
    setMembers(result.members ?? []);
  }

  async function submitCreate(payload) {
    setSaving(true);
    try {
      const created = await createTeam(organizationId, payload);
      setShowCreate(false);
      navigate(`/teams/${idOf(created)}`);
    } finally { setSaving(false); }
  }

  async function submitUpdate(payload) {
    setSaving(true);
    try {
      const updated = await updateTeam(organizationId, teamId, payload);
      setTeam(updated);
      setEditing(false);
      setNotice("Team details saved.");
    } finally { setSaving(false); }
  }

  async function addMember(event) {
    event.preventDefault();
    if (!addUserId) return;
    setAdding(true);
    setError("");
    try {
      await addTeamMember(organizationId, teamId, addUserId, addRole);
      await refreshTeam();
      setAddUserId("");
      setNotice("Member added to the team.");
    } catch (err) { setError(err.message || "Couldn't add this member."); }
    finally { setAdding(false); }
  }

  async function changeRole(member, role) {
    const memberId = idOf(member);
    setBusyId(memberId);
    setError("");
    try {
      await updateTeamMemberRole(organizationId, teamId, memberId, role);
      await refreshTeam();
      setNotice("Team role updated.");
    } catch (err) { setError(err.message || "Couldn't update this role."); }
    finally { setBusyId(null); }
  }

  async function removeMember() {
    if (!confirm?.member) return;
    const memberId = idOf(confirm.member);
    setBusyId(memberId);
    try {
      await removeTeamMember(organizationId, teamId, memberId);
      await refreshTeam();
      setNotice("Member removed from the team.");
      setConfirm(null);
    } catch (err) { setError(err.message || "Couldn't remove this member."); setConfirm(null); }
    finally { setBusyId(null); }
  }

  async function doArchive() {
    setSaving(true);
    try {
      await archiveTeam(organizationId, teamId);
      navigate("/teams", { replace: true });
    } catch (err) { setError(err.message || "Couldn't archive this team."); setConfirm(null); }
    finally { setSaving(false); }
  }

  if (!organizationId) return <div className="mx-auto max-w-3xl rounded-panel border border-line bg-surface p-8 text-center"><Users size={28} className="mx-auto text-ink-faint" /><h1 className="mt-3 text-xl font-semibold text-ink">Choose an organization</h1><p className="mt-2 text-sm text-ink-muted">Select a workspace to view its teams.</p></div>;

  if (status === "loading") return <div className="mx-auto max-w-5xl space-y-4"><div className="h-8 w-56 animate-pulse rounded bg-surface-subtle" /><div className="grid gap-4 sm:grid-cols-2"><div className="h-40 animate-pulse rounded-panel bg-surface-subtle" /><div className="h-40 animate-pulse rounded-panel bg-surface-subtle" /></div></div>;

  if (status === "error") return <div className="mx-auto max-w-3xl rounded-panel border border-line bg-surface p-8 text-center"><p role="alert" className="text-sm text-danger">{error}</p><button type="button" onClick={() => navigate("/teams")} className="mt-4 text-sm font-semibold underline">Back to teams</button></div>;

  if (!teamId) return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Workspace · {currentOrg.name}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Teams</h1><p className="mt-2 text-sm text-ink-muted">Bring people together around shared responsibilities.</p></div>{canCreate && <button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-control bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong"><Plus size={16} /> Create team</button>}</header>
    {showCreate && <TeamForm saving={saving} onSubmit={submitCreate} onCancel={() => setShowCreate(false)} />}
    {error && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-ink-muted"><strong className="text-ink">{teams.length}</strong> {teams.length === 1 ? "team" : "teams"} in this organization</p><label className="relative w-full sm:max-w-xs"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search teams…" aria-label="Search teams" className={`${inputClass(false)} pl-9`} /></label></div>
    {filteredTeams.length === 0 ? <div className="rounded-panel border border-dashed border-line bg-surface px-6 py-14 text-center"><Users size={26} className="mx-auto text-ink-faint" /><h2 className="mt-3 text-base font-semibold text-ink">{teams.length ? "No teams match your search" : "No teams yet"}</h2><p className="mt-1 text-sm text-ink-muted">{teams.length ? "Try another team name." : canCreate ? "Create your first team to organize people around shared work." : "An organization admin can create teams for this workspace."}</p></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredTeams.map((item) => <Link key={idOf(item)} to={`/teams/${idOf(item)}`} className="group flex min-h-44 flex-col rounded-panel border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-ink-faint/60 hover:shadow-md"><div className="flex items-center justify-between gap-3"><div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-line bg-surface-subtle text-sm font-semibold text-ink">{item.avatar ? <img src={item.avatar} alt="" className="h-full w-full object-cover" /> : (item.name?.[0] ?? "T").toUpperCase()}</div><span className="inline-flex items-center gap-1.5 text-xs text-ink-muted"><Users size={14} />{item.memberCount ?? 0}</span></div><h2 className="mt-4 font-semibold text-ink group-hover:text-accent-support">{item.name}</h2><p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-ink-muted">{item.description || "No description added yet."}</p><div className="mt-auto flex items-center justify-between pt-4 text-xs text-ink-faint"><span>Created {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "recently"}</span><ChevronRight size={16} /></div></Link>)}</div>}
  </div>;

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted"><Link to="/teams" className="inline-flex items-center gap-1.5 hover:text-ink"><ArrowLeft size={15} /> Teams</Link><span>/</span><span className="font-medium text-ink">{team?.name ?? "Team"}</span></div>
    {editing ? <TeamForm initial={team} saving={saving} onSubmit={submitUpdate} onCancel={() => setEditing(false)} /> : <header className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex min-w-0 items-center gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface-subtle text-xl font-semibold text-ink">{team?.avatar ? <img src={team.avatar} alt="" className="h-full w-full object-cover" /> : (team?.name?.[0] ?? "T").toUpperCase()}</div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Team</p><h1 className="truncate text-2xl font-semibold tracking-tight text-ink">{team?.name}</h1><p className="mt-1 text-sm text-ink-muted">{team?.description || "No description added yet."}</p></div></div>{canManage && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditing(true)} className="rounded-control border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-subtle">Edit details</button>{isOrgAdmin && <button type="button" onClick={() => setConfirm({ type: "archive" })} className="inline-flex items-center gap-2 rounded-control border border-danger/25 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/5"><Archive size={14} /> Archive</button>}</div>}</header>}
    {error && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
    {notice && <p role="status" className="flex items-center gap-2 rounded-control border border-emerald-700/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={15} />{notice}</p>}
    <section className="overflow-hidden rounded-panel border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h2 className="font-semibold text-ink">Team members</h2><p className="mt-0.5 text-xs text-ink-muted">{members.length} active {members.length === 1 ? "member" : "members"}</p></div><button type="button" onClick={() => refreshTeam().catch((err) => setError(err.message))} aria-label="Refresh team members" className="grid h-9 w-9 place-items-center rounded-control border border-line text-ink-muted hover:bg-surface-subtle"><RefreshCw size={15} /></button></div>
      {canManage && <form onSubmit={addMember} className="grid gap-3 border-b border-line p-4 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end sm:px-5"><Field id="team-add-member" label="Add organization member"><select id="team-add-member" required value={addUserId} onChange={(event) => setAddUserId(event.target.value)} className={inputClass(false)}><option value="">Select a person</option>{candidates.map((member) => { const person = userOf(member); return <option key={idOf(person) ?? idOf(member)} value={idOf(person) ?? idOf(member)}>{nameOf(member)} · {person.email ?? ""}</option>; })}</select></Field><Field id="team-add-role" label="Team role"><select id="team-add-role" value={addRole} onChange={(event) => setAddRole(event.target.value)} className={inputClass(false)}><option value="MEMBER">Member</option><option value="TEAM_LEAD">Team lead</option></select></Field><button type="submit" disabled={!addUserId || adding} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50">{adding ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}{adding ? "Adding…" : "Add member"}</button></form>}
      {members.length === 0 ? <div className="px-5 py-12 text-center"><CircleUserRound size={25} className="mx-auto text-ink-faint" /><p className="mt-3 text-sm font-semibold text-ink">No active members</p><p className="mt-1 text-sm text-ink-muted">Add organization members to this team.</p></div> : <ul className="divide-y divide-line">{members.map((member) => { const person = userOf(member); const memberKey = idOf(member); const lead = member.role === "TEAM_LEAD"; const self = String(idOf(person)) === myId; return <li key={memberKey} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5"><div className="flex min-w-0 flex-1 items-center gap-3"><Avatar member={member} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{nameOf(member)}{self ? " (you)" : ""}</p><p className="truncate text-xs text-ink-muted">{person.email ?? ""}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${lead ? "bg-brand-lime/20 text-ink" : "border border-line bg-surface-subtle text-ink-muted"}`}>{lead && <Shield size={13} />}{lead ? "Team lead" : "Member"}</span>{canManage && !self && <><label className="sr-only" htmlFor={`team-role-${memberKey}`}>Role for {nameOf(member)}</label><select id={`team-role-${memberKey}`} value={member.role} disabled={busyId === memberKey} onChange={(event) => changeRole(member, event.target.value)} className="h-9 rounded-control border border-line bg-surface px-2.5 text-xs text-ink"><option value="MEMBER">Member</option><option value="TEAM_LEAD">Team lead</option></select><button type="button" disabled={busyId === memberKey} onClick={() => setConfirm({ type: "remove", member })} aria-label={`Remove ${nameOf(member)}`} className="grid h-9 w-9 place-items-center rounded-control text-danger hover:bg-danger/5 disabled:opacity-50"><UserMinus size={15} /></button></>}</div></li>; })}</ul>}
      {!canManage && <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">Only team leads and organization admins can manage team membership.</p>}
    </section>
    <ConfirmDialog open={confirm?.type === "archive"} title="Archive this team?" confirmLabel="Archive team" pending={saving} onConfirm={doArchive} onCancel={() => !saving && setConfirm(null)}>This team will be hidden from the active teams list. Its membership records will be retained.</ConfirmDialog>
    <ConfirmDialog open={confirm?.type === "remove"} title={`Remove ${confirm?.member ? nameOf(confirm.member) : "member"}?`} confirmLabel="Remove member" pending={!!busyId} onConfirm={removeMember} onCancel={() => !busyId && setConfirm(null)}>This person will lose access to this team but will remain in the organization. A team must always have at least one team lead.</ConfirmDialog>
  </div>;
}
