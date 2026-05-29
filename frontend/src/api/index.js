import api from "./axios";

// ── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  verifyOTP: (data) => api.post("/auth/verify-otp", data),
  resendOTP: (data) => api.post("/auth/resend-otp", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (data) => api.post("/auth/reset-password", data),
};

// ── Courses ────────────────────────────────────────────────────────────────
export const courseAPI = {
  getAll:        (params)    => api.get("/courses", { params }),
  getBySlug:     (slug)      => api.get(`/courses/${slug}`),
  create:        (data)      => api.post("/courses", data),
  update:        (id, data)  => api.put(`/courses/${id}`, data),
  delete:        (id)        => api.delete(`/courses/${id}`),
  togglePublish: (id)        => api.post(`/courses/${id}/publish`),
  getLectures:   (id)        => api.get(`/courses/${id}/lectures`),
  addReview:     (id, data)  => api.post(`/courses/${id}/review`, data),

  // ── Course Builder ──────────────────────────────────────────────────────
  getBuilder:     (id)              => api.get(`/courses/${id}/builder`),

  // Sections
  addSection:    (id, data)         => api.post(`/courses/${id}/sections`, data),
  updateSection: (id, sid, data)    => api.put(`/courses/${id}/sections/${sid}`, data),
  deleteSection: (id, sid)          => api.delete(`/courses/${id}/sections/${sid}`),

  // Lectures
  addLecture:    (id, sid, data)         => api.post(`/courses/${id}/sections/${sid}/lectures`, data),
  updateLecture: (id, sid, lid, data)    => api.put(`/courses/${id}/sections/${sid}/lectures/${lid}`, data),
  deleteLecture: (id, sid, lid)          => api.delete(`/courses/${id}/sections/${sid}/lectures/${lid}`),

  // Resources (ZIP / PDF / etc.)
  addResource:    (id, sid, lid, data)        => api.post(`/courses/${id}/sections/${sid}/lectures/${lid}/resources`, data),
  deleteResource: (id, sid, lid, rid)         => api.delete(`/courses/${id}/sections/${sid}/lectures/${lid}/resources/${rid}`),
};

// ── Upload ─────────────────────────────────────────────────────────────────
export const uploadAPI = {
  video: (formData, onProgress) =>
    api.post("/upload/video", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }),
  thumbnail: (formData) =>
    api.post("/upload/thumbnail", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  resource: (formData, onProgress) =>
    api.post("/upload/resource", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }),
  deleteVideo: (filename) => api.delete(`/upload/video/${filename}`),
};

// ── Cart ───────────────────────────────────────────────────────────────────
export const cartAPI = {
  getCart: () => api.get("/cart"),
  addToCart: (courseId) => api.post("/cart/add", { courseId }),
  removeFromCart: (courseId) => api.delete(`/cart/remove/${courseId}`),
  clearCart: () => api.delete("/cart/clear"),
};

// ── Payments ───────────────────────────────────────────────────────────────
export const paymentAPI = {
  createOrder: (courseId) => api.post("/payments/create-order", { courseId }),
  cartCheckout: (courseIds) => api.post("/payments/cart-checkout", { courseIds }),
  verify: (data) => api.post("/payments/verify", data),
  getHistory: () => api.get("/payments/history"),
  getAllAdmin: (params) => api.get("/payments/admin/all", { params }),
};

// ── Users ──────────────────────────────────────────────────────────────────
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data) => api.put("/users/profile", data),
  changePassword: (data) => api.post("/users/change-password", data),
  getWatchHistory: () => api.get("/users/watch-history"),
  updateWatchHistory: (data) => api.post("/users/watch-history", data),
  getEnrolledCourses: () => api.get("/users/enrolled-courses"),
};

// ── Comments ───────────────────────────────────────────────────────────────
export const commentAPI = {
  getByCourse: (courseId, params) => api.get(`/comments/${courseId}`, { params }),
  post: (courseId, data) => api.post(`/comments/${courseId}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
  moderate: (id, data) => api.put(`/comments/${id}/moderate`, data),
  toggleLike: (id) => api.post(`/comments/${id}/like`),
};

// ── Admin ──────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get("/admin/stats"),
  getUsers: (params) => api.get("/admin/users", { params }),
  getCourses: (params) => api.get("/admin/courses", { params }),
  changeUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getPendingComments: () => api.get("/admin/comments/pending"),
  getDailyRevenue: () => api.get("/admin/revenue/daily"),
  getMonthlyRevenue: () => api.get("/admin/revenue/monthly"),
  getYearlyRevenue: () => api.get("/admin/revenue/yearly"),
  getAllTransactions: (params) => api.get("/payments/admin/all", { params }),
  // Reviews
  getReviews: () => api.get("/admin/reviews"),
  deleteReview: (courseId, reviewId) => api.delete(`/admin/reviews/${courseId}/${reviewId}`),
  // Announcements
  sendAnnouncement: (data) => api.post("/admin/announcements", data),
  // Free-access grants
  getUserEnrollments: (id)             => api.get(`/admin/users/${id}/enrollments`),
  grantCourseAccess:  (id, courseId)   => api.post(`/admin/users/${id}/grant-access`, { courseId }),
  revokeCourseAccess: (id, courseId)   => api.delete(`/admin/users/${id}/revoke-access/${courseId}`),
};

// ── Support (AI chat) ──────────────────────────────────────────────────────
export const supportAPI = {
  chat: (data) => api.post("/support/chat", data),
};

// ── Coupons ────────────────────────────────────────────────────────────────
export const couponAPI = {
  getAll:   ()          => api.get("/coupons"),
  create:   (data)      => api.post("/coupons", data),
  update:   (id, data)  => api.patch(`/coupons/${id}`, data),
  delete:   (id)        => api.delete(`/coupons/${id}`),
  validate: (data)      => api.post("/coupons/validate", data),
};
