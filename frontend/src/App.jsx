import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import useAuthStore from "./store/useAuthStore";
import useCartStore from "./store/useCartStore";

// Pages
import HomePage from "./pages/HomePage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyOTPPage from "./pages/VerifyOTPPage";
import ProfilePage from "./pages/ProfilePage";
import CartPage from "./pages/CartPage";
import AdminDashboard from "./pages/AdminDashboard";
import CourseBuilder from "./pages/CourseBuilder";
import LearnPage from "./pages/LearnPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { OAuthSuccessPage } from "./pages/OAuthSuccessPage";
import NotFoundPage from "./pages/NotFoundPage";

// Layout
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Protected route wrappers
const ProtectedRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (user) return <Navigate to="/" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { token, fetchMe, user } = useAuthStore();
  const { fetchCart } = useCartStore();
  const fetchedRef = useRef(false);

  // Restore session on load — useRef guard prevents React StrictMode double-fire
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (token) fetchMe();
  }, []);

  // Sync cart once logged in
  useEffect(() => {
    if (user) fetchCart();
  }, [user?._id]);

  return (
    <Routes>
      {/* ── Admin — full-screen, no Navbar/Footer ── */}
      <Route path="/admin/*" element={
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      } />

      {/* ── Course Builder — full-screen, admin/instructor ── */}
      <Route path="/builder/:id" element={
        <AdminRoute>
          <CourseBuilder />
        </AdminRoute>
      } />

      {/* ── Learn page — full-screen, enrolled students ── */}
      <Route path="/learn/:id" element={
        <ProtectedRoute>
          <LearnPage />
        </ProtectedRoute>
      } />

      {/* ── Public / Student routes — with Navbar + Footer ── */}
      <Route path="/*" element={
        <div className="min-h-screen bg-bg flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:slug" element={<CourseDetailPage />} />

              {/* Auth routes — redirect if already logged in */}
              <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
              <Route path="/verify-otp" element={<VerifyOTPPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/oauth-success" element={<OAuthSuccessPage />} />

              {/* Protected routes */}
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      } />
    </Routes>
  );
}
