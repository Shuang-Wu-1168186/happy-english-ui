import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, asset, entries, request, value } from "../lib/api";
import type { Entry } from "../lib/api";
import { useStudyCatalog, useStudyItem } from "../lib/study";
import { Speak } from "../components/study/Speech";
export function Manage() {
  const [params] = useSearchParams();
  return <EditorLoader key={params.toString()} />;
}
function EditorLoader() {
  const [params] = useSearchParams(),
    id = params.get("id"),
    resource = params.get("resource") || "";
  const result = useStudyItem(resource, id || undefined);
  const notes = useStudyCatalog("notes"),
    categories = useStudyCatalog("interview-categories");
  if (!notes.items || !categories.items)
    return (
      <p className="empty">{notes.error || categories.error || "Loading…"}</p>
    );
  if (id && !result?.item)
    return (
      <p className="empty" role={result?.error ? "alert" : "status"}>
        {result?.error || "Loading…"}
      </p>
    );
  return (
    <Editor
      initial={result?.item}
      resource={resource}
      notes={notes.items || []}
      categories={categories.items || []}
    />
  );
}
function Editor({
  initial,
  resource: initialResource,
  notes,
  categories,
}: {
  initial?: Entry;
  resource: string;
  notes: Entry[];
  categories: Entry[];
}) {
  const [params] = useSearchParams(),
    navigate = useNavigate();
  const [resource, setResource] = useState(initialResource),
    [form, setForm] = useState<Record<string, string>>(() => {
      const data: Record<string, string> = {
        item_type: "phrase",
        difficulty_level: "1",
        share_status: "0",
        priority_order: "0",
        note_id: params.get("parent_id") || String(notes[0]?.id || ""),
        note_date: new Date().toLocaleDateString("en-CA"),
      };
      if (initial)
        for (const [k, v] of Object.entries(initial))
          if (typeof v === "string" || typeof v === "number")
            data[k] = String(v);
      if (initialResource === "sentences") {
        data.english_text = data.en || "";
        data.chinese_text = data.cn || "";
        data.explanation = data.note || "";
      }
      if (initialResource === "vocabulary") {
        data.english_text = data.term || "";
        data.chinese_text = data.chinese_meaning || "";
        data.explanation = data.english_note || "";
        data.examples = data.example_sentence || "";
        data.raw_text = data.extra_note || "";
      }
      for (const s of entries(initial || { id: 0 }, "sections")) {
        data[`${s.section_type}_en`] = value(s, "content_en");
        data[`${s.section_type}_cn`] = value(s, "content_cn");
      }
      return data;
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [hidden, setHidden] = useState(true);

  const interview = resource === "interviews",
    noteMode = resource === "note-items",
    knowledge = noteMode && form.item_type === "knowledge",
    everyday = resource === "sentences";
  const moduleName =
    (
      {
        sentences: "Everyday Speaking",
        "note-items": "Study Notes",
        vocabulary: "Professional Vocabulary",
        notes: "Study Notes",
      } as Record<string, string>
    )[resource] || "Module";
  const set = (key: string, v: string) => setForm((f) => ({ ...f, [key]: v }));
  function field(
    key: string,
    label: string,
    rows = 0,
    required = false,
    full = true,
  ) {
    return (
      <div className={`form-group${full ? " full" : ""}`} key={key}>
        <label htmlFor={key}>{label}</label>
        {rows ? (
          <textarea
            id={key}
            name={key}
            rows={rows}
            value={form[key] || ""}
            required={required}
            onChange={(e) => set(key, e.target.value)}
          />
        ) : (
          <input
            id={key}
            name={key}
            type={
              key === "note_date"
                ? "date"
                : key === "priority_order"
                  ? "number"
                  : "text"
            }
            value={form[key] || ""}
            required={required}
            onChange={(e) => set(key, e.target.value)}
          />
        )}
      </div>
    );
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const f = new FormData();
      f.append("file", file);
      const r = await (
        await request("/uploads", { method: "POST", body: f })
      ).json();
      set("example_image_url", r.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!resource) {
      setError("Choose module.");
      return;
    }
    setBusy(true);
    let data: Record<string, unknown> = {};
    if (everyday)
      data = {
        tag: form.tag || "Everyday Speaking",
        en: form.english_text || "",
        cn: form.chinese_text || "",
        note: form.explanation || "",
        share_status: Number(form.share_status || 0),
        priority_order: Number(form.priority_order || 0),
      };
    else if (resource === "vocabulary")
      data = {
        category: form.category || "professional vocabulary",
        term: form.english_text || form.item_title || "",
        chinese_meaning: form.chinese_text || "",
        english_note: form.explanation || "",
        example_sentence: form.examples || "",
        extra_note: form.raw_text || "",
        sort_order: Number(form.sort_order || 0),
      };
    else if (noteMode) {
      for (const key of [
        "item_type",
        "item_title",
        "raw_text",
        "english_text",
        "chinese_text",
        "explanation",
        "examples",
        "keywords",
        "example_image_url",
        "example_image_alt",
      ])
        data[key] = form[key] || "";
      data.note_id = Number(form.note_id);
      data.priority_order = Number(form.priority_order || 0);
      data.share_status = Number(form.share_status || 0);
    } else if (resource === "notes")
      data = {
        title: form.title,
        note_date: form.note_date,
        source: form.source || "",
        summary: form.summary || "",
        share_status: Number(form.share_status || 0),
        priority_order: Number(form.priority_order || 0),
      };
    else if (interview) {
      for (const key of [
        "question",
        "question_cn",
        "short_answer",
        "full_answer",
        "answer_tip",
        "keywords",
      ])
        data[key] = form[key] || "";
      for (const key of [
        "category_id",
        "difficulty_level",
        "share_status",
        "priority_order",
      ])
        data[key] = Number(form[key] || 0);
      data.sections = ["situation", "action", "result", "learning"]
        .map((s, i) => ({
          section_type: s,
          section_title: [
            "Situation",
            "What I Did",
            "Result",
            "What I Learned",
          ][i],
          content_en: form[`${s}_en`] || "",
          content_cn: form[`${s}_cn`] || "",
        }))
        .filter((s) => s.content_en || s.content_cn);
    }
    const action = (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
      "value",
    );
    try {
      const saved = await api<Entry>(
        `/content/${resource}${initial ? `/${initial.id}` : ""}`,
        initial ? "PUT" : "POST",
        data,
      );
      if (action === "save_and_continue") {
        setMessage("Card saved.");
        setForm((f) => ({
          ...f,
          item_title: "",
          raw_text: "",
          english_text: "",
          chinese_text: "",
          explanation: "",
          examples: "",
          keywords: "",
          example_image_url: "",
          example_image_alt: "",
        }));
      } else if (!initial && resource === "notes") {
        navigate(`/manage?resource=note-items&parent_id=${saved.id}`);
      } else navigate(`/learn/${resource}/${saved.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={interview ? "study-interview-editor" : "study-editor"}>
      <div className={interview ? "manage-page" : "note-item-create-page"}>
        <div className="editor-panel">
          <div className="page-head">
            <div>
              <h1>
                {interview
                  ? initial
                    ? "Edit Interview Question"
                    : "Create Interview Question"
                  : resource === "notes"
                    ? initial
                      ? "Edit Study Note"
                      : "Create Study Note"
                    : initial
                      ? "Edit English Note Item"
                      : "Create English Note Item"}
              </h1>
              <p>
                {interview
                  ? "Fill in the form on the left. The live preview on the right shows how the interview card will look."
                  : "Fill in the form on the left. The preview on the right follows the same card style as your formal note card page."}
              </p>
              {interview && initial && (
                <div className="edit-info">
                  Editing Question ID: {initial.id}
                </div>
              )}
            </div>
            {interview && (
              <div className="head-actions">
                <Link className="btn-secondary" to="/learn/interviews">
                  Back to List
                </Link>
              </div>
            )}
          </div>
          {error && (
            <div className="flash-wrap">
              <div className="flash-message flash-danger" role="alert">
                {error}
              </div>
            </div>
          )}
          {message && (
            <div className="flash-wrap">
              <div className="flash-message flash-success" role="status">
                {message}
              </div>
            </div>
          )}
          <form className="editor-form" onSubmit={submit}>
            <div className="form-grid">
              {interview ? (
                <>
                  <div className="form-group">
                    <label htmlFor="category_id">Category</label>
                    <select
                      id="category_id"
                      required
                      value={form.category_id || ""}
                      onChange={(e) => set("category_id", e.target.value)}
                    >
                      <option value="">Choose category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {value(c, "category_name")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="difficulty_level">Difficulty</label>
                    <select
                      id="difficulty_level"
                      value={form.difficulty_level}
                      onChange={(e) => set("difficulty_level", e.target.value)}
                    >
                      {[1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          Level {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  {field("question", "Question", 3, true)}
                  {field("question_cn", "Question CN", 3)}
                  {field("short_answer", "Short Answer", 5)}
                  {field("full_answer", "Full Answer", 8)}
                  {field("answer_tip", "Answer Tip", 4)}
                  {field("keywords", "Keywords")}
                  <div className="form-group">
                    <label htmlFor="share_status">Share Status</label>
                    <select
                      id="share_status"
                      value={form.share_status}
                      onChange={(e) => set("share_status", e.target.value)}
                    >
                      <option value="0">Private</option>
                      <option value="1">Shared</option>
                    </select>
                  </div>
                  {field("priority_order", "Priority Order", 0, false, false)}
                </>
              ) : resource === "notes" ? (
                <>
                  {field("title", "Title", 0, true)}
                  {field("note_date", "Date", 0, true)}
                  {field("source", "Source")}
                  {field("summary", "Summary", 5)}
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="module_code">Module</label>
                    <select
                      id="module_code"
                      required
                      value={resource}
                      onChange={(e) => setResource(e.target.value)}
                      disabled={!!initial}
                    >
                      <option value="">Choose module</option>
                      <option value="sentences">Everyday Speaking</option>
                      <option value="note-items">Study Notes</option>
                      <option value="vocabulary">
                        Professional Vocabulary
                      </option>
                    </select>
                  </div>
                  {noteMode && (
                    <div className="form-group">
                      <label htmlFor="note_id">Note (for MODULE02)</label>
                      <select
                        id="note_id"
                        required
                        value={form.note_id}
                        onChange={(e) => set("note_id", e.target.value)}
                      >
                        <option value="">Choose note</option>
                        {notes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {value(n, "note_date")} - {value(n, "title")}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!everyday && (
                    <>
                      <div className="form-group">
                        <label htmlFor="item_type">Item Type</label>
                        <select
                          id="item_type"
                          value={form.item_type}
                          onChange={(e) => set("item_type", e.target.value)}
                        >
                          {[
                            ["phrase", "📘 Phrase"],
                            ["sentence", "📝 Sentence"],
                            ["vocab", "🔤 Vocab"],
                            ["grammar", "📐 Grammar"],
                            ["knowledge", "🧠 Knowledge Summary"],
                          ].map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>
                      {field(
                        "item_title",
                        knowledge ? "知识点标题" : "Item Title",
                        0,
                        noteMode,
                        false,
                      )}
                      {field(
                        "raw_text",
                        knowledge ? "本课核心摘要" : "Raw Text",
                        3,
                        noteMode,
                      )}
                    </>
                  )}
                  {field(
                    "english_text",
                    knowledge ? "核心知识点（每行一条）" : "English Text",
                    3,
                    true,
                  )}
                  {field(
                    "chinese_text",
                    knowledge ? "方法与易错点（每行一条）" : "Chinese Text",
                    3,
                    true,
                  )}
                  {field(
                    "explanation",
                    knowledge ? "知识讲解" : "Explanation",
                    5,
                  )}
                  {!everyday &&
                    field("examples", knowledge ? "例题与练习" : "Examples", 5)}
                  {noteMode && (
                    <>
                      <div className="form-group full">
                        <label htmlFor="image-upload">
                          Example Image Upload
                        </label>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => upload(e.target.files?.[0])}
                        />
                        <div className="field-help">
                          Upload an image, or fill in the image URL below.
                        </div>
                      </div>
                      {field("example_image_url", "Example Image URL")}
                      {field("example_image_alt", "Example Image Alt")}
                    </>
                  )}
                  {!everyday && field("keywords", "Keywords")}
                </>
              )}
            </div>
            {interview && (
              <div className="star-section">
                <h3>STAR Structure</h3>
                {[
                  ["situation", "Situation"],
                  ["action", "What I Did"],
                  ["result", "Result"],
                  ["learning", "What I Learned"],
                ].map(([key, label]) => (
                  <div className="form-group full" key={key}>
                    <label htmlFor={`${key}_en`}>{label}</label>
                    <textarea
                      id={`${key}_en`}
                      rows={4}
                      value={form[`${key}_en`] || ""}
                      onChange={(e) => set(`${key}_en`, e.target.value)}
                    />
                    <textarea
                      rows={2}
                      aria-label={`${label} Chinese`}
                      placeholder={`${key[0].toUpperCase() + key.slice(1)} Chinese`}
                      value={form[`${key}_cn`] || ""}
                      onChange={(e) => set(`${key}_cn`, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={busy}
                value="save"
              >
                {interview
                  ? initial
                    ? "Update Interview Question"
                    : "Save Interview Question"
                  : "Save Card"}
              </button>
              {!interview && (
                <button
                  type="submit"
                  className="btn-secondary"
                  value="save_and_continue"
                  disabled={busy}
                >
                  Save and Continue
                </button>
              )}
              {interview && initial && (
                <Link className="btn-light" to="/manage?resource=interviews">
                  Create New
                </Link>
              )}
            </div>
          </form>
        </div>
        <div className="preview-panel">
          {interview ? (
            <div className="preview-card">
              <div className="card-head">
                <span className="badge">
                  {value(
                    categories.find(
                      (c) => String(c.id) === form.category_id,
                    ) || { id: 0 },
                    "category_name",
                  ) || "Category"}
                </span>
                <span className="difficulty">
                  Level {form.difficulty_level}
                </span>
              </div>
              <h2 className="question-title">
                {form.question || "Your interview question will appear here."}
              </h2>
              <p className="question-cn">
                {form.question_cn || "中文提示会显示在这里。"}
              </p>
              {[
                ["short_answer", "Short Answer", "Short answer preview."],
                ["full_answer", "Full Answer", "Full answer preview."],
                ["answer_tip", "Tip", "Tip preview."],
              ].map(([key, title, fallback]) => (
                <div className="answer-block" key={key}>
                  <div className="label">{title}</div>
                  <p>{form[key] || fallback}</p>
                </div>
              ))}
              <div className="star-grid">
                {[
                  ["situation", "Situation"],
                  ["action", "What I Did"],
                  ["result", "Result"],
                  ["learning", "What I Learned"],
                ].map(([key, title]) => (
                  <div className="star-box" key={key}>
                    <div className="star-title">{title}</div>
                    <p>{form[`${key}_en`] || `${title} preview.`}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="preview-page-shell">
              <div className="topbar preview-topbar">
                <button className="icon-btn" type="button" tabIndex={-1}>
                  ←
                </button>
                <form
                  className="search-form"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <input
                    className="search"
                    placeholder="Search cards, phrases, or examples..."
                    tabIndex={-1}
                  />
                </form>
                <button className="icon-btn" type="button" tabIndex={-1}>
                  ⌂
                </button>
              </div>
              <section className="hero-card">
                <h1>Card Preview</h1>
                <p>
                  This preview follows the same structure and visual hierarchy
                  as your formal English note card page.
                </p>
              </section>
              <div className="section-head">
                <h2>Cards</h2>
                <button className="counter-btn" type="button" tabIndex={-1}>
                  1 / 1
                </button>
              </div>
              <section className="carousel-wrap preview-carousel-wrap">
                <div className="carousel preview-carousel-single">
                  <article className="card">
                    <div className="card-top">
                      <span className="module-badge">{moduleName}</span>
                      <span className="type">
                        {everyday ? "sentence" : form.item_type}
                      </span>
                    </div>
                    <div className="section">
                      <div className="section-toolbar">
                        <div className="label inline-label">English</div>
                        <button
                          className="card-icon-btn eye-btn"
                          type="button"
                          title="Show or hide English"
                          onClick={() => setHidden(!hidden)}
                        >
                          {hidden ? "👁" : "🙈"}
                        </button>
                        <Speak text={form.english_text || ""} />
                      </div>
                      <p className={`english${hidden ? " is-hidden" : ""}`}>
                        {form.english_text ||
                          "Your English text will appear here."}
                      </p>
                    </div>
                    <div className="section">
                      <div className="label">Chinese</div>
                      <p className="cn">
                        {form.chinese_text || "你的中文内容会显示在这里。"}
                      </p>
                    </div>
                    <div className="note-box">
                      <div className="label">Extra Notes</div>
                      <p className="note-text">
                        {form.explanation || "Explanation will appear here."}
                      </p>
                      <div className="example-list">
                        {form.examples || "Examples will appear here."}
                      </div>
                      {noteMode && form.example_image_url && (
                        <div className="preview-image-wrap">
                          <div className="label">Example Image</div>
                          <div className="preview-image-box">
                            <img
                              className="preview-image"
                              src={asset(form.example_image_url)}
                              alt={form.example_image_alt || "Example image"}
                            />
                          </div>
                          <p className="preview-image-alt">
                            {form.example_image_alt}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                </div>
              </section>
              <div className="bottom-counter">1 / 1</div>
              {!everyday && (
                <div className="preview-meta-box">
                  {[
                    ["item_title", "Title", "Your item title"],
                    ["raw_text", "Raw Text", "Your raw text will appear here."],
                    ["keywords", "Keywords", "Keywords will appear here."],
                    ...(noteMode
                      ? [["example_image_url", "Image URL", "No image yet."]]
                      : []),
                  ].map(([key, label, fallback]) => (
                    <div className="preview-meta-row" key={key}>
                      <span className="meta-label">{label}</span>
                      <span className="meta-value">
                        {form[key] || fallback}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
