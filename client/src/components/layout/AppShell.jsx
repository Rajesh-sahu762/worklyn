import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { OrganizationProvider } from "../../context/OrganizationContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { isMac } from "../../lib/platform";
import CommandPalette from "./CommandPalette";

const KEY = "worklyn:sidebarCollapsed";
const readCollapsed = () => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};

function Shell() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try { localStorage.setItem(KEY, c ? "0" : "1"); } catch { /* ignore */ }
      return !c;
    });

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen bg-canvas text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      {mobileOpen && <div aria-hidden="true" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-ink/40 lg:hidden" />}
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onOpenMenu={() => setMobileOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto px-5 py-6 outline-none lg:px-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

// Provider lives here so org/project data loads only for signed-in users.
export default function AppShell() {
  return (
    <OrganizationProvider>
      <Shell />
    </OrganizationProvider>
  );
}