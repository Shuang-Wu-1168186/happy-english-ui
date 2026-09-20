import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
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
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route element={<Protected />}>
            <Route path="english/*" element={<LegacyRoute />} />
            <Route path="admin/users/*" element={<LegacyRoute />} />
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="learn/:resource" element={<Learning />} />
              <Route path="learn/:resource/:id" element={<Detail />} />
              <Route path="profile" element={<Profile />} />
              <Route path="change-password" element={<Profile />} />
              <Route element={<Protected admin />}>
                <Route path="manage" element={<Manage />} />
                <Route path="users" element={<Users />} />
                <Route path="login-monitor" element={<LoginMonitor />} />
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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
