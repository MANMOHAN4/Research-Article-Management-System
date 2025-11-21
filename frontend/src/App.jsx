import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import DashboardLayout from "./layouts/DashboardLayout";

// Auth pages
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";

// Protected pages
import Dashboard from "./pages/Dashboard/Dashboard";
import ArticleList from "./pages/Articles/ArticleList";
import ArticleDetail from "./pages/Articles/ArticleDetail";
import ArticleForm from "./pages/Articles/ArticleForm";
import AuthorList from "./pages/Authors/AuthorList";
import AuthorDetail from "./pages/Authors/AuthorDetail";
import JournalList from "./pages/Journals/JournalList";
import ConferenceList from "./pages/Conferences/ConferenceList";
import UserList from "./pages/Users/UserList";

// Guards
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Admin";
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* Protected */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Articles */}
        <Route path="/articles" element={<ArticleList />} />
        <Route path="/articles/new" element={<ArticleForm />} />
        <Route path="/articles/:id" element={<ArticleDetail />} />
        <Route path="/articles/:id/edit" element={<ArticleForm />} />

        {/* Authors */}
        <Route path="/authors" element={<AuthorList />} />
        <Route path="/authors/:id" element={<AuthorDetail />} />

        {/* Journals */}
        <Route path="/journals" element={<JournalList />} />

        {/* Conferences */}
        <Route path="/conferences" element={<ConferenceList />} />

        {/* Users (Admin only) */}
        <Route
          path="/users"
          element={
            <AdminRoute>
              <UserList />
            </AdminRoute>
          }
        />
      </Route>

      {/* Defaults */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
