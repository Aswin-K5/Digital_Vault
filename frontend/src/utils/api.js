import axios from "axios";

/* ================================
   AXIOS INSTANCE
================================ */
const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

/* ================================
   REQUEST INTERCEPTOR (Attach Token)
================================ */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ================================
   RESPONSE INTERCEPTOR (Auto Logout on 401)
================================ */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("kv_token");
      localStorage.removeItem("kv_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

/* =====================================================
   AUTH APIs
===================================================== */
export const AuthAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

/* =====================================================
   NOTES APIs
===================================================== */
export const NotesAPI = {
  getAll: () => api.get("/notes/"),
  getById: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post("/notes/", data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
  getRelated: (id) => api.get(`/notes/${id}/related`),
  summarize: (id) => api.post(`/notes/${id}/summarize`),
};

/* =====================================================
   DOCUMENTS APIs
===================================================== */
export const DocumentsAPI = {
  getAll: () => api.get("/documents/"),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  delete: (id) => api.delete(`/documents/${id}`),
  rescan: (id) => api.post(`/documents/${id}/rescan`),
  download: (id) =>
    api.get(`/documents/${id}/download`, { responseType: "blob" }),
};

/* =====================================================
   SEARCH API
===================================================== */
export const SearchAPI = {
  search: (
    query,
    include_notes = true,
    include_docs = true,
    ai_boost = false,
  ) =>
    api.get("/search/", {
      params: { q: query, include_notes, include_docs, ai_boost },
    }),
};

/* =====================================================
   DASHBOARD / STATS API
===================================================== */
export const StatsAPI = {
  getStats: () => api.get("/dashboard/stats"),
};

export default api;
