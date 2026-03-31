import { Layers, MapPin, Calendar } from "lucide-react";

export default function ConferenceCard({ conference, onEdit, onDelete }) {
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "?";

  return (
    <div className="glass-card p-5 hover:scale-[1.02] hover:border-white/15 group transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div
          className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/15
            flex items-center justify-center shrink-0"
        >
          <Layers size={15} strokeWidth={1.5} className="text-amber-500" />
        </div>
        {conference.ArticleCount !== undefined && (
          <span className="text-xs font-mono text-zinc-600">
            {conference.ArticleCount} articles
          </span>
        )}
      </div>

      <h3
        className="text-sm font-semibold text-zinc-100 mb-3 line-clamp-2
          group-hover:text-amber-400 transition-colors duration-200"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {conference.Name}
      </h3>

      <div className="space-y-1.5">
        {conference.Location && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <MapPin
              size={11}
              strokeWidth={1.5}
              className="text-zinc-600 shrink-0"
            />
            {conference.Location}
          </div>
        )}
        {conference.StartDate && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Calendar
              size={11}
              strokeWidth={1.5}
              className="text-zinc-600 shrink-0"
            />
            {fmt(conference.StartDate)} – {fmt(conference.EndDate)}
          </div>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(conference);
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
                onDelete(conference);
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
