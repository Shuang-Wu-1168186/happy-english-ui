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

function initial(value: string | null) {
  return (value || "访").trim().slice(0, 1).toUpperCase();
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
  const outcomeLabel =
    outcome === "success"
      ? "仅成功登录"
      : outcome === "failed"
        ? "仅失败登录"
        : "全部登录结果";
  const dateRange =
    startDate || endDate
      ? `${startDate || "最早记录"} 至 ${endDate || "今天"}`
      : "全部时间";

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
        if (!active) return;
        setError((e as Error).message);
        setRecords([]);
      });
    return () => {
      active = false;
    };
  }, [endDate, loginIp, outcome, page, q, startDate]);

  function changePage(next: number) {
    setParams({ ...Object.fromEntries(params), page: String(next) });
  }

  return (
    <section className="container py-5 admin-list-page admin-login-page">
      <div className="container py-4 admin-list-content">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <header className="admin-list-header">
          <div className="admin-list-copy">
            <p className="admin-list-eyebrow">安全审计</p>
            <h1>登录监控</h1>
            <p>查看成功和失败的登录尝试，追踪来源 IP、时间和浏览器信息。</p>
          </div>
          <div className="admin-list-actions">
            <Link
              className="admin-action-button admin-action-secondary"
              to="/admin/users"
            >
              用户管理
            </Link>
            <Link
              className="admin-action-button admin-action-quiet"
              to="/admin"
            >
              后台概览
            </Link>
          </div>
        </header>

        <section className="admin-list-metrics" aria-label="登录审计统计">
          <div className="admin-list-metric">
            <span>匹配记录</span>
            <strong>{total}</strong>
            <small>条登录审计</small>
          </div>
          <div className="admin-list-metric">
            <span>登录结果</span>
            <strong className="admin-metric-text">{outcomeLabel}</strong>
            <small>当前筛选条件</small>
          </div>
          <div className="admin-list-metric">
            <span>查询时间</span>
            <strong className="admin-metric-text">{dateRange}</strong>
            <small>按登录时间筛选</small>
          </div>
        </section>

        <div className="card shadow-sm admin-filter-panel">
          <div className="card-body">
            <div className="admin-filter-panel-title">
              <div>
                <p>筛选登录记录</p>
                <span>组合账号、IP、登录结果和日期范围进行查询。</span>
              </div>
            </div>
            <form
              className="row g-3 admin-filter-form"
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
                <button className="admin-filter-submit flex-grow-1">
                  查询
                </button>
                <Link className="admin-filter-reset" to="/admin/login-monitor">
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

        <div className="card shadow-sm admin-data-card">
          <div className="card-header admin-data-card-head">
            <div>
              <p>安全事件</p>
              <h2>登录记录</h2>
            </div>
            <div className="admin-data-card-meta">
              <strong>{total}</strong>
              <span>
                共 {total} 条 · 第 {page} / {pages} 页
              </span>
            </div>
          </div>
          <div className="card-body p-0">
            {records === null ? (
              <div className="admin-table-loading" role="status">
                正在读取登录记录…
              </div>
            ) : records.length ? (
              <div className="table-responsive">
                <table className="table admin-data-table admin-login-table mb-0">
                  <thead>
                    <tr>
                      <th>编号</th>
                      <th>账号</th>
                      <th>结果</th>
                      <th>登录 IP</th>
                      <th>登录时间</th>
                      <th>浏览器信息</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr
                        className={record.success ? "is-success" : "is-failed"}
                        key={record.id}
                      >
                        <td className="admin-table-id" data-label="编号">
                          #{record.id}
                        </td>
                        <td
                          className="admin-table-person-cell"
                          data-label="账号"
                        >
                          <div className="admin-person">
                            <span
                              className={`admin-list-avatar ${record.success ? "is-success" : "is-failed"}`}
                              aria-hidden="true"
                            >
                              {initial(record.full_name || record.username)}
                            </span>
                            <span>
                              <strong>{record.username}</strong>
                              <small>{record.full_name || "未识别用户"}</small>
                            </span>
                          </div>
                        </td>
                        <td data-label="结果">
                          <span
                            className={`admin-result-pill ${record.success ? "is-success" : "is-failed"}`}
                          >
                            {record.success ? "成功" : "失败"}
                          </span>
                        </td>
                        <td className="admin-table-ip" data-label="登录 IP">
                          {record.login_ip || "—"}
                        </td>
                        <td className="admin-table-time" data-label="登录时间">
                          <time dateTime={record.logged_in_at}>
                            {displayTime(record.logged_in_at)}
                          </time>
                        </td>
                        <td data-label="浏览器信息">
                          <span
                            className="admin-user-agent"
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
              <div className="admin-empty-state">
                <strong>没有匹配的登录记录</strong>
                <span>调整筛选条件，或重置后查看全部登录审计。</span>
              </div>
            )}
          </div>
        </div>

        {pages > 1 && (
          <nav className="admin-pagination" aria-label="登录记录分页">
            <button
              className="admin-page-button"
              disabled={page === 1}
              onClick={() => changePage(page - 1)}
            >
              上一页
            </button>
            <span>
              第 {page} / {pages} 页
            </span>
            <button
              className="admin-page-button"
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
