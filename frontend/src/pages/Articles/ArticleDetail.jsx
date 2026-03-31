import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { articleAPI, reviewAPI, citationAPI } from "../../api/endpoint.js";
import Loader from "../../components/ui/Loader.jsx";
import { useToastStore } from "../../store/toastStore.js";
import {
  ArrowLeft,
  Edit,
  Trash2,
  BookOpen,
  Tag,
  User,
  MessageSquare,
} from "lucide-react";

const statusColors = {
  Published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Accepted: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Under Review": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Submitted: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  Rejected: "bg-red-500/15 text-red-400 border-red-500/20",
};

export default function ArticleDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", id],
    queryFn: () => articleAPI.getById(id).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => articleAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(["articles"]);
      addToast("Article deleted", "success");
      nav("/articles");
    },
    onError: (err) =>
      addToast(err.response?.data?.error || "Delete failed", "error"),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader text="Loading article…" />
      </div>
    );
  if (!article)
    return (
      <div className="py-20 text-center text-zinc-600">Article not found.</div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => nav("/articles")}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.5} /> Back to Articles
      </button>

      {/* Header */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-mono border
                ${statusColors[article.Status] || statusColors.Submitted}`}
              >
                {article.Status}
              </span>
              <span className="text-xs text-zinc-600 font-mono">
                {article.PublicationType}
              </span>
            </div>
            <h1
              className="text-xl font-semibold text-white leading-snug"
              style={{ fontFamily: "'Space Grotesk',sans-serif" }}
            >
              {article.Title}
            </h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => nav(`/articles/${id}/edit`)}
              className="h-8 px-3 rounded-lg text-xs border border-white/10 text-zinc-400
                hover:border-white/20 hover:text-white transition-all focus-ring flex items-center gap-1.5"
            >
              <Edit size={13} strokeWidth={1.5} /> Edit
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this article?")) deleteMutation.mutate();
              }}
              className="h-8 px-3 rounded-lg text-xs border border-red-500/20 text-red-400
                hover:bg-red-500/10 transition-all focus-ring flex items-center gap-1.5"
            >
              <Trash2 size={13} strokeWidth={1.5} /> Delete
            </button>
          </div>
        </div>

        {article.Abstract && (
          <p className="text-sm text-zinc-400 leading-relaxed border-t border-white/5 pt-4">
            {article.Abstract}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {[
            ["DOI", article.DOI],
            [
              "Submitted",
              article.SubmissionDate
                ? new Date(article.SubmissionDate).toLocaleDateString()
                : null,
            ],
            ["Journal", article.JournalName],
            ["Conference", article.ConferenceName],
          ].map(
            ([label, val]) =>
              val && (
                <div key={label}>
                  <p className="text-xs font-mono text-zinc-600 mb-0.5">
                    {label}
                  </p>
                  <p className="text-xs text-zinc-300">{val}</p>
                </div>
              ),
          )}
        </div>
      </div>

      {/* Authors */}
      {article.authors?.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <User size={13} strokeWidth={1.5} /> Authors
          </h2>
          <div className="flex flex-wrap gap-2">
            {article.authors.map((a) => (
              <span
                key={a.AuthorID}
                className="px-3 py-1 rounded-full text-xs
                bg-white/5 border border-white/8 text-zinc-300"
              >
                {a.Name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {article.keywords?.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Tag size={13} strokeWidth={1.5} /> Keywords
          </h2>
          <div className="flex flex-wrap gap-2">
            {article.keywords.map((k) => (
              <span
                key={k.KeywordID}
                className="px-3 py-1 rounded-full text-xs
                bg-amber-500/8 border border-amber-500/15 text-amber-400/70"
              >
                {k.KeywordText}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {article.reviews?.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <MessageSquare size={13} strokeWidth={1.5} /> Reviews (
            {article.reviews.length})
          </h2>
          <div className="space-y-3">
            {article.reviews.map((r) => (
              <div
                key={r.ReviewID}
                className="p-4 rounded-lg bg-white/3 border border-white/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-300">
                    {r.ReviewerName}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono border
                    ${
                      r.Recommendation === "Accept"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                        : r.Recommendation === "Reject"
                          ? "bg-red-500/15 text-red-400 border-red-500/20"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {r.Recommendation}
                  </span>
                </div>
                {r.Comments && (
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {r.Comments}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
