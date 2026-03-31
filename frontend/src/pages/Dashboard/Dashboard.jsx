import { useQuery } from "@tanstack/react-query";
import { statsAPI } from "../../api/endpoint.js";
import {
  FileText,
  Users,
  BookMarked,
  CalendarDays,
  Quote,
  Tag,
} from "lucide-react";
import Loader from "../../components/ui/Loader.jsx";

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center
          ${accent ? "bg-amber-500/15 border border-amber-500/20" : "bg-white/5 border border-white/8"}`}
        >
          <Icon
            size={16}
            strokeWidth={1.5}
            className={accent ? "text-amber-500" : "text-zinc-400"}
          />
        </div>
      </div>
      <p
        className="text-2xl font-semibold text-white tracking-tight mb-1"
        style={{ fontFamily: "'Space Grotesk',sans-serif" }}
      >
        {value ?? "—"}
      </p>
      <p className="text-xs text-zinc-500 font-mono tracking-wide uppercase">
        {label}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: () => statsAPI.getOverview().then((r) => r.data),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader text="Loading stats…" />
      </div>
    );
  if (error)
    return (
      <div className="py-20 text-center text-red-400 text-sm">
        Failed to load stats.
      </div>
    );

  const o = data?.overview || {};
  const stats = [
    {
      label: "Total Articles",
      value: o.articles,
      icon: FileText,
      accent: true,
    },
    { label: "Authors", value: o.authors, icon: Users, accent: false },
    { label: "Journals", value: o.journals, icon: BookMarked, accent: false },
    {
      label: "Conferences",
      value: o.conferences,
      icon: CalendarDays,
      accent: false,
    },
    { label: "Reviews", value: o.reviews, icon: Quote, accent: false },
    { label: "Keywords", value: o.keywords, icon: Tag, accent: false },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-semibold text-white tracking-tight mb-1"
          style={{ fontFamily: "'Space Grotesk',sans-serif" }}
        >
          Overview
        </h1>
        <p className="text-sm text-zinc-500">
          Research Article Management System
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Status breakdown */}
      {data?.articleStatusBreakdown?.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4 font-mono tracking-wide uppercase">
            Article Status
          </h2>
          <div className="space-y-3">
            {data.articleStatusBreakdown.map((row) => (
              <div key={row.Status} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 font-mono w-28 shrink-0">
                  {row.Status}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500/70 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (row.Count / (o.articles || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-zinc-500 font-mono w-8 text-right">
                  {row.Count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
