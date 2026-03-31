import { BookMarked, TrendingUp, Hash } from "lucide-react";

export default function JournalCard({ journal, onEdit, onDelete }) {
  return (
    <div className="glass-card p-5 hover:scale-[1.02] hover:border-white/15 group transition-all duration-300">
      {/* Icon + article count */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/15
            flex items-center justify-center shrink-0"
        >
          <BookMarked size={15} strokeWidth={1.5} className="text-amber-500" />
        </div>
        {journal.ArticleCount !== undefined && (
          <span className="text-xs font-mono text-zinc-600">
            {journal.ArticleCount} articles
          </span>
        )}
      </div>

      {/* Name */}
      <h3
        className="text-sm font-semibold text-zinc-100 mb-1 line-clamp-2
          group-hover:text-amber-400 transition-colors duration-200"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {journal.Name}
      </h3>

      {journal.Publisher && (
        <p className="text-xs text-zinc-500 mb-3">{journal.Publisher}</p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/5">
        {journal.ImpactFactor != null && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <TrendingUp
              size={11}
              strokeWidth={1.5}
              className="text-amber-500/60"
            />
            IF {Number(journal.ImpactFactor).toFixed(3)}
          </div>
        )}
        {journal.ISSN && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Hash size={11} strokeWidth={1.5} className="text-zinc-600" />
            {journal.ISSN}
          </div>
        )}
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(journal);
              }}
              className="flex-1 h-8 rounded-md text-xs border border-white/10 text-zinc-400
                hover:border-white/20 hover:text-white transition-all focus-ring"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(journal);
              }}
              className="flex-1 h-8 rounded-md text-xs border border-red-500/20 text-red-400
                hover:bg-red-500/10 transition-all focus-ring"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
