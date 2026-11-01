import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

// Pages only for signed-in users. App.jsx waits for the session restore,
// so `status` is never "loading" here.
export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status !== "authenticated") {
    // Remember where the user was heading so login can send them back.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}