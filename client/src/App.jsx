import { useAuth } from "./context/AuthContext";
import SessionLoading from "./components/SessionLoading";
import AppRoutes from "./routes";

export default function App() {
  const { status } = useAuth();
  // Wait for refresh + /me before rendering routes, so a page refresh
  // doesn't flash the login screen.
  if (status === "loading") return <SessionLoading />;
  return <AppRoutes />;
}