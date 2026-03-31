import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userAPI } from "../../api/endpoint.js";
import UserCard from "../../components/cards/UserCard.jsx";
import Loader from "../../components/ui/Loader.jsx";
import { useToastStore } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ShieldAlert } from "lucide-react";

export default function UserList() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "Admin";

  const { data = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => userAPI.getAll().then((r) => r.data),
  });

  const del = useMutation({
    mutationFn: (id) => userAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(["users"]);
      addToast("User removed", "success");
    },
    onError: (err) =>
      addToast(err.response?.data?.error || "Delete failed", "error"),
  });

  const handleDelete = (user) => {
    // Guard: only admins can delete
    if (!isAdmin) {
      addToast("Only admins can remove users", "error");
      return;
    }
    // Guard: prevent self-deletion
    if (user.UserID === currentUser?.userId) {
      addToast("You cannot remove your own account", "error");
      return;
    }
    if (confirm(`Remove user "${user.Username}"? This cannot be undone.`)) {
      del.mutate(user.UserID);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold text-white tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Users
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {data.length} registered
          </p>
        </div>

        {/* Role indicator */}
        {!isAdmin && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg
            bg-amber-500/8 border border-amber-500/15"
          >
            <ShieldAlert
              size={13}
              strokeWidth={1.5}
              className="text-amber-500/70"
            />
            <span className="text-xs text-amber-400/70 font-mono">
              View only — Admin role required to remove users
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader text="Loading users…" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((u) => (
            <UserCard
              key={u.UserID}
              user={u}
              // Only pass onDelete prop if current user is Admin
              // UserCard only renders the delete button when onDelete is defined
              onDelete={isAdmin ? handleDelete : undefined}
            />
          ))}
          {data.length === 0 && (
            <p className="col-span-full text-center text-zinc-600 py-12">
              No users found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
