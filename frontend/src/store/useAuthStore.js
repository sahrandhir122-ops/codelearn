import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI } from "../api";
import toast from "react-hot-toast";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      setUser: (user) => set({ user }),

      setToken: (token) => {
        if (token) localStorage.setItem("token", token);
        else localStorage.removeItem("token");
        set({ token });
      },

      // ── Login ────────────────────────────────────────────────────────
      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.login(credentials);
          get().setToken(data.token);
          set({ user: data.data.user, isLoading: false });
          toast.success(`Welcome back, ${data.data.user.name}! 👋`);
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return {
            success: false,
            message: err.response?.data?.message || "Login failed. Check your credentials.",
          };
        }
      },

      // ── Register ─────────────────────────────────────────────────────
      register: async (formData) => {
        set({ isLoading: true });
        try {
          await authAPI.register(formData);
          set({ isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return {
            success: false,
            message: err.response?.data?.message || "Registration failed. Try again.",
          };
        }
      },

      // ── Verify OTP ───────────────────────────────────────────────────
      verifyOTP: async (email, otp) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.verifyOTP({ email, otp });
          get().setToken(data.token);
          set({ user: data.data.user, isLoading: false });
          toast.success("Email verified! Welcome to CodeLearn 🎉");
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return {
            success: false,
            message: err.response?.data?.message || "OTP verification failed.",
          };
        }
      },

      // ── Logout ───────────────────────────────────────────────────────
      logout: async () => {
        try {
          await authAPI.logout();
        } catch (_) {
          /* ignore */
        }
        get().setToken(null);
        set({ user: null });

        // Clear cart from localStorage
        try {
          const { default: useCartStore } = await import("./useCartStore");
          useCartStore.getState().resetCart();
        } catch (_) {}

        toast.success("Signed out successfully.");
      },

      // ── Fetch /me ─────────────────────────────────────────────────────
      // Silently clears session on failure — does NOT show a toast.
      // logout() is the explicit "user clicked sign out" action.
      fetchMe: async () => {
        try {
          const { data } = await authAPI.getMe();
          set({ user: data.data.user });
        } catch (_) {
          // Clear state silently — route guards will redirect as needed
          get().setToken(null);
          set({ user: null });
        }
      },

      // ── Enroll (local update after payment) ───────────────────────────
      enrollCourse: (courseId) => {
        set((state) => {
          const existing = state.user?.enrolledCourses || [];
          // Avoid duplicates
          const already = existing.some(
            (id) => (id?._id || id)?.toString() === courseId?.toString()
          );
          if (already) return state;
          return {
            user: {
              ...state.user,
              enrolledCourses: [...existing, courseId],
            },
          };
        });
      },
    }),
    {
      name: "codelearn-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

export default useAuthStore;
