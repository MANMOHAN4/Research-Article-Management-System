import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authorAPI } from "@/api/endpoint";
import Loader from "@/components/ui/Loader";
import CardList from "@/components/ui/CardList";
import { User } from "lucide-react";

const AuthorList = () => {
  const navigate = useNavigate();

  const { data: authors, isLoading } = useQuery({
    queryKey: ["authors"],
    queryFn: () => authorAPI.getAll().then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Authors</h1>
        <p className="text-white text-opacity-90">Browse research authors</p>
      </div>

      <div className="card">
        <CardList>
          {(authors || []).map((author) => (
            <div
              key={author.AuthorID}
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/authors/${author.AuthorID}`)}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  }}
                >
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {author.Name}
                  </h3>
                  {author.Affiliation && (
                    <p className="text-sm text-gray-600 truncate">
                      {author.Affiliation}
                    </p>
                  )}
                  {author.ORCID && (
                    <p className="text-xs text-blue-600 mt-1">{author.ORCID}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardList>
      </div>
    </div>
  );
};

export default AuthorList;
