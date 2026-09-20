import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

type LoginAudit = {
  id: number;
  user_id: number | null;
  username: string;
  full_name: string | null;
  login_ip: string | null;
  user_agent: string | null;
  success: boolean;
  logged_in_at: string;
};

type LoginAuditPage = {
  items: LoginAudit[];
  page: number;
  total: number;
  total_pages: number;
};

function displayTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value.replace("T", " ")
    : date.toLocaleString();
}

export function LoginMonitor() {
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get("page"));
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const q = params.get("q") || "";
  const loginIp = params.get("login_ip") || "";
  const outcome = params.get("outcome") || "";
  const startDate = params.get("start_date") || "";
  const endDate = params.get("end_date") || "";
  const [records, setRecords] = useState<LoginAudit[] | null>(null);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const search = new URLSearchParams({ page: String(page) });
    for (const [key, value] of Object.entries({
      q,
      login_ip: loginIp,
      outcome,
      start_date: startDate,
      end_date: endDate,
    }))
      if (value) search.set(key, value);
    api<LoginAuditPage>(`/admin/login-audits?${search}`)
      .then((data) => {
        if (!active) return;
        setRecords(data.items);
        setPages(data.total_pages);
        setTotal(data.total);
        setError("");
      })
      .catch((e) => {
        if (active) {
          setError((e as Error).message);
          setRecords([]);
        }
      });
    return () => {
      active = false;
    };
  }, [endDate, loginIp, outcome, page, q, startDate]);

  function changePage(next: number) {
    setParams({ ...Object.fromEntries(params), page: String(next) });
  }

  return (
    <section className="container py-5">
      <div className="container py-4">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="mb-1">登录监控</h3>
            <p className="text-muted mb-0">
              查看成功和失败的登录尝试，包括来源 IP、登录时间和浏览器信息。
            </p>
          </div>
          <div className="d-flex gap-2">
            <Link className="btn btn-outline-secondary btn-sm" to="/users">
              用户管理
            </Link>
            <Link className="btn btn-outline-secondary btn-sm" to="/">
              返回首页
            </Link>
          </div>
        </div>

        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <form
              className="row g-3"
              key={params.toString()}
              onSubmit={(e) => {
                e.preventDefault();
                const values = Object.fromEntries(
                  new FormData(e.currentTarget),
                ) as Record<string, string>;
                setParams(
                  Object.fromEntries(
                    Object.entries(values).filter(([, value]) =>
                      Boolean(value),
                    ),
                  ),
                );
              }}
            >
              <div className="col-md-4">
                <label className="form-label" htmlFor="login-monitor-q">
                  账号或姓名
                </label>
                <input
                  className="form-control"
                  defaultValue={q}
                  id="login-monitor-q"
                  name="q"
                  placeholder="例如 admin_test"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="login-monitor-ip">
                  登录 IP
                </label>
                <input
                  className="form-control"
                  defaultValue={loginIp}
                  id="login-monitor-ip"
                  name="login_ip"
                  placeholder="例如 203.0.113.24"
                />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="login-monitor-outcome">
                  登录结果
                </label>
                <select
                  className="form-select"
                  defaultValue={outcome}
                  id="login-monitor-outcome"
                  name="outcome"
                >
                  <option value="">全部</option>
                  <option value="success">成功</option>
                  <option value="failed">失败</option>
                </select>
              </div>
              <div className="col-md-3 d-flex align-items-end gap-2">
                <button className="btn btn-primary flex-grow-1">查询</button>
                <Link className="btn btn-outline-secondary" to="/login-monitor">
                  重置
                </Link>
              </div>
              <div className="col-md-3">
                <label
                  className="form-label"
                  htmlFor="login-monitor-start-date"
                >
                  开始日期
                </label>
                <input
                  className="form-control"
                  defaultValue={startDate}
                  id="login-monitor-start-date"
                  name="start_date"
                  type="date"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="login-monitor-end-date">
                  结束日期
                </label>
                <input
                  className="form-control"
                  defaultValue={endDate}
                  id="login-monitor-end-date"
                  name="end_date"
                  type="date"
                />
              </div>
            </form>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-header bg-white d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span className="fw-semibold">登录记录</span>
            <span className="text-muted small">共 {total} 条</span>
          </div>
          <div className="card-body p-0">
            {records === null ? (
              <p className="p-4 mb-0" role="status">
                正在加载登录记录…
              </p>
            ) : records.length ? (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ minWidth: 80 }}>ID</th>
                      <th style={{ minWidth: 180 }}>账号</th>
                      <th style={{ minWidth: 100 }}>结果</th>
                      <th style={{ minWidth: 160 }}>登录 IP</th>
                      <th style={{ minWidth: 210 }}>登录时间</th>
                      <th style={{ minWidth: 300 }}>浏览器信息</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td className="text-muted">{record.id}</td>
                        <td>
                          <div className="fw-semibold">{record.username}</div>
                          {record.full_name && (
                            <div className="text-muted small">
                              {record.full_name}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge text-bg-${record.success ? "success" : "danger"}`}
                          >
                            {record.success ? "成功" : "失败"}
                          </span>
                        </td>
                        <td className="font-monospace">
                          {record.login_ip || "—"}
                        </td>
                        <td>{displayTime(record.logged_in_at)}</td>
                        <td>
                          <span
                            className="d-inline-block text-truncate"
                            style={{ maxWidth: 360 }}
                            title={record.user_agent || ""}
                          >
                            {record.user_agent || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <div className="alert alert-info mb-0">
                  没有匹配的登录记录。
                </div>
              </div>
            )}
          </div>
        </div>

        {pages > 1 && (
          <nav
            className="d-flex justify-content-center gap-2 mt-4"
            aria-label="登录记录分页"
          >
            <button
              className="btn btn-outline-secondary"
              disabled={page === 1}
              onClick={() => changePage(page - 1)}
            >
              上一页
            </button>
            <span className="align-self-center text-muted">
              第 {page} / {pages} 页
            </span>
            <button
              className="btn btn-outline-secondary"
              disabled={page >= pages}
              onClick={() => changePage(page + 1)}
            >
              下一页
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}
