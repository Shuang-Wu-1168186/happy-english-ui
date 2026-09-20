import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { User } from "../lib/api";
const roles = ["learner", "premium_learner", "volunteer", "leader", "admin"];
export function Users() {
  const [params, setParams] = useSearchParams(),
    [users, setUsers] = useState<User[]>([]),
    [pages, setPages] = useState(1),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [editUser, setEditUser] = useState<{ id: string; user: User | null }>(),
    [busy, setBusy] = useState(false);
  const page = Number(params.get("page")) || 1,
    q = params.get("q") || "",
    role = params.get("role") || "",
    status = params.get("status") || "",
    id = params.get("id"),
    creating = params.has("create");
  useEffect(() => {
    let active = true;
    api<{ items: User[]; total_pages: number }>(
      `/admin/users?${new URLSearchParams({ q, role, status, page: String(page) })}`,
    )
      .then((d) => {
        if (active) {
          setUsers(d.items);
          setPages(d.total_pages);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [page, q, role, status, version]);
  const listedUser = users.find((u) => String(u.id) === id);
  useEffect(() => {
    if (!id || listedUser) return;
    let active = true;
    async function loadUser() {
      let currentPage = 1;
      while (active) {
        const result = await api<{ items: User[]; total_pages: number }>(
          `/admin/users?page=${currentPage}`,
        );
        const user = result.items.find((u) => String(u.id) === id);
        if (!active) return;
        if (user || currentPage >= result.total_pages) {
          setEditUser({ id: id!, user: user || null });
          return;
        }
        currentPage++;
      }
    }
    loadUser().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [id, listedUser]);
  const selected =
    listedUser || (editUser?.id === id ? editUser.user : undefined);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setError("");
    if (creating && data.password !== data.password2) {
      setError("Passwords do not match.");
      return;
    }
    delete data.password2;
    setBusy(true);
    try {
      await api(
        `/admin/users${selected ? `/${selected.id}` : ""}`,
        selected ? "PUT" : "POST",
        data,
      );
      setParams({});
      setVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(u: User) {
    const next = u.status === "active" ? "inactive" : "active";
    if (
      !confirm(
        next === "active" ? "Activate this user?" : "Deactivate this user?",
      )
    )
      return;
    try {
      await api(`/admin/users/${u.id}`, "PUT", {
        username: u.username,
        full_name: u.full_name,
        email: u.email,
        contact_number: u.contact_number,
        home_address: u.home_address,
        role: u.role,
        status: next,
      });
      setVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const formField = (
    key: keyof User | "password" | "password2",
    label: string,
    col = "col-md-6",
    required = false,
  ) => (
    <div className={col} key={key}>
      <label className="form-label" htmlFor={key}>
        {label}
      </label>
      <input
        className="form-control"
        id={key}
        name={key}
        type={
          key.startsWith("password")
            ? "password"
            : key === "email"
              ? "email"
              : "text"
        }
        defaultValue={String(selected?.[key as keyof User] || "")}
        required={required}
      />
    </div>
  );
  if (creating || id)
    return (
      <section className="container py-5" style={{ maxWidth: 760 }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h3 className="mb-1">{creating ? "Create User" : "Edit User"}</h3>
            <p className="text-muted mb-0">
              {creating
                ? "Create an account and set its initial role and status."
                : `Editing user ID #${id}. Update account details, role, and status. The password is unchanged.`}
            </p>
          </div>
          <Link className="btn btn-outline-secondary btn-sm" to="/admin/users">
            Back to Users
          </Link>
        </div>
        <div className="card shadow-sm">
          <div className="card-body p-4">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            {!creating && !selected ? (
              <p>
                {editUser?.id === id && !editUser.user
                  ? "User not found."
                  : "Loading…"}
              </p>
            ) : (
              <form
                className="row g-3"
                key={selected?.id || "new"}
                onSubmit={submit}
              >
                {formField("username", "Username", "col-md-6", true)}
                {formField("full_name", "Full name", "col-md-6", true)}
                {formField("email", "Email", "col-12", creating)}
                {formField(
                  "contact_number",
                  "Contact number",
                  "col-md-6",
                  creating,
                )}
                <div className="col-md-3">
                  <label className="form-label" htmlFor="role">
                    Role
                  </label>
                  <select
                    className="form-select"
                    id="role"
                    name="role"
                    defaultValue={selected?.role || "learner"}
                  >
                    {roles.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="status">
                    Status
                  </label>
                  <select
                    className="form-select"
                    id="status"
                    name="status"
                    defaultValue={selected?.status || "active"}
                  >
                    <option>active</option>
                    <option>inactive</option>
                  </select>
                </div>
                {formField("home_address", "Home address", "col-12", creating)}
                {creating && (
                  <>
                    {formField(
                      "password",
                      "Initial password",
                      "col-md-6",
                      true,
                    )}
                    {formField(
                      "password2",
                      "Confirm password",
                      "col-md-6",
                      true,
                    )}
                  </>
                )}
                <div className="col-12 d-flex gap-2 mt-2">
                  <button className="btn btn-primary" disabled={busy}>
                    {creating ? "Create User" : "Save Changes"}
                  </button>
                  <Link className="btn btn-outline-secondary" to="/admin/users">
                    Cancel
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    );
  return (
    <section className="container py-5">
      <div className="container py-4">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h3 className="mb-0">Users</h3>
          <div className="d-flex gap-2">
            <Link
              className="btn btn-outline-primary btn-sm"
              to="/admin/login-monitor"
            >
              登录监控
            </Link>
            <Link className="btn btn-primary btn-sm" to="/admin/users?create=1">
              Add User
            </Link>
            <Link className="btn btn-outline-secondary btn-sm" to="/admin">
              Back
            </Link>
          </div>
        </div>
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <form
              className="row g-3"
              onSubmit={(e) => {
                e.preventDefault();
                setParams(
                  Object.fromEntries(new FormData(e.currentTarget)) as Record<
                    string,
                    string
                  >,
                );
              }}
            >
              <div className="col-md-5">
                <label className="form-label" htmlFor="q">
                  Search (name / username / email)
                </label>
                <input
                  className="form-control"
                  id="q"
                  name="q"
                  placeholder="e.g. Mia Chen"
                  defaultValue={q}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="role-filter">
                  Role
                </label>
                <select
                  className="form-select"
                  id="role-filter"
                  name="role"
                  defaultValue={role}
                >
                  <option value="">All</option>
                  {roles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="status-filter">
                  Status
                </label>
                <select
                  className="form-select"
                  id="status-filter"
                  name="status"
                  defaultValue={status}
                >
                  <option value="">All</option>
                  <option>active</option>
                  <option>inactive</option>
                </select>
              </div>
              <div className="col-md-1 d-flex align-items-end">
                <button className="btn btn-success w-100">Go</button>
              </div>
              <div className="col-12 d-flex gap-2">
                <Link className="btn btn-outline-secondary" to="/admin/users">
                  Reset
                </Link>
              </div>
            </form>
          </div>
        </div>
        <div className="card shadow-sm">
          <div className="card-header bg-white d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="fw-semibold">All users</div>
            <div className="text-muted small">
              Page {page} of {pages}
            </div>
          </div>
          <div className="card-body p-0">
            {users.length ? (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      {[
                        ["ID", 80],
                        ["Name", 220],
                        ["Email", 220],
                        ["Username", 160],
                        ["Role", 120],
                        ["Status", 120],
                        ["Actions", 290],
                      ].map(([label, width]) => (
                        <th
                          key={label}
                          className={label === "Actions" ? "text-end" : ""}
                          style={{ minWidth: Number(width) }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="text-muted">{u.id}</td>
                        <td>
                          <div className="fw-semibold">{u.full_name}</div>
                          <div className="text-muted small">
                            {u.contact_number || "—"}
                          </div>
                        </td>
                        <td className="text-break">{u.email}</td>
                        <td>{u.username}</td>
                        <td>
                          <span className="badge text-bg-primary">
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge text-bg-${u.status === "active" ? "success" : "secondary"}`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2 align-items-center">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() =>
                                setParams({
                                  ...Object.fromEntries(params),
                                  id: String(u.id),
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              className={`btn btn-sm btn-outline-${u.status === "active" ? "danger" : "success"}`}
                              onClick={() => toggle(u)}
                            >
                              {u.status === "active"
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <div className="alert alert-info mb-0">
                  No users found. Try adjusting your filters.
                </div>
              </div>
            )}
          </div>
        </div>
        {pages > 1 && (
          <nav aria-label="Users pagination">
            <ul className="pagination justify-content-center mt-4">
              {[
                page - 1,
                ...Array.from(
                  { length: Math.min(5, pages) },
                  (_, i) => Math.max(1, page - 2) + i,
                ).filter((n) => n <= pages),
                page + 1,
              ].map((n, i, all) => (
                <li
                  className={`page-item${(i === 0 ? n < 1 : i === all.length - 1 ? n > pages : false) ? " disabled" : n === page ? " active" : ""}`}
                  key={i}
                >
                  <button
                    className="page-link"
                    disabled={n < 1 || n > pages}
                    onClick={() =>
                      setParams({
                        ...Object.fromEntries(params),
                        page: String(n),
                      })
                    }
                  >
                    {i === 0 ? "Previous" : i === all.length - 1 ? "Next" : n}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
