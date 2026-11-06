import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Check, LoaderCircle, Plus, RefreshCw, Shield, Users, UserMinus } from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";
import { useAuth } from "../context/AuthContext";
import {
  addProjectMember, getOrgMembers, getProject, getProjectMembers, removeProjectMember, updateProjectMemberRole, } from "../lib/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { Field } from "../components/AuthShell";
import { inputClass } from "../components/authStyles";

const memberId = (member) => member._id ?? member.id;
const userOf = (member) => member.user && typeof member.user === "object" ? member.user : {};
const nameOf = (member) => {
  const user = userOf(member);
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Unknown member";
};

function Avatar({ member }) {
  const user = userOf(member);
  const initials = nameOf(member).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface-subtle text-xs font-semibold text-ink-muted">{user.profileImage ? <img src={user.profileImage} alt="" className="h-full w-full object-cover" /> : initials || "?"}</span>;
}

export default function ProjectMembersPage() {
  const { projectId } = useParams();
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const myId = user?._id ?? user?.id;
  const [project, setProject] = useState(null);
  const [role, setRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("MEMBER");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  const isAdmin = role === "PROJECT_ADMIN";

  async function load() {
    setStatus("loading");
    setError("");
    try {
      const [projectResult, projectMembers, organizationMembers] = await Promise.all([
        getProject(projectId),
        getProjectMembers(projectId),
        currentOrg?.id ? getOrgMembers(currentOrg.id) : Promise.resolve([]),
      ]);
      setProject(projectResult?.project ?? projectResult);
      setRole(projectResult?.role ?? null);
      setMembers(projectMembers);
      setOrgMembers(organizationMembers);
      setStatus("ready");
    } catch (err) {
      setError(err.message || "Couldn't load project members.");
      setStatus("error");
    }
  }

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");
    Promise.all([
      getProject(projectId),
      getProjectMembers(projectId),
      currentOrg?.id ? getOrgMembers(currentOrg.id) : Promise.resolve([]),
    ])
      .then(([projectResult, projectMembers, organizationMembers]) => {
        if (cancelled) return;
        setProject(projectResult?.project ?? projectResult);
        setRole(projectResult?.role ?? null);
        setMembers(projectMembers);
        setOrgMembers(organizationMembers);
        setStatus("ready");
      })
      .catch((err) => {
        if (!cancelled) { setError(err.message || "Couldn't load project members."); setStatus("error"); }
      });
    return () => { cancelled = true; };
  }, [projectId, currentOrg?.id]);

  const memberUserIds = useMemo(() => new Set(members.map((item) => String(userOf(item)._id ?? userOf(item).id ?? item.user))), [members]);
  const candidates = useMemo(() => orgMembers.filter((item) => {
    const id = userOf(item)._id ?? userOf(item).id;
    return id && !memberUserIds.has(String(id));
  }), [orgMembers, memberUserIds]);

  async function addMember(event) {
    event.preventDefault();
    if (!addUserId || adding) return;
    setAdding(true);
    setError("");
    setNotice("");
    try {
      await addProjectMember(projectId, addUserId, addRole);
      const updated = await getProjectMembers(projectId);
      setMembers(updated);
      setAddUserId("");
      setNotice("Member added to this project.");
    } catch (err) {
      setError(err.message || "Couldn't add this member.");
    } finally {
      setAdding(false);
    }
  }

  async function changeRole(member, nextRole) {
    const id = memberId(member);
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      await updateProjectMemberRole(projectId, id, nextRole);
      setMembers((items) => items.map((item) => memberId(item) === id ? { ...item, role: nextRole } : item));
      setNotice("Project role updated.");
    } catch (err) {
      setError(err.message || "Couldn't update this role.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    const id = memberId(removeTarget);
    setBusyId(id);
    try {
      await removeProjectMember(projectId, id);
      setMembers((items) => items.filter((item) => memberId(item) !== id));
      setNotice("Member removed from this project.");
      setRemoveTarget(null);
    } catch (err) {
      setError(err.message || "Couldn't remove this member.");
      setRemoveTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  const projectName = project?.name ?? "Project";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted"><Link to={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 hover:text-ink"><ArrowLeft size={15} /> {projectName}</Link><span aria-hidden="true">/</span><span className="font-medium text-ink">Members</span></div>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">{project?.key ?? "Project"} · Access</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Project members</h1><p className="mt-2 text-sm text-ink-muted">Manage who can access this project's issues and collaboration space.</p></div>
        {status === "ready" && <span className="rounded-control border border-line bg-surface px-3 py-2 text-sm"><strong className="tabular-nums">{members.length}</strong><span className="ml-1.5 text-ink-muted">active members</span></span>}
      </header>

      {error && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="flex items-center gap-2 rounded-control border border-emerald-700/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={15} />{notice}</p>}

      {isAdmin && status === "ready" && <section className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-control bg-surface-subtle"><Plus size={18} /></span><div><h2 className="text-sm font-semibold text-ink">Add organization member</h2><p className="text-xs text-ink-muted">Only active organization members can be added to a project.</p></div></div>
        <form onSubmit={addMember} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
          <Field id="project-member-user" label="Person">
            <select id="project-member-user" value={addUserId} onChange={(event) => setAddUserId(event.target.value)} required className={inputClass(false)}>
              <option value="">Select a person</option>
              {candidates.map((member) => { const user = userOf(member); const id = user._id ?? user.id; return <option key={id} value={id}>{nameOf(member)} · {user.email}</option>; })}
            </select>
          </Field>
          <Field id="project-member-role" label="Project role"><select id="project-member-role" value={addRole} onChange={(event) => setAddRole(event.target.value)} className={inputClass(false)}><option value="MEMBER">Member</option><option value="VIEWER">Viewer</option></select></Field>
          <button type="submit" disabled={!addUserId || adding} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50">{adding ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}{adding ? "Adding…" : "Add member"}</button>
        </form>
        {candidates.length === 0 && <p className="mt-3 text-xs text-ink-muted">Everyone in your organization is already a project member.</p>}
      </section>}

      <section className="overflow-hidden rounded-panel border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h2 className="text-sm font-semibold text-ink">People with access</h2><p className="mt-0.5 text-xs text-ink-muted">Project roles are separate from organization roles.</p></div><button type="button" onClick={load} disabled={status === "loading"} aria-label="Refresh members" className="grid h-9 w-9 place-items-center rounded-control border border-line text-ink-muted hover:bg-surface-subtle disabled:opacity-50"><RefreshCw size={15} className={status === "loading" ? "animate-spin" : ""} /></button></div>
        {status === "loading" && <div className="space-y-3 p-5">{[0,1,2,3].map((i) => <div key={i} className="h-14 animate-pulse rounded-control bg-surface-subtle" />)}</div>}
        {status === "error" && <div className="px-5 py-12 text-center"><p className="text-sm text-ink-muted">Project members couldn't be loaded.</p><button type="button" onClick={load} className="mt-3 text-sm font-semibold underline">Try again</button></div>}
        {status === "ready" && members.length === 0 && <div className="px-5 py-12 text-center"><Users size={24} className="mx-auto text-ink-faint" /><p className="mt-3 text-sm font-semibold text-ink">No active project members</p><p className="mt-1 text-sm text-ink-muted">Add organization members to collaborate on this project.</p></div>}
        {status === "ready" && members.length > 0 && <ul className="divide-y divide-line">
          {members.map((member) => {
            const user = userOf(member);
            const id = memberId(member);
            const isProjectAdmin = member.role === "PROJECT_ADMIN";
            return <li key={id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-3"><Avatar member={member} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{nameOf(member)}{String(user._id ?? user.id) === String(myId) ? " (you)" : ""}</p><p className="truncate text-xs text-ink-muted">{user.email ?? ""}</p></div></div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isProjectAdmin ? "bg-brand-lime/20 text-ink" : "border border-line bg-surface-subtle text-ink-muted"}`}>{isProjectAdmin ? <Shield size={13} /> : null}{member.role === "PROJECT_ADMIN" ? "Project admin" : member.role === "VIEWER" ? "Viewer" : "Member"}</span>
                {isAdmin && !isProjectAdmin && <><label className="sr-only" htmlFor={`project-role-${id}`}>Role for {nameOf(member)}</label><select id={`project-role-${id}`} value={member.role} disabled={busyId === id} onChange={(event) => changeRole(member, event.target.value)} className="h-9 rounded-control border border-line bg-surface px-2.5 text-xs text-ink"><option value="MEMBER">Member</option><option value="VIEWER">Viewer</option></select><button type="button" onClick={() => setRemoveTarget(member)} disabled={busyId === id} aria-label={`Remove ${nameOf(member)}`} className="grid h-9 w-9 place-items-center rounded-control text-danger hover:bg-danger/5 disabled:opacity-50"><UserMinus size={15} /></button></>}
                {busyId === id && <span className="text-xs text-ink-muted">Saving…</span>}
              </div>
            </li>;
          })}
        </ul>}
        {status === "ready" && !isAdmin && <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">You have read-only access to project membership. Only project admins can add, change or remove members.</p>}
      </section>

      <ConfirmDialog open={!!removeTarget} title={`Remove ${removeTarget ? nameOf(removeTarget) : "member"} from project?`} confirmLabel="Remove member" pending={!!removeTarget && busyId === memberId(removeTarget)} onConfirm={confirmRemove} onCancel={() => setRemoveTarget(null)}>
        This person will lose access to this project's issues. Their organization membership will not be affected.
      </ConfirmDialog>
    </div>
  );
}
