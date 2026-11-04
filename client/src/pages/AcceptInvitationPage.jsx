import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { acceptInvitation } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";

const ROLE_LABEL = { ADMIN: "an Admin", MEMBER: "a Member" };
const btn = "inline-flex rounded-control px-4 py-2.5 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-70";

export default function AcceptInvitationPage() {
  const { token: pathToken } = useParams();
  const [params] = useSearchParams();
  const token = pathToken ?? params.get("token") ?? "";
  const { user, logout } = useAuth();
  const { addOrganization } = useOrganization();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "idle", error: "", joined: null });

  async function accept() {
    setState({ status: "pending", error: "", joined: null });
    try {
      const { organization, role } = await acceptInvitation(token);
      addOrganization(organization, role); // joined org becomes the current one
      setState({ status: "done", error: "", joined: { name: organization?.name, role } });
    } catch (err) {
      setState({ status: "error", error: err.message, joined: null });
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-md rounded-panel border border-line bg-surface p-6">
      {!token ? (
        <>
          <h1 className="text-xl font-semibold">Invitation link is incomplete</h1>
          <p className="mt-2 text-sm text-ink-muted">Ask the person who invited you to send the link again.</p>
          <Link to="/" className={`${btn} mt-6 bg-accent text-ink hover:bg-accent-strong`}>Go to Home</Link>
        </>
      ) : state.status === "done" ? (
        <>
          <h1 className="text-xl font-semibold">You're in</h1>
          <p role="status" className="mt-2 text-sm text-ink-muted">
            You joined {state.joined.name ?? "the organization"} as {ROLE_LABEL[state.joined.role] ?? "a member"}.
          </p>
          <button type="button" onClick={() => navigate("/", { replace: true })} className={`${btn} mt-6 bg-accent text-ink hover:bg-accent-strong`}>Go to Home</button>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">You've been invited to join an organization</h1>
          <p className="mt-2 text-sm text-ink-muted">
            You're signed in as <span className="font-medium text-ink">{user?.email}</span>. The invitation only works for the email address it was sent to.
          </p>
          {state.status === "error" && (
            <p role="alert" className="mt-4 rounded-control border border-danger/40 bg-danger/5 px-3.5 py-3 text-sm text-ink">{state.error}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="button" onClick={accept} disabled={state.status === "pending"} aria-busy={state.status === "pending"} className={`${btn} bg-accent text-ink hover:bg-accent-strong`}>
              {state.status === "pending" ? "Joining…" : "Accept invitation"}
            </button>
            <button type="button" onClick={logout} className="text-sm font-medium text-accent-support underline underline-offset-2">
              Use a different account
            </button>
          </div>
        </>
      )}
    </div>
  );
}