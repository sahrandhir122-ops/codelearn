import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cartAPI } from "../api";
import toast from "react-hot-toast";

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],        // { course: { _id, title, price, … }, addedAt }
      count: 0,
      totalPrice: 0,
      isLoading: false,

      // ── Fetch cart from server ─────────────────────────────────────────
      fetchCart: async () => {
        set({ isLoading: true });
        try {
          const { data } = await cartAPI.getCart();
          set({
            items: data.data.items,
            count: data.data.count,
            totalPrice: data.data.totalPrice,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      // ── Add course to cart ─────────────────────────────────────────────
      addToCart: async (course) => {
        // Optimistic local update — use .toString() so ObjectId and string IDs compare correctly
        const already = get().items.some(
          (item) => (item.course?._id || item.course)?.toString() === course._id?.toString()
        );
        if (already) {
          toast.error("Already in cart");
          return false;
        }

        set((state) => ({
          items: [...state.items, { course, addedAt: new Date() }],
          count: state.count + 1,
          totalPrice: state.totalPrice + (course.price || 0),
        }));

        try {
          await cartAPI.addToCart(course._id);
          toast.success(`"${course.title}" added to cart! 🛒`);
          return true;
        } catch (err) {
          // Rollback on error
          set((state) => ({
            items: state.items.filter(
              (item) => (item.course?._id || item.course) !== course._id
            ),
            count: Math.max(0, state.count - 1),
            totalPrice: Math.max(0, state.totalPrice - (course.price || 0)),
          }));
          toast.error(err.response?.data?.message || "Failed to add to cart");
          return false;
        }
      },

      // ── Remove course from cart ────────────────────────────────────────
      removeFromCart: async (courseId) => {
        // Use .toString() for reliable ObjectId / string comparison
        const item = get().items.find(
          (i) => (i.course?._id || i.course)?.toString() === courseId?.toString()
        );
        const price = item?.course?.price || 0;

        set((state) => ({
          items: state.items.filter(
            (i) => (i.course?._id || i.course)?.toString() !== courseId?.toString()
          ),
          count: Math.max(0, state.count - 1),
          totalPrice: Math.max(0, state.totalPrice - price),
        }));

        try {
          await cartAPI.removeFromCart(courseId);
        } catch (err) {
          // Refresh from server on error
          get().fetchCart();
          toast.error("Failed to remove from cart");
        }
      },

      // ── Clear all ──────────────────────────────────────────────────────
      clearCart: async () => {
        set({ items: [], count: 0, totalPrice: 0 });
        try {
          await cartAPI.clearCart();
        } catch {
          /* non-fatal */
        }
      },

      // ── Local clear (after logout) ─────────────────────────────────────
      resetCart: () => set({ items: [], count: 0, totalPrice: 0 }),

      // ── Check if a course is in cart ───────────────────────────────────
      isInCart: (courseId) =>
        get().items.some(
          (item) => (item.course?._id || item.course)?.toString() === courseId?.toString()
        ),
    }),
    {
      name: "codelearn-cart",
      partialize: (state) => ({
        items: state.items,
        count: state.count,
        totalPrice: state.totalPrice,
      }),
    }
  )
);

export default useCartStore;
