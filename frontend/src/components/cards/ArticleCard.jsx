import { useNavigate } from "react-router-dom";
import { Calendar, FileText } from "lucide-react";

const ArticleCard = ({ article }) => {
  const navigate = useNavigate();
  const date = article.SubmissionDate
    ? new Date(article.SubmissionDate).toLocaleDateString()
    : "—";
  const statusColor =
    article.Status === "Published"
      ? "bg-green-100 text-green-700"
      : article.Status === "Rejected"
        ? "bg-red-100 text-red-700"
        : "bg-blue-100 text-blue-700";

  return (
    <div
      className="card hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/articles/${article.ArticleID}`)}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
          }}
        >
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {article.Title}
          </h3>
          <p className="text-sm text-gray-600 truncate">
            {article.Authors ||
              article.authors?.map((a) => a.Name).join(", ") ||
              "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{date}</span>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}
        >
          {article.Status || "Submitted"}
        </span>
      </div>

      {(article.Keywords || article.keywords) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(article.Keywords
            ? article.Keywords.split(",")
            : article.keywords.split(",")
          )
            .slice(0, 3)
            .map((k, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {k.trim()}
              </span>
            ))}
        </div>
      )}
    </div>
  );
};

export default ArticleCard;
