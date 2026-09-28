import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { api, value } from "../lib/api";
import type { Entry } from "../lib/api";
import {
  MATERIAL_TEMPLATE_CHOICES,
  type MaterialTemplateCode,
} from "../lib/material-templates";

type Draft = {
  code: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  sortOrder: string;
  config: string;
};

function emptyDraft(code: MaterialTemplateCode = MATERIAL_TEMPLATE_CHOICES[0].code): Draft {
  const definition =
    MATERIAL_TEMPLATE_CHOICES.find((item) => item.code === code) ||
    MATERIAL_TEMPLATE_CHOICES[0];
  return {
    code: definition.code,
    name: definition.name,
    description: definition.description,
    status: "active",
    sortOrder: "0",
    config: "{}",
  };
}

function configText(input: unknown) {
  return input && typeof input === "object" ? JSON.stringify(input, null, 2) : "{}";
}

export function TemplateManagement() {
  const [templates, setTemplates] = useState<Entry[]>([]);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedDefinition = useMemo(
    () =>
      MATERIAL_TEMPLATE_CHOICES.find((item) => item.code === draft.code) ||
      MATERIAL_TEMPLATE_CHOICES[0],
    [draft.code],
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api<{ items: Entry[] }>("/admin/learning-templates");
      setTemplates(result.items);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startNew() {
    setEditingId(null);
    setDraft(emptyDraft());
    setEditorOpen(true);
    setError("");
  }

  function startEdit(template: Entry) {
    const code = value(template, "code") || value(template, "template_code");
    setEditingId(template.id);
    setDraft({
      code,
      name: value(template, "name"),
      description: value(template, "description"),
      status: value(template, "status") === "inactive" ? "inactive" : "active",
      sortOrder: value(template, "sort_order") || "0",
      config: configText(template.config),
    });
    setEditorOpen(true);
    setError("");
  }

  function changeCode(code: string) {
    const previous = selectedDefinition;
    const definition = MATERIAL_TEMPLATE_CHOICES.find((item) => item.code === code);
    const next = emptyDraft(definition?.code);
    setDraft((current) => ({
      ...current,
      code: next.code,
      name: !current.name || current.name === previous.name ? next.name : current.name,
      description:
        !current.description || current.description === previous.description
          ? next.description
          : current.description,
    }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let config: Record<string, unknown>;
    try {
      const parsed = JSON.parse(draft.config || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error();
      config = parsed as Record<string, unknown>;
    } catch {
      setError("模板配置必须是一个合法的 JSON 对象。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        template_code: selectedDefinition.code,
        template_version: selectedDefinition.version,
        name: draft.name.trim(),
        description: draft.description.trim(),
        content_kind: selectedDefinition.contentKind,
        supported_clients: ["web", "mini"],
        config,
        status: draft.status,
        sort_order: Number(draft.sortOrder || 0),
      };
      await api(
        `/admin/learning-templates${editingId ? `/${editingId}` : ""}`,
        editingId ? "PUT" : "POST",
        payload,
      );
      setEditorOpen(false);
      setEditingId(null);
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(template: Entry) {
    if (!window.confirm(`删除模板“${value(template, "name")}”？`)) return;
    setSaving(true);
    setError("");
    try {
      await api(`/admin/learning-templates/${template.id}`, "DELETE");
      if (editingId === template.id) {
        setEditorOpen(false);
        setEditingId(null);
      }
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="container py-5 membership-page">
      <header className="membership-heading">
        <div>
          <p className="admin-list-eyebrow">内容管理</p>
          <h1>模板管理</h1>
          <p>教材绑定一个模板编号；Web 和小程序都按相同编号与版本渲染。</p>
        </div>
        <div className="d-flex gap-2">
          <button className="admin-action-button admin-action-secondary" onClick={() => void load()} type="button">
            <RefreshCw aria-hidden="true" size={16} /> 刷新
          </button>
          <button className="admin-action-button admin-action-primary" onClick={startNew} type="button">
            <Plus aria-hidden="true" size={16} /> 注册模板
          </button>
        </div>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      {editorOpen && (
        <section className="card shadow-sm membership-sub-editor mb-4">
          <div className="card-body">
            <div className="membership-related-heading">
              <div>
                <p>跨端渲染契约</p>
                <h3>{editingId ? "修改模板" : "注册模板"}</h3>
              </div>
              <button className="admin-action-button admin-action-secondary" onClick={() => setEditorOpen(false)} type="button">
                <X aria-hidden="true" size={16} /> 取消
              </button>
            </div>
            <form className="row g-3" onSubmit={save}>
              <div className="col-md-6">
                <label className="form-label" htmlFor="template-code">模板编号</label>
                <select
                  className="form-select"
                  disabled={Boolean(editingId)}
                  id="template-code"
                  onChange={(event) => changeCode(event.target.value)}
                  value={draft.code}
                >
                  {MATERIAL_TEMPLATE_CHOICES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name} · {item.code}.v{item.version}
                    </option>
                  ))}
                </select>
                <small className="text-muted">编号和版本由 Web 与小程序共同注册，不能填写自定义组件名。</small>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="template-kind">内容类型</label>
                <input className="form-control" id="template-kind" readOnly value={selectedDefinition.contentKind} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="template-name">后台名称</label>
                <input className="form-control" id="template-name" onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required value={draft.name} />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="template-status">状态</label>
                <select className="form-select" id="template-status" onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Draft["status"] }))} value={draft.status}>
                  <option value="active">启用</option>
                  <option value="inactive">停用</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="template-order">排序</label>
                <input className="form-control" id="template-order" min="0" onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))} type="number" value={draft.sortOrder} />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="template-description">说明</label>
                <textarea className="form-control" id="template-description" onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={2} value={draft.description} />
              </div>
              <div className="col-12 membership-form-actions">
                <button className="admin-action-button admin-action-primary" disabled={saving} type="submit">
                  <Save aria-hidden="true" size={16} /> 保存模板
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      <section className="card shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <p className="admin-table-loading" role="status">正在读取模板…</p>
          ) : (
            <div className="table-responsive">
              <table className="table admin-data-table membership-table mb-0">
                <thead><tr><th>模板</th><th>编号</th><th>内容类型</th><th>客户端</th><th>状态</th><th className="text-end">操作</th></tr></thead>
                <tbody>
                  {templates.map((template) => {
                    const clients = Array.isArray(template.supported_clients)
                      ? (template.supported_clients as string[]).join(" / ")
                      : "—";
                    return (
                      <tr key={template.id}>
                        <td><strong>{value(template, "name")}</strong><small className="membership-table-subtitle">{value(template, "description")}</small></td>
                        <td><code>{value(template, "renderer") || `${value(template, "code")}.v${value(template, "version")}`}</code></td>
                        <td>{value(template, "content_kind")}</td>
                        <td>{clients}</td>
                        <td>{value(template, "status") === "active" ? "启用" : "停用"}</td>
                        <td className="text-end"><div className="admin-table-actions"><button className="admin-table-button" onClick={() => startEdit(template)} type="button">修改</button><button className="admin-table-button is-warning" disabled={saving} onClick={() => void remove(template)} type="button"><Trash2 aria-hidden="true" size={14} /> 删除</button></div></td>
                      </tr>
                    );
                  })}
                  {!templates.length && <tr><td className="text-center py-5 text-muted" colSpan={6}>暂无模板，请注册一个已在两个客户端实现的模板。</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
