import { useEffect, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { api, entries, value } from "../lib/api";
import type { Entry, Page } from "../lib/api";

type TopicForm = {
  module_id: string;
  topic_code: string;
  title: string;
  title_en: string;
  description: string;
  cover_url: string;
  sort_order: string;
  is_published: boolean;
};

type TopicFilters = {
  query: string;
  moduleId: string;
  publication: string;
};

type CourseDropTarget = {
  courseId: number;
  insertAfter: boolean;
};

const blankForm = (): TopicForm => ({
  module_id: "",
  topic_code: "",
  title: "",
  title_en: "",
  description: "",
  cover_url: "",
  sort_order: "0",
  is_published: true,
});

const topicCodePattern = /^[a-z0-9][a-z0-9-]{0,99}$/;

function topicCodeFromText(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function topicForm(topic: Entry): TopicForm {
  return {
    module_id: value(topic, "module_id"),
    topic_code: value(topic, "topic_code"),
    title: value(topic, "title"),
    title_en: value(topic, "title_en"),
    description: value(topic, "description"),
    cover_url: value(topic, "cover_url"),
    sort_order: value(topic, "sort_order") || "0",
    is_published: value(topic, "is_published") === "1",
  };
}

function topicStatistics(topic: Entry) {
  const stats = topic.statistics;
  if (!stats || typeof stats !== "object" || Array.isArray(stats))
    return { material_count: 0, lesson_count: 0, course_count: 0 };
  const record = stats as Record<string, unknown>;
  return {
    material_count: Number(record.material_count || 0),
    lesson_count: Number(record.lesson_count || 0),
    course_count: Number(record.course_count || 0),
  };
}

function courseOrderDisplay(course: Entry) {
  const title = value(course, "title");
  const code = value(course, "course_code");
  const titleEn = value(course, "title_en");
  return { title, subtitle: [code, titleEn].filter(Boolean).join(" · ") };
}

export function TopicManagement() {
  const [modules, setModules] = useState<Entry[]>([]);
  const [topics, setTopics] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [publicationFilter, setPublicationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState<TopicForm>(blankForm);
  const [courseOrderOpen, setCourseOrderOpen] = useState(false);
  const [orderingTopic, setOrderingTopic] = useState<Entry | null>(null);
  const [orderedCourses, setOrderedCourses] = useState<Entry[]>([]);
  const [courseOrderLoading, setCourseOrderLoading] = useState(false);
  const [courseOrderSaving, setCourseOrderSaving] = useState(false);
  const [courseRemovingId, setCourseRemovingId] = useState<number | null>(null);
  const [courseOrderError, setCourseOrderError] = useState("");
  const [courseAssociationOpen, setCourseAssociationOpen] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<Entry[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [courseAssociationQuery, setCourseAssociationQuery] = useState("");
  const [courseAssociationLoading, setCourseAssociationLoading] =
    useState(false);
  const [courseAssociationSaving, setCourseAssociationSaving] = useState(false);
  const [courseAssociationError, setCourseAssociationError] = useState("");
  const [draggedCourseId, setDraggedCourseId] = useState<number | null>(null);
  const [courseDropTarget, setCourseDropTarget] =
    useState<CourseDropTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadTopics(
    nextPage = page,
    filterOverrides?: Partial<TopicFilters>,
  ) {
    setLoading(true);
    setError("");
    try {
      const filters: TopicFilters = {
        query,
        moduleId,
        publication: publicationFilter,
        ...filterOverrides,
      };
      const params = new URLSearchParams({
        page: String(nextPage),
        page_size: "20",
      });
      if (filters.query.trim()) params.set("q", filters.query.trim());
      if (filters.moduleId) params.set("module_id", filters.moduleId);
      if (filters.publication) params.set("is_published", filters.publication);
      const result = await api<Page>(
        `/admin/learning-topics?${params.toString()}`,
      );
      const items = Array.isArray(result.items) ? result.items : [];
      const responseTotal = Number(result.total);
      const responsePage = Number(result.page);
      const responsePages = Number(result.total_pages);
      const total =
        Number.isFinite(responseTotal) && responseTotal >= 0
          ? responseTotal
          : items.length;
      const currentPage =
        Number.isFinite(responsePage) && responsePage >= 1
          ? responsePage
          : nextPage;
      const totalPages =
        Number.isFinite(responsePages) && responsePages >= 1
          ? responsePages
          : Math.max(1, Math.ceil(total / 20));
      setTopics(items);
      setPages(totalPages);
      setTotal(total);
      setPage(currentPage);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void api<{ items: Entry[] }>("/learning/modules")
      .then((result) => {
        if (active) setModules(result.items);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void loadTopics(1);
    // Loading is intentionally driven by explicit filtering, not every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField<Key extends keyof TopicForm>(
    key: Key,
    fieldValue: TopicForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: fieldValue }));
  }

  function createTopic() {
    setEditing(null);
    setForm({ ...blankForm(), module_id: String(modules[0]?.id || "") });
    setEditorOpen(true);
    setError("");
    setMessage("");
  }

  function editTopic(topic: Entry) {
    setEditing(topic);
    setForm(topicForm(topic));
    setEditorOpen(true);
    setError("");
    setMessage("");
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
    setForm(blankForm());
  }

  async function openCourseOrder(topic: Entry) {
    setOrderingTopic(topic);
    setOrderedCourses([]);
    setCourseOrderError("");
    setCourseOrderOpen(true);
    setCourseOrderLoading(true);
    setError("");
    setMessage("");
    try {
      const detail = await api<Entry>(`/admin/learning-topics/${topic.id}`);
      setOrderingTopic(detail);
      setOrderedCourses(entries(detail, "courses"));
    } catch (reason) {
      setCourseOrderError((reason as Error).message);
    } finally {
      setCourseOrderLoading(false);
    }
  }

  function closeCourseOrder(force = false) {
    if (
      !force &&
      (courseOrderSaving ||
        courseRemovingId !== null ||
        courseAssociationSaving)
    )
      return;
    setCourseOrderOpen(false);
    setOrderingTopic(null);
    setOrderedCourses([]);
    setCourseOrderError("");
    setCourseAssociationOpen(false);
    setAvailableCourses([]);
    setSelectedCourseIds([]);
    setCourseAssociationQuery("");
    setCourseAssociationLoading(false);
    setCourseAssociationSaving(false);
    setCourseAssociationError("");
    setCourseRemovingId(null);
    setDraggedCourseId(null);
    setCourseDropTarget(null);
  }

  async function openCourseAssociation() {
    if (!orderingTopic) return;
    setCourseAssociationOpen(true);
    setAvailableCourses([]);
    setSelectedCourseIds([]);
    setCourseAssociationQuery("");
    setCourseAssociationError("");
    setCourseAssociationLoading(true);
    try {
      const result = await api<Page>(
        "/admin/learning-courses?page=1&page_size=100",
      );
      const currentIds = new Set(orderedCourses.map((course) => course.id));
      setAvailableCourses(
        (Array.isArray(result.items) ? result.items : []).filter(
          (course) => !currentIds.has(course.id),
        ),
      );
    } catch (reason) {
      setCourseAssociationError((reason as Error).message);
    } finally {
      setCourseAssociationLoading(false);
    }
  }

  function closeCourseAssociation(force = false) {
    if (courseAssociationSaving && !force) return;
    setCourseAssociationOpen(false);
    setAvailableCourses([]);
    setSelectedCourseIds([]);
    setCourseAssociationQuery("");
    setCourseAssociationError("");
  }

  function toggleCourseAssociation(courseId: number) {
    setSelectedCourseIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId],
    );
  }

  function moveCourseTo(
    courseId: number,
    targetCourseId: number,
    insertAfter: boolean,
  ) {
    if (courseId === targetCourseId) return;
    setOrderedCourses((current) => {
      const moving = current.find((course) => course.id === courseId);
      if (!moving) return current;
      const next = current.filter((course) => course.id !== courseId);
      const targetIndex = next.findIndex(
        (course) => course.id === targetCourseId,
      );
      if (targetIndex < 0) return current;
      next.splice(targetIndex + (insertAfter ? 1 : 0), 0, moving);
      return next;
    });
  }

  function startCourseDrag(event: DragEvent<HTMLLIElement>, courseId: number) {
    if (courseOrderSaving || courseRemovingId !== null) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(courseId));
    setDraggedCourseId(courseId);
  }

  function previewCourseDrop(
    event: DragEvent<HTMLLIElement>,
    courseId: number,
  ) {
    event.preventDefault();
    if (
      courseOrderSaving ||
      courseRemovingId !== null ||
      draggedCourseId === null ||
      draggedCourseId === courseId
    )
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setCourseDropTarget({
      courseId,
      insertAfter: event.clientY >= bounds.top + bounds.height / 2,
    });
  }

  function dropCourse(event: DragEvent<HTMLLIElement>, targetCourseId: number) {
    event.preventDefault();
    const transferredCourseId = Number(
      event.dataTransfer.getData("text/plain"),
    );
    const courseId = draggedCourseId ?? transferredCourseId;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (Number.isFinite(courseId)) {
      moveCourseTo(
        courseId,
        targetCourseId,
        event.clientY >= bounds.top + bounds.height / 2,
      );
    }
    setDraggedCourseId(null);
    setCourseDropTarget(null);
  }

  function finishCourseDrag() {
    setDraggedCourseId(null);
    setCourseDropTarget(null);
  }

  async function saveCourseOrder() {
    if (!orderingTopic || !orderedCourses.length || courseRemovingId !== null)
      return;
    setCourseOrderSaving(true);
    setCourseOrderError("");
    try {
      await api(
        `/admin/learning-topics/${orderingTopic.id}/course-order`,
        "PUT",
        { course_ids: orderedCourses.map((course) => course.id) },
      );
      closeCourseOrder(true);
      setMessage("专题内课程顺序已保存。");
      await loadTopics();
    } catch (reason) {
      setCourseOrderError((reason as Error).message);
    } finally {
      setCourseOrderSaving(false);
    }
  }

  async function removeCourseFromTopic(course: Entry) {
    if (!orderingTopic || courseRemovingId !== null) return;
    const display = courseOrderDisplay(course);
    const courseTitle = value(course, "title") || display.title;
    if (
      !window.confirm(
        `确定解除课程“${courseTitle}”与本专题的关联吗？课程、教材和课时都会保留。`,
      )
    )
      return;
    setCourseRemovingId(course.id);
    setCourseOrderError("");
    try {
      await api(
        `/admin/learning-topics/${orderingTopic.id}/courses/${course.id}`,
        "DELETE",
      );
      setOrderedCourses((current) =>
        current.filter((item) => item.id !== course.id),
      );
      setDraggedCourseId(null);
      setCourseDropTarget(null);
      setMessage(`课程“${courseTitle}”已解除与本专题的关联。`);
      await loadTopics();
    } catch (reason) {
      setCourseOrderError((reason as Error).message);
    } finally {
      setCourseRemovingId(null);
    }
  }

  async function associateCourses(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderingTopic || !selectedCourseIds.length) return;
    setCourseAssociationSaving(true);
    setCourseAssociationError("");
    try {
      const result = await api<{ items: Entry[] }>(
        `/admin/learning-topics/${orderingTopic.id}/courses`,
        "POST",
        { course_ids: selectedCourseIds },
      );
      setOrderedCourses((current) => [
        ...current,
        ...(Array.isArray(result.items) ? result.items : []),
      ]);
      closeCourseAssociation(true);
      setMessage("已有课程已关联到该专题。");
      await loadTopics();
    } catch (reason) {
      setCourseAssociationError((reason as Error).message);
    } finally {
      setCourseAssociationSaving(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const topicCode = form.topic_code.trim();
    if (!topicCodePattern.test(topicCode)) {
      setError(
        "专题编码只能使用小写英文字母、数字和连字符，例如 daily-speaking。",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api(
        editing
          ? `/admin/learning/topics/${editing.id}`
          : "/admin/learning/topics",
        editing ? "PUT" : "POST",
        {
          ...form,
          topic_code: topicCode,
          module_id: Number(form.module_id),
          sort_order: Number(form.sort_order || 0),
          is_published: form.is_published ? 1 : 0,
        },
      );
      setMessage(editing ? "专题已更新。" : "专题已创建。");
      closeEditor();
      await loadTopics(editing ? page : 1);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublication(topic: Entry) {
    const published = value(topic, "is_published") === "1";
    try {
      await api(`/admin/learning/topics/${topic.id}/publication`, "PUT", {
        is_published: published ? 0 : 1,
      });
      setMessage(published ? "专题已下架。" : "专题已发布。");
      await loadTopics();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function remove(topic: Entry) {
    if (
      !window.confirm(
        `确定删除“${value(topic, "title")}”吗？含教材或课程的专题不能删除。`,
      )
    )
      return;
    try {
      await api(`/admin/learning/topics/${topic.id}`, "DELETE");
      setMessage("专题已删除。");
      if (editing?.id === topic.id) closeEditor();
      await loadTopics(topics.length === 1 && page > 1 ? page - 1 : page);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const moduleName = (id: unknown) =>
    value(
      modules.find((item) => item.id === Number(id)),
      "name",
    ) || `学习区域 #${id}`;

  return (
    <section className="container py-5 topic-management-page">
      <header className="admin-page-heading">
        <div>
          <p className="admin-list-eyebrow">内容管理</p>
          <h2>专题维护</h2>
          <p>建立学习专题，整理教材和课程，并控制学习端的可见状态。</p>
        </div>
        <button
          className="admin-action-button admin-action-primary"
          onClick={createTopic}
          type="button"
        >
          新建专题
        </button>
      </header>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      )}

      <section className="card shadow-sm admin-filter-panel">
        <div className="card-body">
          <div className="admin-filter-panel-title">
            <p>筛选专题</p>
            <span>按名称、编码、学习区域或发布状态查询。</span>
          </div>
          <div className="topic-filter-grid">
            <div>
              <label className="form-label" htmlFor="topic-search">
                搜索专题
              </label>
              <input
                className="form-control"
                id="topic-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="名称或专题编码"
                value={query}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="topic-filter-module">
                学习区域
              </label>
              <select
                className="form-select"
                id="topic-filter-module"
                onChange={(event) => setModuleId(event.target.value)}
                value={moduleId}
              >
                <option value="">全部学习区域</option>
                {modules.map((item) => (
                  <option key={item.id} value={item.id}>
                    {value(item, "name")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="topic-filter-publication">
                发布状态
              </label>
              <select
                className="form-select"
                id="topic-filter-publication"
                onChange={(event) => setPublicationFilter(event.target.value)}
                value={publicationFilter}
              >
                <option value="">全部状态</option>
                <option value="1">已发布</option>
                <option value="0">未发布</option>
              </select>
            </div>
            <div className="topic-filter-actions">
              <button
                className="admin-filter-submit"
                onClick={() => void loadTopics(1)}
                type="button"
              >
                查询
              </button>
              <button
                className="admin-filter-submit"
                onClick={() => {
                  setQuery("");
                  setModuleId("");
                  setPublicationFilter("");
                  void loadTopics(1, {
                    query: "",
                    moduleId: "",
                    publication: "",
                  });
                }}
                type="button"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="card shadow-sm topic-table-card">
        <div className="table-responsive">
          <table className="table admin-data-table topic-table">
            <thead>
              <tr>
                <th>专题</th>
                <th>学习区域</th>
                <th>内容统计</th>
                <th>排序</th>
                <th>状态</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="admin-table-loading">
                    正在加载专题…
                  </td>
                </tr>
              ) : topics.length ? (
                topics.map((topic) => {
                  const stats = topicStatistics(topic);
                  const published = value(topic, "is_published") === "1";
                  return (
                    <tr key={topic.id}>
                      <td>
                        <strong>{value(topic, "title")}</strong>
                        <small>{value(topic, "topic_code")}</small>
                      </td>
                      <td>{moduleName(topic.module_id)}</td>
                      <td>
                        教材 {stats.material_count} · 课时 {stats.lesson_count}{" "}
                        · 课程 {stats.course_count}
                      </td>
                      <td>{value(topic, "sort_order")}</td>
                      <td>
                        <span
                          className={`topic-status${published ? "" : " is-unpublished"}`}
                        >
                          {published ? "已发布" : "未发布"}
                        </span>
                      </td>
                      <td className="admin-table-actions-cell">
                        <div className="admin-table-actions">
                          <button
                            className="admin-table-button topic-course-order-button"
                            onClick={() => void openCourseOrder(topic)}
                            type="button"
                          >
                            课程管理
                          </button>
                          <button
                            className="admin-table-button"
                            onClick={() => editTopic(topic)}
                            type="button"
                          >
                            编辑
                          </button>
                          <button
                            className={`admin-table-button ${published ? "is-warning" : "is-positive"}`}
                            onClick={() => void togglePublication(topic)}
                            type="button"
                          >
                            {published ? "下架" : "发布"}
                          </button>
                          <button
                            className="admin-table-button is-danger"
                            onClick={() => void remove(topic)}
                            type="button"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="admin-table-loading">
                    没有符合条件的专题。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="topic-pagination">
          <span>
            共 {total} 个专题，第 {page} / {pages} 页
          </span>
          <div>
            <button
              className="admin-table-button"
              disabled={page <= 1 || loading}
              onClick={() => void loadTopics(page - 1)}
              type="button"
            >
              上一页
            </button>
            <button
              className="admin-table-button"
              disabled={page >= pages || loading}
              onClick={() => void loadTopics(page + 1)}
              type="button"
            >
              下一页
            </button>
          </div>
        </footer>
      </section>

      {editorOpen && (
        <div
          className="topic-editor-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}
          role="presentation"
        >
          <section
            aria-labelledby="topic-editor-title"
            aria-modal="true"
            className="topic-editor-dialog"
            role="dialog"
          >
            <header className="topic-editor-heading">
              <div>
                <p className="admin-list-eyebrow">专题资料</p>
                <h2 id="topic-editor-title">
                  {editing ? `编辑：${value(editing, "title")}` : "新建专题"}
                </h2>
              </div>
              <button
                aria-label="关闭"
                className="topic-editor-close"
                onClick={closeEditor}
                type="button"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </header>
            <div className="topic-editor-body">
              <form className="row g-3" onSubmit={(event) => void save(event)}>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="topic-module-id">
                    所属学习区域
                  </label>
                  <select
                    className="form-select"
                    id="topic-module-id"
                    onChange={(event) =>
                      setField("module_id", event.target.value)
                    }
                    required
                    value={form.module_id}
                  >
                    <option value="">请选择学习区域</option>
                    {modules.map((item) => (
                      <option key={item.id} value={item.id}>
                        {value(item, "name")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="topic-code">
                    专题编码
                  </label>
                  <input
                    className="form-control"
                    id="topic-code"
                    maxLength={100}
                    onChange={(event) =>
                      setField(
                        "topic_code",
                        topicCodeFromText(event.target.value),
                      )
                    }
                    onInvalid={(event) =>
                      event.currentTarget.setCustomValidity(
                        "专题编码只能使用小写英文字母、数字和连字符，例如 daily-speaking。",
                      )
                    }
                    onInput={(event) =>
                      event.currentTarget.setCustomValidity("")
                    }
                    pattern="[a-z0-9][a-z0-9-]{0,99}"
                    placeholder="例如 daily-speaking"
                    required
                    value={form.topic_code}
                  />
                  <div className="topic-code-help">
                    仅用于系统识别和链接，不能填中文。填写英文名称后可自动生成。
                    <button
                      disabled={!form.title_en.trim()}
                      onClick={() =>
                        setField("topic_code", topicCodeFromText(form.title_en))
                      }
                      type="button"
                    >
                      根据英文名称生成
                    </button>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="topic-title">
                    专题名称
                  </label>
                  <input
                    className="form-control"
                    id="topic-title"
                    maxLength={200}
                    onChange={(event) => setField("title", event.target.value)}
                    required
                    value={form.title}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="topic-title-en">
                    英文名称
                  </label>
                  <input
                    className="form-control"
                    id="topic-title-en"
                    maxLength={200}
                    onChange={(event) => {
                      const titleEn = event.target.value;
                      setForm((current) => ({
                        ...current,
                        title_en: titleEn,
                        topic_code:
                          !editing && !current.topic_code
                            ? topicCodeFromText(titleEn)
                            : current.topic_code,
                      }));
                    }}
                    value={form.title_en}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="topic-description">
                    专题简介
                  </label>
                  <textarea
                    className="form-control"
                    id="topic-description"
                    maxLength={50000}
                    onChange={(event) =>
                      setField("description", event.target.value)
                    }
                    rows={4}
                    value={form.description}
                  />
                </div>
                <div className="col-md-8">
                  <label className="form-label" htmlFor="topic-cover-url">
                    封面地址
                  </label>
                  <input
                    className="form-control"
                    id="topic-cover-url"
                    maxLength={500}
                    onChange={(event) =>
                      setField("cover_url", event.target.value)
                    }
                    type="url"
                    value={form.cover_url}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="topic-sort-order">
                    排序
                  </label>
                  <input
                    className="form-control"
                    id="topic-sort-order"
                    onChange={(event) =>
                      setField("sort_order", event.target.value)
                    }
                    type="number"
                    value={form.sort_order}
                  />
                </div>
                <div className="col-12 form-check topic-published-check">
                  <input
                    checked={form.is_published}
                    className="form-check-input"
                    id="topic-is-published"
                    onChange={(event) =>
                      setField("is_published", event.target.checked)
                    }
                    type="checkbox"
                  />{" "}
                  <label
                    className="form-check-label"
                    htmlFor="topic-is-published"
                  >
                    立即发布给学习者
                  </label>
                </div>
                <div className="col-12 d-flex gap-2">
                  <button
                    className="admin-action-button admin-action-primary"
                    disabled={saving}
                    type="submit"
                  >
                    {saving ? "正在保存…" : "保存专题"}
                  </button>
                  <button
                    className="admin-action-button admin-action-secondary"
                    onClick={closeEditor}
                    type="button"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}

      {courseOrderOpen && (
        <div
          className="topic-editor-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCourseOrder();
          }}
          role="presentation"
        >
          <section
            aria-labelledby="topic-course-order-title"
            aria-modal="true"
            className="topic-editor-dialog topic-course-order-dialog"
            role="dialog"
          >
            <header className="topic-editor-heading">
              <div>
                <p className="admin-list-eyebrow">课程编排</p>
                <h2 id="topic-course-order-title">
                  课程管理：{value(orderingTopic, "title")}
                </h2>
              </div>
              <div className="topic-course-order-heading-actions">
                <button
                  className="admin-action-button admin-action-primary topic-course-order-add"
                  disabled={
                    courseOrderLoading ||
                    courseOrderSaving ||
                    courseRemovingId !== null ||
                    courseAssociationSaving ||
                    courseAssociationOpen
                  }
                  onClick={() => void openCourseAssociation()}
                  type="button"
                >
                  <Plus aria-hidden="true" size={16} />
                  关联课程
                </button>
                <button
                  aria-label="关闭"
                  className="topic-editor-close"
                  onClick={() => closeCourseOrder()}
                  type="button"
                >
                  <X aria-hidden="true" size={19} />
                </button>
              </div>
            </header>
            <div className="topic-editor-body topic-course-order-body">
              <p
                className="topic-course-order-help"
                id="topic-course-order-help"
              >
                从课程开发中选择已有课程关联到本专题，再拖住左侧手柄调整学习顺序。悬浮课程可解除与本专题的关联；课程、教材和课时都会保留。
              </p>
              {courseOrderError && (
                <div className="alert alert-danger" role="alert">
                  {courseOrderError}
                </div>
              )}
              {courseAssociationOpen && (
                <form
                  className="topic-course-association-form"
                  onSubmit={(event) => void associateCourses(event)}
                >
                  <div className="topic-course-association-heading">
                    <div>
                      <strong>关联已有课程</strong>
                      <small>
                        从课程库选择已配置的课程，课程内容仍在“课程开发”中维护。
                      </small>
                    </div>
                    <button
                      className="admin-table-button"
                      disabled={courseAssociationSaving}
                      onClick={() => closeCourseAssociation()}
                      type="button"
                    >
                      收起
                    </button>
                  </div>
                  {courseAssociationError && (
                    <div className="alert alert-danger" role="alert">
                      {courseAssociationError}
                    </div>
                  )}
                  <label className="topic-course-association-search">
                    <span>搜索课程</span>
                    <input
                      className="form-control"
                      onChange={(event) =>
                        setCourseAssociationQuery(event.target.value)
                      }
                      placeholder="课程名称、编码或英文名称"
                      value={courseAssociationQuery}
                    />
                  </label>
                  {courseAssociationLoading ? (
                    <p className="topic-course-association-empty" role="status">
                      正在读取课程库…
                    </p>
                  ) : availableCourses.filter((course) => {
                      const search = courseAssociationQuery
                        .trim()
                        .toLowerCase();
                      if (!search) return true;
                      return [
                        value(course, "title"),
                        value(course, "title_en"),
                        value(course, "course_code"),
                      ].some((field) => field.toLowerCase().includes(search));
                    }).length ? (
                    <div className="topic-course-association-options">
                      {availableCourses
                        .filter((course) => {
                          const search = courseAssociationQuery
                            .trim()
                            .toLowerCase();
                          if (!search) return true;
                          return [
                            value(course, "title"),
                            value(course, "title_en"),
                            value(course, "course_code"),
                          ].some((field) =>
                            field.toLowerCase().includes(search),
                          );
                        })
                        .map((course) => (
                          <label
                            className={
                              selectedCourseIds.includes(course.id)
                                ? "is-selected"
                                : ""
                            }
                            key={course.id}
                          >
                            <input
                              checked={selectedCourseIds.includes(course.id)}
                              onChange={() =>
                                toggleCourseAssociation(course.id)
                              }
                              type="checkbox"
                            />
                            <span>
                              <strong>
                                {courseOrderDisplay(course).title}
                              </strong>
                              <small>
                                {courseOrderDisplay(course).subtitle ||
                                  value(course, "course_code")}
                              </small>
                            </span>
                          </label>
                        ))}
                    </div>
                  ) : (
                    <p className="topic-course-association-empty">
                      没有可关联的课程，请先到“课程开发”配置课程。
                    </p>
                  )}
                  <div className="topic-course-association-actions">
                    <button
                      className="admin-action-button admin-action-secondary"
                      disabled={courseAssociationSaving}
                      onClick={() => closeCourseAssociation()}
                      type="button"
                    >
                      取消
                    </button>
                    <button
                      className="admin-action-button admin-action-primary"
                      disabled={
                        courseAssociationSaving || !selectedCourseIds.length
                      }
                      type="submit"
                    >
                      {courseAssociationSaving ? "正在关联…" : "关联课程"}
                    </button>
                  </div>
                </form>
              )}
              {courseOrderLoading ? (
                <p className="topic-course-order-empty" role="status">
                  正在读取课程…
                </p>
              ) : orderedCourses.length ? (
                <ol
                  aria-describedby="topic-course-order-help"
                  className="topic-course-order-list"
                >
                  {orderedCourses.map((course, index) => {
                    const dropBefore =
                      courseDropTarget?.courseId === course.id &&
                      !courseDropTarget.insertAfter;
                    const dropAfter =
                      courseDropTarget?.courseId === course.id &&
                      courseDropTarget.insertAfter;
                    const display = courseOrderDisplay(course);
                    const courseTitle = value(course, "title") || display.title;
                    const removing = courseRemovingId === course.id;
                    return (
                      <li
                        aria-label={`${display.title}，第 ${index + 1} 位`}
                        className={`topic-course-order-item${draggedCourseId === course.id ? " is-dragging" : ""}${dropBefore ? " is-drop-before" : ""}${dropAfter ? " is-drop-after" : ""}`}
                        data-course-id={course.id}
                        draggable={
                          !courseOrderSaving && courseRemovingId === null
                        }
                        key={course.id}
                        onDragEnd={finishCourseDrag}
                        onDragOver={(event) =>
                          previewCourseDrop(event, course.id)
                        }
                        onDragStart={(event) =>
                          startCourseDrag(event, course.id)
                        }
                        onDrop={(event) => dropCourse(event, course.id)}
                      >
                        <span
                          aria-hidden="true"
                          className="topic-course-order-handle"
                          title="拖拽调整顺序"
                        >
                          <GripVertical size={19} strokeWidth={2.25} />
                        </span>
                        <span className="topic-course-order-position">
                          {index + 1}
                        </span>
                        <div className="topic-course-order-copy">
                          <strong>{display.title}</strong>
                          <small>{display.subtitle}</small>
                        </div>
                        <button
                          aria-label={`移除课程：${courseTitle}`}
                          className="topic-course-order-remove"
                          disabled={
                            courseOrderSaving || courseRemovingId !== null
                          }
                          onClick={() => void removeCourseFromTopic(course)}
                          onPointerDown={(event) => event.stopPropagation()}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={14} />
                          {removing ? "正在移除…" : "移除"}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="topic-course-order-empty">
                  该专题还没有关联课程。点击“关联课程”选择课程。
                </p>
              )}
              <div className="topic-course-order-footer">
                <button
                  className="admin-action-button admin-action-secondary"
                  disabled={
                    courseOrderSaving ||
                    courseRemovingId !== null ||
                    courseAssociationSaving
                  }
                  onClick={() => closeCourseOrder()}
                  type="button"
                >
                  取消
                </button>
                <button
                  className="admin-action-button admin-action-primary"
                  disabled={
                    courseOrderLoading ||
                    courseOrderSaving ||
                    courseRemovingId !== null ||
                    !orderedCourses.length
                  }
                  onClick={() => void saveCourseOrder()}
                  type="button"
                >
                  {courseOrderSaving ? "正在保存…" : "保存顺序"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
