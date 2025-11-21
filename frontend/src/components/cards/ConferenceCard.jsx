import { Calendar, Edit, Trash2 } from "lucide-react";

const ConferenceCard = ({ conference, isAdmin, onEdit, onDelete }) => {
  const start = conference.StartDate
    ? new Date(conference.StartDate).toLocaleDateString()
    : "—";
  const end = conference.EndDate
    ? new Date(conference.EndDate).toLocaleDateString()
    : "—";

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{
              background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            }}
          >
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {conference.Name}
            </h3>
            <p className="text-sm text-gray-600 truncate">
              {conference.Location || "—"}
            </p>
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Conference"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Conference"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 text-sm text-gray-700">
        {start} — {end}
      </div>
    </div>
  );
};

export default ConferenceCard;
