import { User, Building2, FileText, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AuthorCard({ author }) {
  const nav = useNavigate();
  const isRegistered = author.UserType === "Registered";

  return (
    <div
      onClick={() => nav(`/authors/${author.AuthorID}`)}
      className="glass-card p-5 cursor-pointer hover:scale-[1.02]
        hover:border-white/15 group transition-all duration-300"
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0
            border ${
              isRegistered
                ? "bg-amber-500/12 border-amber-500/20"
                : "bg-white/5 border-white/10"
            }`}
        >
          <User
            size={17}
            strokeWidth={1.5}
            className={isRegistered ? "text-amber-500" : "text-zinc-500"}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold text-zinc-100 truncate
              group-hover:text-amber-400 transition-colors duration-200"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {author.Name || "—"}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {isRegistered && (
              <BadgeCheck
                size={11}
                strokeWidth={2}
                className="text-amber-500/70"
              />
            )}
            <p className="text-xs text-zinc-600 font-mono">{author.UserType}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        {author.Affiliation && author.Affiliation !== "N/A" && (
          <div className="flex items-start gap-2">
            <Building2
              size={12}
              strokeWidth={1.5}
              className="text-zinc-600 mt-0.5 shrink-0"
            />
            <span className="text-xs text-zinc-500 leading-snug line-clamp-1">
              {author.Affiliation}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <FileText
            size={12}
            strokeWidth={1.5}
            className="text-zinc-600 shrink-0"
          />
          <span className="text-xs text-zinc-500">
            {author.ArticleCount ?? 0} article
            {author.ArticleCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
