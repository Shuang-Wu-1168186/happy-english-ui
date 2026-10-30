import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";

type Metric = {
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

type LatencyReport = {
  overview: Metric & {
    unique_users: number;
    unique_endpoints: number;
    slow_requests: number;
  };
  endpoints: Array<Metric & { method: string; path: string }>;
  daily: Array<Metric & { date: string }>;
};

const quickDateRanges = [
  { label: "今天", daysAgo: 0 },
  { label: "三天内", daysAgo: 2 },
  { label: "一周内", daysAgo: 6 },
  { label: "一个月内", daysAgo: 29 },
];

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

function formatMetric(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)} ms`;
}

function shortenPath(path: string) {
  return path.length > 28 ? `${path.slice(0, 25)}…` : path;
}

export function RequestLatencyReport() {
  const [params, setParams] = useSearchParams();
  const username = params.get("username") || "";
  const path = params.get("path") || "";
  const method = params.get("method") || "";
  const status = params.get("status") || "";
  const hasDateFilter = params.has("start_date") || params.has("end_date");
  const startDate = params.get("start_date") || (!hasDateFilter ? todayDateInput() : "");
  const endDate = params.get("end_date") || (!hasDateFilter ? todayDateInput() : "");
  const [report, setReport] = useState<LatencyReport | null>(null);
  const [error, setError] = useState("");
  const dateRange = startDate || endDate
    ? `${startDate || "最早记录"} 至 ${endDate || "今天"}`
    : "全部时间";

  useEffect(() => {
    const search = new URLSearchParams();
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
    let active = true;
    api<LatencyReport>(`/admin/request-audits/latency-report?${search}`)
      .then((data) => {
        if (!active) return;
        setReport(data);
        setError("");
      })
      .catch((reason: Error) => {
        if (!active) return;
        setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [endDate, method, path, startDate, status, username]);

  function applyQuickDateRange(daysAgo: number) {
    setParams({
      ...Object.fromEntries(params),
      start_date: dateDaysAgo(daysAgo),
      end_date: formatDateInput(new Date()),
    });
  }

  const endpoints = report?.endpoints || [];
  const chartEndpoints = endpoints.slice(0, 15);

  return (
    <section className="container py-5 admin-list-page">
      <div className="container py-4 admin-list-content">
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <header className="admin-list-header">
          <div className="admin-list-copy">
            <p className="admin-list-eyebrow">PERFORMANCE REPORT</p>
            <h1>接口耗时报表</h1>
            <p>按接口统计真实用户请求的平均耗时、P90、P95 和 P99，已排除游客健康检查。</p>
          </div>
          <div className="admin-list-actions">
            <Link className="admin-action-button admin-action-secondary" to="/admin/user-behavior">用户行为查询</Link>
            <Link className="admin-action-button admin-action-quiet" to="/admin">后台概览</Link>
          </div>
        </header>

        <section className="admin-list-metrics" aria-label="接口耗时概览">
          <div className="admin-list-metric"><span>用户请求</span><strong>{report?.overview.requests ?? "—"}</strong><small>{dateRange}</small></div>
          <div className="admin-list-metric"><span>P90</span><strong>{formatMetric(report?.overview.p90_ms ?? null)}</strong><small>90% 请求低于此耗时</small></div>
          <div className="admin-list-metric"><span>P95</span><strong>{formatMetric(report?.overview.p95_ms ?? null)}</strong><small>95% 请求低于此耗时</small></div>
          <div className="admin-list-metric"><span>P99</span><strong>{formatMetric(report?.overview.p99_ms ?? null)}</strong><small>99% 请求低于此耗时</small></div>
        </section>

        <div className="card shadow-sm admin-filter-panel">
          <div className="card-body">
            <div className="admin-filter-panel-title"><div><p>筛选接口耗时</p><span>可按用户、接口、方法、状态码和日期范围筛选。</span></div></div>
            <form className="row g-3 admin-filter-form" key={params.toString()} onSubmit={(event) => {
              event.preventDefault();
              const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
              setParams(Object.fromEntries(Object.entries(values).filter(([, value]) => Boolean(value))));
            }}>
              <div className="col-md-3"><label className="form-label" htmlFor="latency-username">用户</label><input className="form-control" defaultValue={username} id="latency-username" name="username" placeholder="例如 admin" /></div>
              <div className="col-md-4"><label className="form-label" htmlFor="latency-path">接口路径</label><input className="form-control" defaultValue={path} id="latency-path" name="path" placeholder="例如 /api/learning/materials" /></div>
              <div className="col-md-2"><label className="form-label" htmlFor="latency-method">请求方法</label><select className="form-select" defaultValue={method} id="latency-method" name="method"><option value="">全部</option><option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="PATCH">PATCH</option><option value="DELETE">DELETE</option></select></div>
              <div className="col-md-3 d-flex align-items-end gap-2"><button className="admin-filter-submit flex-grow-1">查询</button><Link className="admin-filter-reset" to="/admin/request-latency">重置</Link></div>
              <div className="col-md-3"><label className="form-label" htmlFor="latency-status">状态码</label><input className="form-control" defaultValue={status} id="latency-status" inputMode="numeric" max="599" min="100" name="status" type="number" /></div>
              <div className="col-md-3"><label className="form-label" htmlFor="latency-start-date">开始日期</label><input className="form-control" defaultValue={startDate} id="latency-start-date" name="start_date" type="date" /></div>
              <div className="col-md-3"><label className="form-label" htmlFor="latency-end-date">结束日期</label><input className="form-control" defaultValue={endDate} id="latency-end-date" name="end_date" type="date" /></div>
              <div className="col-12 admin-date-quick-filter"><div className="admin-date-quick-filter-label"><span>查询时间</span><small>快捷查询</small></div><div className="admin-date-quick-filter-options" role="group" aria-label="接口耗时快捷查询">{quickDateRanges.map((range) => { const active = startDate === dateDaysAgo(range.daysAgo) && endDate === formatDateInput(new Date()); return <button className={`admin-date-quick-filter-button${active ? " is-active" : ""}`} key={range.label} onClick={() => applyQuickDateRange(range.daysAgo)} type="button">{range.label}</button>; })}</div></div>
            </form>
          </div>
        </div>

        {report && <section className="behavior-report" aria-label="接口耗时图表">
          <div className="behavior-report-heading"><div><p>LATENCY PERCENTILES</p><h2>接口 P90 / P95 / P99</h2><span>查看接口分布和每日耗时趋势，柱状图按当前列表最高 P99 归一化。</span></div><div className="behavior-report-kpis"><span>接口数 <strong>{report.overview.unique_endpoints}</strong></span><span>平均耗时 <strong>{formatMetric(report.overview.avg_duration_ms)}</strong></span></div></div>
          <div className="behavior-report-card behavior-latency-report-card">
            {chartEndpoints.length ? <div className="behavior-chart behavior-latency-chart"><ResponsiveContainer width="100%" height={Math.max(420, chartEndpoints.length * 42)}>
              <BarChart data={chartEndpoints} layout="vertical" margin={{ top: 12, right: 22, left: 8, bottom: 12 }}>
                <CartesianGrid stroke="#eeeaf8" strokeDasharray="3 3" horizontal={false} />
                <XAxis axisLine={false} tickLine={false} type="number" unit=" ms" />
                <YAxis axisLine={false} tickLine={false} type="category" dataKey="path" width={170} tickFormatter={shortenPath} tick={{ fill: "#625d73", fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="p90_ms" name="P90" fill="#75a9e8" radius={[0, 4, 4, 0]} barSize={9} />
                <Bar dataKey="p95_ms" name="P95" fill="#b18be0" radius={[0, 4, 4, 0]} barSize={9} />
                <Bar dataKey="p99_ms" name="P99" fill="#e58b9e" radius={[0, 4, 4, 0]} barSize={9} />
              </BarChart>
            </ResponsiveContainer></div> : <p className="behavior-report-empty">当前范围没有接口记录。</p>}
          </div>
          <article className="behavior-report-card behavior-time-card">
            <div className="behavior-report-card-heading"><div><p>TIME TREND</p><h3>按日期的接口耗时趋势</h3></div><small>{dateRange}</small></div>
            {report.daily.length ? <div className="behavior-chart"><ResponsiveContainer width="100%" height={310}>
              <LineChart data={report.daily} margin={{ top: 12, right: 20, left: 4, bottom: 8 }}>
                <CartesianGrid stroke="#eeeaf8" strokeDasharray="3 3" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#625d73", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} unit=" ms" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="p90_ms" name="P90" stroke="#75a9e8" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="p95_ms" name="P95" stroke="#b18be0" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="p99_ms" name="P99" stroke="#e58b9e" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer></div> : <p className="behavior-report-empty">当前范围没有时间趋势数据。</p>}
          </article>
          <div className="behavior-report-card behavior-report-tables"><div className="behavior-report-card-heading"><div><p>ENDPOINTS</p><h3>接口耗时明细</h3></div><small>游客请求已忽略，单位：毫秒</small></div><div className="table-responsive"><table className="table behavior-report-table mb-0"><thead><tr><th>接口</th><th>调用次数</th><th>错误率</th><th>平均耗时</th><th>P90</th><th>P95</th><th>P99</th></tr></thead><tbody>{endpoints.map((endpoint) => <tr key={`${endpoint.method}-${endpoint.path}`}><td><b>{endpoint.method}</b> {endpoint.path}</td><td>{endpoint.requests}</td><td>{endpoint.error_rate.toFixed(1)}%</td><td>{formatMetric(endpoint.avg_duration_ms)}</td><td>{formatMetric(endpoint.p90_ms)}</td><td>{formatMetric(endpoint.p95_ms)}</td><td>{formatMetric(endpoint.p99_ms)}</td></tr>)}</tbody></table></div></div>
        </section>}
      </div>
    </section>
  );
}
