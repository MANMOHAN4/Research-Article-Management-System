import { User, ShieldCheck, Mail, Building2 } from "lucide-react";

const roleBadge = {
  Admin: "bg-amber-500/15  text-amber-400  border-amber-500/20",
  Author: "bg-blue-500/15   text-blue-400   border-blue-500/20",
  Reviewer: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

export default function UserCard({ user, onDelete }) {
  return (
    <div className="glass-card p-5 hover:scale-[1.02] hover:border-white/15 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="h-9 w-9 rounded-full bg-[#12121A] border border-white/10
            flex items-center justify-center shrink-0 mt-0.5"
        >
          <span className="text-xs font-mono text-zinc-400 uppercase">
            {user.Username?.charAt(0)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold text-zinc-100 truncate"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {user.Username}
          </p>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
              text-xs font-mono border mt-1
              ${roleBadge[user.Role] || roleBadge.Author}`}
          >
            <ShieldCheck size={9} strokeWidth={2} />
            {user.Role}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Mail
            size={11}
            strokeWidth={1.5}
            className="text-zinc-600 shrink-0"
          />
          <span className="text-xs text-zinc-500 truncate">{user.Email}</span>
        </div>
        {user.Affiliation && (
          <div className="flex items-center gap-2">
            <Building2
              size={11}
              strokeWidth={1.5}
              className="text-zinc-600 shrink-0"
            />
            <span className="text-xs text-zinc-500 truncate">
              {user.Affiliation}
            </span>
          </div>
        )}
        {user.ORCID && (
          <p className="text-xs text-zinc-600 font-mono pl-0.5">{user.ORCID}</p>
        )}
      </div>

      {onDelete && (
        <button
          onClick={() => onDelete(user)}
          className="w-full mt-4 h-8 rounded-md text-xs border border-red-500/20
            text-red-400 hover:bg-red-500/10 transition-all focus-ring"
        >
          Remove user
        </button>
      )}
    </div>
  );
}
