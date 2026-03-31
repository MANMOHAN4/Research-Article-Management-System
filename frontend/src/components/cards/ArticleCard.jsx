import { BookOpen, Calendar, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusStyle = {
  Published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Accepted: "bg-blue-500/15   text-blue-400   border-blue-500/20",
  "Under Review": "bg-amber-500/15  text-amber-400  border-amber-500/20",
  Submitted: "bg-zinc-500/15   text-zinc-400   border-zinc-500/20",
  Rejected: "bg-red-500/15    text-red-400    border-red-500/20",
};

export default function ArticleCard({ article }) {
  const nav = useNavigate();

  // Backend returns Keywords as comma-separated string
  const keywords = article.Keywords
    ? article.Keywords.split(",")
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return (
    <div
      onClick={() => nav(`/articles/${article.ArticleID}`)}
      className="glass-card p-5 cursor-pointer hover:scale-[1.02]
        hover:border-white/15 group transition-all duration-300"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full
            text-xs font-mono border shrink-0
            ${statusStyle[article.Status] || statusStyle.Submitted}`}
        >
          {article.Status}
        </span>
        <span className="text-xs text-zinc-600 font-mono shrink-0">
          {article.PublicationType}
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-sm font-semibold text-zinc-100 leading-snug mb-2 line-clamp-2
          group-hover:text-amber-400 transition-colors duration-200"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {article.Title}
      </h3>

      {/* Authors — backend returns as "Alice, Bob" string */}
      {article.Authors && (
        <p className="text-xs text-zinc-500 mb-3 line-clamp-1">
          {article.Authors}
        </p>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {keywords.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                text-xs bg-amber-500/8 text-amber-400/70 border border-amber-500/10"
            >
              <Tag size={9} strokeWidth={2} />
              {k}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          <Calendar size={11} strokeWidth={1.5} />
          {article.SubmissionDate
            ? new Date(article.SubmissionDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </div>
        {article.JournalName && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 max-w-[140px] min-w-0">
            <BookOpen
              size={11}
              strokeWidth={1.5}
              className="text-amber-500/50 shrink-0"
            />
            <span className="truncate">{article.JournalName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
