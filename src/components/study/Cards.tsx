import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { api, asset, entries, value } from "../../lib/api";
import type { Entry } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useStudyItem } from "../../lib/study";
import { visibleStudyNoteCards } from "../../lib/study-notes";
import { Speak } from "./Speech";
import { FlipBook } from "./FlipBook";

function Dictation({
  text,
  onComplete,
}: {
  text: string;
  onComplete: () => Promise<unknown>;
}) {
  const [answer, setAnswer] = useState(""),
    [feedback, setFeedback] = useState(""),
    [state, setState] = useState("");
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[“”‘’]/g, "'")
      .replace(/[^\w\s']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  return (
    <div className="dictation-box">
      <div className="dictation-head">
        <div>
          <div className="label">Dictation · 听写</div>
          <p>先听音，再输入你听到的英文。</p>
        </div>
        <Speak text={text} className="dictation-play" label="播放听写内容">
          🔊 播放
        </Speak>
      </div>
      <div className="dictation-entry">
        <textarea
          className={`dictation-input${state === "success" ? " is-correct" : state === "error" ? " is-wrong" : ""}`}
          rows={2}
          spellCheck={false}
          autoComplete="off"
          placeholder="输入听到的英文"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <button
          className="dictation-check"
          onClick={() => {
            const correct = normalize(answer) === normalize(text);
            setState(correct ? "success" : "error");
            setFeedback(
              correct
                ? "听写正确！做得很好。"
                : "还不完全正确，再听一遍后试试。",
            );
            if (correct) onComplete().catch((e) => setFeedback(e.message));
          }}
        >
          检查
        </button>
      </div>
      <div className="dictation-footer">
        <button
          className="dictation-hint"
          onClick={() => {
            setState("hint");
            setFeedback(
              "提示：" +
                text
                  .split(/(\s+)/)
                  .map((w) =>
                    /^\s*$/.test(w)
                      ? w
                      : w[0] + "•".repeat(Math.max(0, w.length - 1)),
                  )
                  .join(""),
            );
          }}
        >
          给我提示
        </button>
        <p className={`dictation-feedback ${state}`} aria-live="polite">
          {feedback}
        </p>
      </div>
    </div>
  );
}
function NoteImage({ item }: { item: Entry }) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const src = asset(value(item, "example_image_url")),
    alt = value(item, "example_image_alt") || "Example image";
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close();
    };
    document.body.classList.add("image-preview-open");
    window.addEventListener("keydown", closeOnEscape);
    const frame = window.requestAnimationFrame(() =>
      closeButton.current?.focus(),
    );
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.classList.remove("image-preview-open");
      window.removeEventListener("keydown", closeOnEscape);
      if (previousFocus && document.contains(previousFocus))
        previousFocus.focus();
    };
  }, [close, open]);

  if (!src) return null;
  return (
    <>
      <div className="example-image-wrap">
        <button
          aria-haspopup="dialog"
          aria-label={`全屏查看图片：${alt}`}
          className="example-image-box"
          onClick={() => setOpen(true)}
          type="button"
        >
          <img className="example-image" src={src} alt={alt} loading="lazy" />
        </button>
        {value(item, "example_image_alt") && (
          <div className="example-image-alt">{alt}</div>
        )}
      </div>
      {open &&
        createPortal(
          <div
            className="image-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="图片预览"
          >
            <div
              aria-hidden="true"
              className="image-preview-backdrop"
              onClick={close}
            />
            <div className="image-preview-panel">
              <button
                aria-label="关闭图片预览"
                className="image-preview-close"
                onClick={close}
                ref={closeButton}
                type="button"
              >
                ×
              </button>
              <img src={src} alt={alt} />
              <div className="image-preview-caption">{alt}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
function SentenceBody({
  item,
  resource,
  onComplete,
}: {
  item: Entry;
  resource: string;
  onComplete?: () => Promise<unknown>;
}) {
  const [english, setEnglish] = useState(false);
  const { user } = useAuth();
  const note = resource === "note-items",
    knowledge = value(item, "item_type") === "knowledge";
  const text =
    value(item, "en") ||
    value(item, "term") ||
    value(item, "english_text") ||
    value(item, "item_title") ||
    value(item, "raw_text");
  return (
    <div className={note ? "note-book-page-content" : "card-content"}>
      <div className="card-top">
        <span
          className={note || resource === "vocabulary" ? "type" : "pill-tag"}
        >
          {value(item, "tag") ||
            value(item, "category") ||
            value(item, "item_type") ||
            "note"}
        </span>
      </div>
      {knowledge ? (
        <>
          <section className="knowledge-card-hero">
            <span className="knowledge-card-kicker">知识点总结</span>
            <h3>{value(item, "item_title") || "知识点"}</h3>
            {value(item, "raw_text") && <p>{value(item, "raw_text")}</p>}
          </section>
          <NoteImage item={item} />
          <div className="knowledge-card-grid">
            {[
              ["english_text", "核心知识点", "core"],
              ["chinese_text", "方法与易错点", "method"],
              ["explanation", "知识讲解", "explain"],
              ["examples", "例题与练习", "example"],
            ].map(
              ([key, title, kind]) =>
                (value(item, key) ||
                  ["english_text", "chinese_text"].includes(key)) && (
                  <section
                    className={`knowledge-card-panel knowledge-${kind}-panel`}
                    key={key}
                  >
                    <h4>{title}</h4>
                    <p>{value(item, key) || "待补充"}</p>
                  </section>
                ),
            )}
          </div>
        </>
      ) : (
        <>
          <div className="section">
            <div className="section-toolbar">
              <div className="label inline-label">
                {resource === "vocabulary" ? "Term" : "English"}
              </div>
              <button
                className={`card-icon-btn eye-btn${english ? " is-active" : ""}`}
                type="button"
                aria-label="Show or hide English"
                title="Show or hide English"
                onClick={() => setEnglish(!english)}
              >
                <span
                  className="eye-open"
                  style={{ display: english ? "none" : "inline" }}
                >
                  👁
                </span>
                <span
                  className="eye-close"
                  style={{ display: english ? "inline" : "none" }}
                >
                  🙈
                </span>
              </button>
              {note ? (
                ["admin", "premium_learner"].includes(user?.role || "") && (
                  <Speak
                    text={[
                      text,
                      value(item, "chinese_text"),
                      value(item, "explanation"),
                      value(item, "examples"),
                    ]
                      .filter(Boolean)
                      .join(". ")}
                    className="speak-btn read-card-btn"
                    label="自动阅读此条"
                  >
                    🔊 <span>自动阅读此条</span>
                  </Speak>
                )
              ) : (
                <Speak text={text} />
              )}
            </div>
            <p className={`english${english ? "" : " is-hidden"}`}>{text}</p>
            {note && <NoteImage item={item} />}
          </div>
          {note && onComplete && (
            <Dictation text={text} onComplete={onComplete} />
          )}
          <div className="section">
            <div className="label">Chinese</div>
            <p className="cn">
              {resource === "vocabulary"
                ? `\n\n${value(item, "chinese_meaning") || "—"}\n\n`
                : note
                  ? `\n\n${value(item, "chinese_text") || "—"}\n\n`
                  : value(item, "cn") || "—"}
            </p>
          </div>
          <div className="note-box">
            <div className="label">Extra Notes</div>
            {[
              "note",
              "english_note",
              "example_sentence",
              "extra_note",
              "explanation",
              "examples",
            ]
              .filter((k) => typeof item[k] === "string" && item[k])
              .map((k) => (
                <p
                  className={
                    k.includes("example") ? "example-list" : "note-text"
                  }
                  key={k}
                >
                  {resource === "sentences" && k === "note"
                    ? `\n\n${value(item, k)}\n\n`
                    : value(item, k)}
                </p>
              ))}
            {![
              "note",
              "english_note",
              "example_sentence",
              "extra_note",
              "explanation",
              "examples",
            ].some((k) => item[k]) && (
              <p className="note-text">
                {resource === "sentences"
                  ? "\n\nNo extra notes yet.\n\n"
                  : "No extra notes yet."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function InterviewCard({
  item,
  active,
  categories,
}: {
  item: Entry;
  active: boolean;
  categories: Entry[];
}) {
  const [expanded, setExpanded] = useState(false);
  const detail = useStudyItem(
    "interviews",
    active || expanded ? item.id : undefined,
  );
  return (
    <article className="interview-card" data-card-id={item.id}>
      <div className="card-head">
        <div className="card-meta">
          <span className="badge">
            {value(
              categories.find((c) => c.id === item.category_id) || { id: 0 },
              "category_name",
            )}
          </span>
          <span className="difficulty">
            Level {value(item, "difficulty_level")}
          </span>
        </div>
      </div>
      <h2 className="question-title">{value(item, "question")}</h2>
      {value(item, "question_cn") && (
        <p className="question-cn">{value(item, "question_cn")}</p>
      )}
      {value(item, "short_answer") && (
        <div className="section answer-block">
          <div className="label">Short Answer</div>
          <p>{value(item, "short_answer")}</p>
        </div>
      )}
      <button
        className="expand-btn"
        type="button"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide Full Answer" : "Show Full Answer"}
      </button>
      <div className="full-answer" hidden={!expanded}>
        {value(item, "full_answer") && (
          <div className="section answer-block">
            <div className="label">Full Answer</div>
            <p>{value(item, "full_answer")}</p>
          </div>
        )}
        {value(item, "answer_tip") && (
          <div className="note-box">
            <div className="label">Tip</div>
            <p className="tip-text">{value(item, "answer_tip")}</p>
          </div>
        )}
        {detail?.error && <p role="alert">{detail.error}</p>}
        <div className="star-grid">
          {entries(detail?.item || item, "sections").map((s, i) => (
            <div className="star-box" key={s.id || i}>
              <div className="star-title">{value(s, "section_title")}</div>
              {value(s, "content_en") && <p>{value(s, "content_en")}</p>}
              {value(s, "content_cn") && (
                <p className="cn-text">{value(s, "content_cn")}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
export function OriginalCards({
  items,
  resource,
  initialId,
  note,
  categories = [],
}: {
  items: Entry[];
  resource: string;
  initialId?: number;
  note?: Entry;
  categories?: Entry[];
}) {
  const [params, setParams] = useSearchParams(),
    [jump, setJump] = useState(false),
    [jumpIndex, setJumpIndex] = useState<number | null>(null);
  const q = (params.get("keyword") || params.get("q") || "").toLowerCase(),
    category = params.get("category") || "";
  const visible = items.filter(
    (i) =>
      (!category || value(i, "category") === category) &&
      (!q ||
        Object.values(i).some(
          (v) => typeof v === "string" && v.toLowerCase().includes(q),
        )),
  );
  const first = Math.max(
      0,
      visible.findIndex((i) => i.id === initialId),
    ),
    [index, setIndex] = useState(first),
    [saved, setSaved] = useState<Entry[]>([]),
    [error, setError] = useState("");
  const [bookGeneration, setBookGeneration] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const parent = note?.id || Number(items[0]?.note_id) || 0;
  useEffect(() => {
    let active = true;
    api<Entry[]>("/progress")
      .then((p) => {
        if (active) setSaved(p);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const savedId = saved.find(
    (p) =>
      p.content_type ===
        (resource === "sentences" ? "everyday_sentence" : "english_note") &&
      Number(p.parent_id || 0) === parent,
  )?.item_id;
  const current = visible[index];
  const progressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const progressQueue = useRef<Promise<unknown>>(Promise.resolve());
  const saveProgress = useCallback(
    (item: Entry, completed: boolean) => {
      const save = progressQueue.current
        .catch(() => {})
        .then(() =>
          api("/progress", "POST", {
            content_type:
              resource === "sentences" ? "everyday_sentence" : "english_note",
            parent_id: parent,
            item_id: item.id,
            completed,
          }),
        );
      progressQueue.current = save;
      return save;
    },
    [resource, parent],
  );
  useEffect(() => {
    if (!current || !["sentences", "note-items"].includes(resource)) return;
    progressTimer.current = setTimeout(() => {
      saveProgress(current, false).catch((e) => setError(e.message));
    }, 500);
    return () => clearTimeout(progressTimer.current);
  }, [current, resource, saveProgress]);
  function go(n: number) {
    if (n < 0 || n >= visible.length) return;
    setIndex(n);
    if (resource === "note-items") {
      setJumpIndex(n);
      setBookGeneration((x) => x + 1);
    } else {
      const el = wrap.current,
        card = el?.querySelector<HTMLElement>(
          `[data-card-id="${visible[n].id}"]`,
        );
      if (el && card)
        el.scrollTo({
          left: card.offsetLeft - el.offsetLeft,
          behavior: "smooth",
        });
    }
  }
  useEffect(() => {
    if (resource === "note-items") return;
    const el = wrap.current,
      card = el?.querySelector<HTMLElement>(`[data-card-id="${initialId}"]`);
    if (el && card) el.scrollLeft = card.offsetLeft - el.offsetLeft;
  }, [initialId, resource]);
  useEffect(() => {
    if (!jump) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setJump(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [jump]);
  const noteMode = resource === "note-items";
  const title = noteMode
    ? value(note || { id: 0 }, "title") || "English Notes"
    : resource === "sentences"
      ? "Everyday English Cards"
      : resource === "interviews"
        ? "Professional Interview Cards"
        : "Vocabulary Cards";
  const description = noteMode
    ? value(note || { id: 0 }, "summary") ||
      "Review this note as swipeable cards, one point at a time."
    : resource === "sentences"
      ? "Learn natural English with short, real-life sentence cards."
      : resource === "interviews"
        ? "Prepare your answers with structured, professional interview cards."
        : "Browse and review vocabulary, phrases, and useful expressions one card at a time.";
  return (
    <div
      className={
        resource === "interviews"
          ? "study-interview"
          : `study-cards${noteMode ? " study-note-detail" : ""}`
      }
    >
      <main className="container">
        <div className="topbar">
          <Link
            className="icon-btn"
            to={noteMode ? "/learn/notes" : "/"}
            title="Back"
          >
            ←
          </Link>
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              setIndex(0);
              setParams({
                keyword: String(
                  new FormData(e.currentTarget).get("keyword") || "",
                ),
              });
            }}
          >
            <input
              className="search"
              type="search"
              name="keyword"
              aria-label="Search cards"
              defaultValue={q}
              placeholder={
                resource === "vocabulary"
                  ? "Search cards, terms, meanings, or examples..."
                  : "Search cards, phrases, or examples..."
              }
            />
            {noteMode && (
              <button className="search-btn" type="submit">
                Search
              </button>
            )}
          </form>
          <Link className="icon-btn" to="/" title="Home">
            ⌂
          </Link>
        </div>
        <section className="hero-card">
          <h1>{title}</h1>
          <p>{description}</p>
          {Boolean(savedId) && visible.some((i) => i.id === savedId) && (
            <div className="continue-wrap">
              <button
                className="continue-btn"
                onClick={() => go(visible.findIndex((i) => i.id === savedId))}
              >
                Continue Study
              </button>
            </div>
          )}
        </section>
        {resource === "vocabulary" && (
          <section
            className="hero-card"
            style={{ paddingTop: 14, paddingBottom: 14 }}
          >
            <form
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setIndex(0);
                setParams({
                  category: String(f.get("category") || ""),
                  keyword: String(f.get("keyword") || ""),
                });
              }}
            >
              <select
                name="category"
                className="search"
                style={{ maxWidth: 260 }}
                defaultValue={category}
                aria-label="Category"
              >
                <option value="">All categories</option>
                {[...new Set(items.map((i) => value(i, "category")))].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
              <input
                className="search"
                name="keyword"
                placeholder="Optional keyword..."
                defaultValue={q}
                style={{ maxWidth: 280 }}
              />
              <button
                className="counter-btn"
                type="submit"
                style={{ border: 0, cursor: "pointer" }}
              >
                Filter
              </button>
            </form>
          </section>
        )}
        <div className="section-head">
          <h2>Cards</h2>
          <button
            className="counter-btn"
            type="button"
            onClick={() => setJump(true)}
          >
            {visible.length ? Math.min(index + 1, visible.length) : 0} /{" "}
            {visible.length}
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {visible.length ? (
          noteMode ? (
            <FlipBook
              key={`${q}-${bookGeneration}`}
              kind="note"
              items={visible}
              initial={jumpIndex ?? first}
              onFlip={setIndex}
              render={(item) => (
                <SentenceBody
                  resource={resource}
                  item={item}
                  onComplete={() => {
                    clearTimeout(progressTimer.current);
                    return saveProgress(item, true);
                  }}
                />
              )}
            />
          ) : (
            <section
              className="carousel-wrap"
              ref={wrap}
              onScroll={() => {
                const el = wrap.current;
                if (!el) return;
                const cards = Array.from(
                  el.querySelectorAll<HTMLElement>("[data-card-id]"),
                );
                let nearest = 0;
                cards.forEach((c, i) => {
                  if (
                    Math.abs(c.offsetLeft - el.offsetLeft - el.scrollLeft) <
                    Math.abs(
                      cards[nearest].offsetLeft - el.offsetLeft - el.scrollLeft,
                    )
                  )
                    nearest = i;
                });
                setIndex(nearest);
              }}
            >
              <div className="carousel">
                {visible.map((item, i) =>
                  resource === "interviews" ? (
                    <InterviewCard
                      key={item.id}
                      item={item}
                      categories={categories}
                      active={Math.abs(i - index) < 2}
                    />
                  ) : (
                    <article
                      className="card"
                      data-card-id={item.id}
                      key={item.id}
                    >
                      <SentenceBody item={item} resource={resource} />
                    </article>
                  ),
                )}
              </div>
            </section>
          )
        ) : (
          <div className="empty-state">
            {noteMode ? "No note cards found." : "No sentence cards found."}
            <br />
            Try a different keyword or clear the filters.
          </div>
        )}
        {!noteMode && visible.length > 0 && (
          <div className="bottom-counter">
            {Math.min(index + 1, visible.length)} / {visible.length}
          </div>
        )}
        {resource === "sentences" && (
          <footer>Keep going — a little English every day adds up.</footer>
        )}
        {jump && (
          <div
            className="jump-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Go to card"
          >
            <div className="jump-backdrop" onClick={() => setJump(false)} />
            <div className="jump-panel">
              <div className="jump-title">Go to card</div>
              <div className="jump-subtitle">
                Enter a number from 1 to {visible.length}
              </div>
              <form
                className="jump-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  go(Number(new FormData(e.currentTarget).get("position")) - 1);
                  setJump(false);
                }}
              >
                <input
                  type="number"
                  name="position"
                  aria-label="Card number"
                  min={1}
                  max={visible.length}
                  placeholder="e.g. 100"
                  required
                  autoFocus
                />
                <button className="jump-go-btn" type="submit">
                  Go
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
export function NoteCollections({ items }: { items: Entry[] }) {
  const [params, setParams] = useSearchParams(),
    [progress, setProgress] = useState<Entry[]>([]);
  const q = (params.get("keyword") || "").toLowerCase();
  useEffect(() => {
    let active = true;
    api<Entry[]>("/progress")
      .then((p) => {
        if (active) setProgress(p);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const visible = items.filter((i) =>
    `${value(i, "title")} ${value(i, "summary")}`.toLowerCase().includes(q),
  );
  return (
    <div className="study-notes">
      <main className="container">
        <div className="topbar">
          <Link className="icon-btn" to="/" title="Back">
            ←
          </Link>
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({
                keyword: String(
                  new FormData(e.currentTarget).get("keyword") || "",
                ),
              });
            }}
          >
            <input
              className="search"
              name="keyword"
              defaultValue={q}
              placeholder="Search note titles, phrases, or examples..."
            />
            <button className="search-btn" type="submit">
              Search
            </button>
          </form>
        </div>
        <section className="hero-card">
          <h1>Study Notes</h1>
          <p>
            Browse your note collections first, then open one note to review its
            cards in detail.
          </p>
        </section>
        <div className="section-head">
          <h2>Note Collections</h2>
          <span>{visible.length} notes</span>
        </div>
        <section className="note-list">
          {visible.map((item) => (
            <NoteCollection
              key={item.id}
              item={item}
              progress={progress.find(
                (p) =>
                  Number(p.parent_id) === item.id &&
                  p.content_type === "english_note",
              )}
            />
          ))}
        </section>
        {!visible.length && <div className="empty-state">No notes found.</div>}
      </main>
    </div>
  );
}
function NoteCollection({ item, progress }: { item: Entry; progress?: Entry }) {
  const detail = useStudyItem("notes", item.id);
  return (
    <article className="note-card">
      <div className="note-top">
        <span className="note-date">{value(item, "note_date")}</span>
      </div>
      <h3 className="note-title">{value(item, "title") || "Untitled Note"}</h3>
      <p className="note-summary">
        {value(item, "summary") || "No summary yet."}
      </p>
      <div className="tag-row">
        {value(item, "source") && (
          <span className="tag">{value(item, "source")}</span>
        )}
        <span className="tag">
          {item.share_status === 1 ? "Shared" : "Private"}
        </span>
      </div>
      <div className="note-footer">
        <div className="note-meta-group">
          <span className="note-meta">
            {detail?.item
              ? visibleStudyNoteCards(entries(detail.item, "items")).length
              : "…"} cards
          </span>
          {progress && (
            <span className="study-meta">
              Last studied: {value(progress, "last_studied_at")}
            </span>
          )}
        </div>
        <div className="note-actions">
          {progress && (
            <Link
              className="btn secondary"
              to={`/learn/note-items/${progress.item_id}`}
            >
              Continue Study
            </Link>
          )}
          <Link className="btn primary" to={`/learn/notes/${item.id}`}>
            Open Cards
          </Link>
        </div>
      </div>
    </article>
  );
}
