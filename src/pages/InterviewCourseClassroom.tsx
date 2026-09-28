import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { entries, value } from "../lib/api";
import type { Entry } from "../lib/api";

type Props = {
  course: Entry;
  lessons: Entry[];
  activeLesson: Entry;
  isPreview: boolean;
  previewCount: number;
  lockedLesson: Entry | null;
  onSelectLesson: (lesson: Entry) => void;
  onLockLesson: (lesson: Entry) => void;
  onCloseUpgrade: () => void;
};

function isLocked(lesson: Entry) {
  return lesson.is_locked === true || lesson.access_state === "locked";
}

function lessonTitle(lesson: Entry) {
  return value(lesson, "title") || "未命名面试题";
}

function sourceContent(lesson: Entry) {
  const source = lesson.source_content;
  if (source && typeof source === "object" && !Array.isArray(source))
    return source as Entry;
  const content = lesson.content;
  if (content && typeof content === "object" && !Array.isArray(content))
    return content as Entry;
  return null;
}

function InterviewLessonCard({
  lesson,
  active,
  onUnlock,
}: {
  lesson: Entry;
  active: boolean;
  onUnlock: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const locked = isLocked(lesson);
  const content = sourceContent(lesson);

  return (
    <article
      className={`interview-card course-interview-card${active ? " is-active" : ""}`}
      data-lesson-id={lesson.id}
    >
      <div className="card-head">
        <div className="card-meta">
          <span className="badge">
            {locked
              ? "会员课程"
              : value(content, "category_name") || "面试英语"}
          </span>
          <span className="difficulty">
            {locked ? "LOCKED" : `LESSON ${lesson.sort_order || lesson.id}`}
          </span>
        </div>
      </div>

      {locked ? (
        <div className="course-interview-lock">
          <span aria-hidden="true">🔒</span>
          <h2>{lessonTitle(lesson)}</h2>
          <p>升级会员即可解锁这道面试题和后续课程。</p>
          <button className="expand-btn" onClick={onUnlock} type="button">
            升级会员解锁
          </button>
        </div>
      ) : (
        <>
          <h2 className="question-title">
            {value(content, "question") || lessonTitle(lesson)}
          </h2>
          {value(content, "question_cn") && (
            <p className="question-cn">{value(content, "question_cn")}</p>
          )}
          {value(content, "short_answer") && (
            <div className="section answer-block">
              <div className="label">Short Answer</div>
              <p>{value(content, "short_answer")}</p>
            </div>
          )}
          <button
            className="expand-btn"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? "Hide Full Answer" : "Show Full Answer"}
          </button>
          {expanded && (
            <div className="full-answer">
              {value(content, "full_answer") && (
                <div className="section answer-block">
                  <div className="label">Full Answer</div>
                  <p>{value(content, "full_answer")}</p>
                </div>
              )}
              {value(content, "answer_tip") && (
                <div className="note-box">
                  <div className="label">Tip</div>
                  <p className="tip-text">{value(content, "answer_tip")}</p>
                </div>
              )}
              {entries(content || { id: 0 }, "sections").length > 0 && (
                <div className="star-grid">
                  {entries(content || { id: 0 }, "sections").map(
                    (section, index) => (
                      <div className="star-box" key={section.id || index}>
                        <div className="star-title">
                          {value(section, "section_title")}
                        </div>
                        {value(section, "content_en") && (
                          <p>{value(section, "content_en")}</p>
                        )}
                        {value(section, "content_cn") && (
                          <p className="cn-text">
                            {value(section, "content_cn")}
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}

export function InterviewCourseClassroom({
  course,
  lessons,
  activeLesson,
  isPreview,
  previewCount,
  lockedLesson,
  onSelectLesson,
  onLockLesson,
  onCloseUpgrade,
}: Props) {
  const navigate = useNavigate();
  const carousel = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [activeLessonId, setActiveLessonId] = useState(activeLesson.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const topicId = Number(course.topic_id);
  const fallbackTo =
    Number.isInteger(topicId) && topicId > 0
      ? `/course-topics/${topicId}`
      : "/workplace";
  const visibleLessons = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return lessons;
    return lessons.filter((lesson) =>
      `${lessonTitle(lesson)} ${value(lesson, "summary")}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [lessons, query]);
  const activeIndex = Math.max(
    0,
    lessons.findIndex((lesson) => lesson.id === activeLessonId),
  );

  useEffect(() => {
    setActiveLessonId(activeLesson.id);
  }, [activeLesson.id]);

  useEffect(() => {
    const root = carousel.current;
    const card = root?.querySelector<HTMLElement>(
      `[data-lesson-id="${activeLessonId}"]`,
    );
    if (root && card)
      root.scrollTo({
        left: card.offsetLeft - root.offsetLeft,
        behavior: "smooth",
      });
  }, [activeLessonId, visibleLessons]);

  function selectLesson(lesson: Entry) {
    setActiveLessonId(lesson.id);
    if (isLocked(lesson)) onLockLesson(lesson);
    else onSelectLesson(lesson);
    setPickerOpen(false);
  }

  return (
    <div className="study-interview course-interview-classroom">
      <main className="container">
        <div className="topbar">
          <Link
            className="icon-btn"
            to={fallbackTo}
            title="返回上一页"
            onClick={(event) => {
              event.preventDefault();
              if (window.history.state?.idx > 0) navigate(-1);
              else navigate(fallbackTo);
            }}
          >
            ←
          </Link>
          <div className="search-form">
            <input
              className="search"
              type="search"
              aria-label="搜索面试题"
              placeholder="搜索本课程的面试题…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <section className="hero-card" aria-labelledby="course-title">
          <h1 id="course-title">{value(course, "title")}</h1>
          <p>
            {value(course, "summary") || "用结构化回答练习常见的英文面试题。"}
          </p>
          {isPreview && (
            <span className="course-interview-preview">
              前 {previewCount} 课可试看 · 升级会员即可解锁后续课程
            </span>
          )}
        </section>

        <div className="section-head">
          <h2>Interview Cards</h2>
          <button
            className="counter-btn"
            onClick={() => setPickerOpen(true)}
            type="button"
          >
            {lessons.length ? activeIndex + 1 : 0} / {lessons.length}
          </button>
        </div>

        {visibleLessons.length ? (
          <section
            className="carousel-wrap"
            ref={carousel}
            onScroll={() => {
              const root = carousel.current;
              if (!root) return;
              const cards = Array.from(
                root.querySelectorAll<HTMLElement>("[data-lesson-id]"),
              );
              const nearest = cards.reduce<HTMLElement | null>(
                (current, card) =>
                  !current ||
                  Math.abs(
                    card.offsetLeft - root.offsetLeft - root.scrollLeft,
                  ) <
                    Math.abs(
                      current.offsetLeft - root.offsetLeft - root.scrollLeft,
                    )
                    ? card
                    : current,
                null,
              );
              if (nearest) setActiveLessonId(Number(nearest.dataset.lessonId));
            }}
          >
            <div className="carousel">
              {visibleLessons.map((lesson) => (
                <InterviewLessonCard
                  active={lesson.id === activeLessonId}
                  key={lesson.id}
                  lesson={lesson}
                  onUnlock={() => onLockLesson(lesson)}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="empty-state">没有找到匹配的面试题。</div>
        )}
      </main>

      {pickerOpen && (
        <div className="jump-modal" role="dialog" aria-modal="true">
          <div className="jump-backdrop" onClick={() => setPickerOpen(false)} />
          <section className="jump-panel" aria-labelledby="course-picker-title">
            <div className="jump-title" id="course-picker-title">
              选择面试题
            </div>
            <div className="jump-subtitle">共 {lessons.length} 题</div>
            <div className="course-interview-picker-list">
              {lessons.map((lesson, index) => (
                <button
                  className={lesson.id === activeLessonId ? "is-active" : ""}
                  key={lesson.id}
                  onClick={() => selectLesson(lesson)}
                  type="button"
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{lessonTitle(lesson)}</strong>
                  {isLocked(lesson) && <em>🔒</em>}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {lockedLesson && (
        <div className="course-upgrade-backdrop" role="presentation">
          <section
            aria-labelledby="upgrade-course-title"
            className="course-upgrade-dialog"
            role="dialog"
            aria-modal="true"
          >
            <span aria-hidden="true" className="course-upgrade-icon">
              🔒
            </span>
            <p>会员课程</p>
            <h2 id="upgrade-course-title">{lessonTitle(lockedLesson)}</h2>
            <span>升级会员即可解锁这道面试题和后续全部课程。</span>
            <button
              autoFocus
              className="course-upgrade-close"
              onClick={onCloseUpgrade}
              type="button"
            >
              我知道了
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
