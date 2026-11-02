import { useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { createOrganization } from "../lib/api";
import { useOrganization } from "../context/OrganizationContext";
import { Field, inputClass, linkClass } from "../components/AuthShell";

const NAME_MAX = 100;
const DESC_MAX = 500;

const slugify = (v) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "");

export default function CreateOrganizationPage() {
  const uid = useId();
  const id = (n) => `${uid}-${n}`;
  const navigate = useNavigate();
  const { addOrganization } = useOrganization();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const refs = useRef({});

  const onName = (v) => {
    setName(v);
    if (!slugEdited) setSlug(slugify(v).replace(/-+$/, ""));
  };

  function validate() {
    const e = {};
    if (!name.trim()) e.name = "Give your organization a name.";
    else if (name.trim().length > NAME_MAX) e.name = `Use ${NAME_MAX} characters or fewer.`;
    if (!slug.replace(/-+$/, "")) e.slug = "Choose a URL name.";
    if (description.length > DESC_MAX) e.description = `Use ${DESC_MAX} characters or fewer.`;
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (pending) return;
    setFormError("");

    const errs = validate();
    setFieldErrors(errs);
    const firstBad = ["name", "slug", "description"].find((k) => errs[k]);
    if (firstBad) { refs.current[firstBad]?.focus(); return; }

    setPending(true);
    try {
      const org = await createOrganization({
        name: name.trim(),
        slug: slug.replace(/-+$/, ""),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      addOrganization(org);
      navigate("/", { replace: true });
    } catch (err) {
      const fe = { ...(err.fieldErrors || {}) };
      if (err.status === 409 && !fe.slug) fe.slug = err.message; // name/slug already taken
      setFieldErrors(fe);
      if (!Object.keys(fe).length || err.status !== 409) setFormError(err.message);
    } finally {
      setPending(false);
    }
  }

  const initial = (name.trim().charAt(0) || "W").toUpperCase();
  const bind = (key, extra = {}) => ({
    id: id(key),
    ref: (el) => { refs.current[key] = el; },
    "aria-invalid": !!fieldErrors[key],
    "aria-describedby": fieldErrors[key] ? `${id(key)}-error` : extra.hint ? `${id(key)}-hint` : undefined,
    className: inputClass(!!fieldErrors[key]),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[26px] font-semibold tracking-tight">Create an organization</h1>
      <p className="mt-1.5 max-w-xl text-[15px] text-ink-muted">
        An organization is your team's home. Projects and issues live inside it, and you can invite people later.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-panel border border-line bg-surface p-6">
          {formError && (
            <div role="alert" className="rounded-control border border-danger/40 bg-danger/5 px-3.5 py-3 text-sm text-ink">{formError}</div>
          )}

          <Field id={id("name")} label="Organization name" error={fieldErrors.name}>
            <input {...bind("name")} value={name} onChange={(e) => onName(e.target.value)} maxLength={NAME_MAX} autoFocus autoComplete="organization" placeholder="Acme Engineering" />
          </Field>

          <Field id={id("slug")} label="URL name" hint="Lowercase letters, numbers and hyphens. Must be unique." error={fieldErrors.slug}>
            <input
              {...bind("slug", { hint: true })}
              value={slug}
              onChange={(e) => { setSlugEdited(true); setSlug(slugify(e.target.value)); }}
              autoCapitalize="none"
              spellCheck={false}
              className={`${inputClass(!!fieldErrors.slug)} font-mono`}
              placeholder="acme-engineering"
            />
          </Field>

          <Field id={id("description")} label="Description (optional)" error={fieldErrors.description}>
            <textarea {...bind("description")} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="What does this team work on?" />
            <p className={`text-right text-xs ${description.length > DESC_MAX ? "text-danger" : "text-ink-muted"}`}>{description.length}/{DESC_MAX}</p>
          </Field>

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-accent-strong motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink motion-reduce:animate-none" />}
              {pending ? "Creating…" : "Create organization"}
            </button>
            <Link to="/" className={linkClass}>Cancel</Link>
          </div>
        </form>

        {/* Live preview of how the organization appears in the sidebar */}
        <aside aria-label="Preview" className="hidden lg:block">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Preview</p>
          <div className="rounded-panel bg-surface-subtle p-4">
            <div className="flex items-center gap-3 rounded-panel border border-line bg-surface p-2 shadow-sm">
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-accent font-mono text-sm font-bold text-ink">{initial}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{name.trim() || "Your organization"}</span>
                <span className="block text-xs text-ink-muted">Owner</span>
              </span>
            </div>
            <p className="mt-4 truncate font-mono text-xs text-ink-muted">{slug.replace(/-+$/, "") || "your-url-name"}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}