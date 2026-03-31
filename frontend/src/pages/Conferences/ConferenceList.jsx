import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { conferenceAPI } from "../../api/endpoint.js";
import ConferenceCard from "../../components/cards/ConferenceCard.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Loader from "../../components/ui/Loader.jsx";
import { useToastStore } from "../../store/toastStore.js";
import { Plus } from "lucide-react";

const inputCls = `w-full h-11 px-3.5 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600
  bg-[rgba(26,26,36,0.6)] border border-white/8 focus:outline-none
  focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all`;

export default function ConferenceList() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    location: "",
    startDate: "",
    endDate: "",
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["conferences"],
    queryFn: () => conferenceAPI.getAll().then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (d) =>
      editing
        ? conferenceAPI.update(editing.ConferenceID, d)
        : conferenceAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries(["conferences"]);
      addToast(editing ? "Conference updated" : "Conference created");
      closeModal();
    },
    onError: (err) =>
      addToast(err.response?.data?.error || "Save failed", "error"),
  });
  const del = useMutation({
    mutationFn: (id) => conferenceAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(["conferences"]);
      addToast("Conference deleted");
    },
  });

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setForm({ name: "", location: "", startDate: "", endDate: "" });
  };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.Name,
      location: c.Location || "",
      startDate: c.StartDate?.split("T")[0] || "",
      endDate: c.EndDate?.split("T")[0] || "",
    });
    setModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold text-white tracking-tight"
            style={{ fontFamily: "'Space Grotesk',sans-serif" }}
          >
            Conferences
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{data.length} total</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="h-9 px-4 rounded-lg text-sm font-medium text-[#0A0A0F] bg-amber-500
            hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 focus-ring"
          style={{ boxShadow: "0 0 16px rgba(245,158,11,0.25)" }}
        >
          <Plus size={15} strokeWidth={2} /> Add Conference
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.map((c) => (
            <ConferenceCard
              key={c.ConferenceID}
              conference={c}
              onEdit={openEdit}
              onDelete={(c2) => {
                if (confirm("Delete?")) del.mutate(c2.ConferenceID);
              }}
            />
          ))}
        </div>
      )}
      <Modal
        open={modal}
        onClose={closeModal}
        title={editing ? "Edit Conference" : "New Conference"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="space-y-4"
        >
          {[
            ["name", "Name *", "NeurIPS 2025", true, "text"],
            ["location", "Location", "Vancouver, Canada", false, "text"],
            ["startDate", "Start Date", "", false, "date"],
            ["endDate", "End Date", "", false, "date"],
          ].map(([key, label, ph, req, type]) => (
            <div key={key}>
              <label className="block text-xs font-mono text-zinc-500 mb-1.5 uppercase tracking-wide">
                {label}
              </label>
              <input
                value={form[key]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [key]: e.target.value }))
                }
                placeholder={ph}
                required={req}
                type={type}
                className={inputCls}
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 h-10 rounded-lg border border-white/10 text-zinc-400 hover:border-white/20 text-sm transition-all focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="flex-1 h-10 rounded-lg bg-amber-500 text-[#0A0A0F] text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 focus-ring"
            >
              {save.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
