import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authorAPI } from "../../api/endpoint.js";
import ArticleCard from "../../components/cards/ArticleCard.jsx";
import Loader from "../../components/ui/Loader.jsx";
import { ArrowLeft, Building2, BookOpen } from "lucide-react";

export default function AuthorDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["author", id],
    queryFn: () => authorAPI.getById(id).then((r) => r.data),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    );
  if (!data)
    return (
      <div className="py-20 text-center text-zinc-600">Author not found.</div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => nav("/authors")}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.5} /> Back to Authors
      </button>
      <div className="glass-card p-6">
        <h1
          className="text-xl font-semibold text-white mb-2"
          style={{ fontFamily: "'Space Grotesk',sans-serif" }}
        >
          {data.Name}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
          {data.Affiliation && (
            <span className="flex items-center gap-1.5">
              <Building2 size={13} strokeWidth={1.5} />
              {data.Affiliation}
            </span>
          )}
          {data.ORCID && (
            <span className="font-mono text-xs">{data.ORCID}</span>
          )}
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/8">
            {data.UserType}
          </span>
        </div>
      </div>
      {data.articles?.length > 0 && (
        <div>
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <BookOpen size={13} strokeWidth={1.5} /> Articles (
            {data.articles.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.articles.map((a) => (
              <ArticleCard key={a.ArticleID} article={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
