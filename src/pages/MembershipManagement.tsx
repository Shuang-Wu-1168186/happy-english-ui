import { useCallback, useEffect, useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Award,
  BookCopy,
  Check,
  Eye,
  FilePenLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { api, entries, value } from "../lib/api";
import type { Entry, Page } from "../lib/api";

type ItemList = Page & { items: Entry[]; page_size?: number };
type Tab = "plans" | "benefits" | "memberships";
type DialogMode = "new" | "detail" | "edit" | "lessons";
type DialogState = { mode: DialogMode; record?: Entry };
type QueryValues = Record<string, string | number | null | undefined>;
type PlanBinding = { enabled: boolean; grant: string };
type CourseBinding = { enabled: boolean };
type SupportData = {
  benefits: Entry[];
  courses: Entry[];
  plans: Entry[];
  topics: Entry[];
};

const pageSize = 10;
const materialTypes = [
  "textbook",
  "dialogue",
  "note_collection",
  "card_set",
  "phonics",
  "exam",
  "courseware",
];
const sourceResources = [
  "textbook",
  "notes",
  "dialogues",
  "phonics",
  "kids-cards",
  "math-cards",
  "vocabulary",
  "interviews",
  "sentences",
];
const planStatusOptions = [
  ["", "全部状态"],
  ["draft", "草稿"],
  ["active", "启用"],
  ["inactive", "停用"],
  ["archived", "归档"],
];
const benefitStatusOptions = [
  ["", "全部状态"],
  ["active", "启用"],
  ["inactive", "停用"],
  ["archived", "归档"],
];
const membershipStatusOptions = [
  ["", "全部状态"],
  ["pending", "待生效"],
  ["active", "生效中"],
  ["expired", "已过期"],
  ["cancelled", "已取消"],
  ["revoked", "已撤销"],
];

function emptyPage(): ItemList {
  return { items: [], page: 1, page_size: pageSize, total: 0, total_pages: 1 };
}

function numberValue(entry: Entry | null | undefined, key: string) {
  const parsed = Number(entry?.[key]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isEnabled(entry: Entry | null | undefined, key = "is_enabled") {
  const raw = entry?.[key];
  return raw === true || raw === 1 || raw === "1" || raw === "true";
}

function jsonText(raw: unknown) {
  return raw == null ? "" : JSON.stringify(raw, null, 2);
}

function readJson(raw: FormDataEntryValue | null, field: string) {
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${field} 必须是合法 JSON。`);
  }
}

function optionalNumber(raw: FormDataEntryValue | null) {
  const text = String(raw || "").trim();
  return text ? Number(text) : null;
}

function bindingsForPlan(detail: Entry): Record<number, PlanBinding> {
  return Object.fromEntries(
    entries(detail, "benefits").map((item) => [
      numberValue(item, "benefit_id"),
      { enabled: isEnabled(item), grant: jsonText(item.grant_value) },
    ]),
  );
}

function bindingsForBenefit(detail: Entry): Record<string, CourseBinding> {
  return Object.fromEntries(
    entries(detail, "courses").map((item) => [
      `${numberValue(item, "course_id")}:${value(item, "access_action")}`,
      { enabled: isEnabled(item) },
    ]),
  );
}

function pathWithQuery(path: string, values: QueryValues) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, raw]) => {
    if (raw !== "" && raw != null) params.set(key, String(raw));
  });
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function displayTime(raw: unknown) {
  const text = String(raw || "");
  return text ? text.replace("T", " ").replace(/\.\d+/, "").replace("Z", "") : "—";
}

function datetimeInput(raw: unknown, fallback = "") {
  const text = String(raw || "");
  return text
    ? text.replace(" ", "T").replace("Z", "").slice(0, 16)
    : fallback;
}

function currentDatetimeInput() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "启用",
    archived: "归档",
    cancelled: "已取消",
    draft: "草稿",
    expired: "已过期",
    inactive: "停用",
    pending: "待生效",
    published: "已发布",
    revoked: "已撤销",
    unpublished: "未发布",
  };
  return labels[status] || status || "—";
}

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    gift: "赠送",
    manual: "人工发放",
    migration: "数据迁移",
    purchase: "购买",
    signup: "注册赠送",
    trial: "试用",
  };
  return labels[source] || source || "—";
}

function benefitTypeLabel(type: string) {
  const labels: Record<string, string> = {
    content_access: "课程访问",
    discount: "折扣",
    feature_access: "功能访问",
    quota: "额度",
    service: "服务",
  };
  return labels[type] || type || "—";
}

function Status({ status }: { status: string }) {
  return <span className={`membership-status is-${status}`}>{statusLabel(status)}</span>;
}

function ErrorNotice({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div className="alert alert-danger membership-error" role="alert">
      {error}
    </div>
  );
}

function FilterActions({
  createLabel,
  onCreate,
  onReset,
}: {
  createLabel: string;
  onCreate: () => void | Promise<void>;
  onReset: () => void;
}) {
  return (
    <div className="col-12 membership-filter-actions">
      <div className="membership-filter-action-group">
        <button className="membership-filter-action is-search" type="submit">
          <Search aria-hidden="true" size={15} />
          查询
        </button>
        <button className="membership-filter-action is-reset" onClick={onReset} type="button">
          重置
        </button>
        <span aria-hidden="true" className="membership-filter-action-divider" />
        <button
          className="membership-filter-action is-create"
          onClick={() => void onCreate()}
          type="button"
        >
          <Plus aria-hidden="true" size={15} />
          {createLabel}
        </button>
      </div>
    </div>
  );
}

function usePagedList(
  path: string,
  filters: QueryValues,
  page: number,
  refreshKey: number,
  reportError: (message: string) => void,
) {
  const [result, setResult] = useState<ItemList>(emptyPage);
  const [loading, setLoading] = useState(true);
  const filterKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await api<ItemList>(
        pathWithQuery(path, {
          ...(JSON.parse(filterKey) as QueryValues),
          page,
          page_size: pageSize,
        }),
      );
      setResult(next);
    } catch (reason) {
      reportError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filterKey, page, path, reportError]);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload, refreshKey]);

  return { loading, reload, result };
}

function Pagination({
  page,
  total,
  totalPages,
  onChange,
}: {
  page: number;
  total: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return <p className="membership-pagination-summary">共 {total} 条记录</p>;
  }
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
  return (
    <nav className="admin-pagination membership-pagination" aria-label="列表分页">
      <span>共 {total} 条</span>
      <ul className="pagination">
        <li className="page-item">
          <button
            className="page-link"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            type="button"
          >
            上一页
          </button>
        </li>
        {pages.map((number) => (
          <li className={`page-item${number === page ? " active" : ""}`} key={number}>
            <button className="page-link" onClick={() => onChange(number)} type="button">
              {number}
            </button>
          </li>
        ))}
        <li className="page-item">
          <button
            className="page-link"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
            type="button"
          >
            下一页
          </button>
        </li>
      </ul>
    </nav>
  );
}

function ManagementDialog({
  children,
  onClose,
  title,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}) {
  return (
    <div
      className="membership-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-label={title}
        aria-modal="true"
        className={`membership-dialog${wide ? " is-wide" : ""}`}
        role="dialog"
      >
        <header className="membership-dialog-header">
          <h2>{title}</h2>
          <button aria-label="关闭" onClick={onClose} type="button">
            <X aria-hidden="true" size={19} />
          </button>
        </header>
        <div className="membership-dialog-body">{children}</div>
      </section>
    </div>
  );
}

function DetailGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="membership-detail-grid">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function DataCard({
  children,
  count,
  emptyText,
  loading,
  title,
}: {
  children: ReactNode;
  count: number;
  emptyText: string;
  loading: boolean;
  title: string;
}) {
  return (
    <div className="card shadow-sm admin-data-card membership-data-card">
      <div className="card-header admin-data-card-head">
        <div>
          <p>配置列表</p>
          <h2>{title}</h2>
        </div>
        <div className="admin-data-card-meta">
          <strong>{count}</strong>
          <span>当前页记录</span>
        </div>
      </div>
      <div className="card-body p-0">
        {loading ? (
          <p className="admin-table-loading" role="status">
            正在加载列表…
          </p>
        ) : count ? (
          children
        ) : (
          <div className="admin-empty-state">
            <strong>没有匹配的记录</strong>
            <span>{emptyText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FormInput({
  defaultValue,
  label,
  name,
  required = false,
  step,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
  step?: string;
  type?: string;
}) {
  const id = `membership-${name}-${useId()}`;
  return (
    <div className="col-md-6">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        className="form-control"
        defaultValue={defaultValue}
        id={id}
        name={name}
        required={required}
        step={step}
        type={type}
      />
    </div>
  );
}

function FormSelect({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue: string;
  label: string;
  name: string;
  options: string[][];
}) {
  const id = `membership-${name}-${useId()}`;
  return (
    <div className="col-md-6">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <select className="form-select" defaultValue={defaultValue} id={id} name={name}>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormTextarea({
  defaultValue,
  label,
  name,
  placeholder,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
}) {
  const id = `membership-${name}-${useId()}`;
  return (
    <div className="col-12">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        className="form-control"
        defaultValue={defaultValue}
        id={id}
        name={name}
        placeholder={placeholder}
        rows={3}
      />
    </div>
  );
}

function userDisplayName(user: Entry) {
  return value(user, "full_name") || value(user, "username") || "未命名用户";
}

function userContactDetails(user: Entry) {
  return [value(user, "contact_number"), value(user, "email")].filter(Boolean).join(" · ");
}

function UserMembershipPicker({
  selectedUser,
  onChange,
}: {
  selectedUser: Entry | null;
  onChange: (user: Entry | null) => void;
}) {
  const inputId = `membership-user-${useId()}`;
  const listId = `${inputId}-results`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Entry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void api<ItemList>(
        pathWithQuery("/admin/users", {
          q: query.trim(),
          page: 1,
          page_size: 12,
        }),
      )
        .then((response) => {
          if (active) setResults(response.items);
        })
        .catch((reason: Error) => {
          if (active) {
            setResults([]);
            setError(reason.message);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const contactDetails = selectedUser ? userContactDetails(selectedUser) : "";
  return (
    <div className="col-md-6 membership-user-picker">
      <label className="form-label" htmlFor={inputId}>
        用户
      </label>
      <input name="user_id" type="hidden" value={selectedUser?.id || ""} />
      {selectedUser ? (
        <div className="membership-user-picker-selected">
          <div>
            <strong>{userDisplayName(selectedUser)}</strong>
            <span>
              {value(selectedUser, "username") && `@${value(selectedUser, "username")}`}
              {contactDetails && ` · ${contactDetails}`}
            </span>
          </div>
          <button
            onClick={() => {
              onChange(null);
              setQuery("");
              setOpen(true);
            }}
            type="button"
          >
            更换
          </button>
        </div>
      ) : (
        <div className="membership-user-picker-control">
          <Search aria-hidden="true" className="membership-user-picker-icon" size={17} />
          <input
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={open}
            className="form-control"
            id={inputId}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            placeholder="搜索姓名、用户名、手机号或邮箱"
            role="combobox"
            value={query}
          />
          {open && (
            <div className="membership-user-picker-results" id={listId} role="listbox">
              {loading ? (
                <p className="membership-user-picker-status">正在搜索用户…</p>
              ) : error ? (
                <p className="membership-user-picker-status is-error">{error}</p>
              ) : results.length ? (
                results.map((user) => {
                  const details = userContactDetails(user);
                  return (
                    <button
                      key={user.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onChange(user);
                        setQuery("");
                        setOpen(false);
                      }}
                      role="option"
                      type="button"
                    >
                      <strong>{userDisplayName(user)}</strong>
                      <span>
                        {value(user, "username") && `@${value(user, "username")}`}
                        {details && ` · ${details}`}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="membership-user-picker-status">
                  {query.trim() ? "没有找到匹配用户" : "暂无可选择的用户"}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <p className="membership-user-picker-hint">按姓名、用户名、手机号或邮箱搜索后选择用户。</p>
    </div>
  );
}

export function MembershipManagement() {
  const [tab, setTab] = useState<Tab>("plans");
  const [support, setSupport] = useState<SupportData>({
    benefits: [],
    courses: [],
    plans: [],
    topics: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSupport = useCallback(async () => {
    const [planResult, benefitResult, topicResult, courseResult] = await Promise.all([
      api<ItemList>(pathWithQuery("/admin/membership-plans", { page_size: 100 })),
      api<ItemList>(pathWithQuery("/admin/membership-benefits", { page_size: 100 })),
      api<{ items: Entry[] }>("/admin/learning-topics"),
      api<ItemList>(pathWithQuery("/admin/learning-courses", { page_size: 100 })),
    ]);
    setSupport({
      benefits: benefitResult.items,
      courses: courseResult.items,
      plans: planResult.items,
      topics: topicResult.items,
    });
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(loadSupport)
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadSupport]);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      await loadSupport();
      setRefreshKey((current) => current + 1);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="container py-5 membership-page">
      <header className="membership-heading">
        <div>
          <p className="admin-list-eyebrow">会员与权益配置</p>
          <h1>会员管理</h1>
          <p>配置会员等级、课程访问权益，并查看每一笔会员发放记录。</p>
        </div>
        <button className="admin-action-button admin-action-secondary" onClick={refresh} type="button">
          <RefreshCw aria-hidden="true" size={16} />
          刷新数据
        </button>
      </header>

      <nav aria-label="会员配置分类" className="membership-tabs">
        <button className={tab === "plans" ? "is-active" : ""} onClick={() => setTab("plans")} type="button">
          <Award aria-hidden="true" size={17} /> 会员等级
        </button>
        <button className={tab === "benefits" ? "is-active" : ""} onClick={() => setTab("benefits")} type="button">
          <Check aria-hidden="true" size={17} /> 会员权益
        </button>
        <button className={tab === "memberships" ? "is-active" : ""} onClick={() => setTab("memberships")} type="button">
          <UsersRound aria-hidden="true" size={17} /> 用户会员
        </button>
      </nav>

      <ErrorNotice error={error} />
      {loading ? (
        <p className="admin-table-loading" role="status">
          正在加载会员配置…
        </p>
      ) : tab === "plans" ? (
        <PlansPanel
          benefits={support.benefits}
          refreshKey={refreshKey}
          refreshSupport={loadSupport}
          reportError={setError}
        />
      ) : tab === "benefits" ? (
        <BenefitsPanel
          courses={support.courses}
          refreshKey={refreshKey}
          refreshSupport={loadSupport}
          reportError={setError}
          topics={support.topics}
        />
      ) : (
        <UserMembershipsPanel
          plans={support.plans}
          refreshKey={refreshKey}
          refreshSupport={loadSupport}
          reportError={setError}
        />
      )}
    </section>
  );
}

export function MaterialDevelopment() {
  const [topics, setTopics] = useState<Entry[]>([]);
  const [templates, setTemplates] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSupport = useCallback(async () => {
    const [topicResult, templateResult] = await Promise.all([
      api<{ items: Entry[] }>("/admin/learning-topics"),
      api<{ items: Entry[] }>("/admin/learning-templates"),
    ]);
    setTopics(topicResult.items);
    setTemplates(templateResult.items);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(loadSupport)
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadSupport]);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      await loadSupport();
      setRefreshKey((current) => current + 1);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="container py-5 membership-page">
      <header className="membership-heading">
        <div>
          <p className="admin-list-eyebrow">内容管理</p>
          <h1>教材开发</h1>
          <p>创建教材，并为每一本教材维护多个课时。</p>
        </div>
        <button
          className="admin-action-button admin-action-secondary"
          onClick={refresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={16} />
          刷新数据
        </button>
      </header>

      <ErrorNotice error={error} />
      {loading ? (
        <p className="admin-table-loading" role="status">
          正在加载教材开发数据…
        </p>
      ) : (
        <MaterialsPanel
          refreshKey={refreshKey}
          refreshSupport={loadSupport}
          reportError={setError}
          templates={templates}
          topics={topics}
        />
      )}
    </section>
  );
}

function PlansPanel({
  benefits,
  refreshKey,
  refreshSupport,
  reportError,
}: {
  benefits: Entry[];
  refreshKey: number;
  refreshSupport: () => Promise<unknown>;
  reportError: (message: string) => void;
}) {
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [benefitBindingPlan, setBenefitBindingPlan] = useState<Entry | null>(null);
  const [detail, setDetail] = useState<Entry | null>(null);
  const [bindings, setBindings] = useState<Record<number, PlanBinding>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const { loading, reload, result } = usePagedList(
    "/admin/membership-plans",
    applied,
    page,
    refreshKey,
    reportError,
  );

  const loadDetail = useCallback(
    async (planId: number) => {
      setDetailLoading(true);
      try {
        const next = await api<Entry>(`/admin/membership-plans/${planId}`);
        setDetail(next);
        setBindings(bindingsForPlan(next));
        return next;
      } catch (reason) {
        reportError((reason as Error).message);
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    [reportError],
  );

  async function openDialog(mode: DialogMode, record?: Entry) {
    setBenefitBindingPlan(null);
    setDialog({ mode, record });
    setDetail(record || null);
    setBindings({});
    if (record) await loadDetail(record.id);
  }

  function closeDialog() {
    setDialog(null);
    setDetail(null);
    setBindings({});
  }

  async function openBenefitBindings(record: Entry) {
    setDialog(null);
    setBenefitBindingPlan(record);
    setDetail(null);
    setBindings({});
    reportError("");
    await loadDetail(record.id);
  }

  function closeBenefitBindings() {
    setBenefitBindingPlan(null);
    setDetail(null);
    setBindings({});
  }

  async function refreshAfterChange() {
    await Promise.all([reload(), refreshSupport()]);
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedId = numberValue(detail || dialog?.record, "id");
    setBusy(true);
    reportError("");
    try {
      const saved = await api<Entry>(
        `/admin/membership-plans${selectedId ? `/${selectedId}` : ""}`,
        selectedId ? "PUT" : "POST",
        {
          plan_code: String(form.get("plan_code") || ""),
          name: String(form.get("name") || ""),
          name_en: String(form.get("name_en") || ""),
          description: String(form.get("description") || ""),
          tier_rank: Number(form.get("tier_rank") || 0),
          billing_cycle: String(form.get("billing_cycle") || "manual"),
          duration_days: optionalNumber(form.get("duration_days")),
          price: String(form.get("price") || "0"),
          currency: String(form.get("currency") || "CNY"),
          icon: String(form.get("icon") || ""),
          badge_text: String(form.get("badge_text") || ""),
          sort_order: Number(form.get("sort_order") || 0),
          status: String(form.get("status") || "draft"),
          is_default: form.get("is_default") === "on",
        },
      );
      await refreshAfterChange();
      await openDialog("edit", saved);
    } catch (reason) {
      reportError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveBindings() {
    const selectedId = numberValue(detail, "id");
    if (!selectedId || selectedId !== numberValue(benefitBindingPlan, "id")) return;
    setBusy(true);
    reportError("");
    try {
      const items = benefits.flatMap((benefit) => {
        const binding = bindings[benefit.id];
        if (!binding?.enabled) return [];
        return [
          {
            benefit_id: benefit.id,
            grant_value: binding.grant.trim() ? JSON.parse(binding.grant) : null,
            is_enabled: true,
            sort_order: numberValue(benefit, "sort_order"),
          },
        ];
      });
      await api(`/admin/membership-plans/${selectedId}/benefits`, "PUT", { items });
      setDetail(null);
      await loadDetail(selectedId);
    } catch (reason) {
      reportError(
        reason instanceof SyntaxError
          ? "权益覆盖值必须是合法 JSON，例如 true、20 或 {\"key\": \"value\"}。"
          : (reason as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function removePlan(record: Entry) {
    if (!window.confirm(`删除会员等级“${value(record, "name")}”？`)) return;
    setBusy(true);
    reportError("");
    try {
      await api(`/admin/membership-plans/${record.id}`, "DELETE");
      closeDialog();
      if (result.items.length === 1 && page > 1) {
        await refreshSupport();
        setPage(page - 1);
      } else {
        await refreshAfterChange();
      }
    } catch (reason) {
      reportError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selected = detail || dialog?.record || null;
  const benefitBindingReady = Boolean(
    detail && numberValue(detail, "id") === numberValue(benefitBindingPlan, "id"),
  );
  return (
    <div className="membership-list-page">
      <section className="card shadow-sm admin-filter-panel membership-filter-card">
        <div className="card-body">
          <div className="admin-filter-panel-title">
            <div>
              <p>查询会员等级</p>
              <span>按名称、编码和状态查找会员产品。</span>
            </div>
          </div>
          <form
            className="row g-3 admin-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              reportError("");
              setPage(1);
              setApplied(filters);
            }}
          >
            <div className="col-md-6">
              <label className="form-label" htmlFor="plan-query">
                名称或等级编码
              </label>
              <input
                className="form-control"
                id="plan-query"
                onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                placeholder="例如 口语月卡 或 talk-monthly"
                value={filters.q}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="plan-status">
                状态
              </label>
              <select
                className="form-select"
                id="plan-status"
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                value={filters.status}
              >
                {planStatusOptions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <FilterActions
              createLabel="新建"
              onCreate={() => openDialog("new")}
              onReset={() => {
                const reset = { q: "", status: "" };
                setFilters(reset);
                setApplied(reset);
                setPage(1);
              }}
            />
          </form>
        </div>
      </section>

      <DataCard count={result.items.length} emptyText="调整查询条件，或新建一个会员等级。" loading={loading} title="会员等级列表">
        <div className="table-responsive">
          <table className="table admin-data-table membership-table mb-0">
            <thead>
              <tr>
                <th>编号</th>
                <th>会员等级</th>
                <th>周期与价格</th>
                <th>排序</th>
                <th>状态</th>
                <th className="text-end">操作</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((plan) => (
                <tr key={plan.id}>
                  <td className="admin-table-id" data-label="编号">#{plan.id}</td>
                  <td data-label="会员等级">
                    <strong>{value(plan, "icon") || "👑"} {value(plan, "name")}</strong>
                    <small className="membership-table-subtitle">{value(plan, "plan_code")}</small>
                  </td>
                  <td data-label="周期与价格">
                    {value(plan, "billing_cycle")} · {value(plan, "currency")} {value(plan, "price") || "0"}
                  </td>
                  <td data-label="排序">等级 {value(plan, "tier_rank")} / 列表 {value(plan, "sort_order")}</td>
                  <td data-label="状态">
                    <Status status={value(plan, "status")} />
                    {isEnabled(plan, "is_default") && <span className="membership-default-mark">默认</span>}
                  </td>
                  <td className="admin-table-actions-cell" data-label="操作">
                    <div className="admin-table-actions">
                      <button className="admin-table-button" onClick={() => void openDialog("detail", plan)} type="button">
                        <Eye aria-hidden="true" size={14} /> 查看详情
                      </button>
                      <button className="admin-table-button is-positive" onClick={() => void openBenefitBindings(plan)} type="button">
                        <Check aria-hidden="true" size={14} /> 关联权益
                      </button>
                      <button className="admin-table-button" onClick={() => void openDialog("edit", plan)} type="button">
                        <FilePenLine aria-hidden="true" size={14} /> 修改
                      </button>
                      <button className="admin-table-button is-warning" onClick={() => void removePlan(plan)} type="button">
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
      <Pagination page={page} total={result.total} totalPages={result.total_pages} onChange={setPage} />

      {dialog && (
        <ManagementDialog
          onClose={closeDialog}
          title={dialog.mode === "new" ? "新建会员等级" : dialog.mode === "edit" ? "修改会员等级" : "会员等级详情"}
          wide={dialog.mode === "edit"}
        >
          {detailLoading ? (
            <p className="membership-dialog-loading">正在读取详细信息…</p>
          ) : dialog.mode === "detail" && selected ? (
            <>
              <div className="membership-detail-actions">
                <button className="admin-action-button admin-action-primary" onClick={() => setDialog({ mode: "edit", record: selected })} type="button">
                  <FilePenLine aria-hidden="true" size={16} /> 修改配置
                </button>
              </div>
              <DetailGrid
                items={[
                  { label: "等级编码", value: value(selected, "plan_code") },
                  { label: "会员名称", value: value(selected, "name") },
                  { label: "英文名称", value: value(selected, "name_en") },
                  { label: "状态", value: <Status status={value(selected, "status")} /> },
                  { label: "计费周期", value: value(selected, "billing_cycle") },
                  { label: "有效天数", value: value(selected, "duration_days") },
                  { label: "展示价格", value: `${value(selected, "currency")} ${value(selected, "price")}` },
                  { label: "默认会员", value: isEnabled(selected, "is_default") ? "是" : "否" },
                  { label: "说明", value: value(selected, "description") },
                ]}
              />
              <section className="membership-related-section">
                <h3>已配置权益</h3>
                {entries(selected, "benefits").length ? (
                  <div className="table-responsive">
                    <table className="table membership-related-table mb-0">
                      <thead><tr><th>权益</th><th>类型</th><th>覆盖值</th></tr></thead>
                      <tbody>
                        {entries(selected, "benefits").map((benefit) => (
                          <tr key={benefit.id}>
                            <td>{value(benefit, "benefit_name")}</td>
                            <td>{value(benefit, "benefit_type")}</td>
                            <td>{jsonText(benefit.grant_value) || "继承默认值"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="membership-help">尚未配置权益。</p>}
              </section>
            </>
          ) : (
            <>
              <form className="row g-3 membership-dialog-form" key={selected?.id || "new-plan"} onSubmit={savePlan}>
                <FormInput defaultValue={value(selected, "plan_code")} label="等级编码" name="plan_code" required />
                <FormInput defaultValue={value(selected, "name")} label="会员名称" name="name" required />
                <FormInput defaultValue={value(selected, "name_en")} label="英文名称" name="name_en" />
                <FormInput defaultValue={value(selected, "tier_rank") || "0"} label="等级排序" name="tier_rank" type="number" />
                <FormSelect defaultValue={value(selected, "billing_cycle") || "manual"} label="周期" name="billing_cycle" options={[["free", "免费"], ["manual", "手动发放"], ["monthly", "月度"], ["quarterly", "季度"], ["yearly", "年度"], ["lifetime", "终身"]]} />
                <FormInput defaultValue={value(selected, "duration_days")} label="有效天数" name="duration_days" type="number" />
                <FormInput defaultValue={value(selected, "price") || "0"} label="展示价格" name="price" step="0.01" type="number" />
                <FormInput defaultValue={value(selected, "currency") || "CNY"} label="币种" name="currency" />
                <FormInput defaultValue={value(selected, "icon")} label="图标或 emoji" name="icon" />
                <FormInput defaultValue={value(selected, "badge_text")} label="角标文案" name="badge_text" />
                <FormInput defaultValue={value(selected, "sort_order") || "0"} label="列表排序" name="sort_order" type="number" />
                <FormSelect defaultValue={value(selected, "status") || "draft"} label="状态" name="status" options={planStatusOptions.slice(1)} />
                <FormTextarea defaultValue={value(selected, "description")} label="说明" name="description" />
                <div className="col-md-6 d-flex align-items-end">
                  <label className="membership-check"><input defaultChecked={isEnabled(selected, "is_default")} name="is_default" type="checkbox" /> 作为新用户默认会员</label>
                </div>
                <div className="col-12 membership-form-actions">
                  <button className="admin-action-button admin-action-primary" disabled={busy} type="submit"><Save aria-hidden="true" size={16} /> 保存会员等级</button>
                  {selected && <button className="admin-action-button membership-danger-button" disabled={busy} onClick={() => void removePlan(selected)} type="button"><Trash2 aria-hidden="true" size={16} /> 删除</button>}
                </div>
              </form>
            </>
          )}
        </ManagementDialog>
      )}

      {benefitBindingPlan && (
        <ManagementDialog
          onClose={closeBenefitBindings}
          title={`关联权益 · ${value(detail || benefitBindingPlan, "name")}`}
          wide
        >
          {detailLoading ? (
            <p className="membership-dialog-loading">正在读取会员权益…</p>
          ) : !benefitBindingReady ? (
            <p className="membership-dialog-loading">无法读取当前会员权益，请关闭后重试。</p>
          ) : (
            <section className="membership-benefit-authorization">
              <div className="membership-related-heading">
                <div>
                  <p>会员权益配置</p>
                  <h3>选择该会员等级包含的权益</h3>
                </div>
                <button
                  className="admin-action-button admin-action-primary"
                  disabled={busy || !benefitBindingReady}
                  onClick={() => void saveBindings()}
                  type="button"
                >
                  <Save aria-hidden="true" size={16} /> 保存关联权益
                </button>
              </div>
              <p className="membership-help">
                勾选权益后保存即可关联；取消勾选并保存即可移除。覆盖值留空时使用该权益的默认值。
              </p>
              <div className="membership-binding-list">
                {benefits.map((benefit) => {
                  const binding = bindings[benefit.id] || { enabled: false, grant: "" };
                  return (
                    <div className="membership-binding-row" key={benefit.id}>
                      <label className="membership-check">
                        <input
                          checked={binding.enabled}
                          onChange={(event) =>
                            setBindings((current) => ({
                              ...current,
                              [benefit.id]: { ...binding, enabled: event.target.checked },
                            }))
                          }
                          type="checkbox"
                        />
                        <span>
                          <strong>{value(benefit, "name")}</strong>
                          <small>{value(benefit, "benefit_code")} · {benefitTypeLabel(value(benefit, "benefit_type"))}</small>
                        </span>
                      </label>
                      <input
                        aria-label={`${value(benefit, "name")} 覆盖值`}
                        disabled={!binding.enabled}
                        onChange={(event) =>
                          setBindings((current) => ({
                            ...current,
                            [benefit.id]: { ...binding, grant: event.target.value },
                          }))
                        }
                        placeholder="覆盖值 JSON（可留空）"
                        value={binding.grant}
                      />
                    </div>
                  );
                })}
                {!benefits.length && <p className="membership-empty">请先新建权益，再关联到会员等级。</p>}
              </div>
            </section>
          )}
        </ManagementDialog>
      )}
    </div>
  );
}

function BenefitsPanel({
  courses,
  refreshKey,
  refreshSupport,
  reportError,
  topics,
}: {
  courses: Entry[];
  refreshKey: number;
  refreshSupport: () => Promise<unknown>;
  reportError: (message: string) => void;
  topics: Entry[];
}) {
  const [filters, setFilters] = useState({ q: "", status: "", benefit_type: "" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [courseBindingBenefit, setCourseBindingBenefit] = useState<Entry | null>(null);
  const [courseFilters, setCourseFilters] = useState({
    q: "",
    topic_id: "",
    authorization: "all",
  });
  const [detail, setDetail] = useState<Entry | null>(null);
  const [bindings, setBindings] = useState<Record<string, CourseBinding>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const { loading, reload, result } = usePagedList(
    "/admin/membership-benefits",
    applied,
    page,
    refreshKey,
    reportError,
  );

  const loadDetail = useCallback(
    async (benefitId: number) => {
      setDetailLoading(true);
      try {
        const next = await api<Entry>(`/admin/membership-benefits/${benefitId}`);
        setDetail(next);
        setBindings(bindingsForBenefit(next));
        return next;
      } catch (reason) {
        reportError((reason as Error).message);
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    [reportError],
  );

  async function openDialog(mode: DialogMode, record?: Entry) {
    setCourseBindingBenefit(null);
    setDialog({ mode, record });
    setDetail(record || null);
    setBindings({});
    if (record) await loadDetail(record.id);
  }

  function closeDialog() {
    setDialog(null);
    setDetail(null);
    setBindings({});
  }

  async function openCourseAuthorization(record: Entry) {
    setDialog(null);
    setCourseBindingBenefit(record);
    setCourseFilters({ q: "", topic_id: "", authorization: "all" });
    setDetail(null);
    setBindings({});
    reportError("");
    await loadDetail(record.id);
  }

  function closeCourseAuthorization() {
    setCourseBindingBenefit(null);
    setDetail(null);
    setBindings({});
  }

  async function refreshAfterChange() {
    await Promise.all([reload(), refreshSupport()]);
  }

  async function saveBenefit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedId = numberValue(detail || dialog?.record, "id");
    setBusy(true);
    reportError("");
    try {
      const saved = await api<Entry>(
        `/admin/membership-benefits${selectedId ? `/${selectedId}` : ""}`,
        selectedId ? "PUT" : "POST",
        {
          benefit_code: String(form.get("benefit_code") || ""),
          name: String(form.get("name") || ""),
          name_en: String(form.get("name_en") || ""),
          description: String(form.get("description") || ""),
          benefit_type: String(form.get("benefit_type") || "content_access"),
          value_type: String(form.get("value_type") || "boolean"),
          unit: String(form.get("unit") || ""),
          scope: readJson(form.get("scope"), "适用范围"),
          default_value: readJson(form.get("default_value"), "默认权益值"),
          icon: String(form.get("icon") || ""),
          sort_order: Number(form.get("sort_order") || 0),
          status: String(form.get("status") || "active"),
        },
      );
      await refreshAfterChange();
      await openDialog("edit", saved);
    } catch (reason) {
      reportError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveBindings() {
    const selectedId = numberValue(detail, "id");
    if (!selectedId || selectedId !== numberValue(courseBindingBenefit, "id")) return;
    setBusy(true);
    reportError("");
    try {
      const items = courses.flatMap((course) =>
        ["study", "download"].flatMap((accessAction) => {
          const binding = bindings[`${course.id}:${accessAction}`];
          return binding?.enabled
            ? [{ course_id: course.id, access_action: accessAction, is_enabled: true, sort_order: numberValue(course, "sort_order") }]
            : [];
        }),
      );
      await api(`/admin/membership-benefits/${selectedId}/courses`, "PUT", { items });
      setDetail(null);
      await loadDetail(selectedId);
    } catch (reason) {
      reportError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeBenefit(record: Entry) {
    if (!window.confirm(`删除权益“${value(record, "name")}”？`)) return;
    setBusy(true);
    reportError("");
    try {
      await api(`/admin/membership-benefits/${record.id}`, "DELETE");
      closeDialog();
      if (result.items.length === 1 && page > 1) {
        await refreshSupport();
        setPage(page - 1);
      } else {
        await refreshAfterChange();
      }
    } catch (reason) {
      reportError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selected = detail || dialog?.record || null;
  const courseBindingReady = Boolean(
    detail && numberValue(detail, "id") === numberValue(courseBindingBenefit, "id"),
  );
  const topicNames = new Map(topics.map((topic) => [String(topic.id), value(topic, "title")]));
  const isCourseAuthorized = (course: Entry) =>
    ["study", "download"].some(
      (accessAction) => bindings[`${course.id}:${accessAction}`]?.enabled,
    );
  const filterTerm = courseFilters.q.trim().toLocaleLowerCase();
  const manageableCourses = courses.filter(
    (course) => value(course, "access_policy") === "benefit" || isCourseAuthorized(course),
  );
  const filteredCourses = manageableCourses
    .filter((course) => {
      const matchesTerm = !filterTerm || [
        value(course, "title"),
        value(course, "title_en"),
        value(course, "course_code"),
        value(course, "course_type"),
      ].join(" ").toLocaleLowerCase().includes(filterTerm);
      const matchesTopic = !courseFilters.topic_id || value(course, "topic_id") === courseFilters.topic_id;
      const authorized = isCourseAuthorized(course);
      const matchesAuthorization =
        courseFilters.authorization === "authorized"
          ? authorized
          : courseFilters.authorization === "unassigned"
            ? !authorized
            : true;
      return matchesTerm && matchesTopic && matchesAuthorization;
    })
    .sort((first, second) =>
      Number(isCourseAuthorized(second)) - Number(isCourseAuthorized(first)) ||
      numberValue(first, "sort_order") - numberValue(second, "sort_order") ||
      first.id - second.id,
    );
  return (
    <div className="membership-list-page">
      <section className="card shadow-sm admin-filter-panel membership-filter-card">
        <div className="card-body">
          <div className="admin-filter-panel-title">
            <div>
              <p>查询会员权益</p>
              <span>按权益名称、编码、类型或状态筛选。</span>
            </div>
          </div>
          <form
            className="row g-3 admin-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              reportError("");
              setPage(1);
              setApplied(filters);
            }}
          >
            <div className="col-md-4">
              <label className="form-label" htmlFor="benefit-query">名称或权益编码</label>
              <input className="form-control" id="benefit-query" onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="例如 course-access" value={filters.q} />
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="benefit-type">权益类型</label>
              <select className="form-select" id="benefit-type" onChange={(event) => setFilters((current) => ({ ...current, benefit_type: event.target.value }))} value={filters.benefit_type}>
                <option value="">全部类型</option>
                {[["content_access", "课程访问"], ["feature_access", "功能访问"], ["quota", "额度"], ["discount", "折扣"], ["service", "服务"]].map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="benefit-status">状态</label>
              <select className="form-select" id="benefit-status" onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}>
                {benefitStatusOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <FilterActions
              createLabel="新建"
              onCreate={() => openDialog("new")}
              onReset={() => {
                const reset = { q: "", status: "", benefit_type: "" };
                setFilters(reset);
                setApplied(reset);
                setPage(1);
              }}
            />
          </form>
        </div>
      </section>

      <DataCard count={result.items.length} emptyText="调整查询条件，或新建一项权益。" loading={loading} title="会员权益列表">
        <div className="table-responsive">
          <table className="table admin-data-table membership-table mb-0">
            <thead><tr><th>编号</th><th>权益</th><th>类型</th><th>默认值</th><th>状态</th><th className="text-end">操作</th></tr></thead>
            <tbody>
              {result.items.map((benefit) => (
                <tr key={benefit.id}>
                  <td className="admin-table-id" data-label="编号">#{benefit.id}</td>
                  <td data-label="权益"><strong>{value(benefit, "icon") || "✓"} {value(benefit, "name")}</strong><small className="membership-table-subtitle">{value(benefit, "benefit_code")}</small></td>
                  <td data-label="类型">{benefitTypeLabel(value(benefit, "benefit_type"))}<small className="membership-table-subtitle">{value(benefit, "value_type")}</small></td>
                  <td className="membership-json-cell" data-label="默认值">{jsonText(benefit.default_value) || "—"}</td>
                  <td data-label="状态"><Status status={value(benefit, "status")} /></td>
                  <td className="admin-table-actions-cell" data-label="操作">
                    <div className="admin-table-actions">
                      <button className="admin-table-button" onClick={() => void openDialog("detail", benefit)} type="button"><Eye aria-hidden="true" size={14} /> 查看详情</button>
                      {value(benefit, "benefit_type") === "content_access" && <button className="admin-table-button is-positive" onClick={() => void openCourseAuthorization(benefit)} type="button"><BookCopy aria-hidden="true" size={14} /> 授权课程</button>}
                      <button className="admin-table-button" onClick={() => void openDialog("edit", benefit)} type="button"><FilePenLine aria-hidden="true" size={14} /> 修改</button>
                      <button className="admin-table-button is-warning" onClick={() => void removeBenefit(benefit)} type="button">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
      <Pagination page={page} total={result.total} totalPages={result.total_pages} onChange={setPage} />

      {dialog && (
        <ManagementDialog onClose={closeDialog} title={dialog.mode === "new" ? "新建会员权益" : dialog.mode === "edit" ? "修改会员权益" : "会员权益详情"} wide={dialog.mode === "edit"}>
          {detailLoading ? <p className="membership-dialog-loading">正在读取详细信息…</p> : dialog.mode === "detail" && selected ? (
            <>
              <div className="membership-detail-actions"><button className="admin-action-button admin-action-primary" onClick={() => setDialog({ mode: "edit", record: selected })} type="button"><FilePenLine aria-hidden="true" size={16} /> 修改配置</button></div>
              <DetailGrid items={[
                { label: "权益编码", value: value(selected, "benefit_code") },
                { label: "权益名称", value: value(selected, "name") },
                { label: "权益类型", value: benefitTypeLabel(value(selected, "benefit_type")) },
                { label: "值类型", value: value(selected, "value_type") },
                { label: "默认权益值", value: <pre className="membership-detail-json">{jsonText(selected.default_value) || "—"}</pre> },
                { label: "适用范围", value: <pre className="membership-detail-json">{jsonText(selected.scope) || "全部课程"}</pre> },
                { label: "状态", value: <Status status={value(selected, "status")} /> },
                { label: "说明", value: value(selected, "description") },
              ]} />
              <section className="membership-related-section">
                <h3>已授权课程</h3>
                {entries(selected, "courses").length ? (
                  <div className="table-responsive"><table className="table membership-related-table mb-0"><thead><tr><th>课程</th><th>访问动作</th><th>教材</th></tr></thead><tbody>{entries(selected, "courses").map((course) => <tr key={course.id}><td>{value(course, "course_title")}</td><td>{value(course, "access_action") === "download" ? "下载" : "学习"}</td><td>{value(course, "material_title") || "—"}</td></tr>)}</tbody></table></div>
                ) : <p className="membership-help">尚未绑定需要解锁的课程。</p>}
              </section>
            </>
          ) : (
            <>
              <form className="row g-3 membership-dialog-form" key={selected?.id || "new-benefit"} onSubmit={saveBenefit}>
                <FormInput defaultValue={value(selected, "benefit_code")} label="权益编码" name="benefit_code" required />
                <FormInput defaultValue={value(selected, "name")} label="权益名称" name="name" required />
                <FormInput defaultValue={value(selected, "name_en")} label="英文名称" name="name_en" />
                <FormInput defaultValue={value(selected, "icon")} label="图标或 emoji" name="icon" />
                <FormSelect defaultValue={value(selected, "benefit_type") || "content_access"} label="权益类型" name="benefit_type" options={[["content_access", "课程访问"], ["feature_access", "功能访问"], ["quota", "额度"], ["discount", "折扣"], ["service", "服务"]]} />
                <FormSelect defaultValue={value(selected, "value_type") || "boolean"} label="值类型" name="value_type" options={[["boolean", "布尔值"], ["integer", "整数"], ["decimal", "小数"], ["string", "字符串"], ["json", "JSON"]]} />
                <FormInput defaultValue={value(selected, "unit")} label="额度单位" name="unit" />
                <FormInput defaultValue={value(selected, "sort_order") || "0"} label="列表排序" name="sort_order" type="number" />
                <FormSelect defaultValue={value(selected, "status") || "active"} label="状态" name="status" options={benefitStatusOptions.slice(1)} />
                <FormTextarea defaultValue={value(selected, "description")} label="说明" name="description" />
                <FormTextarea defaultValue={jsonText(selected?.scope)} label="适用范围 JSON" name="scope" placeholder='例如 {"module":"daily-speaking"}' />
                <FormTextarea defaultValue={jsonText(selected?.default_value)} label="默认权益值 JSON" name="default_value" placeholder="例如 true、20 或 {&quot;discount&quot;:0.9}" />
                <div className="col-12 membership-form-actions"><button className="admin-action-button admin-action-primary" disabled={busy} type="submit"><Save aria-hidden="true" size={16} /> 保存权益</button>{selected && <button className="admin-action-button membership-danger-button" disabled={busy} onClick={() => void removeBenefit(selected)} type="button"><Trash2 aria-hidden="true" size={16} /> 删除</button>}</div>
              </form>
            </>
          )}
        </ManagementDialog>
      )}

      {courseBindingBenefit && (
        <ManagementDialog
          onClose={closeCourseAuthorization}
          title={`授权课程 · ${value(detail || courseBindingBenefit, "name")}`}
          wide
        >
          {detailLoading ? (
            <p className="membership-dialog-loading">正在读取课程授权…</p>
          ) : !courseBindingReady ? (
            <p className="membership-dialog-loading">无法读取当前课程授权，请关闭后重试。</p>
          ) : (
            <section className="membership-course-authorization">
              <div className="membership-related-heading">
                <div>
                  <p>课程权益绑定</p>
                  <h3>选择需要授权的课程</h3>
                </div>
                <button
                  className="admin-action-button admin-action-primary"
                  disabled={busy || !courseBindingReady}
                  onClick={() => void saveBindings()}
                  type="button"
                >
                  <Save aria-hidden="true" size={16} /> 保存授权课程
                </button>
              </div>
              <p className="membership-help">
                勾选“学习”即可增加课程；取消该课程的全部勾选并保存，即可移除课程。仅访问策略为“会员权益”的课程可新增授权。
              </p>
              <div className="row g-2 membership-course-filter">
                <div className="col-md-5">
                  <label className="form-label" htmlFor="course-authorization-query">搜索课程</label>
                  <input
                    className="form-control"
                    id="course-authorization-query"
                    onChange={(event) => setCourseFilters((current) => ({ ...current, q: event.target.value }))}
                    placeholder="名称、英文名、课程编码或类型"
                    value={courseFilters.q}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="course-authorization-topic">专题</label>
                  <select
                    className="form-select"
                    id="course-authorization-topic"
                    onChange={(event) => setCourseFilters((current) => ({ ...current, topic_id: event.target.value }))}
                    value={courseFilters.topic_id}
                  >
                    <option value="">全部专题</option>
                    {topics.map((topic) => <option key={topic.id} value={topic.id}>{value(topic, "title")}</option>)}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label" htmlFor="course-authorization-status">授权状态</label>
                  <select
                    className="form-select"
                    id="course-authorization-status"
                    onChange={(event) => setCourseFilters((current) => ({ ...current, authorization: event.target.value }))}
                    value={courseFilters.authorization}
                  >
                    <option value="all">全部</option>
                    <option value="authorized">已授权</option>
                    <option value="unassigned">未授权</option>
                  </select>
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    className="admin-action-button admin-action-secondary membership-course-filter-reset"
                    onClick={() => setCourseFilters({ q: "", topic_id: "", authorization: "all" })}
                    type="button"
                  >
                    重置筛选
                  </button>
                </div>
                <div className="col-12 membership-course-filter-summary">
                  已显示 {filteredCourses.length} / {manageableCourses.length} 门可管理课程，已授权课程优先展示。
                </div>
              </div>
              <div className="membership-course-list">
                {filteredCourses.map((course) => (
                  <div className="membership-course-row" key={course.id}>
                    <div>
                      <strong>{value(course, "title")}</strong>
                      <small>{value(course, "course_code")} · {topicNames.get(value(course, "topic_id")) || "未归属专题"} · {isCourseAuthorized(course) ? "已授权" : "未授权"}</small>
                    </div>
                    <div className="membership-course-actions">
                      {["study", "download"].map((accessAction) => {
                        const key = `${course.id}:${accessAction}`;
                        return (
                          <label className="membership-check" key={key}>
                            <input
                              checked={bindings[key]?.enabled || false}
                              disabled={value(course, "access_policy") !== "benefit"}
                              onChange={(event) =>
                                setBindings((current) => ({
                                  ...current,
                                  [key]: { enabled: event.target.checked },
                                }))
                              }
                              type="checkbox"
                            />
                            {accessAction === "study" ? "学习" : "下载"}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {!manageableCourses.length ? (
                  <p className="membership-empty">暂无可授权课程，请先将课程访问策略设为“会员权益”。</p>
                ) : !filteredCourses.length ? (
                  <p className="membership-empty">没有匹配课程，调整筛选条件后重试。</p>
                ) : null}
              </div>
            </section>
          )}
        </ManagementDialog>
      )}
    </div>
  );
}

function MaterialsPanel({
  refreshKey,
  refreshSupport,
  reportError,
  templates,
  topics,
}: {
  refreshKey: number;
  refreshSupport: () => Promise<unknown>;
  reportError: (message: string) => void;
  templates: Entry[];
  topics: Entry[];
}) {
  const [filters, setFilters] = useState({ q: "", topic_id: "", is_published: "" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [detail, setDetail] = useState<Entry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lessonEditorOpen, setLessonEditorOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const { loading, reload, result } = usePagedList(
    "/admin/learning-materials",
    applied,
    page,
    refreshKey,
    reportError,
  );

  const loadDetail = useCallback(
    async (materialId: number) => {
      setDetailLoading(true);
      try {
        const next = await api<Entry>(`/admin/learning-materials/${materialId}`);
        setDetail(next);
        return next;
      } catch (reason) {
        reportError((reason as Error).message);
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    [reportError],
  );

  async function openDialog(mode: DialogMode, record?: Entry) {
    setDialog({ mode, record });
    setDetail(record || null);
    setLessonEditorOpen(false);
    setEditingLesson(null);
    if (record) await loadDetail(record.id);
  }

  function closeDialog() {
    setDialog(null);
    setDetail(null);
    setLessonEditorOpen(false);
    setEditingLesson(null);
  }

  async function refreshAfterChange() {
    await Promise.all([reload(), refreshSupport()]);
  }

  async function saveMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedId = numberValue(detail || dialog?.record, "id");
    setBusy(true);
    reportError("");
    try {
      const saved = await api<Entry>(
        `/admin/learning-materials${selectedId ? `/${selectedId}` : ""}`,
        selectedId ? "PUT" : "POST",
        {
          topic_id: Number(form.get("topic_id")),
          template_id: optionalNumber(form.get("template_id")),
          material_code: String(form.get("material_code") || ""),
          title: String(form.get("title") || ""),
          title_en: String(form.get("title_en") || ""),
          summary: String(form.get("summary") || ""),
          material_type: String(form.get("material_type") || "textbook"),
          publisher: String(form.get("publisher") || ""),
          version_name: String(form.get("version_name") || ""),
          cover_url: String(form.get("cover_url") || ""),
          difficulty_code: String(form.get("difficulty_code") || ""),
          estimated_minutes: optionalNumber(form.get("estimated_minutes")),
          sort_order: Number(form.get("sort_order") || 0),
          is_published: form.get("is_published") === "on" ? 1 : 0,
        },
      );
      await refreshAfterChange();
      await openDialog("edit", saved);
    } catch (reason) {
      reportError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedId = numberValue(detail || dialog?.record, "id");
    if (!selectedId) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    reportError("");
    try {
      await api(
        editingLesson
          ? `/admin/learning-material-lessons/${editingLesson.id}`
          : `/admin/learning-materials/${selectedId}/lessons`,
        editingLesson ? "PUT" : "POST",
        {
          lesson_code: String(form.get("lesson_code") || ""),
          title: String(form.get("title") || ""),
          title_en: String(form.get("title_en") || ""),
          summary: String(form.get("summary") || ""),
          lesson_format: String(form.get("lesson_format") || "source"),
          source_resource: String(form.get("source_resource") || ""),
          source_reference_id: optionalNumber(form.get("source_reference_id")),
          content: readJson(form.get("content"), "课时内容"),
          estimated_minutes: optionalNumber(form.get("estimated_minutes")),
          sort_order: Number(form.get("sort_order") || 0),
          is_published: form.get("is_published") === "on" ? 1 : 0,
        },
      );
      setLessonEditorOpen(false);
      setEditingLesson(null);
      await loadDetail(selectedId);
    } catch (reason) {
      reportError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeMaterial(record: Entry) {
    if (!window.confirm(`删除教材“${value(record, "title")}”？请先删除它的课时和课程关联。`)) return;
    setBusy(true);
    reportError("");
    try {
      await api(`/admin/learning-materials/${record.id}`, "DELETE");
      closeDialog();
      if (result.items.length === 1 && page > 1) {
        await refreshSupport();
        setPage(page - 1);
      } else {
        await refreshAfterChange();
      }
    } catch (reason) {
      reportError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeLesson(lesson: Entry) {
    if (!window.confirm(`删除课时“${value(lesson, "title")}”？`)) return;
    setBusy(true);
    reportError("");
    try {
      await api(`/admin/learning-material-lessons/${lesson.id}`, "DELETE");
      const selectedId = numberValue(detail || dialog?.record, "id");
      if (selectedId) await loadDetail(selectedId);
    } catch (reason) {
      reportError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selected = detail || dialog?.record || null;
  const lessons = entries(detail || { id: 0 }, "lessons");
  const topicName = (topicId: number) =>
    value(topics.find((topic) => topic.id === topicId), "title") || `专题 #${topicId}`;
  const templateName = (material: Entry | null | undefined) => {
    const template = material?.template;
    if (template && typeof template === "object" && !Array.isArray(template)) {
      const entry = template as Entry;
      return value(entry, "name") || value(entry, "renderer") || "未配置";
    }
    return "未配置";
  };
  const activeTemplates = templates.filter(
    (template) => value(template, "status") === "active",
  );
  const defaultTemplateId =
    numberValue(selected, "template_id") ||
    numberValue(
      activeTemplates.find((template) => value(template, "code") === "textbook"),
      "id",
    ) ||
    numberValue(activeTemplates[0], "id");
  const showLessonEditor = dialog?.mode === "lessons" && lessonEditorOpen;
  return (
    <div className="membership-list-page">
      <section className="card shadow-sm admin-filter-panel membership-filter-card">
        <div className="card-body">
          <div className="admin-filter-panel-title">
            <div><p>查询教材</p><span>按教材名称、来源、专题或发布状态查询。</span></div>
          </div>
          <form
            className="row g-3 admin-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              reportError("");
              setPage(1);
              setApplied(filters);
            }}
          >
            <div className="col-md-4"><label className="form-label" htmlFor="material-query">教材名称或编码</label><input className="form-control" id="material-query" onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="例如 Travel English" value={filters.q} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="material-topic-filter">所属专题</label><select className="form-select" id="material-topic-filter" onChange={(event) => setFilters((current) => ({ ...current, topic_id: event.target.value }))} value={filters.topic_id}><option value="">全部专题</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{value(topic, "title")}</option>)}</select></div>
            <div className="col-md-2"><label className="form-label" htmlFor="material-status">发布状态</label><select className="form-select" id="material-status" onChange={(event) => setFilters((current) => ({ ...current, is_published: event.target.value }))} value={filters.is_published}><option value="">全部状态</option><option value="1">已发布</option><option value="0">未发布</option></select></div>
            <FilterActions
              createLabel="新建"
              onCreate={() => openDialog("new")}
              onReset={() => {
                const reset = { q: "", topic_id: "", is_published: "" };
                setFilters(reset);
                setApplied(reset);
                setPage(1);
              }}
            />
          </form>
        </div>
      </section>

      <DataCard count={result.items.length} emptyText="调整查询条件，或新建一本教材。" loading={loading} title="教材列表 · learning_material">
        <div className="table-responsive">
          <table className="table admin-data-table membership-table mb-0">
            <thead><tr><th>编号</th><th>教材</th><th>所属专题</th><th>类型与模板</th><th>发布状态</th><th className="text-end">操作</th></tr></thead>
            <tbody>
              {result.items.map((material) => (
                <tr key={material.id}>
                  <td className="admin-table-id" data-label="编号">#{material.id}</td>
                  <td data-label="教材"><strong>{value(material, "title")}</strong><small className="membership-table-subtitle">{value(material, "material_code")}</small></td>
                  <td data-label="所属专题">{topicName(numberValue(material, "topic_id"))}</td>
                  <td data-label="类型与模板">{value(material, "material_type")}<small className="membership-table-subtitle">{templateName(material)}</small></td>
                  <td data-label="发布状态"><Status status={isEnabled(material, "is_published") ? "published" : "unpublished"} /></td>
                  <td className="admin-table-actions-cell" data-label="操作"><div className="admin-table-actions"><button className="admin-table-button" onClick={() => void openDialog("detail", material)} type="button"><Eye aria-hidden="true" size={14} /> 查看详情</button><button className="admin-table-button" onClick={() => void openDialog("edit", material)} type="button"><FilePenLine aria-hidden="true" size={14} /> 修改教材</button><button className="admin-table-button" onClick={() => void openDialog("lessons", material)} type="button">维护课时</button><button className="admin-table-button is-warning" onClick={() => void removeMaterial(material)} type="button">删除</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
      <Pagination page={page} total={result.total} totalPages={result.total_pages} onChange={setPage} />

      {dialog && (
        <ManagementDialog onClose={closeDialog} title={dialog.mode === "new" ? "新建教材 · learning_material" : dialog.mode === "edit" ? "修改教材 · learning_material" : dialog.mode === "lessons" ? "维护课时列表 · learning_material_lesson" : "教材详情 · learning_material"} wide>
          {detailLoading ? <p className="membership-dialog-loading">正在读取教材和课时…</p> : dialog.mode === "detail" && selected ? (
            <>
              <DetailGrid items={[
                { label: "教材编码", value: value(selected, "material_code") },
                { label: "教材名称", value: value(selected, "title") },
                { label: "所属专题", value: topicName(numberValue(selected, "topic_id")) },
                { label: "教材类型", value: value(selected, "material_type") },
                { label: "渲染模板", value: templateName(selected) },
                { label: "出版社或来源", value: value(selected, "publisher") },
                { label: "版本或册别", value: value(selected, "version_name") },
                { label: "预计学习时长", value: value(selected, "estimated_minutes") ? `${value(selected, "estimated_minutes")} 分钟` : "—" },
                { label: "发布状态", value: <Status status={isEnabled(selected, "is_published") ? "published" : "unpublished"} /> },
                { label: "教材简介", value: value(selected, "summary") },
              ]} />
            </>
          ) : (
            <>
              {dialog.mode !== "lessons" && (
              <form className="row g-3 membership-dialog-form" key={selected?.id || "new-material"} onSubmit={saveMaterial}>
                <div className="col-md-6"><label className="form-label" htmlFor="material-topic">所属专题</label><select className="form-select" defaultValue={value(selected, "topic_id")} id="material-topic" name="topic_id" required><option value="">请选择专题</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{value(topic, "title")}</option>)}</select></div>
                <FormInput defaultValue={value(selected, "material_code")} label="教材编码" name="material_code" required />
                <FormInput defaultValue={value(selected, "title")} label="教材名称" name="title" required />
                <FormInput defaultValue={value(selected, "title_en")} label="英文名称" name="title_en" />
                <FormSelect defaultValue={value(selected, "material_type") || "textbook"} label="教材类型" name="material_type" options={materialTypes.map((item) => [item, item])} />
                <FormSelect defaultValue={String(defaultTemplateId || "")} label="渲染模板" name="template_id" options={activeTemplates.map((template) => [String(template.id), `${value(template, "name")} · ${value(template, "renderer")}`])} />
                <FormInput defaultValue={value(selected, "publisher")} label="出版社或来源" name="publisher" />
                <FormInput defaultValue={value(selected, "version_name")} label="版本或册别" name="version_name" />
                <FormInput defaultValue={value(selected, "difficulty_code")} label="难度编码" name="difficulty_code" />
                <FormInput defaultValue={value(selected, "cover_url")} label="封面地址" name="cover_url" />
                <FormInput defaultValue={value(selected, "estimated_minutes")} label="预计学习分钟" name="estimated_minutes" type="number" />
                <FormInput defaultValue={value(selected, "sort_order") || "0"} label="列表排序" name="sort_order" type="number" />
                <FormTextarea defaultValue={value(selected, "summary")} label="教材简介" name="summary" />
                <div className="col-md-6 d-flex align-items-end"><label className="membership-check"><input defaultChecked={selected ? isEnabled(selected, "is_published") : true} name="is_published" type="checkbox" /> 对学习者发布</label></div>
                <div className="col-12 membership-form-actions"><button className="admin-action-button admin-action-primary" disabled={busy} type="submit"><Save aria-hidden="true" size={16} /> 保存教材</button>{selected && <button className="admin-action-button membership-danger-button" disabled={busy} onClick={() => void removeMaterial(selected)} type="button"><Trash2 aria-hidden="true" size={16} /> 删除</button>}</div>
              </form>
              )}
              {dialog.mode === "lessons" && selected && (
                <>
                  {showLessonEditor && (
                    <section className="membership-sub-editor">
                      <div className="membership-related-heading"><div><p>教材课时 · learning_material_lesson</p><h3>{editingLesson ? `修改 ${value(editingLesson, "title")}` : "新增课时"}</h3></div><button className="admin-action-button admin-action-secondary" onClick={() => { setLessonEditorOpen(false); setEditingLesson(null); }} type="button">取消</button></div>
                      <form className="row g-3" key={editingLesson?.id || "new-lesson"} onSubmit={saveLesson}>
                        <input name="lesson_format" type="hidden" value={value(editingLesson, "lesson_format") || "source"} />
                        <FormInput defaultValue={value(editingLesson, "lesson_code")} label="课时编码" name="lesson_code" required />
                        <FormInput defaultValue={value(editingLesson, "title")} label="课时标题" name="title" required />
                        <FormInput defaultValue={value(editingLesson, "title_en")} label="英文标题" name="title_en" />
                        <div className="col-md-6"><label className="form-label" htmlFor="lesson-source">来源资源</label><select className="form-select" defaultValue={value(editingLesson, "source_resource")} id="lesson-source" name="source_resource"><option value="">使用自包含内容</option>{sourceResources.map((resource) => <option key={resource}>{resource}</option>)}</select></div>
                        <FormInput defaultValue={value(editingLesson, "source_reference_id")} label="来源根记录 ID" name="source_reference_id" type="number" />
                        <FormInput defaultValue={value(editingLesson, "estimated_minutes")} label="预计学习分钟" name="estimated_minutes" type="number" />
                        <FormInput defaultValue={value(editingLesson, "sort_order") || "0"} label="课时排序" name="sort_order" type="number" />
                        <FormTextarea defaultValue={value(editingLesson, "summary")} label="课时简介" name="summary" />
                        <FormTextarea defaultValue={jsonText(editingLesson?.content)} label="自包含内容 JSON" name="content" placeholder='没有已有内容表时填写，例如 {"blocks":[]}' />
                        <div className="col-md-6 d-flex align-items-end"><label className="membership-check"><input defaultChecked={editingLesson ? isEnabled(editingLesson, "is_published") : true} name="is_published" type="checkbox" /> 对学习者发布</label></div>
                        <div className="col-12 membership-form-actions"><button className="admin-action-button admin-action-primary" disabled={busy} type="submit"><Save aria-hidden="true" size={16} /> 保存课时</button></div>
                      </form>
                    </section>
                  )}
                  <RelatedLessons lessons={lessons} onAdd={() => { setEditingLesson(null); setLessonEditorOpen(true); }} onEdit={(lesson) => { setEditingLesson(lesson); setLessonEditorOpen(true); }} onRemove={removeLesson} />
                </>
              )}
            </>
          )}
        </ManagementDialog>
      )}
    </div>
  );
}

function lessonSourceLabel(lesson: Entry) {
  if (value(lesson, "lesson_format") === "courseware") return "课件区块";
  return value(lesson, "source_resource") || "自包含内容";
}

function RelatedLessons({
  lessons,
  onAdd,
  onEdit,
  onRemove,
}: {
  lessons: Entry[];
  onAdd?: () => void;
  onEdit: (lesson: Entry) => void;
  onRemove: (lesson: Entry) => void;
}) {
  return (
    <section className="membership-related-section">
      <div className="membership-related-heading">
        <div><p>教材内容</p><h3>课时列表 · learning_material_lesson</h3></div>
        {onAdd && <button className="admin-action-button admin-action-secondary" onClick={onAdd} type="button"><Plus aria-hidden="true" size={16} /> 新增课时</button>}
      </div>
      {lessons.length ? (
        <div className="table-responsive"><table className="table membership-related-table mb-0"><thead><tr><th>课时</th><th>内容来源</th><th>状态</th><th className="text-end">操作</th></tr></thead><tbody>{lessons.map((lesson) => <tr key={lesson.id}><td><strong>{value(lesson, "title")}</strong><small className="membership-table-subtitle">{value(lesson, "lesson_code")}</small></td><td>{lessonSourceLabel(lesson)}</td><td><Status status={isEnabled(lesson, "is_published") ? "published" : "unpublished"} /></td><td className="text-end"><div className="admin-table-actions"><button className="admin-table-button" onClick={() => onEdit(lesson)} type="button">修改</button><button className="admin-table-button is-warning" onClick={() => void onRemove(lesson)} type="button">删除</button></div></td></tr>)}</tbody></table></div>
      ) : <p className="membership-help">这本教材还没有课时。</p>}
    </section>
  );
}

function UserMembershipsPanel({
  plans,
  refreshKey,
  refreshSupport,
  reportError,
}: {
  plans: Entry[];
  refreshKey: number;
  refreshSupport: () => Promise<unknown>;
  reportError: (message: string) => void;
}) {
  const [filters, setFilters] = useState({
    q: "",
    membership_plan_id: "",
    status: "",
    source: "",
  });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [membershipUser, setMembershipUser] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const { loading, reload, result } = usePagedList(
    "/admin/user-memberships",
    applied,
    page,
    refreshKey,
    reportError,
  );

  function closeDialog() {
    setDialog(null);
    setMembershipUser(null);
  }

  async function saveMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selected = dialog?.record;
    const userId = selected?.user_id
      ? numberValue(selected, "user_id")
      : numberValue(membershipUser, "id");
    if (!userId) {
      reportError("请选择需要发放会员的用户。");
      return;
    }
    setBusy(true);
    reportError("");
    try {
      const payload = {
        membership_plan_id: Number(form.get("membership_plan_id")),
        status: String(form.get("status") || "active"),
        source: String(form.get("source") || "manual"),
        starts_at: String(form.get("starts_at") || ""),
        ends_at: String(form.get("ends_at") || "") || null,
        auto_renew: form.get("auto_renew") === "on",
        external_reference: String(form.get("external_reference") || ""),
        cancel_reason: String(form.get("cancel_reason") || ""),
      };
      await api(
        `/admin/users/${userId}/memberships${selected ? `/${selected.id}` : ""}`,
        selected ? "PUT" : "POST",
        payload,
      );
      closeDialog();
      await Promise.all([reload(), refreshSupport()]);
    } catch (reason) {
      reportError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selected = dialog?.record;
  const activePlans = plans.filter((plan) => value(plan, "status") === "active");
  const selectablePlans = selected
    ? plans.filter(
        (plan) =>
          value(plan, "status") === "active" ||
          numberValue(plan, "id") === numberValue(selected, "membership_plan_id"),
      )
    : activePlans;
  return (
    <div className="membership-list-page">
      <section className="card shadow-sm admin-filter-panel membership-filter-card">
        <div className="card-body">
          <div className="admin-filter-panel-title">
            <div><p>查询用户会员</p><span>按用户、会员等级、发放来源和当前状态查看记录。</span></div>
          </div>
          <form
            className="row g-3 admin-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              reportError("");
              setPage(1);
              setApplied(filters);
            }}
          >
            <div className="col-md-3"><label className="form-label" htmlFor="membership-user-query">用户信息</label><input className="form-control" id="membership-user-query" onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="姓名、用户名、邮箱或手机号" value={filters.q} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="membership-plan-filter">会员等级</label><select className="form-select" id="membership-plan-filter" onChange={(event) => setFilters((current) => ({ ...current, membership_plan_id: event.target.value }))} value={filters.membership_plan_id}><option value="">全部等级</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{value(plan, "name")}</option>)}</select></div>
            <div className="col-md-2"><label className="form-label" htmlFor="membership-record-status">状态</label><select className="form-select" id="membership-record-status" onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}>{membershipStatusOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
            <div className="col-md-2"><label className="form-label" htmlFor="membership-source">发放来源</label><select className="form-select" id="membership-source" onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} value={filters.source}><option value="">全部来源</option>{[["manual", "人工发放"], ["purchase", "购买"], ["trial", "试用"], ["gift", "赠送"], ["migration", "数据迁移"], ["signup", "注册赠送"]].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
            <FilterActions
              createLabel="发放会员"
              onCreate={() => {
                if (!activePlans.length) {
                  reportError("当前没有已启用的会员等级，请先在“会员等级”中启用一个等级。");
                  return;
                }
                setMembershipUser(null);
                setDialog({ mode: "new" });
              }}
              onReset={() => {
                const reset = { q: "", membership_plan_id: "", status: "", source: "" };
                setFilters(reset);
                setApplied(reset);
                setPage(1);
              }}
            />
          </form>
        </div>
      </section>

      <DataCard count={result.items.length} emptyText="调整查询条件，或为用户发放会员。" loading={loading} title="用户会员记录">
        <div className="table-responsive">
          <table className="table admin-data-table membership-table mb-0">
            <thead><tr><th>编号</th><th>用户</th><th>会员等级</th><th>有效期</th><th>状态</th><th className="text-end">操作</th></tr></thead>
            <tbody>
              {result.items.map((membership) => (
                <tr key={membership.id}>
                  <td className="admin-table-id" data-label="编号">#{membership.id}</td>
                  <td data-label="用户"><strong>{value(membership, "full_name") || value(membership, "username")}</strong><small className="membership-table-subtitle">#{value(membership, "user_id")} · {value(membership, "username")}</small></td>
                  <td data-label="会员等级"><strong>{value(membership, "plan_name")}</strong><small className="membership-table-subtitle">{value(membership, "plan_code")}</small></td>
                  <td className="admin-table-time" data-label="有效期">{displayTime(membership.starts_at)}<small className="membership-table-subtitle">至 {displayTime(membership.ends_at)}</small></td>
                  <td data-label="状态"><Status status={value(membership, "status")} /><small className="membership-table-subtitle">{sourceLabel(value(membership, "source"))}</small></td>
                  <td className="admin-table-actions-cell" data-label="操作"><div className="admin-table-actions"><button className="admin-table-button" onClick={() => setDialog({ mode: "detail", record: membership })} type="button"><Eye aria-hidden="true" size={14} /> 查看详情</button><button className="admin-table-button" onClick={() => setDialog({ mode: "edit", record: membership })} type="button"><FilePenLine aria-hidden="true" size={14} /> 修改</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
      <Pagination page={page} total={result.total} totalPages={result.total_pages} onChange={setPage} />

      {dialog && (
        <ManagementDialog onClose={closeDialog} title={dialog.mode === "new" ? "发放用户会员" : dialog.mode === "edit" ? "修改用户会员" : "用户会员详情"}>
          {dialog.mode === "detail" && selected ? (
            <>
              <div className="membership-detail-actions"><button className="admin-action-button admin-action-primary" onClick={() => setDialog({ mode: "edit", record: selected })} type="button"><FilePenLine aria-hidden="true" size={16} /> 修改记录</button></div>
              <DetailGrid items={[
                { label: "会员记录", value: `#${selected.id}` },
                { label: "用户", value: `${value(selected, "full_name") || value(selected, "username")} (#${value(selected, "user_id")})` },
                { label: "联系信息", value: value(selected, "user_email") || value(selected, "contact_number") },
                { label: "会员等级", value: `${value(selected, "plan_name")} (${value(selected, "plan_code")})` },
                { label: "当前状态", value: <Status status={value(selected, "status")} /> },
                { label: "发放来源", value: sourceLabel(value(selected, "source")) },
                { label: "开始时间", value: displayTime(selected.starts_at) },
                { label: "结束时间", value: displayTime(selected.ends_at) },
                { label: "自动续费", value: isEnabled(selected, "auto_renew") ? "是" : "否" },
                { label: "外部订单号", value: value(selected, "external_reference") },
                { label: "取消原因", value: value(selected, "cancel_reason") },
              ]} />
            </>
          ) : (
            <form className="row g-3 membership-dialog-form" key={selected?.id || "new-membership"} onSubmit={saveMembership}>
              {!selected && <UserMembershipPicker onChange={setMembershipUser} selectedUser={membershipUser} />}
              {selected && <div className="col-md-6"><label className="form-label">用户</label><p className="membership-readonly-field">{value(selected, "full_name") || value(selected, "username")} · #{value(selected, "user_id")}</p></div>}
              <div className="col-md-6"><label className="form-label" htmlFor="membership-plan-id">会员等级</label><select className="form-select" defaultValue={value(selected, "membership_plan_id")} id="membership-plan-id" name="membership_plan_id" required><option value="">请选择会员等级</option>{selectablePlans.map((plan) => <option key={plan.id} value={plan.id}>{value(plan, "name")} · {value(plan, "plan_code")}{value(plan, "status") !== "active" ? "（未启用）" : ""}</option>)}</select></div>
              {!selected && <p className="col-12 membership-user-picker-hint">发放会员时仅可选择已启用的会员等级。</p>}
              <FormSelect defaultValue={value(selected, "status") || "active"} label="状态" name="status" options={membershipStatusOptions.slice(1)} />
              <FormSelect defaultValue={value(selected, "source") || "manual"} label="发放来源" name="source" options={[["manual", "人工发放"], ["purchase", "购买"], ["trial", "试用"], ["gift", "赠送"], ["migration", "数据迁移"], ["signup", "注册赠送"]]} />
              <FormInput defaultValue={datetimeInput(selected?.starts_at, currentDatetimeInput())} label="开始时间" name="starts_at" required type="datetime-local" />
              <FormInput defaultValue={datetimeInput(selected?.ends_at)} label="结束时间" name="ends_at" type="datetime-local" />
              <FormInput defaultValue={value(selected, "external_reference")} label="外部订单号或参考号" name="external_reference" />
              <FormTextarea defaultValue={value(selected, "cancel_reason")} label="取消或撤销原因" name="cancel_reason" />
              <div className="col-md-6 d-flex align-items-end"><label className="membership-check"><input defaultChecked={isEnabled(selected, "auto_renew")} name="auto_renew" type="checkbox" /> 自动续费</label></div>
              <div className="col-12 membership-form-actions"><button className="admin-action-button admin-action-primary" disabled={busy} type="submit"><Save aria-hidden="true" size={16} /> 保存会员记录</button></div>
            </form>
          )}
        </ManagementDialog>
      )}
    </div>
  );
}
