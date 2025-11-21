import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { articleAPI } from "@/api/endpoint";
import SearchBar from "@/components/ui/SearchBar";
import Loader from "@/components/ui/Loader";
import { Plus } from "lucide-react";

import CardList from "@/components/ui/CardList";
import ArticleCard from "@/components/cards/ArticleCard";

const ArticleList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", searchQuery],
    queryFn: () =>
      searchQuery
        ? articleAPI.search(searchQuery).then((res) => res.data)
        : articleAPI.getAll().then((res) => res.data),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Articles</h1>
        <button
          onClick={() => navigate("/articles/new")}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Article
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Search articles by title, keywords, authors..."
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : (
          <CardList>
            {(articles || []).map((a) => (
              <ArticleCard key={a.ArticleID} article={a} />
            ))}
          </CardList>
        )}
      </div>
    </div>
  );
};

export default ArticleList;
