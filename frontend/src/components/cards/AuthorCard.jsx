import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";

const AuthorCard = ({ author }) => {
  const navigate = useNavigate();
  return (
    <div
      className="card hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/authors/${author.AuthorID}`)}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
          style={{
            background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          }}
        >
          {author.Name?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {author.Name}
          </h3>
          <p className="text-sm text-gray-600 truncate">
            {author.Affiliation || "—"}
          </p>
        </div>
      </div>
      {author.ORCID && (
        <div className="mt-3 text-xs text-gray-600">
          ORCID: <span className="font-mono">{author.ORCID}</span>
        </div>
      )}
    </div>
  );
};

export default AuthorCard;
