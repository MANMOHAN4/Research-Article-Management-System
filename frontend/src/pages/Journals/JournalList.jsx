import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { journalAPI } from "@/api/endpoint";
import { useToastStore } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import Loader from "@/components/ui/Loader";
import Modal from "@/components/ui/Modal";
import { Plus, BookOpen, Edit, Trash2 } from "lucide-react";

const JournalList = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Admin";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    publisher: "",
    issn: "",
    impactFactor: "",
  });

  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data: journals, isLoading } = useQuery({
    queryKey: ["journals"],
    queryFn: () => journalAPI.getAll().then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => journalAPI.create(data),
    onSuccess: () => {
      addToast({ type: "success", message: "Journal created successfully" });
      queryClient.invalidateQueries(["journals"]);
      closeModal();
    },
    onError: () =>
      addToast({ type: "error", message: "Failed to create journal" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => journalAPI.update(id, data),
    onSuccess: () => {
      addToast({ type: "success", message: "Journal updated successfully" });
      queryClient.invalidateQueries(["journals"]);
      closeModal();
    },
    onError: () =>
      addToast({ type: "error", message: "Failed to update journal" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => journalAPI.delete(id),
    onSuccess: () => {
      addToast({ type: "success", message: "Journal deleted successfully" });
      queryClient.invalidateQueries(["journals"]);
    },
    onError: () =>
      addToast({ type: "error", message: "Failed to delete journal" }),
  });

  const openModal = (journal = null) => {
    if (journal) {
      setEditingJournal(journal);
      setFormData({
        name: journal.Name || "",
        publisher: journal.Publisher || "",
        issn: journal.ISSN || "",
        impactFactor: journal.ImpactFactor || "",
      });
    } else {
      setEditingJournal(null);
      setFormData({ name: "", publisher: "", issn: "", impactFactor: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingJournal(null);
    setFormData({ name: "", publisher: "", issn: "", impactFactor: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingJournal) {
      updateMutation.mutate({ id: editingJournal.JournalID, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this journal?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Journals</h1>
          <p className="text-white text-opacity-90">
            Browse and manage journals
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => openModal()}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Journal
          </button>
        )}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : (
          <div className="space-y-4">
            {(journals || []).map((journal) => (
              <div
                key={journal.JournalID}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Icon and Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
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
                  {/* Metadata */}
                  <div className="flex items-center gap-6">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">ISSN:</span>{" "}
                      {journal.ISSN || "—"}
                    </div>
                    <div className="px-3 py-1 rounded bg-purple-100 text-purple-700 text-sm font-medium">
                      IF: {journal.ImpactFactor ?? "—"}
                    </div>
                  </div>
                  {/* Admin controls */}
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openModal(journal)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(journal.JournalID)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingJournal ? "Edit Journal" : "New Journal"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Publisher
            </label>
            <input
              type="text"
              value={formData.publisher}
              onChange={(e) =>
                setFormData({ ...formData, publisher: e.target.value })
              }
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ISSN
            </label>
            <input
              type="text"
              value={formData.issn}
              onChange={(e) =>
                setFormData({ ...formData, issn: e.target.value })
              }
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Impact Factor
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.impactFactor}
              onChange={(e) =>
                setFormData({ ...formData, impactFactor: e.target.value })
              }
              className="input"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary">
              {editingJournal ? "Update" : "Create"}
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
    </div>
  );
};

export default JournalList;
