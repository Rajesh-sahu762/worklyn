import { Navigate, Route, Routes, useNavigate } from "react-router";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/RouteGuards";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function SessionLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <div role="status" className="flex items-center gap-3 text-ink-muted">
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent-support motion-reduce:animate-none"
        />
        <span className="text-[15px]">Restoring your session…</span>
      </div>
    </div>
  );
}

function LoginRoute() {
  const navigate = useNavigate();
  const { login } = useAuth();
  // No manual redirect: once login() flips the status, PublicOnlyRoute
  // sends the user to the page they originally wanted (or "/").
  return (
    <LoginPage
      onLoggedIn={(user, accessToken) => login(user, accessToken)}
      onCreateAccount={() => navigate("/register")}
    />
  );
}

function RegisterRoute() {
  const navigate = useNavigate();
  return <RegisterPage onGoToLogin={() => navigate("/login")} />;
}

// Placeholder until the app shell exists.
function Home() {
  const { user, logout } = useAuth();
  return (
    <div className="space-y-4 p-8">
      <p>Signed in as {user?.email}</p>
      <button
        type="button"
        onClick={logout}
        className="rounded-control border border-line bg-surface px-3 py-2 text-sm"
      >
        Sign out (temporary)
      </button>
    </div>
  );
}

export default function App() {
  const { status } = useAuth();

  // Wait for refresh + /me before rendering routes, otherwise a page
  // refresh would flash the login screen.
  if (status === "loading") return <SessionLoading />;

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        {/* Future app pages go here, e.g. /organizations, /projects/:id */}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}