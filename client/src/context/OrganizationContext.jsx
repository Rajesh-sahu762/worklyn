/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { getMyOrganizations, getMyProjects } from "../lib/api";

const OrgContext = createContext(null);
const STORAGE_KEY = "worklyn:orgId"; // per-browser convenience only

const readStored = () => {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
};
const writeStored = (v) => {
  try { localStorage.setItem(STORAGE_KEY, v); } catch { /* storage unavailable */ }
};

const idOf = (x) => x?._id ?? x?.id ?? null;

// The API returns the org/project together with the caller's role. The exact
// nesting isn't documented, so accept { organization, role } or a flat object.
const normalizeOrg = (item) => {
  const o = item?.organization ?? item;
  return { id: idOf(o), name: o?.name ?? "Untitled", slug: o?.slug ?? "", role: item?.role ?? null };
};
const normalizeProject = (item) => {
  const p = item?.project ?? item;
  return { id: idOf(p), name: p?.name ?? "Untitled", key: p?.key ?? "", role: item?.role ?? null };
};

export function OrganizationProvider({ children }) {
  const { user, accessToken } = useAuth();
  const tokenRef = useRef(accessToken);
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);
  const userKey = idOf(user) ?? user?.email ?? null;

  const [orgs, setOrgs] = useState([]);
  const [orgState, setOrgState] = useState({ status: "loading", error: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const [storedId, setStoredId] = useState(readStored);

  useEffect(() => {
    let cancelled = false;
    getMyOrganizations(tokenRef.current)
      .then((list) => {
        if (cancelled) return;
        setOrgs(list.map(normalizeOrg).filter((o) => o.id));
        setOrgState({ status: "ready", error: "" });
      })
      .catch((err) => {
        if (!cancelled) setOrgState({ status: "error", error: err.message });
      });
    return () => { cancelled = true; };
  }, [userKey, reloadKey]);

  const currentOrg = useMemo(
    () => orgs.find((o) => o.id === storedId) ?? orgs[0] ?? null,
    [orgs, storedId]
  );
  const currentId = currentOrg?.id ?? null;

  const [projState, setProjState] = useState({ orgId: null, items: [], error: "" });
  useEffect(() => {
    if (!currentId) return;
    let cancelled = false;
    getMyProjects(currentId, tokenRef.current)
      .then((list) => {
        if (!cancelled) setProjState({ orgId: currentId, items: list.map(normalizeProject).filter((p) => p.id), error: "" });
      })
      .catch((err) => {
        if (!cancelled) setProjState({ orgId: currentId, items: [], error: err.message });
      });
    return () => { cancelled = true; };
  }, [currentId]);

  const projectsLoaded = projState.orgId === currentId;
  const projects = projectsLoaded ? projState.items : [];
  const projectsStatus = !currentId ? "idle" : !projectsLoaded ? "loading" : projState.error ? "error" : "ready";

  const switchOrg = useCallback((id) => {
    setStoredId(id);
    writeStored(id);
  }, []);

  const reloadOrgs = useCallback(() => {
    setOrgState({ status: "loading", error: "" });
    setReloadKey((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      orgs, orgStatus: orgState.status, orgError: orgState.error, currentOrg, switchOrg, reloadOrgs,
      projects, projectsStatus, projectsError: projState.error,
    }),
    [orgs, orgState, currentOrg, switchOrg, reloadOrgs, projects, projectsStatus, projState.error]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrganization() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrganization must be used inside <OrganizationProvider>");
  return ctx;
}