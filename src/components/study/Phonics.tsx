import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { entries, value } from "../../lib/api";
import type { Entry } from "../../lib/api";
import { Speak } from "./Speech";
function Lesson({ lesson, number }: { lesson: Entry; number: number }) {
  const [answer, setAnswer] = useState("");
  return (
    <article className="lesson-card">
      <header className="lesson-heading">
        <div>
          <p className="lesson-kicker">
            LESSON {String(number).padStart(2, "0")} ·{" "}
            {value(lesson, "subtitle")}
          </p>
          <h2>{value(lesson, "title")}</h2>
        </div>
        <Speak
          className="listen-pattern"
          text={value(lesson, "pattern_text")}
          label="Listen to the sound pattern"
        >
          🔊 听一听
        </Speak>
      </header>
      <section className="pattern-panel">
        <p>FOCUS PATTERN</p>
        <strong>{value(lesson, "pattern_text")}</strong>
        <span>{value(lesson, "sound_text")}</span>
      </section>
      <p className="lesson-tip">
        <b>学习提示</b>
        {value(lesson, "learning_tip")}
      </p>
      {["review_examples", "examples"].map(
        (key) =>
          entries(lesson, key).length > 0 && (
            <section
              className={key === "examples" ? "word-section" : "review-section"}
              key={key}
            >
              <div className="section-heading">
                <div>
                  <p>
                    {key === "examples"
                      ? "BLEND & READ · 视频单词"
                      : "WARM UP · 视频复习"}
                  </p>
                  <h3>
                    {key === "examples"
                      ? value(lesson, "pattern_text")
                      : "复习视频中的例词"}
                  </h3>
                </div>
                <small>
                  {key === "examples"
                    ? "点按单词听发音"
                    : entries(lesson, key)
                        .map((e) => value(e, "word"))
                        .join(" · ")}
                </small>
              </div>
              <div
                className={`word-grid${key === "review_examples" ? " review-grid" : ""}`}
              >
                {entries(lesson, key).map((example, i) => (
                  <Speak
                    key={i}
                    className="word-card"
                    text={value(example, "word")}
                    label={`Listen to ${value(example, "word")}`}
                  >
                    <strong>{value(example, "word")}</strong>
                    <span>
                      <b>{value(example, "focus")}</b> ·{" "}
                      {value(example, "sound")}
                    </span>
                    <i>🔊</i>
                  </Speak>
                ))}
              </div>
            </section>
          ),
      )}
      <section className="quick-check">
        <p>QUICK CHECK · 小测验</p>
        <h3>{value(lesson, "quiz_prompt")}</h3>
        <div className="quiz-choices">
          {(Array.isArray(lesson.quiz_choices) ? lesson.quiz_choices : []).map(
            (choice, i) => (
              <button
                key={i}
                disabled={!!answer}
                className={
                  answer
                    ? String(choice) === value(lesson, "quiz_answer")
                      ? "correct"
                      : String(choice) === answer
                        ? "wrong"
                        : ""
                    : ""
                }
                onClick={() => setAnswer(String(choice))}
              >
                {String(choice)}
              </button>
            ),
          )}
        </div>
        <p className="quiz-feedback" aria-live="polite">
          {answer &&
            (answer === value(lesson, "quiz_answer")
              ? "答对了！你已经找到了这个拼读规律。"
              : `再看一看：正确答案是 “${value(lesson, "quiz_answer")}”。`)}
        </p>
      </section>
    </article>
  );
}
export function Phonics({
  items,
  initialId,
}: {
  items: Entry[];
  initialId?: number;
}) {
  const [params, setParams] = useSearchParams();
  const id = Number(params.get("lesson")) || initialId || items[0]?.id;
  const index = Math.max(
      0,
      items.findIndex((i) => i.id === id),
    ),
    lesson = items[index];
  const menu = Math.floor(index / 10),
    count = Math.ceil(items.length / 10);
  function choose(id: number) {
    setParams({ lesson: String(id) });
  }
  return (
    <div className="study-phonics">
      <main className="phonics-page">
        <header className="phonics-topbar">
          <Link className="back-button" to="/" aria-label="Back to modules">
            ←
          </Link>
          <div className="brand-mark">
            <span>✦</span> Happy English
          </div>
          <div className="topbar-spacer" />
        </header>
        <section className="phonics-hero">
          <div>
            <p className="eyebrow">🔤 PHONICS FOUNDATION</p>
            <h1>
              Hear it. Blend it.
              <br />
              <span>Read it.</span>
            </h1>
            <p className="hero-copy">
              从字母音开始，循序学习常见拼读规律，再用单词把声音连起来。
            </p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span>Ａ</span>
            <span>Ｂ</span>
            <span>Ｃ</span>
            <i>♪</i>
          </div>
        </section>
        {lesson ? (
          <section
            className="lesson-layout"
            aria-label="Natural phonics lessons"
          >
            <nav className="lesson-menu" aria-label="Phonics lessons">
              <div className="menu-title">
                <p className="menu-label">LESSONS · 课程</p>
                <small>
                  第 {menu + 1} / {count} 页
                </small>
              </div>
              <div className="lesson-links">
                {items.slice(menu * 10, menu * 10 + 10).map((item, i) => (
                  <a
                    key={item.id}
                    className={`lesson-link${item.id === lesson.id ? " active" : ""}`}
                    href={`?lesson=${item.id}`}
                    aria-current={item.id === lesson.id ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      choose(item.id);
                    }}
                  >
                    <span>{menu * 10 + i + 1}</span>
                    <div>
                      <strong>{value(item, "title")}</strong>
                      <small>{value(item, "subtitle")}</small>
                    </div>
                  </a>
                ))}
              </div>
              {count > 1 && (
                <div className="lesson-pagination">
                  {menu > 0 ? (
                    <a
                      href={`?lesson=${items[(menu - 1) * 10].id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        choose(items[(menu - 1) * 10].id);
                      }}
                    >
                      ← 前 10 课
                    </a>
                  ) : (
                    <span />
                  )}
                  {menu < count - 1 && (
                    <a
                      href={`?lesson=${items[(menu + 1) * 10].id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        choose(items[(menu + 1) * 10].id);
                      }}
                    >
                      后 10 课 →
                    </a>
                  )}
                </div>
              )}
            </nav>
            <Lesson key={lesson.id} lesson={lesson} number={index + 1} />
          </section>
        ) : (
          <p className="empty">暂无课程。</p>
        )}
      </main>
    </div>
  );
}
