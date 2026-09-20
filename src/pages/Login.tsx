import { useLayoutEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
export function Login() {
  const auth = useAuth();
  const signup = useLocation().pathname === "/signup";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useLayoutEffect(() => {
    document.documentElement.lang = "en";
    document.body.className = "account-ui study-userbase study-login";
    return () => {
      document.body.className = "";
    };
  }, []);
  if (auth.user) return <Navigate to="/" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username")),
      password = String(form.get("password"));
    try {
      await auth.refresh();
      if (signup)
        await api("/auth/signup", "POST", {
          username,
          password,
          full_name: form.get("full_name"),
          email: form.get("email") || null,
        });
      await auth.login(username, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-ui study-userbase study-login">
      <nav className="navbar navbar-expand-lg happy-navbar">
        <div className="container">
          <Link className="navbar-brand fw-semibold" to="/">
            HappyEnglish
          </Link>
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link active" to="/login">
                Login
              </Link>
            </li>
          </ul>
        </div>
      </nav>
      <main>
        <section className="container py-5" style={{ maxWidth: 560 }}>
          <div className="card happy-card">
            <div className="happy-hero">
              <div className="d-flex align-items-start justify-content-between gap-3">
                <div>
                  <h3 className="happy-title">Happy English</h3>
                  <p className="happy-sub">
                    Log in and continue your English learning journey.
                  </p>
                </div>
                <div className="happy-badge" title="English learning">
                  📘
                </div>
              </div>
            </div>
            <div className="card-body p-4 p-md-5 happy-body">
              <div className="text-center mb-4">
                <div className="welcome-text">Welcome back</div>
                <h1 className="h4 mb-0 login-heading">
                  {signup ? "Create your account" : "Login to your account"}
                </h1>
              </div>
              {(error || auth.error) && (
                <div
                  className="alert alert-danger happy-alert d-flex align-items-start gap-2"
                  role="alert"
                >
                  <span>⚠️</span>
                  <div>{error || auth.error}</div>
                </div>
              )}
              <form className="mt-3" onSubmit={submit}>
                {signup && (
                  <>
                    <div className="mb-3 happy-input">
                      <label
                        className="form-label fw-semibold"
                        htmlFor="full_name"
                      >
                        Full name
                      </label>
                      <input
                        id="full_name"
                        name="full_name"
                        className="form-control"
                        required
                      />
                    </div>
                    <div className="mb-3 happy-input">
                      <label className="form-label fw-semibold" htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        className="form-control"
                      />
                    </div>
                  </>
                )}
                <div className="mb-3 happy-input">
                  <label className="form-label fw-semibold" htmlFor="username">
                    Username
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">👤</span>
                    <input
                      id="username"
                      type="text"
                      name="username"
                      className="form-control"
                      maxLength={50}
                      placeholder="Enter your username"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>
                <div className="mb-3 happy-input">
                  <label className="form-label fw-semibold" htmlFor="password">
                    Password
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">🔑</span>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      className="form-control"
                      placeholder="Enter your password"
                      autoComplete={
                        signup ? "new-password" : "current-password"
                      }
                      required
                    />
                  </div>
                </div>
                <button
                  className="btn happy-btn w-100 py-2"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? "Please wait…" : signup ? "Sign up" : "Login"}
                </button>
                <div className="text-center mt-4">
                  <div className="happy-tip">
                    Keep learning, one English card at a time.
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
