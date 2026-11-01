/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { configureApi, getMe, logout as apiLogout, refresh, setAccessToken } from "../lib/api";

const AuthContext = createContext(null);

// Refresh tokens rotate. React StrictMode runs effects twice in dev, and two
// parallel /refresh calls with the same cookie would make the second one fail.
// So both calls share one in-flight promise.
let restoreInFlight = null;
function restoreSession() {
  if (!restoreInFlight) {
    restoreInFlight = (async () => {
      const { accessToken } = await refresh();
      const { user } = await getMe(accessToken);
      return { user, accessToken };
    })().finally(() => {
      restoreInFlight = null;
    });
  }
  return restoreInFlight;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { user, accessToken }
  const [status, setStatus] = useState("loading"); // loading | authenticated | unauthenticated

  // Let the API client report silent refreshes and dead sessions.
  useEffect(() => {
    configureApi({
      onTokenRefreshed: (token) => setSession((s) => (s ? { ...s, accessToken: token } : s)),
      onSessionExpired: () => {
        setAccessToken(null);
        setSession(null);
        setStatus("unauthenticated"); // ProtectedRoute sends the user to /login
      },
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .then((s) => {
        if (cancelled) return;
        setAccessToken(s.accessToken);
        setSession(s);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setAccessToken(null);
        setSession(null);
        setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((user, accessToken) => {
    setAccessToken(accessToken);
    setSession({ user, accessToken });
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Even if the server call fails, drop the local session.
    }
    setAccessToken(null);
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({
      status,
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      login,
      logout,
    }),
    [status, session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}