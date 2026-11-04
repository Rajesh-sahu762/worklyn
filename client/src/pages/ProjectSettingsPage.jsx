import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Check, FolderKanban, LoaderCircle, Save, Users } from "lucide-react";
import { getProject, updateProject } from "../lib/api";
import { Field, inputClass } from "../components/AuthShell";

export default function ProjectSettingsPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    getProject(projectId).then((result) => {
      if (cancelled) return;
      const item = result?.project ?? result;
      setProject(item);
      setRole(result?.role ?? null);
      setName(item?.name ?? "");
      setDescription(item?.description ?? "");
      setAvatar(item?.avatar ?? "");
      setStatus("ready");
    }).catch((err) => {
      if (!cancelled) { setError(err.message || "Couldn't load project settings."); setStatus("error"); }
    });
    return () => { cancelled = true; };
  }, [projectId]);

  const isAdmin = role === "PROJECT_ADMIN";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (name.trim().length < 2 || name.trim().length > 100) return setError("Project name must be between 2 and 100 characters.");
    if (description.length > 1000) return setError("Description cannot exceed 1000 characters.");
    if (avatar.trim()) {
      try {
        const parsed = new URL(avatar.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch { return setError("Project image must be a valid HTTP or HTTPS URL."); }
    }
    setSaving(true);
    try {
      const updated = await updateProject(projectId, { name: name.trim(), description: description.trim(), avatar: avatar.trim() });
      setProject(updated);
      setName(updated.name ?? name.trim());
      setDescription(updated.description ?? description.trim());
      setAvatar(updated.avatar ?? avatar.trim());
      setNotice("Project settings saved.");
    } catch (err) {
      setError(err.message || "Couldn't save project settings.");
    } finally { setSaving(false); }
  }

  if (status === "loading") return <div className="mx-auto max-w-4xl space-y-4"><div className="h-8 w-60 animate-pulse rounded bg-surface-subtle" /><div className="h-64 animate-pulse rounded-panel border border-line bg-surface" /></div>;
  if (status === "error") return <div className="mx-auto max-w-xl rounded-panel border border-line bg-surface p-8 text-center"><p role="alert" className="text-sm text-danger">{error}</p><Link to="/projects" className="mt-4 inline-flex text-sm font-semibold underline">Back to projects</Link></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted"><Link to={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 hover:text-ink"><ArrowLeft size={15} /> {project?.name ?? "Project"}</Link><span>/</span><span className="font-medium text-ink">Settings</span></div>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">{project?.key ?? "Project"} · Configuration</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Project settings</h1><p className="mt-2 text-sm text-ink-muted">Update the identity and description of this project.</p></div><Link to={`/projects/${projectId}/members`} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-control border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-surface-subtle"><Users size={15} /> Manage members</Link></header>
      <section className="overflow-hidden rounded-panel border border-line bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-control bg-surface-subtle"><FolderKanban size={19} /></span><div><h2 className="text-sm font-semibold text-ink">Project details</h2><p className="text-xs text-ink-muted">Name, description and project identity</p></div></div>
        <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
          {error && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">{error}</p>}
          {notice && <p role="status" className="flex items-center gap-2 rounded-control border border-emerald-700/20 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"><Check size={15} />{notice}</p>}
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className="space-y-5">
              <Field id="project-name" label="Project name"><input id="project-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} disabled={!isAdmin} className={inputClass(false)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field id="project-key" label="Project key" hint="Used in issue identifiers."><input id="project-key" value={project?.key ?? ""} readOnly className={`${inputClass(false)} font-mono opacity-70`} /></Field><Field id="project-type" label="Project type"><input id="project-type" value={project?.projectType ?? "KANBAN"} readOnly className={`${inputClass(false)} opacity-70`} /></Field></div>
            </div>
            <div className="space-y-2"><span className="block text-sm font-medium text-ink">Project image</span><div className="grid aspect-square max-h-[150px] place-items-center overflow-hidden rounded-xl border border-line bg-surface-subtle">{avatar ? <img src={avatar} alt="Project image preview" className="h-full w-full object-cover" /> : <span className="text-3xl font-semibold text-ink-muted">{(name.trim()[0] || "P").toUpperCase()}</span>}</div><input aria-label="Project image URL" value={avatar} onChange={(event) => setAvatar(event.target.value)} disabled={!isAdmin} placeholder="https://example.com/project.png" className={inputClass(false)} /></div>
          </div>
          <Field id="project-description" label="Description" hint={`Optional · ${description.length}/1000`}><textarea id="project-description" rows={5} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} disabled={!isAdmin} placeholder="What is this project about?" className={inputClass(false)} /></Field>
          {isAdmin ? <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4"><button type="button" onClick={() => { setName(project?.name ?? ""); setDescription(project?.description ?? ""); setAvatar(project?.avatar ?? ""); setError(""); setNotice(""); }} className="rounded-control px-4 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-subtle">Discard changes</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50">{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}{saving ? "Saving…" : "Save changes"}</button></div> : <p className="border-t border-line pt-4 text-xs text-ink-muted">Only project admins can edit project details.</p>}
        </form>
      </section>
    </div>
  );
}
