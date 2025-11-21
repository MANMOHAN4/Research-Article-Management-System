import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { articleAPI, journalAPI, conferenceAPI } from "@/api/endpoint";
import { useToastStore } from "@/store/toastStore";
import Loader from "@/components/ui/Loader";
import { Plus, X } from "lucide-react";

const ArticleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const addToast = useToastStore((state) => state.addToast);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    doi: "",
    keywords: "",
    submissionDate: new Date().toISOString().split("T")[0],
    status: "Submitted",
    journalId: "",
    conferenceId: "",
    authors: [{ name: "", affiliation: "", orcid: "" }],
  });

  const { data: journals } = useQuery({
    queryKey: ["journals"],
    queryFn: () => journalAPI.getAll().then((res) => res.data),
  });

  const { data: conferences } = useQuery({
    queryKey: ["conferences"],
    queryFn: () => conferenceAPI.getAll().then((res) => res.data),
  });

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", id],
    queryFn: () => articleAPI.getById(id).then((res) => res.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (article && isEdit) {
      setFormData({
        title: article.Title || "",
        abstract: article.Abstract || "",
        doi: article.DOI || "",
        keywords: article.Keywords || "",
        submissionDate: article.SubmissionDate?.split("T")[0] || "",
        status: article.Status || "Submitted",
        journalId: article.JournalID || "",
        conferenceId: article.ConferenceID || "",
        authors: article.authors?.map((a) => ({
          name: a.Name,
          affiliation: a.Affiliation || "",
          orcid: a.ORCID || "",
        })) || [{ name: "", affiliation: "", orcid: "" }],
      });
    }
  }, [article, isEdit]);

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? articleAPI.update(id, data) : articleAPI.create(data),
    onSuccess: () => {
      addToast({
        type: "success",
        message: `Article ${isEdit ? "updated" : "created"} successfully`,
      });
      queryClient.invalidateQueries(["articles"]);
      navigate("/articles");
    },
    onError: (error) => {
      addToast({
        type: "error",
        message: error.response?.data?.error || "Operation failed",
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const addAuthor = () => {
    setFormData({
      ...formData,
      authors: [...formData.authors, { name: "", affiliation: "", orcid: "" }],
    });
  };

  const removeAuthor = (index) => {
    setFormData({
      ...formData,
      authors: formData.authors.filter((_, i) => i !== index),
    });
  };

  const updateAuthor = (index, field, value) => {
    const newAuthors = [...formData.authors];
    newAuthors[index][field] = value;
    setFormData({ ...formData, authors: newAuthors });
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        {isEdit ? "Edit Article" : "New Article"}
      </h1>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Abstract *
          </label>
          <textarea
            value={formData.abstract}
            onChange={(e) =>
              setFormData({ ...formData, abstract: e.target.value })
            }
            className="input min-h-32"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DOI
            </label>
            <input
              type="text"
              value={formData.doi}
              onChange={(e) =>
                setFormData({ ...formData, doi: e.target.value })
              }
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) =>
                setFormData({ ...formData, keywords: e.target.value })
              }
              className="input"
              placeholder="Comma separated"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Submission Date
            </label>
            <input
              type="date"
              value={formData.submissionDate}
              onChange={(e) =>
                setFormData({ ...formData, submissionDate: e.target.value })
              }
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="input"
            >
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
              <option value="Published">Published</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Journal
            </label>
            <select
              value={formData.journalId}
              onChange={(e) =>
                setFormData({ ...formData, journalId: e.target.value })
              }
              className="input"
            >
              <option value="">Select Journal</option>
              {journals?.map((j) => (
                <option key={j.JournalID} value={j.JournalID}>
                  {j.Name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conference
            </label>
            <select
              value={formData.conferenceId}
              onChange={(e) =>
                setFormData({ ...formData, conferenceId: e.target.value })
              }
              className="input"
            >
              <option value="">Select Conference</option>
              {conferences?.map((c) => (
                <option key={c.ConferenceID} value={c.ConferenceID}>
                  {c.Name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Authors *
            </label>
            <button
              type="button"
              onClick={addAuthor}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Author
            </button>
          </div>
          <div className="space-y-4">
            {formData.authors.map((author, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Author {index + 1}
                  </span>
                  {formData.authors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAuthor(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={author.name}
                    onChange={(e) =>
                      updateAuthor(index, "name", e.target.value)
                    }
                    placeholder="Name *"
                    className="input"
                    required
                  />
                  <input
                    type="text"
                    value={author.affiliation}
                    onChange={(e) =>
                      updateAuthor(index, "affiliation", e.target.value)
                    }
                    placeholder="Affiliation"
                    className="input"
                  />
                  <input
                    type="text"
                    value={author.orcid}
                    onChange={(e) =>
                      updateAuthor(index, "orcid", e.target.value)
                    }
                    placeholder="ORCID"
                    className="input"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn btn-primary"
          >
            {mutation.isPending ? (
              <Loader size="sm" />
            ) : isEdit ? (
              "Update Article"
            ) : (
              "Create Article"
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate("/articles")}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ArticleForm;
