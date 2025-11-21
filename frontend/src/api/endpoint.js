import api from "./axios";

// Auth
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  signup: (userData) => api.post("/auth/signup", userData),
};

// Articles
export const articleAPI = {
  getAll: () => api.get("/articles"),
  search: (query) => api.get("/articles/search", { params: { q: query } }),
  getById: (id) => api.get(`/articles/${id}`),
  create: (data) => api.post("/articles", data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
};

// Authors
export const authorAPI = {
  getAll: () => api.get("/authors"),
  getById: (id) => api.get(`/authors/${id}`),
  create: (data) => api.post("/authors", data),
  update: (id, data) => api.put(`/authors/${id}`, data),
  delete: (id) => api.delete(`/authors/${id}`),
};

// Journals
export const journalAPI = {
  getAll: () => api.get("/journals"),
  getById: (id) => api.get(`/journals/${id}`),
  create: (data) => api.post("/journals", data),
  update: (id, data) => api.put(`/journals/${id}`, data),
  delete: (id) => api.delete(`/journals/${id}`),
};

// Conferences
export const conferenceAPI = {
  getAll: () => api.get("/conferences"),
  getById: (id) => api.get(`/conferences/${id}`),
  create: (data) => api.post("/conferences", data),
  update: (id, data) => api.put(`/conferences/${id}`, data),
  delete: (id) => api.delete(`/conferences/${id}`),
};

// Reviews
export const reviewAPI = {
  create: (data) => api.post("/reviews", data),
  getAll: () => api.get("/reviews"),
  getByArticle: (articleId) => api.get(`/articles/${articleId}/reviews`),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// Reviewers
export const reviewerAPI = {
  getAll: () => api.get("/reviewers"),
  getById: (id) => api.get(`/reviewers/${id}`),
  create: (data) => api.post("/reviewers", data),
  update: (id, data) => api.put(`/reviewers/${id}`, data),
  delete: (id) => api.delete(`/reviewers/${id}`),
};

// Users
export const userAPI = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  updatePassword: (id, data) => api.put(`/users/${id}/password`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Stats
export const statsAPI = {
  getStats: () => api.get("/stats"),
  getHealth: () => api.get("/health"),
};

// Citations
export const citationAPI = {
  getByArticle: (articleId) =>
    api.get(`/citations/articles/${articleId}/citations`),
  getCitedBy: (articleId) =>
    api.get(`/citations/articles/${articleId}/cited-by`),
  getStats: () => api.get("/citations/stats"),
  create: (data) => api.post("/citations", data),
  delete: (id) => api.delete(`/citations/${id}`),
};
