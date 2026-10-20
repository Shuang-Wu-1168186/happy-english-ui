import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { HomeNavigation } from "../components/Layout";
import { api, idValue, value } from "../lib/api";
import type { ApiId, Entry } from "../lib/api";

type FavoriteCourse = Entry & {
  source?: {
    scope_type?: string;
    label?: string;
    family_group_name?: string | null;
  };
  resource?: Entry;
  access?: Entry;
};

type Shortcut = Entry;
type PublicEntry = Entry;
type PersonalNote = Entry;

type PrivateZoneHome = {
  favorite_course_count?: number;
  public_entries?: PublicEntry[];
  shortcuts?: Shortcut[];
  personal_note_count?: number;
  recent_personal_notes?: PersonalNote[];
};

type FavoritesResponse = { items?: FavoriteCourse[] };
type NotesResponse = { items?: PersonalNote[] };

type PersonalNoteDraft = {
  title: string;
  content: string;
  tags: string;
  color: string;
  is_pinned: number;
};

const emptyNote: PersonalNoteDraft = {
  title: "",
  content: "",
  tags: "",
  color: "violet",
  is_pinned: 0,
};

const everydayEnglishEntries: Entry[] = [
  {
    id: "local-food-menu",
    title: "Rolleston Food Bar Menu",
    description: "Open the English menu and listen to each item.",
    icon: "🍽️",
    target_url: "/roleston-menu/index.html",
  },
];

// Public entries are kept server-side for a later product decision.
const PUBLIC_ENTRIES_VISIBLE = false;

function numberValue(entry: Entry | undefined, key: string) {
  const parsed = Number(entry?.[key]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sourceLabel(item: FavoriteCourse) {
  return item.source?.scope_type === "family" ? "来自家庭" : "来自个人";
}

function accessLabel(item: FavoriteCourse) {
  return {
    available: "可以学习",
    preview: "可试看",
    locked: "需要会员",
    unavailable: "暂不可用",
  }[value(item.access, "access_state")] || "已收藏";
}

function courseTitle(item: FavoriteCourse) {
  return value(item, "label") || value(item.resource, "title") || "未命名课程";
}

function courseSummary(item: FavoriteCourse) {
  return (
    value(item.resource, "summary") ||
    value(item.resource, "title_en") ||
    "从这门课程继续学习。"
  );
}

function isInternalPath(target: string) {
  return target.startsWith("/") && !target.startsWith("//");
}

function needsDocumentNavigation(target: string) {
  return target.split(/[?#]/, 1)[0].endsWith(".html");
}

const entryIcons: Record<string, string> = {
  notebook: "📝",
  "book-open": "📖",
  languages: "🔤",
  briefcase: "💼",
  bookmark: "🔖",
};

function entryIcon(entry: Entry) {
  const icon = value(entry, "icon");
  return entryIcons[icon] || icon || "🔖";
}

function EntryGrid({ entries }: { entries: Entry[] }) {
  return (
    <div className="private-zone-shortcut-grid">
      {entries.map((entry) => {
        const target = value(entry, "target_url");
        const familyGroupName = value(entry, "family_group_name");
        const useDocumentNavigation = needsDocumentNavigation(target);
        const isInternal = isInternalPath(target);
        const label = (
          <>
            <span className="private-zone-shortcut-icon">{entryIcon(entry)}</span>
            <span className="private-zone-shortcut-body">
              <strong>{value(entry, "title")}</strong>
              {familyGroupName && <em>家庭 · {familyGroupName}</em>}
              <small>{value(entry, "description") || target}</small>
            </span>
            <span className="private-zone-shortcut-arrow">›</span>
          </>
        );
        return (
          <article className="private-zone-shortcut" key={idValue(entry) || String(entry.id)}>
            {isInternal && !useDocumentNavigation ? (
              <Link className="private-zone-shortcut-link" to={target}>{label}</Link>
            ) : (
              <a
                className="private-zone-shortcut-link"
                href={target}
                rel={isInternal ? undefined : "noreferrer"}
                target={isInternal ? undefined : "_blank"}
              >
                {label}
              </a>
            )}
          </article>
        );
      })}
    </div>
  );
}

function noteDate(note: PersonalNote) {
  const raw = value(note, "updated_at") || value(note, "created_at");
  if (!raw) return "刚刚记录";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function previewText(note: PersonalNote) {
  const content = value(note, "content").replace(/\s+/g, " ").trim();
  return content || "还没有写正文，点击继续补充。";
}

function NoteForm({
  draft,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  draft: PersonalNoteDraft;
  submitting: boolean;
  onChange: (draft: PersonalNoteDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <div className="private-zone-modal-backdrop" role="presentation">
      <form className="private-zone-editor private-zone-note-editor" onSubmit={onSubmit}>
        <div className="private-zone-editor-heading">
          <div>
            <p>PERSONAL NOTE</p>
            <h2>{draft.title ? "编辑个人笔记" : "写一条个人笔记"}</h2>
          </div>
          <button aria-label="关闭" className="private-zone-close" onClick={onCancel} type="button">
            ×
          </button>
        </div>
        <label>
          标题
          <input
            autoFocus
            maxLength={200}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            placeholder="给这条记录起个标题"
            required
            value={draft.title}
          />
        </label>
        <label>
          内容
          <textarea
            maxLength={50000}
            onChange={(event) => onChange({ ...draft, content: event.target.value })}
            placeholder="记录今天学到的内容、待办或灵感…"
            rows={9}
            value={draft.content}
          />
        </label>
        <div className="private-zone-editor-row">
          <label>
            标签（可选）
            <input
              maxLength={500}
              onChange={(event) => onChange({ ...draft, tags: event.target.value })}
              placeholder="例如：复习, 待办"
              value={draft.tags}
            />
          </label>
          <label>
            颜色
            <select
              onChange={(event) => onChange({ ...draft, color: event.target.value })}
              value={draft.color}
            >
              <option value="violet">紫色</option>
              <option value="blue">蓝色</option>
              <option value="green">绿色</option>
              <option value="yellow">黄色</option>
              <option value="pink">粉色</option>
            </select>
          </label>
        </div>
        <label className="private-zone-checkbox">
          <input
            checked={draft.is_pinned === 1}
            onChange={(event) => onChange({ ...draft, is_pinned: event.target.checked ? 1 : 0 })}
            type="checkbox"
          />
          置顶这条笔记
        </label>
        <div className="private-zone-editor-actions">
          <button className="private-zone-text-button" onClick={onCancel} type="button">
            取消
          </button>
          <button className="private-zone-primary-button" disabled={submitting} type="submit">
            {submitting ? "正在保存…" : "保存笔记"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PrivateZone() {
  const [home, setHome] = useState<PrivateZoneHome>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const result = await api<PrivateZoneHome>("/learning/private-zone");
      setHome(result);
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const publicEntries = PUBLIC_ENTRIES_VISIBLE ? home.public_entries || [] : [];
  const shortcuts = home.shortcuts || [];
  const notes = home.recent_personal_notes || [];

  return (
    <div className="study-home private-zone-page">
      <HomeNavigation />
      <main className="container private-zone-main">
        <section className="private-zone-hero">
          <div>
            <p>YOUR PRIVATE SPACE</p>
            <h1>私人专区</h1>
            <span>把收藏课程、常用学习入口和随手笔记，放在属于你的一个地方。</span>
          </div>
          <span aria-hidden="true" className="private-zone-hero-icon">✦</span>
        </section>

        {error && <p className="private-zone-alert is-error" role="alert">{error}</p>}
        {loading ? (
          <div className="private-zone-loading">正在整理你的私人专区…</div>
        ) : (
          <>
            <section className="private-zone-modules" aria-label="私人专区功能">
              <Link className="private-zone-module private-zone-course-module" to="/private-zone/favorite-courses">
                <span className="private-zone-module-icon">☆</span>
                <p>FAVORITE COURSES</p>
                <h2>收藏课程</h2>
                <span>查看全部收藏课程，点进去就能继续学习。</span>
                <strong>{home.favorite_course_count || 0} 门课程 <b>›</b></strong>
              </Link>
              <Link className="private-zone-module private-zone-note-module" to="/private-zone/personal-notes">
                <span className="private-zone-module-icon">✎</span>
                <p>PERSONAL NOTES</p>
                <h2>个人笔记</h2>
                <span>记录你的想法、学习计划和待办，不会进入 English Note。</span>
                <strong>{home.personal_note_count || 0} 条笔记 <b>›</b></strong>
              </Link>
            </section>

            <section className="private-zone-shortcuts" aria-labelledby="everyday-english-heading">
              <div className="private-zone-section-heading">
                <div>
                  <p>EVERYDAY ENGLISH</p>
                  <h2 id="everyday-english-heading">生活英语</h2>
                  <span>从真实菜单开始，听一听常用点餐英文。</span>
                </div>
              </div>
              <EntryGrid entries={everydayEnglishEntries} />
            </section>

            {PUBLIC_ENTRIES_VISIBLE && publicEntries.length > 0 && (
              <section className="private-zone-public-entries" aria-labelledby="public-entries-heading">
                <div className="private-zone-section-heading">
                  <div>
                    <p>PUBLIC LEARNING</p>
                    <h2 id="public-entries-heading">公共学习入口</h2>
                    <span>所有学习者都可以从这里直接进入公共学习内容。</span>
                  </div>
                </div>
                <EntryGrid entries={publicEntries} />
              </section>
            )}

            {shortcuts.length > 0 && (
              <section className="private-zone-shortcuts" aria-labelledby="shortcuts-heading">
              <div className="private-zone-section-heading">
                <div>
                  <p>FAMILY SHORTCUTS</p>
                  <h2 id="shortcuts-heading">家庭常用入口</h2>
                  <span>这是家庭共享的学习入口，家庭成员都可以从这里继续学习。</span>
                </div>
              </div>
              <EntryGrid entries={shortcuts} />
              </section>
            )}

            <section className="private-zone-recent-notes" aria-labelledby="recent-notes-heading">
              <div className="private-zone-section-heading">
                <div>
                  <p>RECENT NOTES</p>
                  <h2 id="recent-notes-heading">最近记录</h2>
                </div>
                <Link className="private-zone-view-all" to="/private-zone/personal-notes">查看全部 ›</Link>
              </div>
              {notes.length ? (
                <div className="private-zone-note-preview-grid">
                  {notes.map((note) => (
                    <Link
                      className={`private-zone-note-preview color-${value(note, "color") || "violet"}`}
                      key={note.id}
                      to="/private-zone/personal-notes"
                    >
                      <div><span>{numberValue(note, "is_pinned") ? "置顶" : noteDate(note)}</span><time>{noteDate(note)}</time></div>
                      <strong>{value(note, "title")}</strong>
                      <p>{previewText(note)}</p>
                      {value(note, "tags") && <small>{value(note, "tags")}</small>}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="private-zone-recent-empty">
                  写下第一条个人笔记，把今天的学习想法留住。<Link to="/private-zone/personal-notes">去写笔记 ›</Link>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export function PrivateZoneFavoriteCourses() {
  const [items, setItems] = useState<FavoriteCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<ApiId | null>(null);

  async function load() {
    try {
      const result = await api<FavoritesResponse>("/learning/private-zone/favorite-courses");
      setItems(result.items || []);
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(item: FavoriteCourse) {
    const itemId = idValue(item);
    if (!itemId || item.source?.scope_type !== "personal" || !window.confirm(`移除“${courseTitle(item)}”吗？`)) return;
    setBusy(itemId);
    try {
      await api(`/learning/private-zone/items/${itemId}`, "DELETE");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="study-home private-zone-page">
      <HomeNavigation />
      <main className="container private-zone-main private-zone-list-main">
        <Link className="private-zone-back" to="/private-zone">‹ 返回私人专区</Link>
        <section className="private-zone-list-hero">
          <p>FAVORITE COURSES</p>
          <h1>收藏课程</h1>
          <span>所有收藏课程都在这里。点击课程后，直接回到原有的学习页面。</span>
        </section>
        {error && <p className="private-zone-alert is-error" role="alert">{error}</p>}
        {loading ? <div className="private-zone-loading">正在读取收藏课程…</div> : items.length ? (
          <div className="private-zone-course-list">
            {items.map((item) => {
              const courseId = idValue(item.resource) || idValue(item, "resource_id");
              return (
                <article className="private-zone-course-card" key={idValue(item)}>
                  <Link className="private-zone-course-link" to={`/courses/${courseId}`}>
                    <span className="private-zone-course-icon">▸</span>
                    <div>
                      <div className="private-zone-course-meta">
                        <span className={item.source?.scope_type === "family" ? "is-family" : "is-personal"}>{sourceLabel(item)}</span>
                        <small>{accessLabel(item)}</small>
                      </div>
                      <h2>{courseTitle(item)}</h2>
                      <p>{courseSummary(item)}</p>
                      {item.source?.family_group_name && <em>{item.source.family_group_name}</em>}
                    </div>
                    <span className="private-zone-course-arrow">›</span>
                  </Link>
                  {item.source?.scope_type === "personal" && (
                    <button disabled={busy === idValue(item)} onClick={() => void remove(item)} type="button">
                      {busy === idValue(item) ? "移除中…" : "移除收藏"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="private-zone-empty-state">
            <span>☆</span><h2>还没有收藏课程</h2><p>学习课程时点击“收藏”，它就会出现在这里。</p>
            <Link className="private-zone-primary-button" to="/">去找课程</Link>
          </div>
        )}
      </main>
    </div>
  );
}

export function PrivateZonePersonalNotes() {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<PersonalNoteDraft | null>(null);
  const [editingId, setEditingId] = useState<ApiId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<ApiId | null>(null);

  async function load() {
    try {
      const result = await api<NotesResponse>("/learning/private-zone/personal-notes");
      setNotes(result.items || []);
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openEditor(note?: PersonalNote) {
    setEditingId(note ? idValue(note) : null);
    setDraft(note ? {
      title: value(note, "title"),
      content: value(note, "content"),
      tags: value(note, "tags"),
      color: value(note, "color") || "violet",
      is_pinned: numberValue(note, "is_pinned") ? 1 : 0,
    } : { ...emptyNote });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSubmitting(true);
    setError("");
    try {
      const path = editingId
        ? `/learning/private-zone/personal-notes/${editingId}`
        : "/learning/private-zone/personal-notes";
      await api(path, editingId ? "PUT" : "POST", draft);
      setDraft(null);
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(note: PersonalNote) {
    const id = idValue(note);
    if (!id || !window.confirm(`删除“${value(note, "title")}”吗？`)) return;
    setDeleting(id);
    try {
      await api(`/learning/private-zone/personal-notes/${id}`, "DELETE");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="study-home private-zone-page">
      <HomeNavigation />
      <main className="container private-zone-main private-zone-list-main">
        <Link className="private-zone-back" to="/private-zone">‹ 返回私人专区</Link>
        <section className="private-zone-notes-hero">
          <div>
            <p>PERSONAL NOTES</p>
            <h1>个人笔记</h1>
            <span>这是你的自由记录本，和 English Note 的学习内容彼此独立。</span>
          </div>
          <button className="private-zone-primary-button" onClick={() => openEditor()} type="button">+ 写笔记</button>
        </section>
        {error && <p className="private-zone-alert is-error" role="alert">{error}</p>}
        {loading ? <div className="private-zone-loading">正在读取个人笔记…</div> : notes.length ? (
          <div className="private-zone-notes-grid">
            {notes.map((note) => (
              <article className={`private-zone-note-card color-${value(note, "color") || "violet"}`} key={idValue(note)}>
                <button className="private-zone-note-open" onClick={() => openEditor(note)} type="button">
                  <div className="private-zone-note-card-meta"><span>{numberValue(note, "is_pinned") ? "置顶" : "个人记录"}</span><time>{noteDate(note)}</time></div>
                  <h2>{value(note, "title")}</h2>
                  <p>{previewText(note)}</p>
                  {value(note, "tags") && <small>{value(note, "tags")}</small>}
                </button>
                <div className="private-zone-note-card-actions">
                  <button onClick={() => openEditor(note)} type="button">编辑</button>
                  <button className="is-danger" disabled={deleting === idValue(note)} onClick={() => void remove(note)} type="button">
                    {deleting === idValue(note) ? "删除中…" : "删除"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="private-zone-empty-state">
            <span>✎</span><h2>还没有个人笔记</h2><p>把今天的学习、待办和灵感写下来，它只属于你。</p>
            <button className="private-zone-primary-button" onClick={() => openEditor()} type="button">写第一条笔记</button>
          </div>
        )}
      </main>
      {draft && (
        <NoteForm
          draft={draft}
          onCancel={() => !submitting && setDraft(null)}
          onChange={setDraft}
          onSubmit={(event) => void save(event)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
