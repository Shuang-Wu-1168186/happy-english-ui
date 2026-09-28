import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Speak } from "../components/study/Speech";
import { api, asset, entries, value } from "../lib/api";
import type { Entry, Page } from "../lib/api";
import {
  NOTE_REGISTER_LABELS,
  NOTE_SCENARIO_LABELS,
  noteScenarioCodes,
} from "../lib/note-language";

type NotePage = Page & { items: Entry[] };

function noteTitle(note: Entry | null | undefined) {
  return value(note, "title") || "未命名学习笔记";
}

function cardTitle(card: Entry, index: number) {
  return (
    value(card, "item_title") ||
    value(card, "english_text") ||
    value(card, "raw_text") ||
    `单词卡片 ${index + 1}`
  );
}

function cardEnglish(card: Entry) {
  return (
    value(card, "english_text") ||
    value(card, "raw_text") ||
    value(card, "item_title")
  );
}

function cardChinese(card: Entry) {
  return value(card, "chinese_text");
}

async function loadAllNotes() {
  const first = await api<NotePage>("/content/notes?page=1&page_size=100");
  if (first.total_pages <= 1) return first.items;
  const remaining = await Promise.all(
    Array.from({ length: first.total_pages - 1 }, (_, index) =>
      api<NotePage>(`/content/notes?page=${index + 2}&page_size=100`),
    ),
  );
  return [...first.items, ...remaining.flatMap((page) => page.items)];
}

function NoteLanguageTags({ card }: { card: Entry }) {
  const register = value(card, "language_register");
  const registerLabel = NOTE_REGISTER_LABELS[register];
  const scenarios = noteScenarioCodes(card.usage_scenarios)
    .map((code) => NOTE_SCENARIO_LABELS[code])
    .filter(Boolean);

  if (!registerLabel && !scenarios.length) return null;
  return (
    <div className="note-course-card-tags" aria-label="表达语体与适用场景">
      {registerLabel && register !== "unclassified" && (
        <span className={`note-course-register is-${register}`}>
          {registerLabel}
        </span>
      )}
      {scenarios.map((scenario) => (
        <span className="note-course-scenario" key={scenario}>
          {scenario}
        </span>
      ))}
    </div>
  );
}

function NoteWordCard({
  card,
  cardNumber,
  englishVisible,
  onToggleEnglish,
}: {
  card: Entry;
  cardNumber: number;
  englishVisible: boolean;
  onToggleEnglish: () => void;
}) {
  const english = cardEnglish(card);
  const chinese = cardChinese(card);
  const imageUrl = asset(value(card, "example_image_url"));
  const itemType = value(card, "item_type");

  return (
    <article
      className="note-course-card"
      aria-labelledby="note-course-card-title"
    >
      <div className="note-course-card-topline">
        <span className="note-course-card-index">
          CARD {String(cardNumber).padStart(2, "0")}
        </span>
        <NoteLanguageTags card={card} />
      </div>

      <div className="note-course-card-heading">
        <div>
          <p className="note-course-card-kind">
            {itemType === "knowledge" ? "知识点卡片" : "单词 / 表达卡片"}
          </p>
          <h2 id="note-course-card-title">{cardTitle(card, cardNumber - 1)}</h2>
        </div>
        {english && (
          <Speak
            className="note-course-speak"
            label={`朗读 ${english}`}
            text={english}
          >
            🔊 <span>朗读</span>
          </Speak>
        )}
      </div>

      {english && (
        <section className="note-course-term" aria-label="英文表达">
          <div>
            <p>ENGLISH</p>
            <strong className={englishVisible ? "" : "is-concealed"} lang="en">
              {englishVisible ? english : "点击显示英文"}
            </strong>
          </div>
          <button
            aria-pressed={englishVisible}
            className="note-course-english-toggle"
            onClick={onToggleEnglish}
            type="button"
          >
            {englishVisible ? "隐藏英文" : "显示英文"}
          </button>
        </section>
      )}

      <section className="note-course-meaning" aria-label="中文释义">
        <p>CHINESE</p>
        <strong>{chinese || "待补充中文释义"}</strong>
      </section>

      {value(card, "explanation") && (
        <section className="note-course-detail note-course-explanation">
          <p>用法说明</p>
          <span>{value(card, "explanation")}</span>
        </section>
      )}

      {value(card, "examples") && (
        <section className="note-course-detail note-course-example">
          <p>例句与练习</p>
          <span>{value(card, "examples")}</span>
        </section>
      )}

      {imageUrl && (
        <figure className="note-course-image">
          <img
            alt={
              value(card, "example_image_alt") ||
              cardTitle(card, cardNumber - 1)
            }
            src={imageUrl}
          />
          {value(card, "example_image_alt") && (
            <figcaption>{value(card, "example_image_alt")}</figcaption>
          )}
        </figure>
      )}
    </article>
  );
}

export function NoteCoursePreview() {
  const [notes, setNotes] = useState<Entry[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [selectedNote, setSelectedNote] = useState<Entry | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [noteQuery, setNoteQuery] = useState("");
  const [englishVisible, setEnglishVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [noteReloadKey, setNoteReloadKey] = useState(0);
  const [failedNoteId, setFailedNoteId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    setFailedNoteId(null);
    setNoteReloadKey((current) => current + 1);
    try {
      const nextNotes = await loadAllNotes();
      setNotes(nextNotes);
      setSelectedNoteId((current) =>
        current && nextNotes.some((note) => note.id === current)
          ? current
          : nextNotes[0]?.id || null,
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  useEffect(() => {
    let active = true;
    if (!selectedNoteId)
      return () => {
        active = false;
      };

    api<Entry>(`/content/notes/${selectedNoteId}`)
      .then((note) => {
        if (!active) return;
        setSelectedNote(note);
        setSelectedCardId(entries(note, "items")[0]?.id || null);
        setFailedNoteId(null);
      })
      .catch((reason: Error) => {
        if (!active) return;
        setError(reason.message);
        setFailedNoteId(selectedNoteId);
      });

    return () => {
      active = false;
    };
  }, [noteReloadKey, selectedNoteId]);

  const cards = useMemo(
    () =>
      selectedNote?.id === selectedNoteId ? entries(selectedNote, "items") : [],
    [selectedNote, selectedNoteId],
  );
  const loadingDetail =
    selectedNoteId !== null &&
    selectedNote?.id !== selectedNoteId &&
    failedNoteId !== selectedNoteId;
  const activeCardIndex = Math.max(
    0,
    cards.findIndex((card) => card.id === selectedCardId),
  );
  const activeCard = cards[activeCardIndex];
  const matchingNotes = useMemo(() => {
    const query = noteQuery.trim().toLocaleLowerCase();
    if (!query) return notes;
    return notes.filter((note) =>
      `${noteTitle(note)} ${value(note, "summary")} ${value(note, "source")}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [noteQuery, notes]);

  function selectNote(note: Entry) {
    if (note.id === selectedNoteId) return;
    setSelectedNoteId(note.id);
    setSelectedNote(null);
    setSelectedCardId(null);
    setFailedNoteId(null);
    setError("");
    setEnglishVisible(true);
  }

  function selectCard(card: Entry) {
    setSelectedCardId(card.id);
    setEnglishVisible(true);
  }

  function moveCard(direction: number) {
    const next = cards[activeCardIndex + direction];
    if (next) selectCard(next);
  }

  return (
    <section className="study-dialogue note-course-preview">
      <div className="dialogue-page">
        <header className="note-course-preview-header">
          <div>
            <p>课程页面预览</p>
            <h1>学习笔记 · 单词卡片课程</h1>
            <span>沿用笔记卡片的内容结构，以日常口语对话的课程布局展示。</span>
          </div>
          <button
            className="note-course-refresh"
            disabled={loading}
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={16} />
            刷新笔记
          </button>
        </header>

        {error && (
          <p className="note-course-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="note-course-loading" role="status">
            正在加载学习笔记…
          </p>
        ) : !notes.length ? (
          <section className="note-course-empty">
            <span aria-hidden="true">🗂️</span>
            <h2>还没有可预览的学习笔记</h2>
            <p>先在“学习笔记”中创建卡片，课程预览会自动读取并展示。</p>
          </section>
        ) : (
          <>
            <section
              className="dialogue-hero note-course-hero"
              aria-labelledby="note-course-title"
            >
              <p>NOTE CARD COURSE · PREVIEW</p>
              <h1 id="note-course-title">
                {noteTitle(selectedNote || notes[0])}
              </h1>
              <div>
                {value(selectedNote, "summary") ||
                  `共 ${cards.length} 张卡片，按英文表达、释义和用法逐张学习。`}
              </div>
              <i aria-hidden="true">🗂️</i>
            </section>

            <section className="dialogue-layout">
              <aside className="dialogue-nav note-course-nav">
                <section className="lesson-picker" aria-label="选择学习笔记">
                  <label htmlFor="note-course-search">NOTE · 学习笔记</label>
                  <input
                    autoComplete="off"
                    id="note-course-search"
                    onChange={(event) => setNoteQuery(event.target.value)}
                    placeholder="搜索笔记标题或来源"
                    type="search"
                    value={noteQuery}
                  />
                  <small aria-live="polite">
                    共 {matchingNotes.length} 篇笔记
                  </small>
                  <div
                    className="lesson-results"
                    role="listbox"
                    aria-label="学习笔记列表"
                  >
                    {matchingNotes.map((note) => {
                      const active = note.id === selectedNoteId;
                      return (
                        <button
                          aria-selected={active}
                          className={`lesson-option${active ? " active" : ""}`}
                          key={note.id}
                          onClick={() => selectNote(note)}
                          role="option"
                          type="button"
                        >
                          <span>{value(note, "note_date") || "学习笔记"}</span>
                          <strong>{noteTitle(note)}</strong>
                        </button>
                      );
                    })}
                    {!matchingNotes.length && (
                      <p className="lesson-no-results">
                        没有找到匹配的学习笔记
                      </p>
                    )}
                  </div>
                </section>

                <p>CARD · 本课卡片</p>
                <nav aria-label="本课单词卡片">
                  {cards.map((card, index) => {
                    const active = card.id === activeCard?.id;
                    return (
                      <button
                        aria-current={active ? "step" : undefined}
                        className={`note-course-card-option${active ? " is-active" : ""}`}
                        key={card.id}
                        onClick={() => selectCard(card)}
                        type="button"
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{cardTitle(card, index)}</strong>
                      </button>
                    );
                  })}
                  {!loadingDetail && !cards.length && (
                    <p className="note-course-nav-empty">
                      这篇笔记还没有卡片。
                    </p>
                  )}
                </nav>
              </aside>

              <article className="lesson-content note-course-content">
                {loadingDetail ? (
                  <p className="note-course-loading" role="status">
                    正在打开这篇学习笔记…
                  </p>
                ) : activeCard ? (
                  <>
                    <div className="section-title note-course-section-title">
                      <span>LEARN</span>
                      <h2>单词卡片学习</h2>
                      <small>
                        {activeCardIndex + 1} / {cards.length}
                      </small>
                    </div>
                    <NoteWordCard
                      card={activeCard}
                      cardNumber={activeCardIndex + 1}
                      englishVisible={englishVisible}
                      onToggleEnglish={() =>
                        setEnglishVisible((current) => !current)
                      }
                    />
                    <div className="note-course-card-controls">
                      <button
                        disabled={activeCardIndex === 0}
                        onClick={() => moveCard(-1)}
                        type="button"
                      >
                        ← 上一张
                      </button>
                      <span>用左侧目录或按钮切换卡片</span>
                      <button
                        disabled={activeCardIndex >= cards.length - 1}
                        onClick={() => moveCard(1)}
                        type="button"
                      >
                        下一张 →
                      </button>
                    </div>
                  </>
                ) : (
                  <section className="note-course-empty is-content-empty">
                    <span aria-hidden="true">📖</span>
                    <h2>这篇笔记暂时没有可展示的卡片</h2>
                    <p>
                      在学习笔记中添加单词或知识点后，这里会按卡片顺序显示。
                    </p>
                  </section>
                )}
              </article>
            </section>
          </>
        )}
      </div>
    </section>
  );
}
