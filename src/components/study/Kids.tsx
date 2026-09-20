import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { asset, entries, value } from "../../lib/api";
import type { Entry } from "../../lib/api";
import { useStudyItem } from "../../lib/study";
import { FlipBook } from "./FlipBook";
import { Follow, Speak } from "./Speech";

function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function Eye({
  hidden,
  onClick,
  label,
}: {
  hidden: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className={`card-visibility-toggle${hidden ? " active" : ""}`}
      type="button"
      aria-label={label}
      aria-pressed={hidden}
      onClick={onClick}
    >
      <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="2.6" />
        <path className="eye-slash" d="M4 4 20 20" />
      </svg>
    </button>
  );
}
function KidsCard({
  item,
  learned,
  toggleLearned,
  active,
}: {
  item: Entry;
  learned: boolean;
  toggleLearned: () => void;
  active: boolean;
}) {
  const detail = useStudyItem("kids-cards", active ? item.id : undefined);
  const full = detail?.item || item;
  const [visibility, setVisibility] = useState(
    () =>
      readStored<Record<string, { english: boolean; chinese: boolean }>>(
        "happy-english-kids-card-visibility-v4",
        {},
      )[item.id] || { english: false, chinese: true },
  );
  function toggle(language: "english" | "chinese") {
    const next = { ...visibility, [language]: !visibility[language] };
    setVisibility(next);
    try {
      const all = readStored<Record<string, unknown>>(
        "happy-english-kids-card-visibility-v4",
        {},
      );
      localStorage.setItem(
        "happy-english-kids-card-visibility-v4",
        JSON.stringify({ ...all, [item.id]: next }),
      );
    } catch {
      /* Storage can be disabled. */
    }
  }
  const word = value(item, "word");
  const image =
    word.toLowerCase() === "northeast"
      ? "/static/uploads/kids_cards/northeast-wide.png"
      : value(item, "image_url").includes("-wide.")
        ? value(item, "image_url")
        : value(item, "image_url").replace(".png", "-wide.png");
  return (
    <article
      className={`kids-card featured-card${visibility.english ? " hide-english" : ""}${visibility.chinese ? " hide-chinese" : ""}`}
      data-card-id={item.id}
    >
      <div className="card-colour-tab" />
      <div className="card-header">
        <span className="card-category">
          {value(item, "category")} · {value(item, "level")}
        </span>
        <button
          className={`learned-toggle${learned ? " active" : ""}`}
          aria-label={`Mark ${word} as learned`}
          aria-pressed={learned}
          onClick={toggleLearned}
        >
          {learned ? "★" : "☆"}
        </button>
      </div>
      <div className={`word-picture${image ? " has-image" : ""}`}>
        {image ? (
          <img
            src={asset(image)}
            onError={(e) => {
              const fallback = asset(value(item, "image_url"));
              if (e.currentTarget.getAttribute("src") !== fallback)
                e.currentTarget.src = fallback;
            }}
            alt={`${word} illustration`}
            loading="lazy"
          />
        ) : (
          value(item, "emoji") || "📘"
        )}
      </div>
      <div className="word-area follow-target">
        <div className="word-line">
          <div className="word-title-row">
            <h3 className="english-content">{word}</h3>
            <Eye
              hidden={visibility.english}
              onClick={() => toggle("english")}
              label={`${visibility.english ? "显示清晰的" : "模糊"}英文标题 for ${word}`}
            />
          </div>
        </div>
        <p className="translation">
          <span className="translation-title-row">
            <span className="translation-cn chinese-content">
              {value(item, "translation")}
            </span>
            <Eye
              hidden={visibility.chinese}
              onClick={() => toggle("chinese")}
              label={`${visibility.chinese ? "显示清晰的" : "模糊"}中文标题 for ${word}`}
            />
          </span>
          <span className="word-meta english-content">
            {value(item, "part_of_speech") || "word"} ·{" "}
            {value(item, "phonics") || "pronunciation pending"}
          </span>
        </p>
        <div className="word-audio-actions">
          <Speak
            className="listen-button"
            text={word}
            label={`Listen to ${word}`}
          />
          <Follow
            className="word-follow follow-button"
            text={word}
            label={`Repeat ${word}`}
          />
        </div>
      </div>
      <div className="word-family english-content">
        <span className="learning-label">WORD FAMILY</span>
        {entries(full, "word_family").length ? (
          <strong>
            {entries(full, "word_family")
              .map((w) => value(w, "related_word"))
              .join(" · ")}
          </strong>
        ) : (
          <span className="pending-text">To be added</span>
        )}
      </div>
      <div className="example-box">
        <div className="example-label english-content">TRY IT</div>
        {entries(full, "examples").map((ex, i) => (
          <div className="example-line follow-target" key={ex.id || i}>
            <div className="example-english-row">
              <p className="example english-content">
                “{value(ex, "example_text")}”
              </p>
              <div className="example-actions">
                <Speak
                  className="example-audio"
                  text={value(ex, "example_text")}
                  label="Listen to example sentence"
                />
                <Follow
                  className="example-follow follow-button"
                  text={value(ex, "example_text")}
                  label="Repeat example sentence"
                />
              </div>
            </div>
            <p className="example-cn chinese-content">
              {value(ex, "translation")}
            </p>
          </div>
        ))}
        {detail?.error && <p role="alert">{detail.error}</p>}
        {detail?.item && !entries(full, "examples").length && (
          <p className="pending-text">Examples will be added soon.</p>
        )}
      </div>
      <p className="card-tip english-content">
        <span>💡</span> {value(item, "tip")}
      </p>
    </article>
  );
}
export function Kids({
  items,
  initialId,
}: {
  items: Entry[];
  initialId?: number;
}) {
  const [params, setParams] = useSearchParams();
  const unit = params.get("unit") || "",
    letter = params.get("letter") || "";
  const q = (params.get("q") || params.get("keyword") || "").toLowerCase();
  const filtered = items.filter(
    (i) =>
      (!unit || value(i, "category").split(" · ")[0] === unit) &&
      (!letter || value(i, "word").toUpperCase().startsWith(letter)) &&
      (!q ||
        `${value(i, "word")} ${value(i, "translation")}`
          .toLowerCase()
          .includes(q)),
  );
  const initial = Math.max(
    0,
    filtered.findIndex((i) => i.id === initialId),
  );
  const [active, setActive] = useState(initial);
  const [learned, setLearned] = useState<string[]>(() => {
    const saved = readStored<unknown>("happy-english-kids-learned", []);
    return Array.isArray(saved) ? saved.map(String) : [];
  });
  const units = [
    ...new Set(items.map((i) => value(i, "category").split(" · ")[0])),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const letters = [
    ...new Set(
      items.map((i) => value(i, "word").trim().slice(0, 1).toUpperCase()),
    ),
  ].sort();
  function filter(key: string, v: string) {
    const next = new URLSearchParams(params);
    if (next.get(key) === v) next.delete(key);
    else next.set(key, v);
    setActive(0);
    setParams(next);
  }
  return (
    <div className="study-kids">
      <main className="kids-page">
        <header className="kids-topbar">
          <Link className="back-button" to="/" aria-label="Back to modules">
            ←
          </Link>
          <div className="brand-mark" aria-label="Happy English">
            <span className="brand-star">✦</span>
            <span>Happy English</span>
          </div>
          <div className="topbar-spacer" aria-hidden="true" />
        </header>
        <section className="kids-hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span>🌟</span> YOUNG WORD EXPLORERS
            </div>
            <h1>
              Explore words
              <br />
              <span>with confidence!</span>
            </h1>
            <p>
              Meet useful English words with pictures, pronunciation, and real
              sentences.
            </p>
            <div className="hero-stats">
              <span>
                <strong>{filtered.length}</strong> learning cards
              </span>
              <span>
                <strong>♪</strong> read aloud
              </span>
            </div>
          </div>
          <div className="hero-illustration" aria-hidden="true">
            <div className="sun-face">☀️</div>
            <div className="cloud cloud-one">☁️</div>
            <div className="cloud cloud-two">☁️</div>
            <div className="rainbow">🌈</div>
            <div className="hero-character">🐰</div>
            <span className="float-star star-one">✦</span>
            <span className="float-star star-two">✧</span>
          </div>
        </section>
        <section
          className="learning-panel"
          aria-label="Kids English card practice"
        >
          <div className="panel-heading">
            <div>
              <span className="section-kicker">VOCABULARY EXPLORER</span>
              <h2>Choose a word to explore</h2>
            </div>
            <div className="panel-actions">
              <div className="voice-control">
                <label htmlFor="voice-select">READ ALOUD · 声音</label>
                <select id="voice-select" aria-label="Choose a reading voice">
                  <option value="bf_vale">Vale · British female</option>
                </select>
              </div>
              <div className="learned-badge">{learned.length} learned</div>
            </div>
          </div>
          <div className="filter-section">
            <div className="filter-heading">
              <span>UNIT</span>
              <small>按单元筛选</small>
            </div>
            <div
              className="filter-list unit-filter-list"
              role="tablist"
              aria-label="Filter by unit"
            >
              {["", ...units].map((u) => (
                <button
                  key={u}
                  className={`filter-chip${unit === u ? " active" : ""}`}
                  role="tab"
                  aria-selected={unit === u}
                  onClick={() => filter("unit", u)}
                >
                  {u || "All units"}{" "}
                  <span className="filter-count">
                    {u
                      ? items.filter(
                          (i) => value(i, "category").split(" · ")[0] === u,
                        ).length
                      : items.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="filter-section">
            <div className="filter-heading">
              <span>FIRST LETTER</span>
              <small>按首字母筛选</small>
            </div>
            <div
              className="filter-list letter-filter-list"
              role="tablist"
              aria-label="Filter by first letter"
            >
              {letters.map((l) => (
                <button
                  key={l}
                  className={`filter-chip${letter === l ? " active" : ""}`}
                  role="tab"
                  aria-selected={letter === l}
                  onClick={() => filter("letter", l)}
                >
                  {l}{" "}
                  <span className="filter-count">
                    {
                      items.filter((i) =>
                        value(i, "word").trim().toUpperCase().startsWith(l),
                      ).length
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="category-selection" aria-live="polite">
            <span>当前筛选</span>
            <strong>{unit || "All units"}</strong>
            {letter && <strong>· {letter}</strong>}
            <span>· 共 {filtered.length} 张卡片</span>
          </div>
          {filtered.length ? (
            <FlipBook
              key={`${unit}-${letter}-${q}`}
              kind="kids"
              items={filtered}
              initial={initial}
              onFlip={setActive}
              render={(item, i) => (
                <KidsCard
                  item={item}
                  active={Math.abs(i - active) < 2}
                  learned={learned.includes(String(item.id))}
                  toggleLearned={() => {
                    const next = learned.includes(String(item.id))
                      ? learned.filter((id) => id !== String(item.id))
                      : [...learned, String(item.id)];
                    setLearned(next);
                    try {
                      localStorage.setItem(
                        "happy-english-kids-learned",
                        JSON.stringify(next),
                      );
                    } catch {
                      /* Optional persistence. */
                    }
                  }}
                />
              )}
            />
          ) : (
            <div className="no-results">
              No cards are available yet for this selection. 🌈
            </div>
          )}
        </section>
        <footer className="kids-footer">
          Every new word is a little superpower <span>✦</span>
        </footer>
      </main>
    </div>
  );
}
