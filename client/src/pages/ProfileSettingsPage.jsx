import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Bell, Check, ImagePlus, LoaderCircle, Save, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { updateNotificationPreferences, updateProfile } from "../lib/api";

const DEFAULT_NOTIFICATIONS = {
  ISSUE_ASSIGNED: true,
  ISSUE_STATUS_CHANGED: true,
  ISSUE_COMMENTED: true,
};

const NOTIFICATION_OPTIONS = [
  { key: "ISSUE_ASSIGNED", title: "Issue assigned to me", description: "When someone assigns an issue to you." },
  { key: "ISSUE_STATUS_CHANGED", title: "Issue status changes", description: "When an issue you reported or are assigned to moves to another stage." },
  { key: "ISSUE_COMMENTED", title: "New issue comments", description: "When someone comments on an issue you reported or are assigned to." },
];

const inputClass = "mt-1.5 h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-accent-support focus:ring-2 focus:ring-accent-support/15 disabled:opacity-60";
const labelClass = "text-xs font-semibold text-ink";

function Avatar({ name, image }) {
  const initials = name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";
  return <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-ink text-lg font-semibold text-brand-lime">
    {image ? <img src={image} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : initials}
  </div>;
}

export default function ProfileSettingsPage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    mobile: user?.mobile ?? "",
    profileImage: user?.profileImage ?? "",
  });
  const [notifications, setNotifications] = useState({
    ...DEFAULT_NOTIFICATIONS,
    ...(user?.preferences?.notifications ?? {}),
  });
  const [profileStatus, setProfileStatus] = useState("idle");
  const [preferenceStatus, setPreferenceStatus] = useState("idle");
  const [profileError, setProfileError] = useState("");
  const [preferenceError, setPreferenceError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [preferenceNotice, setPreferenceNotice] = useState("");


  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || user?.email || "Your profile";

  function changeProfile(event) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileStatus("saving");
    setProfileError("");
    setProfileNotice("");
    try {
      const updated = await updateProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        mobile: profile.mobile.trim(),
        profileImage: profile.profileImage.trim(),
      });
      updateUser(updated);
      setProfileNotice("Your profile has been updated.");
      setProfileStatus("saved");
    } catch (error) {
      setProfileError(error.message || "Couldn't update your profile.");
      setProfileStatus("idle");
    }
  }

  async function savePreferences() {
    setPreferenceStatus("saving");
    setPreferenceError("");
    setPreferenceNotice("");
    try {
      const result = await updateNotificationPreferences(notifications);
      updateUser({ preferences: { ...(user?.preferences ?? {}), ...result } });
      setPreferenceNotice("Notification preferences saved.");
      setPreferenceStatus("saved");
    } catch (error) {
      setPreferenceError(error.message || "Couldn't save notification preferences.");
      setPreferenceStatus("idle");
    }
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-center gap-2 text-sm text-ink-muted"><Link to="/" className="inline-flex items-center gap-1.5 hover:text-ink"><ArrowLeft size={15} />Workspace</Link><span>/</span><span className="font-medium text-ink">Profile & preferences</span></div>
    <header><p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">Your account</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Profile & preferences</h1><p className="mt-2 text-sm text-ink-muted">Manage your personal details and choose which in-app updates reach your inbox.</p></header>

    <section className="overflow-hidden rounded-panel border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-subtle text-ink-muted"><UserRound size={17} /></span><div><h2 className="text-sm font-semibold text-ink">Personal information</h2><p className="mt-0.5 text-xs text-ink-muted">Your details shown across Worklyn.</p></div></div>
      <form onSubmit={saveProfile} className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-4"><Avatar name={fullName} image={profile.profileImage} /><div className="min-w-0"><p className="text-sm font-semibold text-ink">{fullName}</p><p className="mt-1 truncate text-xs text-ink-muted">{user?.email}</p><p className="mt-1 text-[11px] text-ink-faint">Profile image preview</p></div></div>
        {profileError && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">{profileError}</p>}
        {profileNotice && <p role="status" className="flex items-center gap-2 text-sm text-status-done"><Check size={15} />{profileNotice}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>First name<input name="firstName" autoComplete="given-name" required minLength={1} maxLength={50} value={profile.firstName} onChange={changeProfile} className={inputClass} /></label>
          <label className={labelClass}>Last name<input name="lastName" autoComplete="family-name" required minLength={1} maxLength={50} value={profile.lastName} onChange={changeProfile} className={inputClass} /></label>
          <label className={labelClass}>Email address<input value={user?.email ?? ""} readOnly className={inputClass + " cursor-not-allowed"} /><span className="mt-1 block text-[11px] font-normal text-ink-faint">Email address cannot be changed here.</span></label>
          <label className={labelClass}>Mobile number<input name="mobile" autoComplete="tel" inputMode="tel" maxLength={20} value={profile.mobile} onChange={changeProfile} placeholder="Add your mobile number" className={inputClass} /></label>
        </div>
        <label className={labelClass}>Profile image URL<div className="relative"><ImagePlus size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input name="profileImage" type="url" maxLength={2048} value={profile.profileImage} onChange={changeProfile} placeholder="https://example.com/avatar.jpg" className={inputClass + " pl-9"} /></div><span className="mt-1 block text-[11px] font-normal text-ink-faint">Use a secure HTTPS image URL. Direct file uploads are not enabled in this version.</span></label>
        <div className="flex justify-end border-t border-line pt-4"><button type="submit" disabled={profileStatus === "saving"} className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50">{profileStatus === "saving" ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}{profileStatus === "saving" ? "Saving…" : "Save profile"}</button></div>
      </form>
    </section>

    <section className="overflow-hidden rounded-panel border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-subtle text-ink-muted"><Bell size={17} /></span><div><h2 className="text-sm font-semibold text-ink">Notification preferences</h2><p className="mt-0.5 text-xs text-ink-muted">Choose which activity creates an in-app notification.</p></div></div>
      <div className="divide-y divide-line px-5 sm:px-6">
        {NOTIFICATION_OPTIONS.map((option) => <label key={option.key} className="flex cursor-pointer items-center justify-between gap-4 py-4"><span className="min-w-0"><span className="block text-sm font-medium text-ink">{option.title}</span><span className="mt-1 block text-xs leading-relaxed text-ink-muted">{option.description}</span></span><input type="checkbox" checked={!!notifications[option.key]} onChange={(event) => { setNotifications((current) => ({ ...current, [option.key]: event.target.checked })); setPreferenceStatus("idle"); }} className="h-4 w-4 shrink-0 accent-current" /></label>)}
      </div>
      <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">{preferenceError ? <p role="alert" className="text-sm text-danger">{preferenceError}</p> : preferenceNotice ? <p role="status" className="flex items-center gap-2 text-sm text-status-done"><Check size={15} />{preferenceNotice}</p> : <p className="text-xs text-ink-faint">Changes apply to future notifications only.</p>}<button type="button" onClick={savePreferences} disabled={preferenceStatus === "saving"} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:opacity-50">{preferenceStatus === "saving" ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}{preferenceStatus === "saving" ? "Saving…" : "Save preferences"}</button></div>
    </section>
  </div>;
}
