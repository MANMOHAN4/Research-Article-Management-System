import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { useToastStore } from "../../store/toastStore.js";

export default function Login() {
  const { login } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const [form, setForm] = useState({ username: "", password: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      // navigation handled inside useAuth.login
    } catch (err) {
      addToast(err.response?.data?.error || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="glass-card p-8"
      style={{ boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}
    >
      <h1
        className="text-2xl font-semibold text-white mb-1 tracking-tight"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Welcome back
      </h1>
      <p className="text-sm text-zinc-500 mb-7">
        Sign in to your account to continue.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label className="block text-xs font-mono text-zinc-500 mb-1.5 tracking-wide uppercase">
            Username
          </label>
          <input
            value={form.username}
            onChange={(e) =>
              setForm((p) => ({ ...p, username: e.target.value }))
            }
            placeholder="your_username"
            required
            autoComplete="username"
            className="w-full h-11 px-3.5 rounded-lg text-sm text-zinc-200
              placeholder:text-zinc-600 bg-[rgba(26,26,36,0.6)] border border-white/8
              focus:outline-none focus:border-amber-500/50 focus:ring-2
              focus:ring-amber-500/20 transition-all duration-200"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-mono text-zinc-500 mb-1.5 tracking-wide uppercase">
            Password
          </label>
          <div className="relative">
            <input
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              type={show ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full h-11 pl-3.5 pr-10 rounded-lg text-sm text-zinc-200
                placeholder:text-zinc-600 bg-[rgba(26,26,36,0.6)] border border-white/8
                focus:outline-none focus:border-amber-500/50 focus:ring-2
                focus:ring-amber-500/20 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500
                hover:text-zinc-300 transition-colors"
            >
              {show ? (
                <EyeOff size={16} strokeWidth={1.5} />
              ) : (
                <Eye size={16} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 mt-2 rounded-lg text-sm font-medium text-[#0A0A0F]
            bg-amber-500 hover:brightness-110 active:scale-[0.98]
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            focus-ring flex items-center justify-center gap-2"
          style={{
            boxShadow: loading ? "none" : "0 0 20px rgba(245,158,11,0.3)",
          }}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black/60 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight size={16} strokeWidth={2} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 mt-6">
        No account?{" "}
        <Link
          to="/signup"
          className="text-amber-500 hover:text-amber-400 transition-colors focus-ring rounded"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
