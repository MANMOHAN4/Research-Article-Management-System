import { Outlet, NavLink } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  UserCircle,
  BookMarked,
  CalendarDays,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/articles", icon: FileText, label: "Articles" },
  { to: "/authors", icon: UserCircle, label: "Authors" },
  { to: "/journals", icon: BookMarked, label: "Journals" },
  { to: "/conferences", icon: CalendarDays, label: "Conferences" },
  { to: "/users", icon: Users, label: "Users" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "#0A0A0F" }}>
      {/* ── Global ambient orb (fixed, behind everything) ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute top-[-10%] left-[30%]
            w-[600px] h-[600px] rounded-full"
          style={{
            background: "#F59E0B",
            opacity: 0.025,
            filter: "blur(150px)",
          }}
        />
      </div>

      {/* ══════════════════════════════════
          SIDEBAR
      ══════════════════════════════════ */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-56 flex flex-col
          bg-[#12121A] border-r border-white/[0.06]
          transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center
                bg-amber-500/15 border border-amber-500/20 shrink-0"
              style={{ boxShadow: "0 0 14px rgba(245,158,11,0.12)" }}
            >
              <span
                className="text-amber-400 font-bold text-xs"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                R
              </span>
            </div>
            <span
              className="font-semibold text-sm text-white tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Research<span className="text-amber-500">AM</span>
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-sm transition-all duration-200 group
                ${
                  isActive
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={15}
                    strokeWidth={isActive ? 2 : 1.5}
                    className={
                      isActive
                        ? "text-amber-500"
                        : "text-zinc-500 group-hover:text-zinc-300"
                    }
                  />
                  <span className="flex-1">{label}</span>
                  {isActive && (
                    <ChevronRight
                      size={12}
                      strokeWidth={2}
                      className="text-amber-500/60"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="shrink-0 p-2 border-t border-white/[0.06]">
          {/* User identity */}
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-lg">
            <div
              className="h-7 w-7 rounded-full bg-[#0A0A0F] border border-white/10
                flex items-center justify-center shrink-0"
            >
              <span className="text-[11px] font-mono text-zinc-400 uppercase">
                {user?.username?.charAt(0) ?? "U"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-300 truncate">
                {user?.username}
              </p>
              <p className="text-[10px] text-zinc-600 font-mono truncate">
                {user?.role}
              </p>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
              text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/8
              transition-all duration-200 focus-ring"
          >
            <LogOut size={14} strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ══════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-56 relative z-10">
        {/* Top bar */}
        <header
          className="h-14 shrink-0 flex items-center gap-3 px-4 md:px-6
            border-b border-white/[0.06] sticky top-0 z-20
            bg-[#12121A]/80 backdrop-blur-md"
        >
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="md:hidden h-8 w-8 flex items-center justify-center
              rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5
              transition-all focus-ring"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <X size={18} strokeWidth={1.5} />
            ) : (
              <Menu size={18} strokeWidth={1.5} />
            )}
          </button>

          <div className="flex-1" />

          {/* Connection indicator */}
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              style={{ boxShadow: "0 0 6px rgba(16,185,129,0.6)" }}
            />
            <span
              className="text-xs text-zinc-600 hidden sm:block"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              connected
            </span>
          </div>

          {/* Role badge */}
          {user?.role && (
            <span
              className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-mono
                bg-amber-500/10 text-amber-400/70 border border-amber-500/15"
            >
              {user.role}
            </span>
          )}
        </header>

        {/* Page outlet */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
