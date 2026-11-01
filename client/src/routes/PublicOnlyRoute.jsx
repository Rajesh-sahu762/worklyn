import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

// Login / register: signed-in users are sent on to where they were going.
export default function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "authenticated") {
    const from = location.state?.from;
    const target = from ? `${from.pathname}${from.search}${from.hash}` : "/";
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}