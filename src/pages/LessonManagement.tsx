import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { FilePenLine, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { api, entries, value } from "../lib/api";
import type { Entry, Page } from "../lib/api";

type SectionCode =
  | "core_vocabulary"
  | "situational_dialogues"
  | "key_sentence_patterns"
  | "speaking_practice"
  | "mini_exercises"
  | "useful_tips"
  | "extended_reading";

type ItemDraft = {
  key: string;
  itemCode: string;
  itemOrder: string;
  title: string;
  payload: string;
};

type SectionDraft = {
  code: SectionCode;
  title: string;
  titleEn: string;
  sortOrder: number;
  items: ItemDraft[];
};

type LessonForm = {
  materialId: string;
  lessonCode: string;
  title: string;
  titleEn: string;
  summary: string;
  illustrationUrl: string;
  estimatedMinutes: string;
  sortOrder: string;
  publish: boolean;
  sections: SectionDraft[];
};

type EditorState = { lesson: Entry | null };

const sectionDefinitions: Array<{
  code: SectionCode;
  title: string;
  titleEn: string;
  sortOrder: number;
  hint: string;
}> = [
  {
    code: "core_vocabulary",
    title: "核心词汇",
    titleEn: "Core Vocabulary",
    sortOrder: 10,
    hint: "4–6 项",
  },
  {
    code: "situational_dialogues",
    title: "情景对话",
    titleEn: "Situational Dialogues",
    sortOrder: 20,
    hint: "6–8 组",
  },
  {
    code: "key_sentence_patterns",
    title: "核心句型",
    titleEn: "Key Sentence Patterns",
    sortOrder: 30,
    hint: "3–5 项",
  },
  {
    code: "speaking_practice",
    title: "口语练习",
    titleEn: "Speaking Practice",
    sortOrder: 40,
    hint: "至少 1 项",
  },
  {
    code: "mini_exercises",
    title: "小练习",
    titleEn: "Mini Exercises",
    sortOrder: 50,
    hint: "至少 1 项",
  },
  {
    code: "useful_tips",
    title: "实用表达提示",
    titleEn: "Useful Tips",
    sortOrder: 60,
    hint: "至少 1 项",
  },
  {
    code: "extended_reading",
    title: "扩展阅读",
    titleEn: "Extended Reading",
    sortOrder: 70,
    hint: "至少 1 项",
  },
];

let draftSequence = 0;

function draftKey() {
  draftSequence += 1;
  return `draft-${draftSequence}`;
}

function numberValue(raw: unknown) {
  const result = Number(raw);
  return Number.isFinite(result) ? result : 0;
}

function isPublished(raw: unknown) {
  return raw === true || raw === 1 || raw === "1" || raw === "true";
}

function emptyItem(index: number): ItemDraft {
  return {
    key: draftKey(),
    itemCode: `item-${String(index).padStart(2, "0")}`,
    itemOrder: String(index * 10),
    title: "",
    payload: "{}",
  };
}

function emptySections(): SectionDraft[] {
  return sectionDefinitions.map((section) => ({
    code: section.code,
    title: section.title,
    titleEn: section.titleEn,
    sortOrder: section.sortOrder,
    items: [],
  }));
}

function emptyForm(materialId = ""): LessonForm {
  return {
    materialId,
    lessonCode: "",
    title: "",
    titleEn: "",
    summary: "",
    illustrationUrl: "",
    estimatedMinutes: "20",
    sortOrder: "0",
    publish: false,
    sections: emptySections(),
  };
}

function itemFromApi(item: Entry): ItemDraft {
  return {
    key: draftKey(),
    itemCode: value(item, "item_code"),
    itemOrder: value(item, "item_order") || "0",
    title: value(item, "title"),
    payload: JSON.stringify(item.payload || {}, null, 2),
  };
}

function sectionsFromApi(sections: Entry[]) {
  const byCode = new Map(
    sections.map((section) => [value(section, "section_code"), section]),
  );
  return sectionDefinitions.map((definition) => {
    const section = byCode.get(definition.code);
    return {
      code: definition.code,
      title: value(section, "title") || definition.title,
      titleEn: value(section, "title_en") || definition.titleEn,
      sortOrder: numberValue(section?.sort_order) || definition.sortOrder,
      items: section ? entries(section, "items").map(itemFromApi) : [],
    };
  });
}

function formFromLesson(lesson: Entry, sections: Entry[]): LessonForm {
  return {
    materialId: value(lesson, "material_id"),
    lessonCode: value(lesson, "lesson_code"),
    title: value(lesson, "title"),
    titleEn: value(lesson, "title_en"),
    summary: value(lesson, "summary"),
    illustrationUrl: value(lesson, "illustration_url"),
    estimatedMinutes: value(lesson, "estimated_minutes"),
    sortOrder: value(lesson, "sort_order") || "0",
    publish: isPublished(lesson.is_published),
    sections: sectionsFromApi(sections),
  };
}

function parsePayload(raw: string, label: string) {
  try {
    const payload: unknown = JSON.parse(raw || "{}");
    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      throw new Error("区块值必须是 JSON 对象。");
    }
    return payload as Record<string, unknown>;
  } catch {
    throw new Error(`${label} 的区块值不是有效 JSON。`);
  }
}

function validatePublish(form: LessonForm) {
  const limits: Record<SectionCode, [number, number | null]> = {
    core_vocabulary: [4, 6],
    situational_dialogues: [6, 8],
    key_sentence_patterns: [3, 5],
    speaking_practice: [1, null],
    mini_exercises: [1, null],
    useful_tips: [1, null],
    extended_reading: [1, null],
  };
  for (const section of form.sections) {
    const [minimum, maximum] = limits[section.code];
    if (
      section.items.length < minimum ||
      (maximum !== null && section.items.length > maximum)
    ) {
      const range =
        maximum === null ? `至少 ${minimum}` : `${minimum}–${maximum}`;
      return `${section.title}需要${range}项后才能发布。`;
    }
  }
  return "";
}

export function LessonManagement() {
  const [materials, setMaterials] = useState<Entry[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [lessons, setLessons] = useState<Entry[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editorError, setEditorError] = useState("");
  const [notice, setNotice] = useState("");

  const materialById = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials],
  );

  const loadMaterials = useCallback(async () => {
    const response = await api<Page>(
      "/admin/learning-materials?page=1&page_size=100",
    );
    setMaterials(Array.isArray(response.items) ? response.items : []);
  }, []);

  const loadLessons = useCallback(async (nextMaterialId: string) => {
    if (!nextMaterialId) {
      setLessons([]);
      return;
    }
    setLessonsLoading(true);
    try {
      const response = await api<{ items: Entry[] }>(
        `/admin/learning-materials/${nextMaterialId}/lessons`,
      );
      setLessons(Array.isArray(response.items) ? response.items : []);
    } finally {
      setLessonsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMaterials()
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [loadMaterials]);

  useEffect(() => {
    void loadLessons(materialId).catch((reason: Error) =>
      setError(reason.message),
    );
  }, [loadLessons, materialId]);

  function updateForm<Key extends keyof LessonForm>(
    key: Key,
    nextValue: LessonForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: nextValue }));
  }

  function updateSection(
    sectionCode: SectionCode,
    update: (section: SectionDraft) => SectionDraft,
  ) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.code === sectionCode ? update(section) : section,
      ),
    }));
  }

  function updateItem(
    sectionCode: SectionCode,
    key: string,
    update: (item: ItemDraft) => ItemDraft,
  ) {
    updateSection(sectionCode, (section) => ({
      ...section,
      items: section.items.map((item) =>
        item.key === key ? update(item) : item,
      ),
    }));
  }

  async function openEditor(lesson: Entry | null) {
    setEditorError("");
    setError("");
    setNotice("");
    if (!lesson) {
      setForm(emptyForm(materialId));
      setEditor({ lesson: null });
      return;
    }
    try {
      const response = await api<{ items: Entry[] }>(
        `/admin/learning-material-lessons/${lesson.id}/sections`,
      );
      setForm(formFromLesson(lesson, response.items || []));
      setEditor({ lesson });
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  function closeEditor() {
    if (!saving) setEditor(null);
  }

  async function refresh() {
    setError("");
    setNotice("");
    try {
      await Promise.all([loadMaterials(), loadLessons(materialId)]);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function saveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedMaterialId = Number(form.materialId);
    if (!selectedMaterialId) {
      setEditorError("请先选择所属教材（material_id）。");
      return;
    }
    if (form.publish) {
      const publishError = validatePublish(form);
      if (publishError) {
        setEditorError(publishError);
        return;
      }
    }
    let sections;
    try {
      sections = form.sections.map((section) => ({
        section_code: section.code,
        title: section.title.trim(),
        title_en: section.titleEn.trim(),
        sort_order: section.sortOrder,
        status: "draft",
        items: section.items.map((item) => ({
          item_code: item.itemCode.trim(),
          item_order: Number(item.itemOrder || 0),
          title: item.title.trim(),
          payload: parsePayload(
            item.payload,
            `${section.title} / ${item.itemCode || "新项目"}`,
          ),
          status: "draft",
        })),
      }));
    } catch (reason) {
      setEditorError((reason as Error).message);
      return;
    }

    setSaving(true);
    setEditorError("");
    try {
      const payload = {
        lesson_code: form.lessonCode.trim(),
        title: form.title.trim(),
        title_en: form.titleEn.trim(),
        summary: form.summary.trim(),
        illustration_url: form.illustrationUrl.trim(),
        source_resource: "",
        source_reference_id: null,
        content: null,
        lesson_format: "structured",
        estimated_minutes: form.estimatedMinutes
          ? Number(form.estimatedMinutes)
          : null,
        sort_order: Number(form.sortOrder || 0),
        is_published: 0,
        sections,
      };
      const saved = await api<Entry>(
        editor?.lesson
          ? `/admin/learning-material-lessons/${editor.lesson.id}`
          : `/admin/learning-materials/${selectedMaterialId}/lessons`,
        editor?.lesson ? "PUT" : "POST",
        payload,
      );
      if (form.publish) {
        await api(
          `/admin/learning-material-lessons/${saved.id}/publish`,
          "POST",
        );
      }
      setMaterialId(String(selectedMaterialId));
      setEditor(null);
      setNotice(form.publish ? "课时已保存并发布。" : "课时草稿已保存。");
      await loadLessons(String(selectedMaterialId));
    } catch (reason) {
      setEditorError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteLesson(lesson: Entry) {
    if (!window.confirm(`确定删除课时“${value(lesson, "title")}”？`)) return;
    setError("");
    try {
      await api(`/admin/learning-material-lessons/${lesson.id}`, "DELETE");
      setNotice("课时已删除。");
      await loadLessons(materialId);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const selectedMaterial = materialById.get(Number(materialId));
  return (
    <section className="container py-5 lesson-management-page">
      <header className="lesson-management-heading">
        <div>
          <p className="admin-list-eyebrow">内容管理</p>
          <h1>课时管理</h1>
          <p>
            课时必须归属一本教材；填写基本信息后，再维护每个内容区块及其 JSON
            值。
          </p>
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
          className="alert alert-danger lesson-management-notice"
          role="alert"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          className="alert alert-success lesson-management-notice"
          role="status"
        >
          {notice}
        </div>
      )}

      <section className="card shadow-sm lesson-material-selector">
        <div className="card-body">
          <label className="form-label" htmlFor="lesson-material-id">
            所属教材（material_id）
          </label>
          <select
            className="form-select"
            id="lesson-material-id"
            onChange={(event) => {
              setMaterialId(event.target.value);
              setNotice("");
              setError("");
            }}
            value={materialId}
          >
            <option value="">请选择教材</option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                #{material.id} · {value(material, "title")} (
                {value(material, "material_code")})
              </option>
            ))}
          </select>
          <small>
            保存时会使用选中的 material_id 创建课时；已存在课时不能跨教材移动。
          </small>
        </div>
      </section>

      <section className="card shadow-sm lesson-management-table-card">
        <div className="lesson-management-table-heading">
          <div>
            <p>教材课时</p>
            <h2>
              {selectedMaterial
                ? value(selectedMaterial, "title")
                : "请先选择教材"}
            </h2>
          </div>
          <button
            className="admin-action-button admin-action-primary"
            disabled={!materialId || loading}
            onClick={() => void openEditor(null)}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            新建课时
          </button>
        </div>
        {!materialId ? (
          <p className="lesson-management-empty">
            选择 material_id 后显示该教材下的全部课时。
          </p>
        ) : lessonsLoading || loading ? (
          <p className="lesson-management-empty">正在加载课时…</p>
        ) : lessons.length ? (
          <div className="table-responsive">
            <table className="table table-hover mb-0 lesson-management-table">
              <thead>
                <tr>
                  <th>课时</th>
                  <th>编码</th>
                  <th>排序</th>
                  <th>时长</th>
                  <th>状态</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => (
                  <tr key={lesson.id}>
                    <td>
                      <strong>{value(lesson, "title")}</strong>
                      <small>{value(lesson, "title_en") || "—"}</small>
                    </td>
                    <td>
                      <code>{value(lesson, "lesson_code")}</code>
                    </td>
                    <td>{value(lesson, "sort_order")}</td>
                    <td>{value(lesson, "estimated_minutes") || "—"} 分钟</td>
                    <td>
                      <span
                        className={`lesson-status${isPublished(lesson.is_published) ? " is-published" : ""}`}
                      >
                        {isPublished(lesson.is_published) ? "已发布" : "草稿"}
                      </span>
                    </td>
                    <td>
                      <div className="lesson-management-actions">
                        <button
                          aria-label={`编辑 ${value(lesson, "title")}`}
                          className="admin-action-button admin-action-secondary"
                          onClick={() => void openEditor(lesson)}
                          type="button"
                        >
                          <FilePenLine aria-hidden="true" size={15} />
                          编辑
                        </button>
                        <button
                          aria-label={`删除 ${value(lesson, "title")}`}
                          className="admin-action-button admin-action-danger"
                          onClick={() => void deleteLesson(lesson)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={15} />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="lesson-management-empty">
            这个教材还没有课时。新建第一节课开始编辑。
          </p>
        )}
      </section>

      {editor && (
        <div className="lesson-editor-backdrop" role="presentation">
          <form
            aria-label="课时编辑器"
            className="lesson-editor-dialog"
            onSubmit={(event) => void saveLesson(event)}
          >
            <header className="lesson-editor-heading">
              <div>
                <p>课时编辑</p>
                <h2>{editor.lesson ? "编辑课时" : "新建课时"}</h2>
              </div>
              <button
                aria-label="关闭课时编辑器"
                disabled={saving}
                onClick={closeEditor}
                type="button"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </header>
            <div className="lesson-editor-body">
              {editorError && (
                <div className="alert alert-danger" role="alert">
                  {editorError}
                </div>
              )}
              <section className="lesson-editor-section">
                <h3>基本信息</h3>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="editor-material-id">
                      所属教材（material_id）
                    </label>
                    <select
                      className="form-select"
                      disabled={Boolean(editor.lesson)}
                      id="editor-material-id"
                      onChange={(event) =>
                        updateForm("materialId", event.target.value)
                      }
                      required
                      value={form.materialId}
                    >
                      <option value="">请选择教材</option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          #{material.id} · {value(material, "title")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="lesson-code">
                      课时编码
                    </label>
                    <input
                      className="form-control"
                      id="lesson-code"
                      onChange={(event) =>
                        updateForm("lessonCode", event.target.value)
                      }
                      pattern="[a-z0-9][a-z0-9-]{0,119}"
                      required
                      value={form.lessonCode}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="lesson-title">
                      中文标题
                    </label>
                    <input
                      className="form-control"
                      id="lesson-title"
                      onChange={(event) =>
                        updateForm("title", event.target.value)
                      }
                      required
                      value={form.title}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="lesson-title-en">
                      英文标题
                    </label>
                    <input
                      className="form-control"
                      id="lesson-title-en"
                      onChange={(event) =>
                        updateForm("titleEn", event.target.value)
                      }
                      value={form.titleEn}
                    />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label" htmlFor="lesson-summary">
                      摘要
                    </label>
                    <textarea
                      className="form-control"
                      id="lesson-summary"
                      onChange={(event) =>
                        updateForm("summary", event.target.value)
                      }
                      rows={2}
                      value={form.summary}
                    />
                  </div>
                  <div className="col-md-12">
                    <label
                      className="form-label"
                      htmlFor="lesson-illustration-url"
                    >
                      小配图地址（通勤课必填，≤100KB）
                    </label>
                    <input
                      className="form-control"
                      id="lesson-illustration-url"
                      onChange={(event) =>
                        updateForm("illustrationUrl", event.target.value)
                      }
                      placeholder="/static/commute-covers/lesson-name.svg"
                      value={form.illustrationUrl}
                    />
                    <small className="text-muted">
                      通勤课仅接受本地 /static/ 图片，保存时会校验文件存在且小于
                      100KB。
                    </small>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label" htmlFor="lesson-minutes">
                      预计分钟
                    </label>
                    <input
                      className="form-control"
                      id="lesson-minutes"
                      min="1"
                      onChange={(event) =>
                        updateForm("estimatedMinutes", event.target.value)
                      }
                      type="number"
                      value={form.estimatedMinutes}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label" htmlFor="lesson-sort">
                      排序
                    </label>
                    <input
                      className="form-control"
                      id="lesson-sort"
                      onChange={(event) =>
                        updateForm("sortOrder", event.target.value)
                      }
                      type="number"
                      value={form.sortOrder}
                    />
                  </div>
                </div>
              </section>

              <section className="lesson-editor-section">
                <div className="lesson-editor-section-heading">
                  <div>
                    <h3>内容区块</h3>
                    <p>
                      每项的“区块值”使用 JSON
                      对象保存。可保存草稿；发布时会校验各区块数量。
                    </p>
                  </div>
                  <label className="lesson-editor-publish">
                    <input
                      checked={form.publish}
                      onChange={(event) =>
                        updateForm("publish", event.target.checked)
                      }
                      type="checkbox"
                    />
                    保存后发布
                  </label>
                </div>
                <div className="lesson-section-list">
                  {form.sections.map((section) => {
                    const definition = sectionDefinitions.find(
                      (entry) => entry.code === section.code,
                    )!;
                    return (
                      <section
                        className="lesson-section-card"
                        key={section.code}
                      >
                        <header>
                          <div>
                            <h4>{section.title}</h4>
                            <small>
                              {section.titleEn} · {definition.hint}
                            </small>
                          </div>
                          <button
                            className="admin-action-button admin-action-secondary"
                            onClick={() =>
                              updateSection(section.code, (current) => ({
                                ...current,
                                items: [
                                  ...current.items,
                                  emptyItem(current.items.length + 1),
                                ],
                              }))
                            }
                            type="button"
                          >
                            <Plus aria-hidden="true" size={14} />
                            添加项目
                          </button>
                        </header>
                        {section.items.length ? (
                          section.items.map((item, itemIndex) => (
                            <div className="lesson-item-editor" key={item.key}>
                              <div className="lesson-item-editor-heading">
                                <strong>项目 {itemIndex + 1}</strong>
                                <button
                                  aria-label={`删除 ${section.title} 项目 ${itemIndex + 1}`}
                                  onClick={() =>
                                    updateSection(section.code, (current) => ({
                                      ...current,
                                      items: current.items.filter(
                                        (candidate) =>
                                          candidate.key !== item.key,
                                      ),
                                    }))
                                  }
                                  type="button"
                                >
                                  <Trash2 aria-hidden="true" size={15} />
                                </button>
                              </div>
                              <div className="row g-2">
                                <div className="col-md-4">
                                  <label className="form-label">项目编码</label>
                                  <input
                                    className="form-control"
                                    onChange={(event) =>
                                      updateItem(
                                        section.code,
                                        item.key,
                                        (current) => ({
                                          ...current,
                                          itemCode: event.target.value,
                                        }),
                                      )
                                    }
                                    pattern="[a-z0-9][a-z0-9-]{0,119}"
                                    required
                                    value={item.itemCode}
                                  />
                                </div>
                                <div className="col-md-2">
                                  <label className="form-label">排序</label>
                                  <input
                                    className="form-control"
                                    onChange={(event) =>
                                      updateItem(
                                        section.code,
                                        item.key,
                                        (current) => ({
                                          ...current,
                                          itemOrder: event.target.value,
                                        }),
                                      )
                                    }
                                    type="number"
                                    value={item.itemOrder}
                                  />
                                </div>
                                <div className="col-md-6">
                                  <label className="form-label">项目标题</label>
                                  <input
                                    className="form-control"
                                    onChange={(event) =>
                                      updateItem(
                                        section.code,
                                        item.key,
                                        (current) => ({
                                          ...current,
                                          title: event.target.value,
                                        }),
                                      )
                                    }
                                    value={item.title}
                                  />
                                </div>
                                <div className="col-12">
                                  <label className="form-label">
                                    区块值（JSON）
                                  </label>
                                  <textarea
                                    className="form-control lesson-payload-input"
                                    onChange={(event) =>
                                      updateItem(
                                        section.code,
                                        item.key,
                                        (current) => ({
                                          ...current,
                                          payload: event.target.value,
                                        }),
                                      )
                                    }
                                    required
                                    spellCheck={false}
                                    value={item.payload}
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="lesson-section-empty">暂未添加项目。</p>
                        )}
                      </section>
                    );
                  })}
                </div>
              </section>
              <footer className="lesson-editor-actions">
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
                  {saving
                    ? "正在保存…"
                    : form.publish
                      ? "保存并发布"
                      : "保存草稿"}
                </button>
              </footer>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
