import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
export function Profile() {
  const { user, refresh } = useAuth(),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const password = useLocation().pathname === "/change-password";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (password && data.new_password !== data.new_password2) {
      setError("Passwords do not match.");
      return;
    }
    delete data.new_password2;
    setBusy(true);
    try {
      await api(
        password ? "/profile/password" : "/profile",
        password ? "POST" : "PUT",
        data,
      );
      await refresh();
      setMessage(password ? "Password updated." : "Profile saved.");
      if (password) form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container py-5" style={{ maxWidth: password ? 520 : 900 }}>
      <div className="card shadow-sm border-0">
        <div className="card-body p-4 p-md-5">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h1 className={`h4 ${password ? "mb-3" : "mb-0"}`}>
              {password ? "Change password" : "My profile"}
            </h1>
            {!password && (
              <Link className="btn btn-outline-secondary btn-sm" to="/">
                Home
              </Link>
            )}
          </div>
          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="alert alert-success mt-3" role="status">
              {message}
            </div>
          )}
          {!password && <hr className="my-4" />}
          <form
            className={password ? "" : "row g-3"}
            onSubmit={submit}
            key={String(password)}
          >
            {password ? (
              <>
                {[
                  ["old_password", "Current password"],
                  ["new_password", "New password"],
                  ["new_password2", "Confirm new password"],
                ].map(([key, label]) => (
                  <div className="mb-3" key={key}>
                    <label className="form-label" htmlFor={key}>
                      {label}
                    </label>
                    <input
                      className="form-control"
                      id={key}
                      type="password"
                      name={key}
                      required
                      autoComplete={
                        key === "old_password"
                          ? "current-password"
                          : "new-password"
                      }
                    />
                    {key === "new_password" && (
                      <div className="form-text">
                        At least 8 chars; mix of types
                        (upper/lower/digit/symbol).
                      </div>
                    )}
                  </div>
                ))}
                <button className="btn btn-primary w-100" disabled={busy}>
                  Update password
                </button>
              </>
            ) : (
              <>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="profile-username">
                    Username (read-only)
                  </label>
                  <input
                    id="profile-username"
                    className="form-control"
                    value={user?.username || ""}
                    disabled
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="profile-role">
                    Role
                  </label>
                  <input
                    id="profile-role"
                    className="form-control"
                    value={user?.role || ""}
                    disabled
                  />
                </div>
                {(
                  [
                    ["full_name", "Full name"],
                    ["email", "Email"],
                    ["contact_number", "Contact number"],
                    ["home_address", "Home address"],
                  ] as const
                ).map(([key, label]) => (
                  <div className="col-md-6" key={key}>
                    <label className="form-label" htmlFor={key}>
                      {label}
                    </label>
                    <input
                      className="form-control"
                      id={key}
                      name={key}
                      type={key === "email" ? "email" : "text"}
                      defaultValue={user?.[key] || ""}
                      required={key === "full_name"}
                    />
                  </div>
                ))}
                <div className="col-12 d-flex gap-2 flex-wrap">
                  <button className="btn btn-primary" disabled={busy}>
                    Save profile
                  </button>
                  <Link
                    className="btn btn-outline-secondary"
                    to="/change-password"
                  >
                    Change password
                  </Link>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
