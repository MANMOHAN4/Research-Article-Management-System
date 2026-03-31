import { Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";

export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);

  // Already logged in → skip auth pages
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "#0A0A0F" }}
    >
      {/* ── Ambient background orbs ── */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Top-center warm glow */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-32
            w-[560px] h-[560px] rounded-full"
          style={{
            background: "#F59E0B",
            opacity: 0.04,
            filter: "blur(120px)",
          }}
        />
        {/* Bottom-right subtle glow */}
        <div
          className="absolute -bottom-24 -right-24
            w-[360px] h-[360px] rounded-full"
          style={{
            background: "#F59E0B",
            opacity: 0.025,
            filter: "blur(100px)",
          }}
        />
      </div>

      {/* ── Subtle dot-grid background ── */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo mark */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-2">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center
                bg-amber-500/15 border border-amber-500/25"
              style={{ boxShadow: "0 0 24px rgba(245,158,11,0.2)" }}
            >
              <span
                className="text-amber-400 font-bold text-base"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                R
              </span>
            </div>
            <div>
              <p
                className="text-lg font-semibold text-white tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Research<span className="text-amber-500">AM</span>
              </p>
              <p
                className="text-xs text-zinc-600 tracking-widest uppercase"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Article Management
              </p>
            </div>
          </div>
        </div>

        {/* Page-specific auth form rendered here */}
        <Outlet />
      </div>
    </div>
  );
}
