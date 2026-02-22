import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("kv_user") || "null"),
  token: localStorage.getItem("kv_token") || null,

  setAuth: (user, token) => {
    localStorage.setItem("kv_token", token);
    localStorage.setItem("kv_user", JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem("kv_token");
    localStorage.removeItem("kv_user");
    set({ user: null, token: null });
  },

  isAuthenticated: () => !!localStorage.getItem("kv_token"),
}));

export default useAuthStore;
