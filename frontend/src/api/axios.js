import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ── Request: attach token from localStorage if present ─────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: handle auth errors globally ─────────────────────────────────
// On 401: only clear the stored token — don't force-redirect.
// The auth store's fetchMe + route guards (ProtectedRoute) handle redirects
// gracefully without triggering a logout toast.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      // Remove token from zustand persisted store too
      try {
        const raw = localStorage.getItem("codelearn-auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.state.token = null;
          localStorage.setItem("codelearn-auth", JSON.stringify(parsed));
        }
      } catch (_) {}
    }
    return Promise.reject(err);
  }
);

export default api;
