import { create } from "zustand";

export const useToastStore = create((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    setTimeout(() => get().removeToast(id), 5000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
