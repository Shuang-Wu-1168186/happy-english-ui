import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { value } from "../../lib/api";
import type { Entry } from "../../lib/api";
import { Speak } from "./Speech";
export function Dialogue({
  items,
  initialId,
}: {
  items: Entry[];
  initialId?: number;
}) {
  const [params, setParams] = useSearchParams(),
    [query, setQuery] = useState("");
  const lessons = [
    ...new Map(items.map((i) => [value(i, "lesson_code"), i])).values(),
  ];
  const lesson =
    lessons.find(
      (i) =>
        value(i, "lesson_code") ===
        (params.get("lesson") ||
          value(
            items.find((i) => i.id === initialId) || { id: 0 },
            "lesson_code",
          )),
    ) || lessons[0];
  const current = items.filter(
    (i) =>
      value(i, "lesson_code") === value(lesson || { id: 0 }, "lesson_code"),
  );
  const sections = [
    ...new Set(current.map((i) => value(i, "section_code"))),
  ].map((code) => ({
    code,
    items: current.filter((i) => value(i, "section_code") === code),
  }));
  const matching = lessons.filter((i) =>
    `${value(i, "chapter_title")} ${value(i, "lesson_title")} ${value(i, "lesson_code")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="study-dialogue">
      <main className="dialogue-page">
        <header className="dialogue-topbar">
          <Link to="/" aria-label="返回学习主页">
            ←
          </Link>
          <strong>Happy English · 日常口语对话</strong>
          <span />
        </header>
        <section className="dialogue-hero">
          <p>DAILY SPOKEN DIALOGUES</p>
          <h1>{lesson ? value(lesson, "lesson_title") : "日常口语对话"}</h1>
          <div>
            {lesson ? value(lesson, "chapter_title") : ""} ·
            实用表达、情景对话与开口练习
          </div>
          <i aria-hidden="true">🛍️</i>
        </section>
        <section className="dialogue-layout">
          <aside className="dialogue-nav">
            <section className="lesson-picker" aria-label="选择课程">
              <label htmlFor="lesson-search">LESSON · 课程</label>
              <input
                id="lesson-search"
                type="search"
                placeholder="搜索章节或课程名称"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <small aria-live="polite">共 {matching.length} 门课程</small>
              <div
                className="lesson-results"
                role="listbox"
                aria-label="课程列表"
              >
                {matching.map((l) => (
                  <a
                    key={value(l, "lesson_code")}
                    className={`lesson-option${value(l, "lesson_code") === value(lesson, "lesson_code") ? " active" : ""}`}
                    href={`?lesson=${encodeURIComponent(value(l, "lesson_code"))}`}
                    role="option"
                    aria-selected={
                      value(l, "lesson_code") === value(lesson, "lesson_code")
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      setParams({ lesson: value(l, "lesson_code") });
                    }}
                  >
                    <span>{value(l, "chapter_title")}</span>
                    <strong>{value(l, "lesson_title")}</strong>
                  </a>
                ))}
                {!matching.length && (
                  <p className="lesson-no-results">没有找到匹配的课程</p>
                )}
              </div>
            </section>
            <p>本课内容</p>
            <nav aria-label="本课章节">
              {sections.map((s, i) => (
                <a href={`#${s.code}`} key={s.code}>
                  {i + 1}. {value(s.items[0], "section_title")}
                </a>
              ))}
            </nav>
          </aside>
          <article className="lesson-content">
            {sections.map((s, i) => (
              <section className="learning-section" id={s.code} key={s.code}>
                <div className="section-title">
                  <span>PART {String.fromCharCode(65 + i)}</span>
                  <h2>{value(s.items[0], "section_title")}</h2>
                </div>
                {["vocabulary", "extra"].includes(s.code) ? (
                  <div className="vocabulary-grid">
                    {s.items.map((item) => (
                      <article className="vocabulary-card" key={item.id}>
                        <div>
                          <h3>{value(item, "item_title")}</h3>
                          {Boolean(item.pronunciation) && (
                            <em>{value(item, "pronunciation")}</em>
                          )}
                        </div>
                        <Speak
                          className=""
                          text={value(item, "english_text")}
                          label={`播放 ${value(item, "item_title")}`}
                        />
                        <p className="meaning">{value(item, "chinese_text")}</p>
                        {Boolean(item.explanation) && (
                          <p>{value(item, "explanation")}</p>
                        )}
                        {Boolean(item.examples) && (
                          <blockquote>{value(item, "examples")}</blockquote>
                        )}
                      </article>
                    ))}
                  </div>
                ) : ["dialogue", "practice"].includes(s.code) ? (
                  <div
                    className={`dialogue-list${s.code === "practice" ? " practice-list" : ""}`}
                  >
                    {s.items.map((item) => (
                      <article className="dialogue-line" key={item.id}>
                        <div className="speaker">{value(item, "speaker")}</div>
                        <div className="line-copy">
                          <p lang="en">{value(item, "english_text")}</p>
                          <small>{value(item, "chinese_text")}</small>
                        </div>
                        <Speak
                          className=""
                          text={value(item, "english_text")}
                          label="播放这句英文"
                        />
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="prompt-grid">
                    {s.items.map((item, j) => (
                      <article className="prompt-card" key={item.id}>
                        <span>{j + 1}</span>
                        <h3>{value(item, "item_title")}</h3>
                        <p lang="en">{value(item, "english_text")}</p>
                        <p className="translation">
                          {value(item, "chinese_text")}
                        </p>
                        {Boolean(item.explanation) && (
                          <div className="hints">
                            <b>Hints</b>
                            {value(item, "explanation")}
                          </div>
                        )}
                        <Speak
                          className=""
                          text={value(item, "english_text")}
                          label="听问题"
                        >
                          🔊 听问题
                        </Speak>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </article>
        </section>
      </main>
    </div>
  );
}
