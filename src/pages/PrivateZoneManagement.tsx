import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Bookmark,
  BriefcaseBusiness,
  Languages,
  NotebookPen,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { api } from "../lib/api";

type PublicEntry = {
  id: number;
  feature_code: string;
  title: string;
  title_en?: string | null;
  description?: string | null;
  icon?: string | null;
  route_key: string;
  target_url: string;
  config?: Record<string, unknown>;
  sort_order: number;
  is_enabled: number;
};

type PublicEntryDraft = {
  title: string;
  title_en: string;
  description: string;
  icon: string;
  route_key: string;
  target_url: string;
  config: Record<string, unknown>;
  sort_order: number;
  is_enabled: number;
};

type Shortcut = {
  id: number;
  family_group_id: number;
  family_group_name?: string | null;
  title: string;
  target_url: string;
  description?: string | null;
  icon?: string | null;
  sort_order: number;
};

type ShortcutDraft = {
  family_group_id: number;
  title: string;
  target_url: string;
  description: string;
  icon: string;
  sort_order: number;
};

type FamilyGroup = {
  id: number;
  name: string;
  member_role?: string;
};

const publicEntryIcons: Record<string, LucideIcon> = {
  notebook: NotebookPen,
  "book-open": BookOpen,
  languages: Languages,
  briefcase: BriefcaseBusiness,
  bookmark: Bookmark,
};

// Preserve public-entry management code and data without exposing the unfinished feature.
const PUBLIC_ENTRIES_VISIBLE = false;

const emptyShortcut: ShortcutDraft = {
  family_group_id: 0,
  title: "",
  target_url: "",
  description: "",
  icon: "🔖",
  sort_order: 0,
};

const emptyPublicEntry: PublicEntryDraft = {
  title: "",
  title_en: "",
  description: "",
  icon: "🔖",
  route_key: "public-entry",
  target_url: "",
  config: {},
  sort_order: 0,
  is_enabled: 1,
};

function sortedEntries<T extends { id: number; sort_order: number }>(items: T[]) {
  return [...items].sort(
    (left, right) =>
      Number(left.sort_order || 0) - Number(right.sort_order || 0) ||
      Number(left.id || 0) - Number(right.id || 0),
  );
}

function publicEntryDraft(entry: PublicEntry): PublicEntryDraft {
  return {
    title: entry.title,
    title_en: entry.title_en || "",
    description: entry.description || "",
    icon: entry.icon || "",
    route_key: entry.route_key,
    target_url: entry.target_url,
    config: entry.config || {},
    sort_order: Number(entry.sort_order || 0),
    is_enabled: Number(entry.is_enabled) ? 1 : 0,
  };
}

function shortcutDraft(shortcut?: Shortcut, defaultFamilyGroupId = 0): ShortcutDraft {
  if (!shortcut) return { ...emptyShortcut, family_group_id: defaultFamilyGroupId };
  return {
    family_group_id: Number(shortcut.family_group_id || defaultFamilyGroupId),
    title: shortcut.title,
    target_url: shortcut.target_url,
    description: shortcut.description || "",
    icon: shortcut.icon || "🔖",
    sort_order: Number(shortcut.sort_order || 0),
  };
}

function PublicEntryIcon({ icon }: { icon?: string | null }) {
  const Icon = publicEntryIcons[icon || ""];
  if (Icon) return <Icon aria-hidden="true" size={19} strokeWidth={2} />;
  if (icon) return <span aria-hidden="true">{icon}</span>;
  return <Settings2 aria-hidden="true" size={19} strokeWidth={2} />;
}

export function PrivateZoneManagement() {
  const [publicEntries, setPublicEntries] = useState<PublicEntry[]>([]);
  const [publicEditor, setPublicEditor] = useState<PublicEntryDraft | null>(null);
  const [editingFeatureCode, setEditingFeatureCode] = useState("");
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [shortcutEditor, setShortcutEditor] = useState<ShortcutDraft | null>(null);
  const [editingShortcutId, setEditingShortcutId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [publicBusy, setPublicBusy] = useState(false);
  const [shortcutBusy, setShortcutBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const manageableFamilies = familyGroups.filter((group) =>
    ["owner", "admin"].includes(group.member_role || "member"),
  );

  async function load() {
    setLoading(true);
    try {
      const publicEntriesRequest = PUBLIC_ENTRIES_VISIBLE
        ? api<{ items: PublicEntry[] }>("/admin/private-zone/features")
        : Promise.resolve({ items: [] as PublicEntry[] });
      const [features, configuredShortcuts, groups] = await Promise.all([
        publicEntriesRequest,
        api<{ items: Shortcut[] }>("/admin/private-zone/shortcuts"),
        api<{ items: FamilyGroup[] }>("/learning/family-groups"),
      ]);
      setPublicEntries(sortedEntries(features.items || []));
      setShortcuts(sortedEntries(configuredShortcuts.items || []));
      setFamilyGroups(groups.items || []);
      setError("");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openPublicEditor(entry: PublicEntry) {
    setError("");
    setMessage("");
    setShortcutEditor(null);
    setEditingShortcutId(0);
    setEditingFeatureCode(entry.feature_code);
    setPublicEditor(publicEntryDraft(entry));
  }

  function openNewPublicEditor() {
    setError("");
    setMessage("");
    setShortcutEditor(null);
    setEditingShortcutId(0);
    setEditingFeatureCode("");
    setPublicEditor({ ...emptyPublicEntry });
  }

  function closePublicEditor() {
    if (publicBusy) return;
    setPublicEditor(null);
    setEditingFeatureCode("");
  }

  async function savePublicEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!publicEditor) return;
    setPublicBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await api<PublicEntry>(
        editingFeatureCode
          ? `/admin/private-zone/features/${editingFeatureCode}`
          : "/admin/private-zone/features",
        editingFeatureCode ? "PUT" : "POST",
        publicEditor,
      );
      setPublicEntries((current) =>
        sortedEntries(
          editingFeatureCode
            ? current.map((entry) => entry.feature_code === saved.feature_code ? saved : entry)
            : [...current, saved],
        ),
      );
      setPublicEditor(null);
      setEditingFeatureCode("");
      setMessage(editingFeatureCode ? "公共学习入口已更新，所有学习者刷新后都能看到它。" : "公共学习入口已添加，所有学习者刷新后都能看到它。");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setPublicBusy(false);
    }
  }

  function openShortcutEditor(shortcut?: Shortcut) {
    setError("");
    setMessage("");
    setPublicEditor(null);
    setEditingFeatureCode("");
    setEditingShortcutId(shortcut?.id || 0);
    setShortcutEditor(
      shortcutDraft(shortcut, manageableFamilies.length === 1 ? manageableFamilies[0].id : 0),
    );
  }

  function closeShortcutEditor() {
    if (shortcutBusy) return;
    setShortcutEditor(null);
    setEditingShortcutId(0);
  }

  async function saveShortcut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shortcutEditor) return;
    if (!shortcutEditor.family_group_id) {
      setError("请选择要共享入口的家庭。");
      return;
    }
    setShortcutBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await api<Shortcut>(
        editingShortcutId
          ? `/admin/private-zone/shortcuts/${editingShortcutId}`
          : "/admin/private-zone/shortcuts",
        editingShortcutId ? "PUT" : "POST",
        shortcutEditor,
      );
      setShortcuts((current) =>
        sortedEntries(
          editingShortcutId
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [...current, saved],
        ),
      );
      setShortcutEditor(null);
      setEditingShortcutId(0);
      setMessage(editingShortcutId ? "家庭常用入口已更新。" : "家庭常用入口已添加。");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setShortcutBusy(false);
    }
  }

  async function removeShortcut(shortcut: Shortcut) {
    if (!window.confirm(`删除“${shortcut.title}”吗？它会从“${shortcut.family_group_name || "这个家庭"}”的常用入口中移除。`)) return;
    setShortcutBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/admin/private-zone/shortcuts/${shortcut.id}`, "DELETE");
      setShortcuts((current) => current.filter((item) => item.id !== shortcut.id));
      if (editingShortcutId === shortcut.id) {
        setShortcutEditor(null);
        setEditingShortcutId(0);
      }
      setMessage("家庭常用入口已删除。");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setShortcutBusy(false);
    }
  }

  return (
    <section className="private-zone-admin">
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">PRIVATE LEARNING SPACE</p>
          <h2>私人专区入口</h2>
          <p>维护当前管理员自己的常用入口。</p>
        </div>
        <button className="admin-secondary-action" type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> 刷新
        </button>
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {message && <div className="alert alert-success" role="status">{message}</div>}

      {PUBLIC_ENTRIES_VISIBLE && (
      <section className="private-zone-admin-public" aria-labelledby="public-entries-heading">
        <div className="private-zone-admin-public-heading">
          <div>
            <span>PUBLIC LEARNING</span>
            <h3 id="public-entries-heading">公共学习入口</h3>
            <p>所有学习者都会看到这些入口，并可直接打开对应的学习内容。</p>
          </div>
          <button
            className="admin-primary-action"
            disabled={publicBusy || shortcutBusy}
            onClick={openNewPublicEditor}
            type="button"
          >
            + 添加公共入口
          </button>
        </div>

        {publicEditor && (
          <form className="private-zone-admin-public-editor" onSubmit={(event) => void savePublicEntry(event)}>
            <div className="private-zone-admin-editor-heading">
              <div>
                <span className="private-zone-admin-code">{editingFeatureCode ? "EDIT PUBLIC ENTRY" : "NEW PUBLIC ENTRY"}</span>
                <h3>{editingFeatureCode ? "编辑公共学习入口" : "添加公共学习入口"}</h3>
              </div>
              <button className="admin-secondary-action" disabled={publicBusy} onClick={closePublicEditor} type="button">取消</button>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="public-entry-title">名称</label>
                <input className="form-control" id="public-entry-title" maxLength={120} onChange={(event) => setPublicEditor((current) => current ? { ...current, title: event.target.value } : current)} required value={publicEditor.title} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="public-entry-url">跳转链接</label>
                <input className="form-control" id="public-entry-url" maxLength={1000} onChange={(event) => setPublicEditor((current) => current ? { ...current, target_url: event.target.value } : current)} placeholder="/learn/notes 或 https://…" required value={publicEditor.target_url} />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="public-entry-title-en">英文名称</label>
                <input className="form-control" id="public-entry-title-en" maxLength={120} onChange={(event) => setPublicEditor((current) => current ? { ...current, title_en: event.target.value } : current)} value={publicEditor.title_en} />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="public-entry-icon">图标</label>
                <input className="form-control" id="public-entry-icon" maxLength={32} onChange={(event) => setPublicEditor((current) => current ? { ...current, icon: event.target.value } : current)} placeholder="book-open 或 📖" value={publicEditor.icon} />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="public-entry-order">排序</label>
                <input className="form-control" id="public-entry-order" onChange={(event) => setPublicEditor((current) => current ? { ...current, sort_order: Number(event.target.value) || 0 } : current)} type="number" value={publicEditor.sort_order} />
              </div>
              <div className="col-md-3 private-zone-admin-public-enabled">
                <label className="form-label" htmlFor="public-entry-enabled">展示状态</label>
                <label className="private-zone-admin-checkbox" htmlFor="public-entry-enabled">
                  <input checked={publicEditor.is_enabled === 1} id="public-entry-enabled" onChange={(event) => setPublicEditor((current) => current ? { ...current, is_enabled: event.target.checked ? 1 : 0 } : current)} type="checkbox" />
                  对所有学习者显示
                </label>
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="public-entry-description">说明</label>
                <input className="form-control" id="public-entry-description" maxLength={500} onChange={(event) => setPublicEditor((current) => current ? { ...current, description: event.target.value } : current)} placeholder="显示在入口下方的简短说明（可选）" value={publicEditor.description} />
              </div>
              <div className="col-12 private-zone-admin-public-editor-actions">
                <button className="admin-primary-action" disabled={publicBusy} type="submit"><Save size={17} />{publicBusy ? "保存中…" : "保存公共入口"}</button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <p className="private-zone-admin-shortcut-empty">正在读取公共学习入口…</p>
        ) : publicEntries.length ? (
          <div className="private-zone-admin-public-list">
            {publicEntries.map((entry) => (
              <article className="private-zone-admin-public-entry" key={entry.id}>
                <span className="private-zone-admin-public-icon"><PublicEntryIcon icon={entry.icon} /></span>
                <div>
                  <strong>{entry.title}</strong>
                  <small>{entry.description || entry.target_url}</small>
                  <code>{entry.target_url}</code>
                </div>
                <span className={Number(entry.is_enabled) ? "private-zone-admin-public-status is-enabled" : "private-zone-admin-public-status"}>
                  {Number(entry.is_enabled) ? "已公开" : "已隐藏"}
                </span>
                <div className="private-zone-admin-public-actions">
                  <button className="admin-secondary-action" disabled={publicBusy || shortcutBusy} onClick={() => openPublicEditor(entry)} type="button">编辑</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="private-zone-admin-shortcut-empty">还没有公共学习入口。</p>
        )}
      </section>
      )}

      <section className="private-zone-admin-shortcuts" aria-labelledby="admin-shortcuts-heading">
        <div className="private-zone-admin-shortcuts-heading">
          <div>
            <span>FAMILY SHORTCUTS</span>
            <h3 id="admin-shortcuts-heading">家庭常用入口</h3>
            <p>为一个家庭配置学习入口；该家庭的所有成员登录后都能看到。</p>
          </div>
          <button
            className="admin-primary-action"
            disabled={loading || shortcutBusy || publicBusy || !manageableFamilies.length}
            onClick={() => openShortcutEditor()}
            type="button"
          >
            + 添加家庭入口
          </button>
        </div>

        {shortcutEditor && (
          <form className="private-zone-admin-shortcut-editor" onSubmit={(event) => void saveShortcut(event)}>
            <div className="private-zone-admin-editor-heading">
              <div>
                <span className="private-zone-admin-code">{editingShortcutId ? "EDIT FAMILY SHORTCUT" : "NEW FAMILY SHORTCUT"}</span>
                <h3>{editingShortcutId ? "编辑家庭常用入口" : "添加家庭常用入口"}</h3>
              </div>
              <button className="admin-secondary-action" disabled={shortcutBusy} onClick={closeShortcutEditor} type="button">取消</button>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="private-shortcut-family">共享家庭</label>
                <select className="form-control" id="private-shortcut-family" onChange={(event) => setShortcutEditor((current) => current ? { ...current, family_group_id: Number(event.target.value) || 0 } : current)} required value={shortcutEditor.family_group_id}>
                  <option value={0}>请选择家庭</option>
                  {manageableFamilies.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="private-shortcut-title">名称</label>
                <input className="form-control" id="private-shortcut-title" maxLength={120} onChange={(event) => setShortcutEditor((current) => current ? { ...current, title: event.target.value } : current)} required value={shortcutEditor.title} />
              </div>
              <div className="col-md-8">
                <label className="form-label" htmlFor="private-shortcut-url">跳转链接</label>
                <input className="form-control" id="private-shortcut-url" maxLength={1000} onChange={(event) => setShortcutEditor((current) => current ? { ...current, target_url: event.target.value } : current)} placeholder="/learn/notes 或 https://…" required value={shortcutEditor.target_url} />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="private-shortcut-icon">图标</label>
                <input className="form-control" id="private-shortcut-icon" maxLength={32} onChange={(event) => setShortcutEditor((current) => current ? { ...current, icon: event.target.value } : current)} value={shortcutEditor.icon} />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="private-shortcut-order">排序</label>
                <input className="form-control" id="private-shortcut-order" onChange={(event) => setShortcutEditor((current) => current ? { ...current, sort_order: Number(event.target.value) || 0 } : current)} type="number" value={shortcutEditor.sort_order} />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="private-shortcut-description">说明</label>
                <input className="form-control" id="private-shortcut-description" maxLength={500} onChange={(event) => setShortcutEditor((current) => current ? { ...current, description: event.target.value } : current)} placeholder="显示在入口下方的简短说明（可选）" value={shortcutEditor.description} />
              </div>
              <div className="col-12 private-zone-admin-shortcut-editor-actions">
                <button className="admin-primary-action" disabled={shortcutBusy} type="submit"><Save size={17} />{shortcutBusy ? "保存中…" : "保存入口"}</button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <p className="private-zone-admin-shortcut-empty">正在读取家庭常用入口…</p>
        ) : !manageableFamilies.length ? (
          <p className="private-zone-admin-shortcut-empty">还没有可配置的家庭。请先到<Link to="/me">“我的”</Link>创建家庭，或由家庭创建者将你设为家庭管理员。</p>
        ) : shortcuts.length ? (
          <div className="private-zone-admin-shortcut-list">
            {shortcuts.map((shortcut) => (
              <article className="private-zone-admin-shortcut" key={shortcut.id}>
                <span className="private-zone-admin-shortcut-icon">{shortcut.icon || "🔖"}</span>
                <div>
                  <strong>{shortcut.title}</strong>
                  <span className="private-zone-admin-shortcut-family">共享家庭 · {shortcut.family_group_name || "未命名家庭"}</span>
                  <small>{shortcut.description || shortcut.target_url}</small>
                  <code>{shortcut.target_url}</code>
                </div>
                <span className="private-zone-admin-shortcut-order">#{shortcut.sort_order}</span>
                <div className="private-zone-admin-shortcut-actions">
                  <button className="admin-secondary-action" disabled={shortcutBusy || publicBusy} onClick={() => openShortcutEditor(shortcut)} type="button">编辑</button>
                  <button className="private-zone-admin-delete" disabled={shortcutBusy || publicBusy} onClick={() => void removeShortcut(shortcut)} type="button"><Trash2 size={15} /> 删除</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="private-zone-admin-shortcut-empty">还没有家庭常用入口。添加后，该家庭成员的私人专区都会显示。</p>
        )}
      </section>
    </section>
  );
}
