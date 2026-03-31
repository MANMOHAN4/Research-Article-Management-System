import api from "./axios.js";

// ── Auth ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login    → { username, password }
// POST /api/auth/signup   → { username, password, email, affiliation?, orcid?, role? }
// POST /api/auth/logout
// PUT  /api/auth/change-password/:id → { currentPassword, newPassword }
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  signup: (data) => api.post("/auth/signup", data),
  logout: () => api.post("/auth/logout"),
  changePassword: (id, data) => api.put(`/auth/change-password/${id}`, data),
};

// ── Users ─────────────────────────────────────────────────────────────────────
// GET    /api/users
// GET    /api/users/:id
// PUT    /api/users/:id      → { email, affiliation?, orcid? }
// PUT    /api/users/:id/password → { password }
// DELETE /api/users/:id
// GET    /api/users/:id/articles
// GET    /api/users/:id/reviews
export const userAPI = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  updatePassword: (id, data) => api.put(`/users/${id}/password`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getArticles: (id) => api.get(`/users/${id}/articles`),
  getReviews: (id) => api.get(`/users/${id}/reviews`),
};

// ── Articles ──────────────────────────────────────────────────────────────────
// GET    /api/articles
// GET    /api/articles/search?q=
// GET    /api/articles/:id
// POST   /api/articles
// PUT    /api/articles/:id
// DELETE /api/articles/:id
export const articleAPI = {
  getAll: () => api.get("/articles"),
  search: (q) => api.get("/articles/search", { params: { q } }),
  getById: (id) => api.get(`/articles/${id}`),
  create: (data) => api.post("/articles", data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
};

// ── Authors ───────────────────────────────────────────────────────────────────
// GET    /api/authors
// GET    /api/authors/:id
// POST   /api/authors
// PUT    /api/authors/:id
// DELETE /api/authors/:id
export const authorAPI = {
  getAll: () => api.get("/authors"),
  getById: (id) => api.get(`/authors/${id}`),
  create: (data) => api.post("/authors", data),
  update: (id, data) => api.put(`/authors/${id}`, data),
  delete: (id) => api.delete(`/authors/${id}`),
};

// ── Journals ──────────────────────────────────────────────────────────────────
export const journalAPI = {
  getAll: () => api.get("/journals"),
  getById: (id) => api.get(`/journals/${id}`),
  create: (data) => api.post("/journals", data),
  update: (id, data) => api.put(`/journals/${id}`, data),
  delete: (id) => api.delete(`/journals/${id}`),
};

// ── Conferences ───────────────────────────────────────────────────────────────
export const conferenceAPI = {
  getAll: () => api.get("/conferences"),
  getById: (id) => api.get(`/conferences/${id}`),
  create: (data) => api.post("/conferences", data),
  update: (id, data) => api.put(`/conferences/${id}`, data),
  delete: (id) => api.delete(`/conferences/${id}`),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewAPI = {
  getAll: () => api.get("/reviews"),
  getByArticle: (id) => api.get(`/reviews/article/${id}`),
  getStatsByArticle: (id) => api.get(`/reviews/article/${id}/stats`),
  create: (data) => api.post("/reviews", data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// ── Citations ─────────────────────────────────────────────────────────────────
export const citationAPI = {
  getByArticle: (id) => api.get(`/citations/article/${id}`),
  getCitedBy: (id) => api.get(`/citations/cited-by/${id}`),
  getNetwork: (id) => api.get(`/citations/network/${id}`),
  getStats: () => api.get("/citations/stats"),
  create: (data) => api.post("/citations", data),
  delete: (id) => api.delete(`/citations/${id}`),
};

// ── Stats ─────────────────────────────────────────────────────────────────────
export const statsAPI = {
  getOverview: () => api.get("/stats"),
  getArticles: () => api.get("/stats/articles"),
  getAuthors: () => api.get("/stats/authors"),
  getReviewers: () => api.get("/stats/reviewers"),
  getKeywords: () => api.get("/stats/keywords"),
};
