import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { useToastStore } from "../../store/toastStore.js";

const ROLES = ["Author", "Reviewer", "Admin"];

export default function Signup() {
  const { signup } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "Author",
    affiliation: "",
    orcid: "",
  });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      addToast("Password must be at least 6 characters", "error");
      return;
    }
    setLoading(true);
    try {
      await signup(form);
    } catch (err) {
      // err.response.data.error comes directly from backend SIGNAL or ER_DUP_ENTRY
      addToast(err.response?.data?.error || "Registration failed", "error");
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
        Create account
      </h1>
      <p className="text-sm text-zinc-500 mb-7">Join the research community.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label className="block text-xs font-mono text-zinc-500 mb-1.5 tracking-wide uppercase">
            Username *
          </label>
          <input
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder="your_username"
            required
            autoComplete="username"
            className="w-full h-11 px-3.5 rounded-lg text-sm text-zinc-200
              placeholder:text-zinc-600 bg-[rgba(26,26,36,0.6)] border border-white/8
              focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-mono text-zinc-500 mb-1.5 tracking-wide uppercase">
            Email *
          </label>
          <input
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            type="email"
            placeholder="you@university.edu"
            required
            autoComplete="email"
            className="w-full h-11 px-3.5 rounded-lg text-sm text-zinc-200
              placeholder:text-zinc-600 bg-[rgba(26,26,36,0.6)] border border-white/8
              focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-mono text-zinc-500 mb-1.5 tracking-wide uppercase">
            Password *{" "}
            <span className="text-zinc-600 normal-case">(min 6 chars)</span>
          </label>
          <div className="relative">
            <input
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              type={show ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              minLength={6}
              className="w-full h-11 pl-3.5 pr-10 rounded-lg text-sm text-zinc-200
                placeholder:text-zinc-600 bg-[rgba(26,26,36,0.6)] border border-white/8
                focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {show ? (
                <EyeOff size={16} strokeWidth={1.5} />
              ) : (
                <Eye size={16} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* Affiliation */}
        <div>
          <label className="block text-xs font-mono text-zinc-500 mb-1.5 tracking-wide uppercase">
            Affiliation{" "}
            <span className="text-zinc-600 normal-case">(optional)</span>
          </label>
          <input
            value={form.affiliation}
            onChange={(e) => set("affiliation", e.target.value)}
            placeholder="MIT, Stanford, IISc…"
            className="w-full h-11 px-3.5 rounded-lg text-sm text-zinc-200
              placeholder:text-zinc-600 bg-[rgba(26,26,36,0.6)] border border-white/8
              focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>

        {/* ORCID */}
        <div>
          <label className="block text-xs font-mono text-zinc-500 mb-1.5 tracking-wide uppercase">
            ORCID <span className="text-zinc-600 normal-case">(optional)</span>
          </label>
          <input
            value={form.orcid}
            onChange={(e) => set("orcid", e.target.value)}
            placeholder="0000-0000-0000-0000"
            className="w-full h-11 px-3.5 rounded-lg text-sm text-zinc-200
              placeholder:text-zinc-600 bg-[rgba(26,26,36,0.6)] border border-white/8
              focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>

        {/* Role — matches backend validRoles exactly */}
        <div>
          <label className="block text-xs font-mono text-zinc-500 mb-1.5 tracking-wide uppercase">
            Role
          </label>
          <div className="flex gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set("role", r)}
                className={`flex-1 h-9 rounded-lg text-xs font-mono transition-all duration-200
                  ${
                    form.role === r
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                      : "border border-white/8 text-zinc-500 hover:border-white/15 hover:text-zinc-300"
                  }`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-1.5 font-mono">
            {form.role === "Admin"
              ? "Admin gets both Author + Reviewer profiles"
              : form.role === "Author"
                ? "An Author profile will be auto-created"
                : "A Reviewer profile will be auto-created"}
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 mt-2 rounded-lg text-sm font-medium text-[#0A0A0F]
            bg-amber-500 hover:brightness-110 active:scale-[0.98]
            transition-all duration-200 disabled:opacity-50
            flex items-center justify-center gap-2 focus-ring"
          style={{ boxShadow: "0 0 20px rgba(245,158,11,0.3)" }}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black/60 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <span>Create account</span>
              <ArrowRight size={16} strokeWidth={2} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 mt-6">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-amber-500 hover:text-amber-400 transition-colors focus-ring rounded"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
