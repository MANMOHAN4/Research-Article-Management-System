import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { authAPI } from "@/api/endpoint";
import { useToastStore } from "@/store/toastStore";

export const useAuth = () => {
  const navigate = useNavigate();
  const { login, logout, user, isAuthenticated } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const handleLogin = async (credentials) => {
    try {
      const res = await authAPI.login(credentials);
      // Expecting backend to return { username, email, role, token? }
      login(res.data);
      addToast({ type: "success", message: "Login successful!" });
      navigate("/dashboard");
      return { success: true };
    } catch (error) {
      const message = error?.response?.data?.error || "Login failed";
      addToast({ type: "error", message });
      return { success: false, error: message };
    }
  };

  const handleSignup = async (payload) => {
    try {
      await authAPI.signup(payload);
      addToast({
        type: "success",
        message: "Registration successful! Please login.",
      });
      navigate("/login");
      return { success: true };
    } catch (error) {
      const message = error?.response?.data?.error || "Registration failed";
      addToast({ type: "error", message });
      return { success: false, error: message };
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    addToast({ type: "info", message: "Logged out successfully" });
  };

  return { handleLogin, handleSignup, handleLogout, user, isAuthenticated };
};
