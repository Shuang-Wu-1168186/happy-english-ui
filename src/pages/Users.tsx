import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { User } from "../lib/api";

const roles = ["learner", "premium_learner", "volunteer", "leader", "admin"];
const roleLabels: Record<string, string> = {
  learner: "学习者",
  premium_learner: "高级学习者",
  volunteer: "志愿者",
  leader: "负责人",
  admin: "管理员",
};

function initial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "U";
}

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
      .then((data) => {
        if (!active) return;
        setUsers(data.items);
        setPages(data.total_pages);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [page, q, role, status, version]);

  const listedUser = users.find((user) => String(user.id) === id);
  useEffect(() => {
    if (!id || listedUser) return;
    let active = true;
    async function loadUser() {
      let currentPage = 1;
      while (active) {
        const result = await api<{ items: User[]; total_pages: number }>(
          `/admin/users?page=${currentPage}`,
        );
        const user = result.items.find((item) => String(item.id) === id);
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
  const activeUsers = users.filter((user) => user.status === "active").length;
  const presentRoles = new Set(users.map((user) => user.role)).size;

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
      setVersion((value) => value + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(user: User) {
    const next = user.status === "active" ? "inactive" : "active";
    if (
      !confirm(
        next === "active" ? "Activate this user?" : "Deactivate this user?",
      )
    )
      return;
    try {
      await api(`/admin/users/${user.id}`, "PUT", {
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        contact_number: user.contact_number,
        home_address: user.home_address,
        role: user.role,
        status: next,
      });
      setVersion((value) => value + 1);
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
      <section
        className="container py-5 admin-user-form-page"
        style={{ maxWidth: 760 }}
      >
        <div className="admin-form-page-header">
          <div>
            <p className="admin-list-eyebrow">用户与权限</p>
            <h1>{creating ? "新建用户" : "编辑用户"}</h1>
            <p>
              {creating
                ? "创建账号，并设置初始角色和账户状态。"
                : `正在编辑用户 #${id}，可更新资料、角色和状态；不修改密码。`}
            </p>
          </div>
          <Link
            className="admin-action-button admin-action-secondary"
            to="/admin/users"
          >
            返回用户列表
          </Link>
        </div>
        <div className="card shadow-sm admin-form-card">
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
                    {roles.map((item) => (
                      <option key={item}>{item}</option>
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
    <section className="container py-5 admin-list-page admin-users-page">
      <div className="container py-4 admin-list-content">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <header className="admin-list-header">
          <div className="admin-list-copy">
            <p className="admin-list-eyebrow">用户与权限</p>
            <h1>用户管理</h1>
            <p>搜索账号、维护角色，并快速调整用户的访问状态。</p>
          </div>
          <div className="admin-list-actions">
            <Link
              className="admin-action-button admin-action-secondary"
              to="/admin/login-monitor"
            >
              登录监控
            </Link>
            <Link
              className="admin-action-button admin-action-primary"
              to="/admin/users?create=1"
            >
              新建用户
            </Link>
            <Link
              className="admin-action-button admin-action-quiet"
              to="/admin"
            >
              后台概览
            </Link>
          </div>
        </header>

        <section className="admin-list-metrics" aria-label="当前页用户统计">
          <div className="admin-list-metric">
            <span>当前页用户</span>
            <strong>{users.length}</strong>
            <small>位账户</small>
          </div>
          <div className="admin-list-metric">
            <span>活跃账户</span>
            <strong>{activeUsers}</strong>
            <small>可正常登录</small>
          </div>
          <div className="admin-list-metric">
            <span>当前角色</span>
            <strong>{presentRoles}</strong>
            <small>种角色类型</small>
          </div>
        </section>

        <div className="card shadow-sm admin-filter-panel">
          <div className="card-body">
            <div className="admin-filter-panel-title">
              <div>
                <p>筛选用户</p>
                <span>按账号信息、角色或状态缩小列表范围。</span>
              </div>
            </div>
            <form
              className="row g-3 admin-filter-form"
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
                  搜索姓名、用户名或邮箱
                </label>
                <input
                  className="form-control"
                  id="q"
                  name="q"
                  placeholder="例如 Mia Chen"
                  defaultValue={q}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="role-filter">
                  角色
                </label>
                <select
                  className="form-select"
                  id="role-filter"
                  name="role"
                  defaultValue={role}
                >
                  <option value="">全部角色</option>
                  {roles.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="status-filter">
                  账户状态
                </label>
                <select
                  className="form-select"
                  id="status-filter"
                  name="status"
                  defaultValue={status}
                >
                  <option value="">全部状态</option>
                  <option>active</option>
                  <option>inactive</option>
                </select>
              </div>
              <div className="col-md-1 d-flex align-items-end">
                <button className="admin-filter-submit w-100">查询</button>
              </div>
              <div className="col-12">
                <Link className="admin-filter-reset" to="/admin/users">
                  重置筛选条件
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="card shadow-sm admin-data-card">
          <div className="card-header admin-data-card-head">
            <div>
              <p>账户目录</p>
              <h2>用户列表</h2>
            </div>
            <div className="admin-data-card-meta">
              <strong>{users.length}</strong>
              <span>
                当前页 · 第 {page} / {pages} 页
              </span>
            </div>
          </div>
          <div className="card-body p-0">
            {users.length ? (
              <div className="table-responsive">
                <table className="table admin-data-table admin-users-table mb-0">
                  <thead>
                    <tr>
                      {[
                        "编号",
                        "用户",
                        "邮箱",
                        "用户名",
                        "角色",
                        "状态",
                        "操作",
                      ].map((label) => (
                        <th
                          key={label}
                          className={label === "操作" ? "text-end" : ""}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="admin-table-id" data-label="编号">
                          #{user.id}
                        </td>
                        <td
                          className="admin-table-person-cell"
                          data-label="用户"
                        >
                          <div className="admin-person">
                            <span
                              className="admin-list-avatar"
                              aria-hidden="true"
                            >
                              {initial(user.full_name || user.username)}
                            </span>
                            <span>
                              <strong>{user.full_name || user.username}</strong>
                              <small>
                                {user.contact_number || "未填写联系电话"}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td className="admin-table-email" data-label="邮箱">
                          {user.email || "未填写"}
                        </td>
                        <td className="admin-table-handle" data-label="用户名">
                          {user.username}
                        </td>
                        <td data-label="角色">
                          <span className="admin-role-chip">
                            {roleLabels[user.role] || user.role}
                          </span>
                        </td>
                        <td data-label="状态">
                          <span
                            className={`admin-status-pill ${user.status === "active" ? "is-active" : "is-inactive"}`}
                          >
                            {user.status === "active" ? "正常" : "已停用"}
                          </span>
                        </td>
                        <td
                          className="admin-table-actions-cell"
                          data-label="操作"
                        >
                          <div className="admin-table-actions">
                            <button
                              className="admin-table-button"
                              onClick={() =>
                                setParams({
                                  ...Object.fromEntries(params),
                                  id: String(user.id),
                                })
                              }
                              type="button"
                            >
                              编辑
                            </button>
                            <button
                              className={`admin-table-button ${user.status === "active" ? "is-warning" : "is-positive"}`}
                              onClick={() => toggle(user)}
                              type="button"
                            >
                              {user.status === "active" ? "停用" : "启用"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">
                <strong>没有匹配的用户</strong>
                <span>调整筛选条件，或重置后重新查看全部用户。</span>
              </div>
            )}
          </div>
        </div>

        {pages > 1 && (
          <nav className="admin-pagination" aria-label="用户分页">
            <ul className="pagination">
              {[
                page - 1,
                ...Array.from(
                  { length: Math.min(5, pages) },
                  (_, index) => Math.max(1, page - 2) + index,
                ).filter((number) => number <= pages),
                page + 1,
              ].map((number, index, all) => (
                <li
                  className={`page-item${(index === 0 ? number < 1 : index === all.length - 1 ? number > pages : false) ? " disabled" : number === page ? " active" : ""}`}
                  key={index}
                >
                  <button
                    className="page-link"
                    disabled={number < 1 || number > pages}
                    onClick={() =>
                      setParams({
                        ...Object.fromEntries(params),
                        page: String(number),
                      })
                    }
                  >
                    {index === 0
                      ? "上一页"
                      : index === all.length - 1
                        ? "下一页"
                        : number}
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
