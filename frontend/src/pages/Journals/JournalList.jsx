import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { journalAPI } from "../../api/endpoint.js";
import JournalCard from "../../components/cards/JournalCard.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Loader from "../../components/ui/Loader.jsx";
import { useToastStore } from "../../store/toastStore.js";
import { Plus } from "lucide-react";

const inputCls = `w-full h-11 px-3.5 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600
  bg-[rgba(26,26,36,0.6)] border border-white/8 focus:outline-none
  focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all`;

export default function JournalList() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    publisher: "",
    issn: "",
    impactFactor: "",
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["journals"],
    queryFn: () => journalAPI.getAll().then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (d) =>
      editing ? journalAPI.update(editing.JournalID, d) : journalAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries(["journals"]);
      addToast(editing ? "Journal updated" : "Journal created");
      closeModal();
    },
    onError: (err) =>
      addToast(err.response?.data?.error || "Save failed", "error"),
  });

  const del = useMutation({
    mutationFn: (id) => journalAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(["journals"]);
      addToast("Journal deleted");
    },
    onError: (err) =>
      addToast(err.response?.data?.error || "Delete failed", "error"),
  });

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setForm({ name: "", publisher: "", issn: "", impactFactor: "" });
  };
  const openEdit = (j) => {
    setEditing(j);
    setForm({
      name: j.Name,
      publisher: j.Publisher || "",
      issn: j.ISSN || "",
      impactFactor: j.ImpactFactor || "",
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
            Journals
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{data.length} total</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="h-9 px-4 rounded-lg text-sm font-medium text-[#0A0A0F] bg-amber-500
            hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 focus-ring"
          style={{ boxShadow: "0 0 16px rgba(245,158,11,0.25)" }}
        >
          <Plus size={15} strokeWidth={2} /> Add Journal
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.map((j) => (
            <JournalCard
              key={j.JournalID}
              journal={j}
              onEdit={openEdit}
              onDelete={(j2) => {
                if (confirm("Delete journal?")) del.mutate(j2.JournalID);
              }}
            />
          ))}
        </div>
      )}

      <Modal
        open={modal}
        onClose={closeModal}
        title={editing ? "Edit Journal" : "New Journal"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="space-y-4"
        >
          {[
            ["name", "Name *", "Nature", true],
            ["publisher", "Publisher", "Springer", false],
            ["issn", "ISSN", "0000-0000", false],
            ["impactFactor", "Impact Factor", "4.5", false],
          ].map(([key, label, ph, req]) => (
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
                type={key === "impactFactor" ? "number" : "text"}
                step="0.001"
                min="0"
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
              className="flex-1 h-10 rounded-lg bg-amber-500 text-[#0A0A0F] text-sm font-medium
                hover:brightness-110 transition-all disabled:opacity-50 focus-ring"
            >
              {save.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
