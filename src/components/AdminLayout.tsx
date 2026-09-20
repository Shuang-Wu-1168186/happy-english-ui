import { useLayoutEffect, useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

const navigation = [
  { to: "/admin", label: "概览", icon: LayoutDashboard, end: true },
  { to: "/admin/content", label: "内容管理", icon: BookOpen },
  { to: "/admin/users", label: "用户管理", icon: Users },
  { to: "/admin/login-monitor", label: "登录监控", icon: ShieldCheck },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const pageTitle =
    navigation.find(
      (item) =>
        pathname === item.to ||
        (item.to !== "/admin" && pathname.startsWith(`${item.to}/`)),
    )?.label || "管理中心";

  useLayoutEffect(() => {
    const previousClassName = document.body.className;
    const previousLanguage = document.documentElement.lang;
    document.body.className = "admin-app";
    document.documentElement.lang = "zh-CN";
    return () => {
      document.body.className = previousClassName;
      document.documentElement.lang = previousLanguage;
    };
  }, []);

  return (
    <div className="account-ui admin-shell">
      <button
        aria-label="关闭后台导航"
        className={`admin-nav-overlay${open ? " is-open" : ""}`}
        onClick={() => setOpen(false)}
        type="button"
      />
      <aside
        aria-label="后台导航"
        className={`admin-sidebar${open ? " is-open" : ""}`}
      >
        <div className="admin-sidebar-top">
          <Link
            className="admin-brand"
            to="/admin"
            onClick={() => setOpen(false)}
          >
            <span className="admin-brand-mark" aria-hidden="true">
              H
            </span>
            <span>
              <strong>HappyEnglish</strong>
              <small>后台管理</small>
            </span>
          </Link>
          <button
            aria-label="关闭后台导航"
            className="admin-sidebar-close"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <nav aria-label="后台菜单" className="admin-nav">
          <p className="admin-nav-label">工作空间</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                className={({ isActive }) =>
                  `admin-nav-link${isActive ? " is-active" : ""}`
                }
                end={item.end}
                key={item.to}
                onClick={() => setOpen(false)}
                to={item.to}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={2.25} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-summary">
            <span className="admin-user-avatar" aria-hidden="true">
              {(user?.full_name || user?.username || "A").slice(0, 1)}
            </span>
            <span>
              <strong>{user?.full_name || user?.username}</strong>
              <small>管理员</small>
            </span>
          </div>
          <Link
            className="admin-learning-link"
            to="/"
            onClick={() => setOpen(false)}
          >
            返回学习端
          </Link>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <button
              aria-expanded={open}
              aria-label="Toggle admin navigation"
              className="admin-menu-toggle"
              onClick={() => setOpen(true)}
              type="button"
            >
              <Menu aria-hidden="true" size={21} />
            </button>
            <div>
              <p>后台管理</p>
              <span className="admin-topbar-page-title">{pageTitle}</span>
            </div>
          </div>
          <div className="admin-topbar-actions">
            <Link className="admin-view-learning" to="/">
              查看学习端
            </Link>
            <button
              className="admin-logout"
              onClick={() => logout().catch((e) => setError(e.message))}
              type="button"
            >
              <LogOut aria-hidden="true" size={17} />
              <span>退出</span>
            </button>
          </div>
        </header>
        {error && (
          <p className="admin-session-error" role="alert">
            {error}
          </p>
        )}
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
