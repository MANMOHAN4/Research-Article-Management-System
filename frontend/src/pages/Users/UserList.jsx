import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userAPI } from "@/api/endpoint";
import { useToastStore } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import Modal from "@/components/ui/Modal";
import Loader from "@/components/ui/Loader";
import CardList from "@/components/ui/CardList";
import { Settings, Edit, Trash2, Key } from "lucide-react";

const UserList = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Admin";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    affiliation: "",
    orcid: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    userId: null,
    username: "",
    newPassword: "",
    confirmPassword: "",
  });

  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => userAPI.getAll().then((res) => res.data),
    enabled: isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => userAPI.update(id, data),
    onSuccess: () => {
      addToast({ type: "success", message: "User updated successfully" });
      queryClient.invalidateQueries(["users"]);
      closeModal();
    },
    onError: () =>
      addToast({ type: "error", message: "Failed to update user" }),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: ({ id, password }) => userAPI.updatePassword(id, { password }),
    onSuccess: () => {
      addToast({ type: "success", message: "Password updated successfully" });
      closePasswordModal();
    },
    onError: (error) => {
      const message =
        error?.response?.data?.error || "Failed to update password";
      addToast({ type: "error", message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => userAPI.delete(id),
    onSuccess: () => {
      addToast({ type: "success", message: "User deleted successfully" });
      queryClient.invalidateQueries(["users"]);
    },
    onError: () =>
      addToast({ type: "error", message: "Failed to delete user" }),
  });

  const openModal = (u) => {
    setEditingUser(u);
    setFormData({
      email: u.Email || "",
      affiliation: u.Affiliation || "",
      orcid: u.ORCID || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ email: "", affiliation: "", orcid: "" });
  };

  const openPasswordModal = (u) => {
    setPasswordForm({
      userId: u.UserID,
      username: u.Username,
      newPassword: "",
      confirmPassword: "",
    });
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordForm({
      userId: null,
      username: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ id: editingUser.UserID, data: formData });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast({ type: "error", message: "Passwords do not match" });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      addToast({
        type: "error",
        message: "Password must be at least 6 characters",
      });
      return;
    }

    updatePasswordMutation.mutate({
      id: passwordForm.userId,
      password: passwordForm.newPassword,
    });
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate(id);
    }
  };

  if (!isAdmin) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold mb-2">Access denied</h1>
        <p className="text-gray-600">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
        <p className="text-white text-opacity-90">Manage system users</p>
      </div>

      <div className="card">
        <CardList>
          {(users || []).map((u) => (
            <div
              key={u.UserID}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
                  }}
                >
                  <Settings className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {u.Username}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">{u.Email}</p>
                  <div className="mt-2">
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">
                      {u.Role}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => openModal(u)}
                  className="text-blue-600 hover:text-blue-800 p-2"
                  title="Edit User"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openPasswordModal(u)}
                  className="text-green-600 hover:text-green-800 p-2"
                  title="Reset Password"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(u.UserID)}
                  className="text-red-600 hover:text-red-800 p-2"
                  title="Delete User"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </CardList>
      </div>

      {/* Edit User Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Edit User">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Affiliation
            </label>
            <input
              type="text"
              value={formData.affiliation}
              onChange={(e) =>
                setFormData({ ...formData, affiliation: e.target.value })
              }
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ORCID
            </label>
            <input
              type="text"
              value={formData.orcid}
              onChange={(e) =>
                setFormData({ ...formData, orcid: e.target.value })
              }
              className="input"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary">
              Update
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={closePasswordModal}
        title="Reset Password"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              <strong>User:</strong> {passwordForm.username}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password *
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value,
                })
              }
              className="input"
              placeholder="Enter new password"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value,
                })
              }
              className="input"
              placeholder="Confirm new password"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={updatePasswordMutation.isPending}
              className="btn btn-primary"
            >
              {updatePasswordMutation.isPending
                ? "Updating..."
                : "Update Password"}
            </button>
            <button
              type="button"
              onClick={closePasswordModal}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserList;
