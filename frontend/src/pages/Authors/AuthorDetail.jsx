import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { authorAPI } from "@/api/endpoint";
import Loader from "@/components/ui/Loader";
import { ArrowLeft } from "lucide-react";

const AuthorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: author, isLoading } = useQuery({
    queryKey: ["author", id],
    queryFn: () => authorAPI.getById(id).then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  if (!author) return <div>Author not found</div>;

  return (
    <div>
      <button
        onClick={() => navigate("/authors")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Authors
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h1 className="text-2xl font-bold mb-4">{author.Name}</h1>
          <dl className="space-y-3">
            {author.Affiliation && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Affiliation
                </dt>
                <dd className="mt-1 text-gray-900">{author.Affiliation}</dd>
              </div>
            )}
            {author.ORCID && (
              <div>
                <dt className="text-sm font-medium text-gray-500">ORCID</dt>
                <dd className="mt-1 text-blue-600">{author.ORCID}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="lg:col-span-2 card">
          <h2 className="text-xl font-semibold mb-4">Publications</h2>
          {author.articles?.length > 0 ? (
            <div className="space-y-3">
              {author.articles.map((article) => (
                <div
                  key={article.ArticleID}
                  onClick={() => navigate(`/articles/${article.ArticleID}`)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <h3 className="font-medium mb-1">{article.Title}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(article.SubmissionDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No publications yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthorDetail;
