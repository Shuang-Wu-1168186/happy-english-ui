import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { useAuth } from "./lib/auth-context";
import { Layout } from "./components/Layout";
import { LegacyRoute } from "./components/LegacyRoute";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Learning, Detail } from "./pages/Learning";
import { Profile } from "./pages/Profile";
import { Manage } from "./pages/Manage";
import { Users } from "./pages/Users";
import { LoginMonitor } from "./pages/LoginMonitor";
import { AdminLayout } from "./components/AdminLayout";
import { AdminDashboard } from "./pages/AdminDashboard";

function Protected({ admin = false }: { admin?: boolean }) {
  const { user, loading, error } = useAuth();
  if (loading) return <div className="empty">正在打开学习空间…</div>;
  if (error)
    return (
      <div className="empty">
        <p role="alert" className="error">
          {error}
        </p>
        <button onClick={() => window.location.reload()}>重新连接</button>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}

function RedirectWithSearch({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate replace to={`${to}${search}`} />;
}

function UserEditRedirect() {
  const { id } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (id) params.set("id", id);
  return <Navigate replace to={`/admin/users?${params.toString()}`} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route element={<Protected />}>
            <Route path="english/*" element={<LegacyRoute />} />
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="learn/:resource" element={<Learning />} />
              <Route path="learn/:resource/:id" element={<Detail />} />
              <Route path="profile" element={<Profile />} />
              <Route path="change-password" element={<Profile />} />
              <Route element={<Protected admin />}>
                <Route
                  path="manage"
                  element={<RedirectWithSearch to="/admin/content" />}
                />
                <Route
                  path="users"
                  element={<RedirectWithSearch to="/admin/users" />}
                />
                <Route
                  path="login-monitor"
                  element={<RedirectWithSearch to="/admin/login-monitor" />}
                />
              </Route>
              <Route
                path="*"
                element={
                  <div className="empty">
                    <h1>找不到这个页面</h1>
                    <Link to="/">返回学习首页</Link>
                  </div>
                }
              />
            </Route>
            <Route element={<Protected admin />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="content" element={<Manage />} />
                <Route path="users" element={<Users />} />
                <Route
                  path="users/create"
                  element={<Navigate replace to="/admin/users?create=1" />}
                />
                <Route path="users/:id/edit" element={<UserEditRedirect />} />
                <Route path="login-monitor" element={<LoginMonitor />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
