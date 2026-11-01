import { Navigate, Route, Routes, useNavigate } from "react-router";
import { useAuth } from "./context/AuthContext";
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

export default function App() {
  const navigate = useNavigate();
  const { status, user, login, logout } = useAuth();

  // Don't render any route until we know whether a session exists,
  // otherwise a refresh would flash the login page.
  if (status === "loading") return <SessionLoading />;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LoginPage
            onLoggedIn={(u, token) => {
              login(u, token);
              navigate("/", { replace: true });
            }}
            onCreateAccount={() => navigate("/register")}
          />
        }
      />
      <Route path="/register" element={<RegisterPage onGoToLogin={() => navigate("/login")} />} />

      {/* Placeholder until the app shell exists. Proper guards come in step 3. */}
      <Route
        path="/"
        element={
          status === "authenticated" ? (
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
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}