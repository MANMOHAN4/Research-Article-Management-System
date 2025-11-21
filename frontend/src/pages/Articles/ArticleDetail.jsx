import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { articleAPI, reviewAPI, citationAPI } from "@/api/endpoint";
import { useToastStore } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import Loader from "@/components/ui/Loader";
import Modal from "@/components/ui/Modal";
import {
  Edit,
  Trash2,
  ArrowLeft,
  Plus,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Admin";

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    reviewerName: user?.username || "",
    affiliation: "",
    expertiseArea: "",
    comments: "",
    recommendation: "Accept",
  });
  const [citationForm, setCitationForm] = useState({
    citedArticleId: "",
  });

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", id],
    queryFn: () => articleAPI.getById(id).then((res) => res.data),
  });

  const { data: citations } = useQuery({
    queryKey: ["citations", id],
    queryFn: () => citationAPI.getByArticle(id).then((res) => res.data),
  });

  const { data: citedBy } = useQuery({
    queryKey: ["citedBy", id],
    queryFn: () => citationAPI.getCitedBy(id).then((res) => res.data),
  });

  const { data: allArticles } = useQuery({
    queryKey: ["articles"],
    queryFn: () => articleAPI.getAll().then((res) => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => articleAPI.delete(id),
    onSuccess: () => {
      addToast({ type: "success", message: "Article deleted successfully" });
      queryClient.invalidateQueries(["articles"]);
      navigate("/articles");
    },
    onError: () => {
      addToast({ type: "error", message: "Failed to delete article" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (data) => reviewAPI.create(data),
    onSuccess: () => {
      addToast({ type: "success", message: "Review submitted successfully" });
      queryClient.invalidateQueries(["article", id]);
      setIsReviewModalOpen(false);
      setReviewForm({
        reviewerName: user?.username || "",
        affiliation: "",
        expertiseArea: "",
        comments: "",
        recommendation: "Accept",
      });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Failed to submit review";
      addToast({ type: "error", message });
    },
  });

  const citationMutation = useMutation({
    mutationFn: (data) => citationAPI.create(data),
    onSuccess: () => {
      addToast({ type: "success", message: "Citation added successfully" });
      queryClient.invalidateQueries(["citations", id]);
      setIsCitationModalOpen(false);
      setCitationForm({ citedArticleId: "" });
    },
    onError: (error) => {
      const message = error?.response?.data?.error || "Failed to add citation";
      addToast({ type: "error", message });
    },
  });

  const deleteCitationMutation = useMutation({
    mutationFn: (citationId) => citationAPI.delete(citationId),
    onSuccess: () => {
      addToast({ type: "success", message: "Citation removed successfully" });
      queryClient.invalidateQueries(["citations", id]);
    },
    onError: () => {
      addToast({ type: "error", message: "Failed to remove citation" });
    },
  });

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    reviewMutation.mutate({
      articleId: parseInt(id),
      reviewerName: reviewForm.reviewerName,
      affiliation: reviewForm.affiliation || null,
      expertiseArea: reviewForm.expertiseArea || null,
      reviewDate: new Date().toISOString().split("T")[0],
      comments: reviewForm.comments,
      recommendation: reviewForm.recommendation,
    });
  };

  const handleCitationSubmit = (e) => {
    e.preventDefault();
    citationMutation.mutate({
      citingArticleId: parseInt(id),
      citedArticleId: parseInt(citationForm.citedArticleId),
      citationDate: new Date().toISOString().split("T")[0],
    });
  };

  const handleDeleteCitation = (citationId) => {
    if (confirm("Are you sure you want to remove this citation?")) {
      deleteCitationMutation.mutate(citationId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  if (!article) return <div className="card">Article not found</div>;

  // Safely compute age label
  const ageLabel =
    typeof article.ArticleAgeDays === "number"
      ? article.ArticleAgeDays === 0
        ? "Today"
        : `${article.ArticleAgeDays} day${article.ArticleAgeDays === 1 ? "" : "s"} ago`
      : "N/A";

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate("/articles")}
          className="flex items-center gap-2 text-white hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Articles
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">{article.Title}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Review
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => navigate(`/articles/${id}/edit`)}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm("Are you sure you want to delete this article?")
                    ) {
                      deleteMutation.mutate();
                    }
                  }}
                  className="btn btn-danger flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Abstract</h2>
            <p className="text-gray-700 leading-relaxed">{article.Abstract}</p>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Authors</h2>
            <div className="space-y-3">
              {article.authors?.map((author) => (
                <div
                  key={author.AuthorID}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => navigate(`/authors/${author.AuthorID}`)}
                >
                  <div>
                    <p className="font-medium">{author.Name}</p>
                    {author.Affiliation && (
                      <p className="text-sm text-gray-600">
                        {author.Affiliation}
                      </p>
                    )}
                  </div>
                  {author.ORCID && (
                    <span className="text-xs text-blue-600">
                      {author.ORCID}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Reviews</h2>
            {article.reviews?.length > 0 ? (
              <div className="space-y-4">
                {article.reviews.map((review) => (
                  <div
                    key={review.ReviewID}
                    className="border-l-4 border-blue-500 pl-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{review.ReviewerName}</p>
                      <span className="text-sm text-gray-600">
                        {new Date(review.ReviewDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm mb-2">
                      <span className="font-medium">Recommendation:</span>{" "}
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          review.Recommendation === "Accept"
                            ? "bg-green-100 text-green-800"
                            : review.Recommendation === "Reject"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {review.Recommendation}
                      </span>
                    </p>
                    <p className="text-gray-700">{review.Comments}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No reviews yet</p>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                References ({citations?.length || 0})
              </h2>
              <button
                onClick={() => setIsCitationModalOpen(true)}
                className="btn btn-primary flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Citation
              </button>
            </div>
            {citations?.length > 0 ? (
              <div className="space-y-3">
                {citations.map((citation) => (
                  <div
                    key={citation.CitationID}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {citation.CitedTitle}
                      </p>
                      {citation.CitedDOI && (
                        <p className="text-sm text-blue-600 mt-1">
                          DOI: {citation.CitedDOI}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Cited on:{" "}
                        {new Date(citation.CitationDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          navigate(`/articles/${citation.CitedArticleID}`)
                        }
                        className="text-blue-600 hover:text-blue-800"
                        title="View article"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteCitation(citation.CitationID)
                        }
                        className="text-red-600 hover:text-red-800"
                        title="Remove citation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No citations yet. Click "Add Citation" to add references.
              </p>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Cited By ({citedBy?.length || 0})
            </h2>
            {citedBy?.length > 0 ? (
              <div className="space-y-3">
                {citedBy.map((citation) => (
                  <div
                    key={citation.CitationID}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate(`/articles/${citation.CitingArticleID}`)
                    }
                  >
                    <p className="font-medium text-gray-900">
                      {citation.CitingTitle}
                    </p>
                    {citation.CitingDOI && (
                      <p className="text-sm text-blue-600 mt-1">
                        DOI: {citation.CitingDOI}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Cited on:{" "}
                      {new Date(citation.CitationDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                This article has not been cited yet.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      article.Status === "Published"
                        ? "bg-green-100 text-green-800"
                        : article.Status === "Rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {article.Status}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Submission Date
                </dt>
                <dd className="mt-1 text-gray-900">
                  {new Date(article.SubmissionDate).toLocaleDateString()}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Age (days)
                </dt>
                <dd className="mt-1 text-gray-900">{ageLabel}</dd>
              </div>

              {article.DOI && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">DOI</dt>
                  <dd className="mt-1 text-blue-600">{article.DOI}</dd>
                </div>
              )}

              {article.Keywords && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Keywords
                  </dt>
                  <dd className="mt-1">
                    <div className="flex flex-wrap gap-2">
                      {article.Keywords.split(",").map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {keyword.trim()}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}

              {article.JournalName && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Journal</dt>
                  <dd className="mt-1 text-gray-900">{article.JournalName}</dd>
                </div>
              )}

              {article.ConferenceName && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Conference
                  </dt>
                  <dd className="mt-1 text-gray-900">
                    {article.ConferenceName}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Submit Review"
        size="lg"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reviewer Name *
            </label>
            <input
              type="text"
              value={reviewForm.reviewerName}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, reviewerName: e.target.value })
              }
              className="input"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Affiliation
              </label>
              <input
                type="text"
                value={reviewForm.affiliation}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, affiliation: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expertise Area
              </label>
              <input
                type="text"
                value={reviewForm.expertiseArea}
                onChange={(e) =>
                  setReviewForm({
                    ...reviewForm,
                    expertiseArea: e.target.value,
                  })
                }
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recommendation *
            </label>
            <select
              value={reviewForm.recommendation}
              onChange={(e) =>
                setReviewForm({
                  ...reviewForm,
                  recommendation: e.target.value,
                })
              }
              className="input"
              required
            >
              <option value="Accept">Accept</option>
              <option value="Minor Revision">Minor Revision</option>
              <option value="Major Revision">Major Revision</option>
              <option value="Reject">Reject</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments *
            </label>
            <textarea
              value={reviewForm.comments}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, comments: e.target.value })
              }
              className="input min-h-32"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={reviewMutation.isPending}
              className="btn btn-primary"
            >
              {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </button>
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Citation Modal */}
      <Modal
        isOpen={isCitationModalOpen}
        onClose={() => setIsCitationModalOpen(false)}
        title="Add Citation"
      >
        <form onSubmit={handleCitationSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Article to Cite *
            </label>
            <select
              value={citationForm.citedArticleId}
              onChange={(e) =>
                setCitationForm({ citedArticleId: e.target.value })
              }
              className="input"
              required
            >
              <option value="">Choose an article...</option>
              {allArticles
                ?.filter((a) => a.ArticleID !== parseInt(id))
                .map((a) => (
                  <option key={a.ArticleID} value={a.ArticleID}>
                    {a.Title} {a.DOI ? `(${a.DOI})` : ""}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This article will cite the selected article
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={citationMutation.isPending}
              className="btn btn-primary"
            >
              {citationMutation.isPending ? "Adding..." : "Add Citation"}
            </button>
            <button
              type="button"
              onClick={() => setIsCitationModalOpen(false)}
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

export default ArticleDetail;
