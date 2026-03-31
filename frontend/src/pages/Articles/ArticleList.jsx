import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { articleAPI } from "../../api/endpoint.js";
import ArticleCard from "../../components/cards/ArticleCard.jsx";
import SearchBar from "../../components/ui/SearchBar.jsx";
import Loader from "../../components/ui/Loader.jsx";
import { Plus } from "lucide-react";

export default function ArticleList() {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const { data: all = [], isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: () => articleAPI.getAll().then((r) => r.data),
  });

  // Client-side filter — backend returns Authors/Keywords as comma strings
  const filtered =
    q.trim().length > 0
      ? all.filter(
          (a) =>
            a.Title?.toLowerCase().includes(q.toLowerCase()) ||
            a.Authors?.toLowerCase().includes(q.toLowerCase()) ||
            a.Keywords?.toLowerCase().includes(q.toLowerCase()),
        )
      : all;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold text-white tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Articles
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{all.length} total</p>
        </div>
        <button
          onClick={() => nav("/articles/new")}
          className="h-9 px-4 rounded-lg text-sm font-medium text-[#0A0A0F]
            bg-amber-500 hover:brightness-110 active:scale-[0.98]
            transition-all duration-200 focus-ring flex items-center gap-2"
          style={{ boxShadow: "0 0 16px rgba(245,158,11,0.25)" }}
        >
          <Plus size={15} strokeWidth={2} />
          New Article
        </button>
      </div>

      <SearchBar
        value={q}
        onChange={setQ}
        onClear={() => setQ("")}
        placeholder="Search by title, author, keyword…"
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader text="Loading articles…" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <p className="col-span-full text-center text-zinc-600 py-12">
              No articles found.
            </p>
          ) : (
            filtered.map((a) => <ArticleCard key={a.ArticleID} article={a} />)
          )}
        </div>
      )}
    </div>
  );
}
