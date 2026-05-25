// OAuthSuccessPage.jsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import toast from "react-hot-toast";
import Loader from "../components/Loader";

export function OAuthSuccessPage() {
  const navigate = useNavigate();
  const { setToken, fetchMe } = useAuthStore();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Use window.location directly — avoids React Router nested-Routes quirks
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      // Backend might not have been restarted yet — fall back to
      // fetching with the httpOnly cookie (might work if same-origin)
      fetchMe().then(() => {
        const user = useAuthStore.getState().user;
        if (user) {
          toast.success(`Welcome, ${user.name}! 👋`);
          navigate("/", { replace: true });
        } else {
          toast.error("Sign-in failed. Please restart the backend server and try again.");
          navigate("/login", { replace: true });
        }
      });
      return;
    }

    // Store token exactly like a normal email/password login
    setToken(token);

    fetchMe().then(() => {
      const user = useAuthStore.getState().user;
      if (user) {
        toast.success(`Welcome, ${user.name}! 👋`);
        // Replace history so browser back button skips the ?token= URL
        navigate("/", { replace: true });
      } else {
        toast.error("Sign-in failed. Please try again.");
        navigate("/login", { replace: true });
      }
    });
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <Loader text="Completing sign-in…" />
    </div>
  );
}
