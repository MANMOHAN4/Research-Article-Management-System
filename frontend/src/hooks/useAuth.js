import { useAuthStore } from "../store/authStore.js";
import { authAPI } from "../api/endpoint.js";
import { useToastStore } from "../store/toastStore.js";
import { useNavigate } from "react-router-dom";

export function useAuth() {
  const { user, setAuth, logout: storeLogout, updateUser } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const login = async ({ username, password }) => {
    // Backend expects: { username, password }
    // Backend returns: { userId, username, email, affiliation, orcid, role,
    //                    hasAuthorProfile, hasReviewerProfile, authorId, reviewerId, message }
    const { data } = await authAPI.login({ username, password });
    setAuth(data);
    addToast(`Welcome back, ${data.username}!`, "success");
    navigate("/dashboard");
  };

  const signup = async ({
    username,
    password,
    email,
    affiliation,
    orcid,
    role,
  }) => {
    // Backend expects: { username, password, email, affiliation?, orcid?, role? }
    // Backend returns: same shape as login + message: "User registered successfully"
    const { data } = await authAPI.signup({
      username,
      password,
      email,
      affiliation: affiliation || null,
      orcid: orcid || null,
      role: role || "Author",
    });
    setAuth(data);
    addToast("Account created successfully!", "success");
    navigate("/dashboard");
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (_) {
      /* server-side session cleanup */
    }
    storeLogout();
    addToast("Signed out.", "info");
    navigate("/login");
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user?.userId) throw new Error("Not authenticated");
    await authAPI.changePassword(user.userId, { currentPassword, newPassword });
    addToast("Password changed successfully.", "success");
  };

  return { user, login, signup, logout, changePassword, updateUser };
}
