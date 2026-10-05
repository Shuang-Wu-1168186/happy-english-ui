import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookCopy,
  FilePenLine,
  GripVertical,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api, entries, value } from "../lib/api";
import type { Entry, Page } from "../lib/api";

type CourseFilters = {
  q: string;
  topicId: string;
  accessPolicy: string;
  isPublished: string;
};

type MaterialPickerFilters = {
  q: string;
  isPublished: string;
};

type CourseForm = {
  materialIds: number[];
  courseCode: string;
  title: string;
  titleEn: string;
  summary: string;
  courseType: string;
  coverUrl: string;
  estimatedMinutes: string;
  difficultyCode: string;
  sortOrder: string;
  isPublished: boolean;
  isFree: boolean;
};

type EditorState = { course: Entry | null };

type MaterialDropTarget = {
  materialId: number;
  insertAfter: boolean;
};

const pageSize = 20;
const materialPickerPageSize = 100;

function emptyCourseForm(): CourseForm {
  return {
    materialIds: [],
    courseCode: "",
    title: "",
    titleEn: "",
    summary: "",
    courseType: "lesson",
    coverUrl: "",
    estimatedMinutes: "",
    difficultyCode: "",
    sortOrder: "0",
    isPublished: true,
    isFree: true,
  };
}

function numberValue(raw: unknown) {
  const result = Number(raw);
  return Number.isFinite(result) ? result : 0;
}

function isEnabled(raw: unknown) {
  return raw === true || raw === 1 || raw === "1" || raw === "true";
}

function idsFrom(entry: Entry, key: string) {
  const raw = entry[key];
  if (!Array.isArray(raw)) return [];
  return raw.map(numberValue).filter((id) => id > 0);
}

function courseForm(course: Entry): CourseForm {
  return {
    materialIds: idsFrom(course, "material_ids"),
    courseCode: value(course, "course_code"),
    title: value(course, "title"),
    titleEn: value(course, "title_en"),
    summary: value(course, "summary"),
    courseType: value(course, "course_type") || "lesson",
    coverUrl: value(course, "cover_url"),
    estimatedMinutes: value(course, "estimated_minutes"),
    difficultyCode: value(course, "difficulty_code"),
    sortOrder: value(course, "sort_order") || "0",
    isPublished: isEnabled(course.is_published),
    isFree: value(course, "access_policy") !== "benefit",
  };
}

function coursePayload(form: CourseForm) {
  const estimatedMinutes = form.estimatedMinutes.trim();
  return {
    material_ids: form.materialIds,
    material_id: form.materialIds[0] || null,
    course_code: form.courseCode.trim(),
    title: form.title.trim(),
    title_en: form.titleEn.trim(),
    summary: form.summary.trim(),
    course_type: form.courseType.trim() || "lesson",
    cover_url: form.coverUrl.trim(),
    estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
    difficulty_code: form.difficultyCode.trim(),
    sort_order: Number(form.sortOrder || 0),
    is_published: form.isPublished ? 1 : 0,
    access_policy: form.isFree ? "free" : "benefit",
  };
}

function materialNames(course: Entry, materials: Map<number, Entry>) {
  const linkedMaterials = entries(course, "materials");
  if (linkedMaterials.length) {
    return linkedMaterials.map(
      (material) => value(material, "title") || `教材 #${material.id}`,
    );
  }
  return idsFrom(course, "material_ids").map(
    (id) => value(materials.get(id), "title") || `教材 #${id}`,
  );
}

function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function CourseDevelopment() {
  const [topics, setTopics] = useState<Entry[]>([]);
  const [materials, setMaterials] = useState<Entry[]>([]);
  const [courses, setCourses] = useState<Entry[]>([]);
  const [filters, setFilters] = useState<CourseFilters>({
    q: "",
    topicId: "",
    accessPolicy: "",
    isPublished: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyCourseForm);
  const [editorError, setEditorError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [materialPickerFilters, setMaterialPickerFilters] =
    useState<MaterialPickerFilters>({ q: "", isPublished: "" });
  const [pickerMaterials, setPickerMaterials] = useState<Entry[]>([]);
  const [pickerTotal, setPickerTotal] = useState(0);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState("");
  const [draggedMaterialId, setDraggedMaterialId] = useState<number | null>(
    null,
  );
  const [materialDropTarget, setMaterialDropTarget] =
    useState<MaterialDropTarget | null>(null);

  const materialById = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials],
  );
  const loadReferenceData = useCallback(async () => {
    const [topicResponse, materialResponse] = await Promise.all([
      api<Page>("/admin/learning-topics?page=1&page_size=100"),
      api<Page>("/admin/learning-materials?page=1&page_size=100"),
    ]);
    setTopics(Array.isArray(topicResponse.items) ? topicResponse.items : []);
    setMaterials(
      Array.isArray(materialResponse.items) ? materialResponse.items : [],
    );
  }, []);

  const loadCourses = useCallback(
    async (nextPage: number, nextFilters: CourseFilters) => {
      const params = new URLSearchParams({
        page: String(nextPage),
        page_size: String(pageSize),
      });
      if (nextFilters.q.trim()) params.set("q", nextFilters.q.trim());
      if (nextFilters.topicId) params.set("topic_id", nextFilters.topicId);
      if (nextFilters.accessPolicy) {
        params.set("access_policy", nextFilters.accessPolicy);
      }
      if (nextFilters.isPublished) {
        params.set("is_published", nextFilters.isPublished);
      }
      const response = await api<Page>(
        `/admin/learning-courses?${params.toString()}`,
      );
      const items = Array.isArray(response.items) ? response.items : [];
      const responseTotal = numberValue(response.total);
      const responsePage = numberValue(response.page);
      const responsePages = numberValue(response.total_pages);
      setCourses(items);
      setTotal(responseTotal);
      setPage(responsePage || nextPage);
      setTotalPages(responsePages || pageCount(responseTotal));
    },
    [],
  );

  const loadPickerMaterials = useCallback(
    async (nextFilters: MaterialPickerFilters) => {
      const params = new URLSearchParams({
        page: "1",
        page_size: String(materialPickerPageSize),
      });
      if (nextFilters.q.trim()) params.set("q", nextFilters.q.trim());
      if (nextFilters.isPublished) {
        params.set("is_published", nextFilters.isPublished);
      }
      const response = await api<Page>(
        `/admin/learning-materials?${params.toString()}`,
      );
      const items = Array.isArray(response.items) ? response.items : [];
      setPickerMaterials(items);
      setPickerTotal(numberValue(response.total));
      setMaterials((current) => {
        const byId = new Map(
          current.map((material) => [material.id, material]),
        );
        items.forEach((material) => byId.set(material.id, material));
        return [...byId.values()];
      });
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(loadReferenceData)
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [loadReferenceData]);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (!active) return undefined;
        setLoading(true);
        setError("");
        return loadCourses(page, appliedFilters);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appliedFilters, loadCourses, page, reloadKey]);

  useEffect(() => {
    if (!editor) return;
    let active = true;
    const delay = window.setTimeout(
      () => {
        setPickerLoading(true);
        setPickerError("");
        void loadPickerMaterials(materialPickerFilters)
          .catch((reason: Error) => {
            if (active) setPickerError(reason.message);
          })
          .finally(() => {
            if (active) setPickerLoading(false);
          });
      },
      materialPickerFilters.q.trim() ? 180 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(delay);
    };
  }, [editor, loadPickerMaterials, materialPickerFilters]);

  function courseTopicNames(course: Entry) {
    const names = entries(course, "topics")
      .map((topic) => value(topic, "title"))
      .filter(Boolean);
    return names.length ? names.join(" / ") : "未关联专题";
  }

  function openEditor(course: Entry | null) {
    setEditor({ course });
    setForm(course ? courseForm(course) : emptyCourseForm());
    setEditorError("");
    setError("");
    setNotice("");
    setMaterialPickerFilters({ q: "", isPublished: "" });
    setPickerError("");
    setDraggedMaterialId(null);
    setMaterialDropTarget(null);
  }

  function closeEditor() {
    if (saving) return;
    setEditor(null);
    setEditorError("");
    setDraggedMaterialId(null);
    setMaterialDropTarget(null);
  }

  function updateForm<Key extends keyof CourseForm>(
    key: Key,
    fieldValue: CourseForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: fieldValue }));
  }

  function addMaterial(materialId: number) {
    setForm((current) =>
      current.materialIds.includes(materialId)
        ? current
        : {
            ...current,
            materialIds: [...current.materialIds, materialId],
          },
    );
  }

  function removeMaterial(materialId: number) {
    setForm((current) => ({
      ...current,
      materialIds: current.materialIds.filter((id) => id !== materialId),
    }));
  }

  function moveMaterial(materialId: number, direction: -1 | 1) {
    setForm((current) => {
      const index = current.materialIds.indexOf(materialId);
      const nextIndex = index + direction;
      if (
        index < 0 ||
        nextIndex < 0 ||
        nextIndex >= current.materialIds.length
      ) {
        return current;
      }
      const materialIds = [...current.materialIds];
      [materialIds[index], materialIds[nextIndex]] = [
        materialIds[nextIndex],
        materialIds[index],
      ];
      return { ...current, materialIds };
    });
  }

  function moveMaterialTo(
    materialId: number,
    targetMaterialId: number,
    insertAfter: boolean,
  ) {
    if (materialId === targetMaterialId) return;
    setForm((current) => {
      const moving = current.materialIds.find((id) => id === materialId);
      if (!moving) return current;
      const next = current.materialIds.filter((id) => id !== materialId);
      const targetIndex = next.indexOf(targetMaterialId);
      if (targetIndex < 0) return current;
      next.splice(targetIndex + (insertAfter ? 1 : 0), 0, moving);
      return { ...current, materialIds: next };
    });
  }

  function startMaterialDrag(
    event: DragEvent<HTMLLIElement>,
    materialId: number,
  ) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(materialId));
    setDraggedMaterialId(materialId);
  }

  function previewMaterialDrop(
    event: DragEvent<HTMLLIElement>,
    materialId: number,
  ) {
    event.preventDefault();
    if (draggedMaterialId === null || draggedMaterialId === materialId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setMaterialDropTarget({
      materialId,
      insertAfter: event.clientY >= bounds.top + bounds.height / 2,
    });
  }

  function dropMaterial(
    event: DragEvent<HTMLLIElement>,
    targetMaterialId: number,
  ) {
    event.preventDefault();
    const transferredMaterialId = Number(
      event.dataTransfer.getData("text/plain"),
    );
    const materialId = draggedMaterialId ?? transferredMaterialId;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (Number.isFinite(materialId)) {
      moveMaterialTo(
        materialId,
        targetMaterialId,
        event.clientY >= bounds.top + bounds.height / 2,
      );
    }
    setDraggedMaterialId(null);
    setMaterialDropTarget(null);
  }

  function finishMaterialDrag() {
    setDraggedMaterialId(null);
    setMaterialDropTarget(null);
  }

  async function refresh() {
    setError("");
    setNotice("");
    try {
      await loadReferenceData();
      setReloadKey((current) => current + 1);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setEditorError("");
    setError("");
    try {
      const editingCourse = editor?.course;
      await api<Entry>(
        `/admin/learning/courses${editingCourse ? `/${editingCourse.id}` : ""}`,
        editingCourse ? "PUT" : "POST",
        coursePayload(form),
      );
      setEditor(null);
      setNotice("课程已保存。");
      await Promise.all([
        loadCourses(page, appliedFilters),
        loadReferenceData(),
      ]);
    } catch (reason) {
      setEditorError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function setPublication(course: Entry) {
    const nextForm = courseForm(course);
    nextForm.isPublished = !nextForm.isPublished;
    setError("");
    setNotice("");
    try {
      await api<Entry>(
        `/admin/learning/courses/${course.id}`,
        "PUT",
        coursePayload(nextForm),
      );
      setNotice(nextForm.isPublished ? "课程已发布。" : "课程已下架。");
      setReloadKey((current) => current + 1);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function deleteCourse(course: Entry) {
    if (!window.confirm(`确定删除课程“${value(course, "title")}”吗？`)) return;
    setError("");
    setNotice("");
    try {
      await api(`/admin/learning/courses/${course.id}`, "DELETE");
      setNotice("课程已删除。");
      if (courses.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const selectedMaterials = form.materialIds.map(
    (materialId) => materialById.get(materialId) || { id: materialId },
  );
  const editorCourse = editor?.course;

  return (
    <section className="container py-5 course-development-page">
      <header className="course-development-heading">
        <div>
          <p className="admin-list-eyebrow">内容管理</p>
          <h1>课程开发</h1>
          <p>课程可先独立创建，再按需要关联、排序或移除教材。</p>
        </div>
        <button
          className="admin-action-button admin-action-secondary"
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={16} />
          刷新数据
        </button>
      </header>

      {error && (
        <div
          className="alert alert-danger course-development-notice"
          role="alert"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          className="alert alert-success course-development-notice"
          role="status"
        >
          {notice}
        </div>
      )}

      <section className="card shadow-sm admin-filter-panel course-development-filter">
        <div className="card-body">
          <div className="admin-filter-panel-title">
            <div>
              <p>查询课程</p>
              <span>按课程、专题、免费状态和发布状态筛选。</span>
            </div>
          </div>
          <form
            className="row g-3 admin-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setAppliedFilters({ ...filters });
              setReloadKey((current) => current + 1);
            }}
          >
            <div className="col-md-4">
              <label className="form-label" htmlFor="course-query">
                课程名称或编码
              </label>
              <input
                className="form-control"
                id="course-query"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    q: event.target.value,
                  }))
                }
                placeholder="例如 地道英语"
                value={filters.q}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="course-topic-filter">
                所属专题
              </label>
              <select
                className="form-select"
                id="course-topic-filter"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    topicId: event.target.value,
                  }))
                }
                value={filters.topicId}
              >
                <option value="">全部专题</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {value(topic, "title")}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="course-access-filter">
                是否免费
              </label>
              <select
                className="form-select"
                id="course-access-filter"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    accessPolicy: event.target.value,
                  }))
                }
                value={filters.accessPolicy}
              >
                <option value="">全部</option>
                <option value="free">免费</option>
                <option value="benefit">会员权益</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="course-published-filter">
                发布状态
              </label>
              <select
                className="form-select"
                id="course-published-filter"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    isPublished: event.target.value,
                  }))
                }
                value={filters.isPublished}
              >
                <option value="">全部</option>
                <option value="1">已发布</option>
                <option value="0">未发布</option>
              </select>
            </div>
            <div className="col-12 course-development-filter-actions">
              <button
                className="admin-action-button admin-action-primary"
                type="submit"
              >
                <Search aria-hidden="true" size={16} />
                查询
              </button>
              <button
                className="admin-action-button admin-action-secondary"
                onClick={() => {
                  const reset = {
                    q: "",
                    topicId: "",
                    accessPolicy: "",
                    isPublished: "",
                  };
                  setFilters(reset);
                  setAppliedFilters(reset);
                  setPage(1);
                  setReloadKey((current) => current + 1);
                }}
                type="button"
              >
                重置
              </button>
              <button
                className="admin-action-button admin-action-primary"
                onClick={() => openEditor(null)}
                type="button"
              >
                <Plus aria-hidden="true" size={16} />
                新建课程
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card shadow-sm course-development-table-card">
        <header className="course-development-table-heading">
          <div>
            <p>课程列表</p>
            <h2>learning_course</h2>
          </div>
          <span>共 {total} 门课程</span>
        </header>
        {loading ? (
          <p className="admin-table-loading" role="status">
            正在加载课程…
          </p>
        ) : courses.length ? (
          <div className="table-responsive">
            <table className="table admin-data-table course-development-table mb-0">
              <thead>
                <tr>
                  <th>课程</th>
                  <th>关联专题</th>
                  <th>关联教材</th>
                  <th>是否免费</th>
                  <th>发布状态</th>
                  <th className="text-end">操作</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => {
                  const names = materialNames(course, materialById);
                  const published = isEnabled(course.is_published);
                  const free = value(course, "access_policy") !== "benefit";
                  return (
                    <tr key={course.id}>
                      <td data-label="课程">
                        <strong>{value(course, "title")}</strong>
                        <small>
                          {[
                            value(course, "course_code"),
                            value(course, "title_en"),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </td>
                      <td data-label="关联专题">{courseTopicNames(course)}</td>
                      <td data-label="关联教材">
                        <div className="course-material-summary">
                          {names.length
                            ? names.map((name) => (
                                <span key={name}>{name}</span>
                              ))
                            : "未关联教材"}
                        </div>
                      </td>
                      <td data-label="是否免费">
                        <span
                          className={`course-access-badge${free ? " is-free" : " is-benefit"}`}
                        >
                          {free ? "免费" : "会员权益"}
                        </span>
                      </td>
                      <td data-label="发布状态">
                        <span
                          className={`course-publication-badge${published ? " is-published" : ""}`}
                        >
                          {published ? "已发布" : "未发布"}
                        </span>
                      </td>
                      <td
                        className="admin-table-actions-cell"
                        data-label="操作"
                      >
                        <div className="admin-table-actions">
                          <button
                            className="admin-table-button"
                            onClick={() => openEditor(course)}
                            type="button"
                          >
                            <FilePenLine aria-hidden="true" size={14} />
                            编辑
                          </button>
                          <button
                            className="admin-table-button"
                            onClick={() => void setPublication(course)}
                            type="button"
                          >
                            {published ? "下架" : "发布"}
                          </button>
                          <button
                            className="admin-table-button is-warning"
                            onClick={() => void deleteCourse(course)}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={14} />
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>没有匹配的课程</strong>
            <span>新建独立课程，或在编辑时关联教材。</span>
          </div>
        )}
        <footer className="course-development-pagination">
          <span>
            第 {page} / {totalPages} 页，共 {total} 门课程
          </span>
          <div>
            <button
              className="admin-table-button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              上一页
            </button>
            <button
              className="admin-table-button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              下一页
            </button>
          </div>
        </footer>
      </section>

      {editor && (
        <div
          className="course-editor-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}
          role="presentation"
        >
          <section
            aria-label={
              editorCourse
                ? `编辑课程：${value(editorCourse, "title")}`
                : "新建课程"
            }
            aria-modal="true"
            className="course-editor-dialog"
            role="dialog"
          >
            <header className="course-editor-heading">
              <div>
                <p>learning_course</p>
                <h2>{editorCourse ? "编辑课程" : "新建课程"}</h2>
              </div>
              <button aria-label="关闭" onClick={closeEditor} type="button">
                <X aria-hidden="true" size={19} />
              </button>
            </header>
            <form className="course-editor-body" onSubmit={saveCourse}>
              {editorError && (
                <div className="alert alert-danger" role="alert">
                  {editorError}
                </div>
              )}
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="course-editor-code">
                    课程编码
                  </label>
                  <input
                    className="form-control"
                    id="course-editor-code"
                    onChange={(event) =>
                      updateForm("courseCode", event.target.value)
                    }
                    pattern="[a-z0-9][a-z0-9-]{0,119}"
                    required
                    value={form.courseCode}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="course-editor-title">
                    课程名称
                  </label>
                  <input
                    className="form-control"
                    id="course-editor-title"
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                    required
                    value={form.title}
                  />
                </div>
                <div className="col-md-6">
                  <label
                    className="form-label"
                    htmlFor="course-editor-title-en"
                  >
                    英文名称
                  </label>
                  <input
                    className="form-control"
                    id="course-editor-title-en"
                    onChange={(event) =>
                      updateForm("titleEn", event.target.value)
                    }
                    value={form.titleEn}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="course-editor-type">
                    课程类型
                  </label>
                  <input
                    className="form-control"
                    id="course-editor-type"
                    onChange={(event) =>
                      updateForm("courseType", event.target.value)
                    }
                    value={form.courseType}
                  />
                </div>
                <div className="col-md-6">
                  <label
                    className="form-label"
                    htmlFor="course-editor-difficulty"
                  >
                    难度编码
                  </label>
                  <input
                    className="form-control"
                    id="course-editor-difficulty"
                    onChange={(event) =>
                      updateForm("difficultyCode", event.target.value)
                    }
                    value={form.difficultyCode}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="course-editor-minutes">
                    预计学习分钟
                  </label>
                  <input
                    className="form-control"
                    id="course-editor-minutes"
                    min="1"
                    onChange={(event) =>
                      updateForm("estimatedMinutes", event.target.value)
                    }
                    type="number"
                    value={form.estimatedMinutes}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="course-editor-order">
                    列表排序
                  </label>
                  <input
                    className="form-control"
                    id="course-editor-order"
                    onChange={(event) =>
                      updateForm("sortOrder", event.target.value)
                    }
                    type="number"
                    value={form.sortOrder}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="course-editor-cover">
                    封面地址
                  </label>
                  <input
                    className="form-control"
                    id="course-editor-cover"
                    onChange={(event) =>
                      updateForm("coverUrl", event.target.value)
                    }
                    type="url"
                    value={form.coverUrl}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="course-editor-summary">
                    课程简介
                  </label>
                  <textarea
                    className="form-control"
                    id="course-editor-summary"
                    onChange={(event) =>
                      updateForm("summary", event.target.value)
                    }
                    rows={3}
                    value={form.summary}
                  />
                </div>
                <div className="col-md-6">
                  <label className="course-editor-check">
                    <input
                      checked={form.isFree}
                      onChange={(event) =>
                        updateForm("isFree", event.target.checked)
                      }
                      type="checkbox"
                    />
                    是否免费
                  </label>
                  <p className="course-editor-help">
                    {form.isFree
                      ? "免费课程可直接学习。"
                      : "会员权益课程还需在会员管理中绑定权益。"}
                  </p>
                </div>
                <div className="col-md-6">
                  <label className="course-editor-check">
                    <input
                      checked={form.isPublished}
                      onChange={(event) =>
                        updateForm("isPublished", event.target.checked)
                      }
                      type="checkbox"
                    />
                    对学习者发布
                  </label>
                </div>
                <div className="col-12">
                  <div className="course-material-picker-heading">
                    <div>
                      <label className="form-label">
                        关联教材（可选；可多选、排序或移除）
                      </label>
                      <p>
                        教材不是必填项；课程创建后也可在这里随时添加、排序或移除。
                      </p>
                    </div>
                    <BookCopy aria-hidden="true" size={19} />
                  </div>
                  <div className="course-material-picker-filters">
                    <label>
                      <span>搜索教材</span>
                      <div className="course-material-picker-search">
                        <Search aria-hidden="true" size={15} />
                        <input
                          aria-label="搜索教材名称或编码"
                          onChange={(event) =>
                            setMaterialPickerFilters((current) => ({
                              ...current,
                              q: event.target.value,
                            }))
                          }
                          placeholder="名称、编码、出版社"
                          type="search"
                          value={materialPickerFilters.q}
                        />
                      </div>
                    </label>
                    <label>
                      <span>发布状态</span>
                      <select
                        aria-label="按发布状态筛选教材"
                        onChange={(event) =>
                          setMaterialPickerFilters((current) => ({
                            ...current,
                            isPublished: event.target.value,
                          }))
                        }
                        value={materialPickerFilters.isPublished}
                      >
                        <option value="">全部状态</option>
                        <option value="1">已发布</option>
                        <option value="0">未发布</option>
                      </select>
                    </label>
                    <span
                      className="course-material-picker-count"
                      role="status"
                    >
                      {pickerLoading
                        ? "正在筛选…"
                        : `找到 ${pickerTotal} 本教材`}
                    </span>
                  </div>
                  {selectedMaterials.length ? (
                    <ol
                      aria-label="已关联教材，可拖拽调整顺序"
                      className="course-selected-materials"
                    >
                      {selectedMaterials.map((material, index) => {
                        const dropBefore =
                          materialDropTarget?.materialId === material.id &&
                          !materialDropTarget.insertAfter;
                        const dropAfter =
                          materialDropTarget?.materialId === material.id &&
                          materialDropTarget.insertAfter;
                        return (
                          <li
                            aria-label={`${value(material, "title") || `教材 #${material.id}`}，第 ${index + 1} 位`}
                            className={`${draggedMaterialId === material.id ? "is-dragging" : ""}${dropBefore ? " is-drop-before" : ""}${dropAfter ? " is-drop-after" : ""}`}
                            draggable
                            key={material.id}
                            onDragEnd={finishMaterialDrag}
                            onDragOver={(event) =>
                              previewMaterialDrop(event, material.id)
                            }
                            onDragStart={(event) =>
                              startMaterialDrag(event, material.id)
                            }
                            onDrop={(event) => dropMaterial(event, material.id)}
                          >
                            <span
                              aria-hidden="true"
                              className="course-selected-material-handle"
                              title="拖拽调整顺序"
                            >
                              <GripVertical size={18} strokeWidth={2.25} />
                            </span>
                            <span className="course-selected-material-position">
                              {index + 1}
                            </span>
                            <span>
                              <strong>
                                {value(material, "title") ||
                                  `教材 #${material.id}`}
                              </strong>
                              <small>
                                {value(material, "material_code") ||
                                  "教材记录已不可用"}
                              </small>
                            </span>
                            <div>
                              <button
                                aria-label="上移教材"
                                disabled={index === 0}
                                onClick={() => moveMaterial(material.id, -1)}
                                onPointerDown={(event) =>
                                  event.stopPropagation()
                                }
                                type="button"
                              >
                                <ArrowUp aria-hidden="true" size={15} />
                              </button>
                              <button
                                aria-label="下移教材"
                                disabled={
                                  index === selectedMaterials.length - 1
                                }
                                onClick={() => moveMaterial(material.id, 1)}
                                onPointerDown={(event) =>
                                  event.stopPropagation()
                                }
                                type="button"
                              >
                                <ArrowDown aria-hidden="true" size={15} />
                              </button>
                              <button
                                className="is-remove"
                                onClick={() => removeMaterial(material.id)}
                                onPointerDown={(event) =>
                                  event.stopPropagation()
                                }
                                type="button"
                              >
                                移除
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="course-material-picker-empty">
                      尚未选择教材。
                    </p>
                  )}
                  <div className="course-material-options">
                    {pickerMaterials.map((material) => {
                      const selected = form.materialIds.includes(material.id);
                      return (
                        <button
                          className={selected ? "is-selected" : ""}
                          disabled={selected}
                          key={material.id}
                          onClick={() => addMaterial(material.id)}
                          type="button"
                        >
                          <span>
                            <strong>{value(material, "title")}</strong>
                            <small>{value(material, "material_code")}</small>
                          </span>
                          <span>{selected ? "已关联" : "添加"}</span>
                        </button>
                      );
                    })}
                    {pickerError && (
                      <p className="course-material-picker-empty" role="alert">
                        {pickerError}
                      </p>
                    )}
                    {!pickerLoading &&
                      !pickerError &&
                      !pickerMaterials.length && (
                        <p className="course-material-picker-empty">
                          {materialPickerFilters.q ||
                          materialPickerFilters.isPublished
                            ? "没有符合筛选条件的教材。"
                            : "还没有教材，请先在“教材开发”中创建教材。"}
                        </p>
                      )}
                  </div>
                </div>
              </div>
              <footer className="course-editor-actions">
                <button
                  className="admin-action-button admin-action-secondary"
                  disabled={saving}
                  onClick={closeEditor}
                  type="button"
                >
                  取消
                </button>
                <button
                  className="admin-action-button admin-action-primary"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "保存中…" : "保存课程"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
