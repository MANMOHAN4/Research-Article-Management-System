import { BookOpen, Edit, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const JournalCard = ({ journal, onEdit, onDelete }) => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Admin";

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Icon and info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{
              background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            }}
          >
            <BookOpen className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg truncate">
              {journal.Name}
            </h3>
            <p className="text-sm text-gray-600 truncate">
              {journal.Publisher || "—"}
            </p>
          </div>
        </div>

        {/* Middle - Metadata */}
        <div className="flex items-center gap-6">
          <div className="text-sm text-gray-600">
            <span className="font-medium">ISSN:</span> {journal.ISSN || "—"}
          </div>
          <div className="px-3 py-1 rounded bg-purple-100 text-purple-700 text-sm font-medium">
            IF: {journal.ImpactFactor ?? "—"}
          </div>
        </div>

        {/* Right side - Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit?.(journal)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete?.(journal.JournalID)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalCard;
