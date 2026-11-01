import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";

// Placeholder; the real dashboard comes after the shell is verified.
export default function HomePage() {
  const { user } = useAuth();
  const { currentOrg, orgStatus, projects, projectsStatus } = useOrganization();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-[26px] font-semibold tracking-tight">
        Welcome{user?.firstName ? `, ${user.firstName}` : ""}
      </h1>
      <p className="mt-1.5 text-[15px] text-ink-muted">
        {orgStatus === "ready" && !currentOrg
          ? "You're not part of an organization yet."
          : currentOrg
            ? `You're working in ${currentOrg.name}.`
            : ""}
      </p>
      {currentOrg && projectsStatus === "ready" && (
        <p className="mt-6 text-sm text-ink-muted">
          {projects.length} {projects.length === 1 ? "project" : "projects"} you can access.
        </p>
      )}
    </div>
  );
}