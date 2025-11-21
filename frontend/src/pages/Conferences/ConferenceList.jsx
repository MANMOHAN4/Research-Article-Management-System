import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conferenceAPI } from "@/api/endpoint";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import CardList from "@/components/ui/CardList";
import ConferenceCard from "@/components/cards/ConferenceCard";
import Modal from "@/components/ui/Modal";
import Loader from "@/components/ui/Loader";
import { Plus } from "lucide-react";

const ConferenceList = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Admin";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConference, setEditingConference] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    startDate: "",
    endDate: "",
  });

  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data: conferences, isLoading } = useQuery({
    queryKey: ["conferences"],
    queryFn: () => conferenceAPI.getAll().then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => conferenceAPI.create(data),
    onSuccess: () => {
      addToast({ type: "success", message: "Conference created successfully" });
      queryClient.invalidateQueries(["conferences"]);
      closeModal();
    },
    onError: () =>
      addToast({ type: "error", message: "Failed to create conference" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => conferenceAPI.update(id, data),
    onSuccess: () => {
      addToast({ type: "success", message: "Conference updated successfully" });
      queryClient.invalidateQueries(["conferences"]);
      closeModal();
    },
    onError: () =>
      addToast({ type: "error", message: "Failed to update conference" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => conferenceAPI.delete(id),
    onSuccess: () => {
      addToast({ type: "success", message: "Conference deleted successfully" });
      queryClient.invalidateQueries(["conferences"]);
    },
    onError: () =>
      addToast({ type: "error", message: "Failed to delete conference" }),
  });

  const openModal = (conference = null) => {
    if (conference) {
      setEditingConference(conference);
      setFormData({
        name: conference.Name || "",
        location: conference.Location || "",
        startDate: conference.StartDate?.split("T")[0] || "",
        endDate: conference.EndDate?.split("T")[0] || "",
      });
    } else {
      setEditingConference(null);
      setFormData({ name: "", location: "", startDate: "", endDate: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingConference(null);
    setFormData({ name: "", location: "", startDate: "", endDate: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingConference) {
      updateMutation.mutate({
        id: editingConference.ConferenceID,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this conference?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Conferences</h1>
          <p className="text-white text-opacity-90">
            Browse and manage conferences
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => openModal()}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Conference
          </button>
        )}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : (
          <CardList>
            {(conferences || []).map((conference) => (
              <ConferenceCard
                key={conference.ConferenceID}
                conference={conference}
                isAdmin={isAdmin}
                onEdit={() => openModal(conference)}
                onDelete={() => handleDelete(conference.ConferenceID)}
              />
            ))}
          </CardList>
        )}
      </div>

      {isAdmin && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingConference ? "Edit Conference" : "New Conference"}
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
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="input"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary">
                {editingConference ? "Update" : "Create"}
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
      )}
    </div>
  );
};

export default ConferenceList;
