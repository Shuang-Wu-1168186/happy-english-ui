import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useLayoutEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
export function HomeNavigation() {
  const { user, logout } = useAuth(),
    [error, setError] = useState("");
  return (
    <>
      <nav className="home-navbar" aria-label="Main navigation">
        <div className="home-navbar-inner">
          <Link className="home-brand" to="/">
            HappyEnglish
          </Link>
          <div className="home-navbar-actions">
            {user?.role === "admin" && (
              <>
                <Link className="logout-link home-admin-link" to="/manage">
                  管理菜单
                </Link>
                <Link
                  className="logout-link home-admin-link"
                  to="/login-monitor"
                >
                  登录监控
                </Link>
              </>
            )}
            <button
              className="logout-link"
              onClick={() => logout().catch((e) => setError(e.message))}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
export function AccountNavigation() {
  const { user, logout } = useAuth(),
    [open, setOpen] = useState(false),
    [menu, setMenu] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <nav className="navbar navbar-expand-lg happy-navbar">
        <div className="container">
          <Link className="navbar-brand fw-semibold" to="/">
            HappyEnglish
          </Link>
          <button
            className="navbar-toggler"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className={`collapse navbar-collapse${open ? " show" : ""}`}>
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {!["learner", "premium_learner"].includes(user?.role || "") && (
                <li className="nav-item">
                  <Link className="nav-link" to="/">
                    Home
                  </Link>
                </li>
              )}
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  English
                </Link>
              </li>
              {user?.role === "admin" && (
                <>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/manage">
                      Manage Cards
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/manage?resource=interviews">
                      Manage Interview Questions
                    </Link>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/users">
                      Manage Users
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/login-monitor">
                      登录监控
                    </NavLink>
                  </li>
                </>
              )}
            </ul>
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
              <li className="nav-item dropdown">
                <button
                  className="nav-link dropdown-toggle d-flex align-items-center gap-2"
                  aria-expanded={menu}
                  onClick={() => setMenu(!menu)}
                >
                  <img
                    className="nav-avatar"
                    src="/original/default.png"
                    alt="avatar"
                  />
                  <span>
                    {user?.full_name}
                    <span className="badge happy-role-badge ms-1">
                      {user?.role}
                    </span>
                  </span>
                </button>
                {menu && (
                  <ul className="dropdown-menu dropdown-menu-end show">
                    {!["learner", "premium_learner"].includes(
                      user?.role || "",
                    ) && (
                      <>
                        <li>
                          <Link
                            className="dropdown-item"
                            to="/profile"
                            onClick={() => setMenu(false)}
                          >
                            Profile
                          </Link>
                        </li>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                      </>
                    )}
                    <li>
                      <button
                        className="dropdown-item text-danger"
                        onClick={() =>
                          logout().catch((e) => setError(e.message))
                        }
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            </ul>
          </div>
        </div>
      </nav>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
export function Layout() {
  const { pathname, search } = useLocation();
  useLayoutEffect(() => {
    const resource = pathname.split("/")[2];
    const kind =
      (
        {
          "kids-cards": "kids",
          phonics: "phonics",
          textbook: "textbook",
          dialogues: "dialogue",
          "math-cards": "math",
          interviews: "interview",
          notes: pathname.split("/")[3] ? "cards study-note-detail" : "notes",
          "note-items": "cards study-note-detail",
        } as Record<string, string>
      )[resource] || "cards";
    document.documentElement.lang = ["textbook", "dialogue", "math"].includes(
      kind,
    )
      ? "zh-CN"
      : "en";
    document.body.className =
      pathname === "/"
        ? "study-home"
        : pathname.startsWith("/learn/")
          ? `study-${kind}`
          : `account-ui study-userbase${pathname === "/manage" ? (new URLSearchParams(search).get("resource") === "interviews" ? " study-interview-editor" : " study-editor") : ""}`;
    return () => {
      document.body.className = "";
    };
  }, [pathname, search]);
  if (pathname === "/" || pathname.startsWith("/learn/")) return <Outlet />;
  return (
    <div className="account-ui study-userbase">
      <AccountNavigation />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
