import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowRight, Check, CheckCircle2, Clock3, Mail, ShieldCheck, Users, XCircle } from "lucide-react";
import { acceptInvitation } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";

const ROLE_LABEL = { ADMIN: "Admin", MEMBER: "Member" };

function InvitationMark({ success = false }) {
  return (
    <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl border ${success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-line bg-surface-subtle text-accent"}`}>
      {success ? <CheckCircle2 size={30} strokeWidth={1.8} /> : <Mail size={28} strokeWidth={1.8} />}
    </div>
  );
}

export default function AcceptInvitationPage() {
  const { token: pathToken } = useParams();
  const [params] = useSearchParams();
  const token = pathToken ?? params.get("token") ?? params.get("inviteToken") ?? "";
  const { user, logout } = useAuth();
  const { addOrganization } = useOrganization();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "idle", error: "", joined: null });

  async function accept() {
    if (!token || state.status === "pending") return;
    setState({ status: "pending", error: "", joined: null });
    try {
      const { organization, role } = await acceptInvitation(token);
      addOrganization(organization, role);
      setState({
        status: "done",
        error: "",
        joined: { name: organization?.name ?? "your new organization", role },
      });
    } catch (err) {
      setState({ status: "error", error: err.message, joined: null });
    }
  }

  const done = state.status === "done";
  const invalidLink = !token;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-3xl items-center justify-center py-6 sm:py-10">
      <section className="w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line bg-surface-subtle/70 px-5 py-8 text-center sm:px-10 sm:py-10">
          <InvitationMark success={done} />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {done ? "Invitation accepted" : "You're invited"}
          </p>
          <h1 className="mx-auto mt-2 max-w-xl text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {done
              ? "Welcome to the team."
              : invalidLink
                ? "This invitation link is incomplete"
                : "A better way to work starts together."}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-ink-muted sm:text-base">
            {done
              ? "Your membership is active. The organization is now available in your Worklyn workspace."
              : invalidLink
                ? "The link doesn't contain an invitation token. Ask the person who invited you to send a fresh link."
                : "You've been invited to collaborate in a Worklyn organization. Accept the invitation to join your team and get started."}
          </p>
        </div>

        <div className="mx-auto w-full max-w-xl px-5 py-6 sm:px-8 sm:py-8">
          {done ? (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <Check className="mt-0.5 shrink-0 text-emerald-700" size={19} />
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{state.joined.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    You joined as {ROLE_LABEL[state.joined.role] ?? "Member"}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/", { replace: true })}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
              >
                Open my workspace <ArrowRight size={17} />
              </button>
            </>
          ) : invalidLink ? (
            <Link
              to="/"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-control border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support"
            >
              Back to workspace
            </Link>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-line p-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-subtle text-ink-muted">
                    <Users size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">Join your organization</p>
                    <p className="mt-1 text-sm leading-5 text-ink-muted">
                      Collaborate on projects, track work and stay aligned with your team.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-line p-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-subtle text-ink-muted">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">Invitation is email-specific</p>
                    <p className="mt-1 break-all text-sm leading-5 text-ink-muted">
                      Signed in as <span className="font-medium text-ink">{user?.email ?? "your account"}</span>. You must use the email address this invitation was sent to.
                    </p>
                  </div>
                </div>
              </div>

              {state.status === "error" && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3.5 text-sm text-ink">
                  <XCircle size={18} className="mt-0.5 shrink-0 text-danger" />
                  <span>{state.error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={accept}
                disabled={state.status === "pending"}
                aria-busy={state.status === "pending"}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
              >
                {state.status === "pending" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Joining your team…
                  </>
                ) : (
                  <>Accept invitation <ArrowRight size={17} /></>
                )}
              </button>
              <button
                type="button"
                onClick={logout}
                disabled={state.status === "pending"}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-control px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-support disabled:opacity-50"
              >
                Use a different account
              </button>
              <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-ink-faint">
                <Clock3 size={13} /> Invitation links expire after a limited time.
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
