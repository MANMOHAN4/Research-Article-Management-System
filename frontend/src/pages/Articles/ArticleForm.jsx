import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { articleAPI, journalAPI, conferenceAPI } from "../../api/endpoint.js";
import { useToastStore } from "../../store/toastStore.js";
import { ArrowLeft, Plus, X } from "lucide-react";
import Loader from "../../components/ui/Loader.jsx";

const STATUSES = [
  "Submitted",
  "Under Review",
  "Accepted",
  "Published",
  "Rejected",
];
const PUB_TYPES = ["Journal", "Conference", "Unpublished"];

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-mono text-zinc-500 mb-1.5 tracking-wide uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = `w-full h-11 px-3.5 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600
  bg-[rgba(26,26,36,0.6)] border border-white/8 transition-all duration-200
  focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20`;

export default function ArticleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const [form, setForm] = useState({
    title: "",
    abstract: "",
    doi: "",
    submissionDate: "",
    status: "Submitted",
    publicationType: "Unpublished",
    journalId: "",
    conferenceId: "",
    keywords: [],
    authors: [],
  });
  const [kwInput, setKwInput] = useState("");

  const { data: journals = [] } = useQuery({
    queryKey: ["journals"],
    queryFn: () => journalAPI.getAll().then((r) => r.data),
  });
  const { data: conferences = [] } = useQuery({
    queryKey: ["conferences"],
    queryFn: () => conferenceAPI.getAll().then((r) => r.data),
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["article", id],
    queryFn: () => articleAPI.getById(id).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.Title || "",
        abstract: existing.Abstract || "",
        doi: existing.DOI || "",
        submissionDate: existing.SubmissionDate?.split("T")[0] || "",
        status: existing.Status || "Submitted",
        publicationType: existing.PublicationType || "Unpublished",
        journalId: existing.JournalID || "",
        conferenceId: existing.ConferenceID || "",
        keywords: existing.keywords?.map((k) => k.KeywordText) || [],
        authors:
          existing.authors?.map((a) => ({ name: a.Name, userId: a.UserID })) ||
          [],
      });
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? articleAPI.update(id, data) : articleAPI.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(["articles"]);
      addToast(isEdit ? "Article updated" : "Article created", "success");
      nav(`/articles/${res.data.article?.ArticleID || id}`);
    },
    onError: (err) =>
      addToast(err.response?.data?.error || "Save failed", "error"),
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const addKw = () => {
    const t = kwInput.trim();
    if (t && !form.keywords.includes(t)) {
      set("keywords", [...form.keywords, t]);
      setKwInput("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      journalId: form.publicationType === "Journal" ? form.journalId : null,
      conferenceId:
        form.publicationType === "Conference" ? form.conferenceId : null,
      authors: form.authors.length
        ? form.authors
        : [{ name: "Unknown Author" }],
    });
  };

  if (isEdit && loadingExisting)
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => nav(-1)}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.5} /> Back
      </button>

      <div>
        <h1
          className="text-2xl font-semibold text-white tracking-tight"
          style={{ fontFamily: "'Space Grotesk',sans-serif" }}
        >
          {isEdit ? "Edit Article" : "New Article"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <Field label="Title *">
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Article title"
            required
            className={inputCls}
          />
        </Field>

        <Field label="Abstract">
          <textarea
            value={form.abstract}
            onChange={(e) => set("abstract", e.target.value)}
            placeholder="Brief abstract…"
            rows={4}
            className={`${inputCls} h-auto py-3 resize-none`}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="DOI">
            <input
              value={form.doi}
              onChange={(e) => set("doi", e.target.value)}
              placeholder="10.xxxx/xxxx"
              className={inputCls}
            />
          </Field>
          <Field label="Submission Date">
            <input
              type="date"
              value={form.submissionDate}
              onChange={(e) => set("submissionDate", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className={inputCls}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Publication Type">
            <select
              value={form.publicationType}
              onChange={(e) => set("publicationType", e.target.value)}
              className={inputCls}
            >
              {PUB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {form.publicationType === "Journal" && (
          <Field label="Journal">
            <select
              value={form.journalId}
              onChange={(e) => set("journalId", e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Select journal…</option>
              {journals.map((j) => (
                <option key={j.JournalID} value={j.JournalID}>
                  {j.Name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {form.publicationType === "Conference" && (
          <Field label="Conference">
            <select
              value={form.conferenceId}
              onChange={(e) => set("conferenceId", e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Select conference…</option>
              {conferences.map((c) => (
                <option key={c.ConferenceID} value={c.ConferenceID}>
                  {c.Name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Keywords">
          <div className="flex gap-2 mb-2">
            <input
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKw();
                }
              }}
              placeholder="Add keyword…"
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              onClick={addKw}
              className="h-11 px-3 rounded-lg border border-white/10 text-zinc-400 hover:border-white/20 hover:text-white transition-all focus-ring"
            >
              <Plus size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.keywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                bg-amber-500/10 border border-amber-500/15 text-amber-400/80"
              >
                {k}
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "keywords",
                      form.keywords.filter((x) => x !== k),
                    )
                  }
                  className="hover:text-white transition-colors"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </Field>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full h-11 rounded-lg text-sm font-medium text-[#0A0A0F]
            bg-amber-500 hover:brightness-110 active:scale-[0.98] transition-all duration-200
            disabled:opacity-50 focus-ring"
          style={{ boxShadow: "0 0 20px rgba(245,158,11,0.25)" }}
        >
          {mutation.isPending
            ? "Saving…"
            : isEdit
              ? "Save Changes"
              : "Create Article"}
        </button>
      </form>
    </div>
  );
}
