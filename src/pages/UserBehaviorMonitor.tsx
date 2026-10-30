import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";

type RequestAudit = {
  logged_at: string;
  request_id: string;
  username: string | null;
  ip: string | null;
  method: string;
  path: string;
  status: number | null;
  duration_ms: number | null;
  event: string;
};

type RequestAuditPage = {
  items: RequestAudit[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type RequestMetric = {
  requests: number;
  errors: number;
  error_rate: number;
  avg_duration_ms: number | null;
  p50_ms: number | null;
  p90_ms: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
  duration_samples: number;
};

type RequestReport = {
  overview: RequestMetric & {
    unique_users: number;
    authenticated_users: number;
    unique_endpoints: number;
    slow_requests: number;
    active_users_today: number;
    active_users_today_date: string;
    active_users_today_list: Array<{ username: string; requests: number }>;
  };
  users: Array<RequestMetric & { username: string }>;
  endpoints: Array<RequestMetric & { method: string; path: string }>;
  daily: Array<RequestMetric & { date: string; active_users: number }>;
};

function displayTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value.replace("T", " ")
    : date.toLocaleString();
}

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateDaysAgo(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return formatDateInput(value);
}

function todayDateInput() {
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const quickDateRanges = [
  { label: "今天", daysAgo: 0 },
  { label: "三天内", daysAgo: 2 },
  { label: "一周内", daysAgo: 6 },
  { label: "一个月内", daysAgo: 29 },
];

function statusClass(status: number | null) {
  if (status === null) return "is-neutral";
  if (status >= 500) return "is-failed";
  if (status >= 400) return "is-warning";
  if (status >= 300) return "is-neutral";
  return "is-success";
}

function displayStatus(record: RequestAudit) {
  if (record.status !== null) return String(record.status);
  return record.event === "failed" ? "异常" : "—";
}

function formatMetric(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)} ms`;
}

export function UserBehaviorMonitor() {
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get("page"));
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const username = params.get("username") || "";
  const path = params.get("path") || "";
  const method = params.get("method") || "";
  const status = params.get("status") || "";
  const hasDateFilter = params.has("start_date") || params.has("end_date");
  const startDate = params.get("start_date") || (!hasDateFilter ? todayDateInput() : "");
  const endDate = params.get("end_date") || (!hasDateFilter ? todayDateInput() : "");
  const [records, setRecords] = useState<RequestAudit[] | null>(null);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [report, setReport] = useState<RequestReport | null>(null);
  const [error, setError] = useState("");
  const dateRange =
    startDate || endDate
      ? `${startDate || "最早记录"} 至 ${endDate || "今天"}`
      : "全部时间";

  useEffect(() => {
    let active = true;
    const search = new URLSearchParams({ page: String(page), page_size: "30" });
    for (const [key, value] of Object.entries({
      username,
      path,
      method,
      status,
      start_date: startDate,
      end_date: endDate,
    })) {
      if (value) search.set(key, value);
    }
    const reportSearch = new URLSearchParams(search);
    reportSearch.delete("page");
    reportSearch.delete("page_size");
    Promise.all([
      api<RequestAuditPage>(`/admin/request-audits?${search}`),
      api<RequestReport>(`/admin/request-audits/user-report?${reportSearch}`),
    ])
      .then(([data, nextReport]) => {
        if (!active) return;
        setRecords(data.items);
        setPages(data.total_pages);
        setTotal(data.total);
        setReport(nextReport);
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
  }, [endDate, method, page, path, startDate, status, username]);

  function applyQuickDateRange(daysAgo: number) {
    setParams({
      ...Object.fromEntries(params),
      start_date: dateDaysAgo(daysAgo),
      end_date: formatDateInput(new Date()),
      page: "1",
    });
  }

  function changePage(next: number) {
    setParams({ ...Object.fromEntries(params), page: String(next) });
  }

  const activeUsers = report?.users.slice(0, 20) || [];

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
            <p className="admin-list-eyebrow">用户行为管理</p>
            <h1>用户行为查询</h1>
            <p>
              从应用请求日志中查看用户调用过的接口、响应状态、耗时和来源地址。
            </p>
          </div>
          <div className="admin-list-actions">
            <Link
              className="admin-action-button admin-action-secondary"
              to="/admin/login-monitor"
            >
              登录监控
            </Link>
            <Link
              className="admin-action-button admin-action-quiet"
              to="/admin"
            >
              后台概览
            </Link>
          </div>
        </header>

        <section className="admin-list-metrics" aria-label="用户行为统计">
          <div className="admin-list-metric">
            <span>匹配请求</span>
            <strong>{total}</strong>
            <small>条应用请求记录</small>
          </div>
          <div className="admin-list-metric">
            <span>接口筛选</span>
            <strong className="admin-metric-text">{path || "全部接口"}</strong>
            <small>{method || "全部请求方法"}</small>
          </div>
          <div className="admin-list-metric">
            <span>查询时间</span>
            <strong className="admin-metric-text">{dateRange}</strong>
            <small>按应用请求时间筛选</small>
          </div>
        </section>

        {report && (
          <section className="behavior-report" aria-label="用户调用报表">
            <div className="behavior-report-heading">
              <div>
                <p>USER ACTIVITY REPORT</p>
                <h2>用户接口调用统计</h2>
                <span>
                  已忽略游客和健康检查请求，共 {report.overview.requests} 次用户请求，覆盖 {report.overview.unique_users} 个用户。
                </span>
              </div>
              <div className="behavior-report-kpis">
                <span>错误率 <strong>{report.overview.error_rate.toFixed(1)}%</strong></span>
                <span>用户数 <strong>{report.overview.unique_users}</strong></span>
                <span>当天活跃用户 <strong>{report.overview.active_users_today}</strong></span>
              </div>
            </div>

            <div className="behavior-report-grid">
              <article className="behavior-report-card">
                <div className="behavior-report-card-heading">
                  <div><p>TOP ACTIVE USERS</p><h3>前 20 位活跃用户</h3></div>
                  <small>按接口调用次数排序</small>
                </div>
                <div className="behavior-chart behavior-user-chart">
                  {activeUsers.length ? <ResponsiveContainer width="100%" height={Math.max(340, activeUsers.length * 30)}>
                    <BarChart data={activeUsers} layout="vertical" margin={{ top: 6, right: 18, left: 8, bottom: 6 }}>
                      <CartesianGrid stroke="#eeeaf8" strokeDasharray="3 3" horizontal={false} />
                      <XAxis axisLine={false} tickLine={false} type="number" allowDecimals={false} />
                      <YAxis axisLine={false} tickLine={false} type="category" dataKey="username" width={108} tick={{ fill: "#625d73", fontSize: 11 }} />
                      <Tooltip cursor={{ fill: "#f8f7ff" }} />
                      <Bar dataKey="requests" name="调用次数" fill="#6d60b8" radius={[0, 5, 5, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer> : <p className="behavior-report-empty">当前范围没有用户请求记录。</p>}
                </div>
              </article>

              <article className="behavior-report-card">
                <div className="behavior-report-card-heading">
                  <div><p>USERS</p><h3>活跃用户明细</h3></div>
                  <small>前 20 位</small>
                </div>
                <div className="table-responsive">
                  <table className="table behavior-report-table mb-0">
                    <thead><tr><th>用户</th><th>调用次数</th><th>错误率</th><th>平均耗时</th><th>P95</th></tr></thead>
                    <tbody>{activeUsers.map((user) => <tr key={user.username}>
                      <td>{user.username}</td><td>{user.requests}</td><td>{user.error_rate.toFixed(1)}%</td><td>{formatMetric(user.avg_duration_ms)}</td><td>{formatMetric(user.p95_ms)}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </article>

              <article className="behavior-report-card behavior-today-users-card">
                <div className="behavior-report-card-heading">
                  <div><p>TODAY ACTIVE USERS</p><h3>当天活跃用户列表</h3></div>
                  <small>{report.overview.active_users_today} 人</small>
                </div>
                {report.overview.active_users_today_list.length ? (
                  <div className="behavior-active-user-list">
                    {report.overview.active_users_today_list.map((user) => (
                      <div className="behavior-active-user-item" key={user.username}>
                        <strong>{user.username}</strong>
                        <span>{user.requests} 次调用</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="behavior-report-empty">今天还没有活跃用户。</p>
                )}
              </article>
            </div>

            <article className="behavior-report-card behavior-time-card">
              <div className="behavior-report-card-heading">
                <div><p>TIME TREND</p><h3>按日期的用户调用趋势</h3></div>
                <small>{dateRange}</small>
              </div>
              {report.daily.length ? <div className="behavior-chart">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={report.daily} margin={{ top: 12, right: 20, left: 4, bottom: 8 }}>
                    <CartesianGrid stroke="#eeeaf8" strokeDasharray="3 3" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#625d73", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="requests" name="用户调用次数" stroke="#6d60b8" strokeWidth={3} dot={{ r: 3, fill: "#6d60b8" }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="active_users" name="活跃用户数" stroke="#39a889" strokeWidth={2} dot={{ r: 3, fill: "#39a889" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div> : <p className="behavior-report-empty">当前范围没有时间趋势数据。</p>}
              <small className="behavior-report-timezone">
                当天活跃用户按 {report.overview.active_users_today_date} 新西兰时间统计，按用户名去重。
              </small>
            </article>
          </section>
        )}

        <div className="card shadow-sm admin-filter-panel">
          <div className="card-body">
            <div className="admin-filter-panel-title">
              <div>
                <p>筛选用户行为</p>
                <span>
                  组合用户名、接口路径、请求方法、状态码和日期范围查询。
                </span>
              </div>
            </div>
            <form
              className="row g-3 admin-filter-form"
              key={params.toString()}
              onSubmit={(event) => {
                event.preventDefault();
                const values = Object.fromEntries(
                  new FormData(event.currentTarget),
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
              <div className="col-md-3">
                <label className="form-label" htmlFor="behavior-username">
                  用户名
                </label>
                <input
                  className="form-control"
                  defaultValue={username}
                  id="behavior-username"
                  name="username"
                  placeholder="例如 admin"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="behavior-path">
                  接口路径
                </label>
                <input
                  className="form-control"
                  defaultValue={path}
                  id="behavior-path"
                  name="path"
                  placeholder="例如 /api/modules"
                />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="behavior-method">
                  请求方法
                </label>
                <select
                  className="form-select"
                  defaultValue={method}
                  id="behavior-method"
                  name="method"
                >
                  <option value="">全部</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>
              </div>
              <div className="col-md-3 d-flex align-items-end gap-2">
                <button className="admin-filter-submit flex-grow-1">
                  查询
                </button>
                <Link className="admin-filter-reset" to="/admin/user-behavior">
                  重置
                </Link>
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="behavior-status">
                  状态码
                </label>
                <input
                  className="form-control"
                  defaultValue={status}
                  id="behavior-status"
                  inputMode="numeric"
                  max="599"
                  min="100"
                  name="status"
                  placeholder="例如 200"
                  type="number"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="behavior-start-date">
                  开始日期
                </label>
                <input
                  className="form-control"
                  defaultValue={startDate}
                  id="behavior-start-date"
                  name="start_date"
                  type="date"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="behavior-end-date">
                  结束日期
                </label>
                <input
                  className="form-control"
                  defaultValue={endDate}
                  id="behavior-end-date"
                  name="end_date"
                  type="date"
                />
              </div>
              <div className="col-12 admin-date-quick-filter">
                <div className="admin-date-quick-filter-label">
                  <span>修改时间</span>
                  <small>快捷查询</small>
                </div>
                <div
                  className="admin-date-quick-filter-options"
                  role="group"
                  aria-label="修改时间快捷查询"
                >
                  {quickDateRanges.map((range) => {
                    const active =
                      startDate === dateDaysAgo(range.daysAgo) &&
                      endDate === formatDateInput(new Date());
                    return (
                      <button
                        className={`admin-date-quick-filter-button${active ? " is-active" : ""}`}
                        key={range.label}
                        onClick={() => applyQuickDateRange(range.daysAgo)}
                        type="button"
                      >
                        {range.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="card shadow-sm admin-data-card">
          <div className="card-header admin-data-card-head">
            <div>
              <p>请求审计</p>
              <h2>用户行为记录</h2>
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
                正在读取用户行为…
              </div>
            ) : records.length ? (
              <div className="table-responsive">
                <table className="table admin-data-table admin-behavior-table mb-0">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>用户</th>
                      <th>方法</th>
                      <th>接口路径</th>
                      <th>状态</th>
                      <th>耗时</th>
                      <th>IP</th>
                      <th>请求 ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr
                        key={`${record.request_id}-${record.logged_at}-${record.path}`}
                      >
                        <td className="admin-table-time" data-label="时间">
                          <time dateTime={record.logged_at}>
                            {displayTime(record.logged_at)}
                          </time>
                        </td>
                        <td className="admin-table-handle" data-label="用户">
                          {record.username || "游客"}
                        </td>
                        <td data-label="方法">
                          <span className="admin-method-pill">
                            {record.method}
                          </span>
                        </td>
                        <td
                          className="admin-behavior-path"
                          data-label="接口路径"
                          title={record.path}
                        >
                          {record.path}
                        </td>
                        <td data-label="状态">
                          <span
                            className={`admin-result-pill ${statusClass(record.status)}`}
                          >
                            {displayStatus(record)}
                          </span>
                        </td>
                        <td data-label="耗时">
                          {record.duration_ms === null
                            ? "—"
                            : `${record.duration_ms.toFixed(1)} ms`}
                        </td>
                        <td className="admin-table-ip" data-label="IP">
                          {record.ip || "—"}
                        </td>
                        <td
                          className="admin-request-id"
                          data-label="请求 ID"
                          title={record.request_id}
                        >
                          {record.request_id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">
                <strong>没有匹配的用户行为</strong>
                <span>调整筛选条件，或重置后查看全部请求记录。</span>
              </div>
            )}
          </div>
        </div>

        {pages > 1 && (
          <nav className="admin-pagination" aria-label="用户行为分页">
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
