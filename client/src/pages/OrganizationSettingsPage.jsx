import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Building2, Check, Crown, LoaderCircle, Save, Shield, UserRoundCog } from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";
import {
  getOrgMembers,
  getOrganization,
  leaveOrganization,
  transferOrganizationOwnership,
  updateOrganization,
} from "../lib/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { Field, inputClass } from "../components/AuthShell";

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;

export default function OrganizationSettingsPage() {
  const navigate = useNavigate();
  const { currentOrg, reloadOrgs } = useOrganization();
  const orgId = currentOrg?.id;
  const isOwner = currentOrg?.role === "OWNER";
  const canEdit = isOwner || currentOrg?.role === "ADMIN";

  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [membersError, setMembersError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [dialog, setDialog] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      setOrg(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getOrganization(orgId)
      .then(({ organization }) => {
        if (cancelled) return;
        setOrg(organization);
        setName(organization?.name ?? "");
        setDescription(organization?.description ?? "");
        setLogo(organization?.logo ?? "");
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !isOwner) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    setMembersLoading(true);
    setMembersError("");
    getOrgMembers(orgId)
      .then((items) => {
        if (cancelled) return;
        setMembers(items);
        const eligible = items.find((item) => item.role !== "OWNER");
        setSelectedOwner(eligible?._id ?? eligible?.id ?? "");
      })
      .catch((error) => {
        if (!cancelled) setMembersError(error.message);
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => { cancelled = true; };
  }, [orgId, isOwner]);

  const eligibleMembers = useMemo(
    () => members.filter((member) => member.role !== "OWNER"),
    [members]
  );

  async function saveSettings(event) {
    event.preventDefault();
    setSaveError("");
    setNotice("");
    if (!name.trim()) {
      setSaveError("Organization name is required.");
      return;
    }
    if (name.trim().length > MAX_NAME || description.length > MAX_DESCRIPTION) {
      setSaveError("Please check the field length limits.");
      return;
    }
    if (logo.trim()) {
      try {
        const parsed = new URL(logo.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        setSaveError("Logo must be a valid HTTP or HTTPS image URL.");
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await updateOrganization(orgId, {
        name: name.trim(),
        description: description.trim(),
        logo: logo.trim(),
      });
      setOrg(updated);
      setName(updated.name ?? name.trim());
      setDescription(updated.description ?? description.trim());
      setLogo(updated.logo ?? logo.trim());
      setNotice("Organization settings saved.");
      reloadOrgs();
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmTransfer() {
    if (!selectedOwner) return;
    setActionBusy(true);
    try {
      await transferOrganizationOwnership(orgId, selectedOwner);
      setDialog("");
      reloadOrgs();
      navigate("/members", { replace: true });
    } catch (error) {
      setMembersError(error.message);
      setDialog("");
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmLeave() {
    setActionBusy(true);
    try {
      await leaveOrganization(orgId);
      setDialog("");
      reloadOrgs();
      navigate("/", { replace: true });
    } catch (error) {
      setLoadError(error.message);
      setDialog("");
    } finally {
      setActionBusy(false);
    }
  }

  if (!currentOrg) {
    return (
      <div className="mx-auto max-w-3xl rounded-panel border border-line bg-surface p-8 text-center">
        <Building2 size={28} className="mx-auto text-ink-muted" />
        <h1 className="mt-3 text-xl font-semibold text-ink">Choose an organization</h1>
        <p className="mt-2 text-sm text-ink-muted">Create or select an organization to manage its settings.</p>
        <button type="button" onClick={() => navigate("/organizations/new")} className="mt-5 rounded-control bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong">Create organization</button>
      </div>
    );
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl space-y-4"><div className="h-8 w-64 animate-pulse rounded bg-surface-subtle" /><div className="h-56 animate-pulse rounded-panel border border-line bg-surface" /></div>;
  }

  if (loadError && !org) {
    return <div role="alert" className="mx-auto max-w-3xl rounded-panel border border-danger/30 bg-surface p-6"><p className="text-sm text-danger">{loadError}</p><button type="button" onClick={() => window.location.reload()} className="mt-3 text-sm font-semibold underline">Reload page</button></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Workspace settings</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Organization settings</h1>
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted">{currentOrg.role === "OWNER" ? "Owner" : currentOrg.role === "ADMIN" ? "Admin" : "Member"}</span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Manage your organization identity, access and ownership.</p>
      </header>

      {loadError && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{loadError}</p>}

      <section className="overflow-hidden rounded-panel border border-line bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-control bg-surface-subtle text-ink"><Building2 size={19} /></span>
          <div><h2 className="font-semibold text-ink">General</h2><p className="text-xs text-ink-muted">Organization name and public identity</p></div>
        </div>
        <form onSubmit={saveSettings} className="space-y-5 p-5 sm:p-6">
          {saveError && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">{saveError}</p>}
          {notice && <p role="status" className="flex items-center gap-2 rounded-control border border-emerald-700/20 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"><Check size={16} />{notice}</p>}
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className="space-y-5">
              <Field id="organization-name" label="Organization name" hint={`Up to ${MAX_NAME} characters.`}>
                <input id="organization-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={MAX_NAME} disabled={!canEdit} className={inputClass(false)} />
              </Field>
              <Field id="organization-slug" label="Workspace URL name" hint="The URL name is fixed after creation.">
                <input id="organization-slug" value={org?.slug ?? currentOrg.slug ?? ""} readOnly className={`${inputClass(false)} font-mono opacity-70`} />
              </Field>
            </div>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-ink">Organization logo</span>
              <div className="grid aspect-square max-h-[150px] place-items-center overflow-hidden rounded-xl border border-line bg-surface-subtle">
                {logo ? <img src={logo} alt="Organization logo preview" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="text-3xl font-semibold text-ink-muted">{(name.trim()[0] || "W").toUpperCase()}</span>}
              </div>
              <input aria-label="Logo image URL" value={logo} onChange={(event) => setLogo(event.target.value)} disabled={!canEdit} placeholder="https://example.com/logo.png" className={inputClass(false)} />
            </div>
          </div>
          <Field id="organization-description" label="Description" hint={`Optional · ${description.length}/${MAX_DESCRIPTION}`}>
            <textarea id="organization-description" rows={4} maxLength={MAX_DESCRIPTION} value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canEdit} placeholder="What does this organization work on?" className={inputClass(false)} />
          </Field>
          {canEdit && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4"><button type="button" onClick={() => { setName(org?.name ?? ""); setDescription(org?.description ?? ""); setLogo(org?.logo ?? ""); setSaveError(""); setNotice(""); }} className="rounded-control px-4 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-subtle">Discard changes</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saving ? "Saving…" : "Save changes"}</button></div>}
          {!canEdit && <p className="border-t border-line pt-4 text-xs text-ink-muted">Only organization owners and admins can edit these details.</p>}
        </form>
      </section>

      {isOwner && <section className="overflow-hidden rounded-panel border border-line bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-control bg-surface-subtle text-ink"><Crown size={19} /></span><div><h2 className="font-semibold text-ink">Ownership</h2><p className="text-xs text-ink-muted">Transfer control to another active organization member</p></div></div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="rounded-control border border-amber-700/20 bg-amber-50 px-3.5 py-3 text-sm leading-5 text-amber-900">Transferring ownership makes the selected member the owner and changes your role to Admin. This action cannot be undone automatically.</div>
          {membersError && <p role="alert" className="text-sm text-danger">{membersError}</p>}
          <Field id="new-owner" label="New organization owner">
            <select id="new-owner" value={selectedOwner} onChange={(event) => setSelectedOwner(event.target.value)} disabled={membersLoading || eligibleMembers.length === 0} className={inputClass(false)}>
              <option value="">Select an active member</option>
              {eligibleMembers.map((member) => { const user = member.user && typeof member.user === "object" ? member.user : {}; return <option key={member._id ?? member.id} value={member._id ?? member.id}>{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Member"} · {user.email ?? "No email"}</option>; })}
            </select>
          </Field>
          {membersLoading && <p className="text-xs text-ink-muted">Loading active members…</p>}
          {!membersLoading && eligibleMembers.length === 0 && <p className="text-xs text-ink-muted">Add another active member before transferring ownership.</p>}
          <div className="flex justify-end"><button type="button" onClick={() => setDialog("transfer")} disabled={!selectedOwner || actionBusy} className="inline-flex items-center gap-2 rounded-control border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-subtle disabled:opacity-50"><UserRoundCog size={16} /> Transfer ownership</button></div>
        </div>
      </section>}

      <section className="overflow-hidden rounded-panel border border-danger/25 bg-surface">
        <div className="flex items-center gap-3 border-b border-danger/15 px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-control bg-danger/10 text-danger"><AlertTriangle size={19} /></span><div><h2 className="font-semibold text-ink">Danger zone</h2><p className="text-xs text-ink-muted">Actions that affect your organization access</p></div></div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><p className="text-sm font-semibold text-ink">Leave this organization</p><p className="mt-1 max-w-xl text-xs leading-5 text-ink-muted">{isOwner ? "Owners must transfer ownership before leaving the organization." : "You will lose access to this organization's projects and work."}</p></div>
          <button type="button" onClick={() => setDialog("leave")} disabled={isOwner || actionBusy} className="shrink-0 rounded-control border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-40">Leave organization</button>
        </div>
      </section>

      <ConfirmDialog open={dialog === "transfer"} title="Transfer organization ownership?" confirmLabel="Transfer ownership" tone="danger" pending={actionBusy} onConfirm={confirmTransfer} onCancel={() => !actionBusy && setDialog("")}>
        The selected member will become the owner. Your account will become an Admin and lose owner-only permissions.
      </ConfirmDialog>
      <ConfirmDialog open={dialog === "leave"} title="Leave this organization?" confirmLabel="Leave organization" tone="danger" pending={actionBusy} onConfirm={confirmLeave} onCancel={() => !actionBusy && setDialog("")}>
        You will lose access to {org?.name ?? currentOrg.name} and its projects. You can only return if an owner or admin invites you again.
      </ConfirmDialog>
    </div>
  );
}
