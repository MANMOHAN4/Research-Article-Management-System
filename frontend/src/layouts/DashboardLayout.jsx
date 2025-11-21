import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  FileText,
  Users,
  BookOpen,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { handleLogout } = useAuth();
  const user = useAuthStore((s) => s.user);

  const isActive = (path) => location.pathname.startsWith(path);

  const coreNav = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "Articles", href: "/articles", icon: FileText },
    { name: "Authors", href: "/authors", icon: Users },
    { name: "Journals", href: "/journals", icon: BookOpen },
    { name: "Conferences", href: "/conferences", icon: Calendar },
  ];

  const adminNav =
    user?.role === "Admin"
      ? [{ name: "Users", href: "/users", icon: Settings }]
      : [];

  const navigation = [...coreNav, ...adminNav];

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-64`}
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderRight: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold" style={{ color: "#4f46e5" }}>
              Research Hub
            </h1>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-6 py-3 mx-2 my-1 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "text-white shadow-lg"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  style={
                    active
                      ? {
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }
                      : {}
                  }
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div
              className="rounded-xl p-4 mb-3"
              style={{
                background:
                  "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className={`${sidebarOpen ? "lg:ml-64" : ""} transition-all`}>
        <header
          className="h-16 flex items-center px-6 sticky top-0 z-30"
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <span
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)",
                color: "#5b21b6",
              }}
            >
              {user?.role}
            </span>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
