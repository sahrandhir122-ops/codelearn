import { create } from "zustand";
import { persist } from "zustand/middleware";

const useWishlistStore = create(
  persist(
    (set, get) => ({
      wishlist: [], // array of full course objects (stored locally)

      toggle: (course) => {
        const isIn = get().wishlist.some((c) => c._id === course._id);
        if (isIn) {
          set((s) => ({ wishlist: s.wishlist.filter((c) => c._id !== course._id) }));
          return false; // removed
        } else {
          set((s) => ({ wishlist: [...s.wishlist, course] }));
          return true; // added
        }
      },

      isWishlisted: (courseId) =>
        get().wishlist.some((c) => c._id === courseId),

      remove: (courseId) =>
        set((s) => ({ wishlist: s.wishlist.filter((c) => c._id !== courseId) })),

      clear: () => set({ wishlist: [] }),
    }),
    { name: "codelearn-wishlist" }
  )
);

export default useWishlistStore;
