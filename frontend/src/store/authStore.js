import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      // Matches backend login/signup response shape exactly:
      // { userId, username, email, affiliation, orcid, role,
      //   hasAuthorProfile, hasReviewerProfile, authorId, reviewerId }
      user: null,

      setAuth: (userData) => set({ user: userData }),
      logout: () => set({ user: null }),

      // Convenience updater after profile edits
      updateUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),
    }),
    {
      name: "ram-auth", // localStorage key
      partialize: (s) => ({ user: s.user }), // only persist user, not actions
    },
  ),
);
