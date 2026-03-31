import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore.js";

import AuthLayout from "./layouts/AuthLayout.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import Toast from "./components/ui/Toast.jsx";

import Login from "./pages/Auth/Login.jsx";
import Signup from "./pages/Auth/Signup.jsx";

import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import ArticleList from "./pages/Articles/ArticleList.jsx";
import ArticleDetail from "./pages/Articles/ArticleDetail.jsx";
import ArticleForm from "./pages/Articles/ArticleForm.jsx";
import AuthorList from "./pages/Authors/AuthorList.jsx";
import AuthorDetail from "./pages/Authors/AuthorDetail.jsx";
import JournalList from "./pages/Journals/JournalList.jsx";
import ConferenceList from "./pages/Conferences/ConferenceList.jsx";
import UserList from "./pages/Users/UserList.jsx";

/* Guards unauthenticated users — checks Zustand persisted store */
function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      {/* Global toast overlay — sits above everything */}
      <Toast />

      <Routes>
        {/* ── Public: Auth pages ─────────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        {/* ── Private: Dashboard ─────────────────────── */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          <Route path="articles" element={<ArticleList />} />
          <Route path="articles/new" element={<ArticleForm />} />
          <Route path="articles/:id" element={<ArticleDetail />} />
          <Route path="articles/:id/edit" element={<ArticleForm />} />

          <Route path="authors" element={<AuthorList />} />
          <Route path="authors/:id" element={<AuthorDetail />} />

          <Route path="journals" element={<JournalList />} />
          <Route path="conferences" element={<ConferenceList />} />
          <Route path="users" element={<UserList />} />
        </Route>

        {/* ── Fallback ────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
