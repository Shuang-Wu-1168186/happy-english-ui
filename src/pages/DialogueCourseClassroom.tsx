import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  DialogueLessonContent,
  dialogueSections,
} from "../components/study/Dialogue";
import { value } from "../lib/api";
import type { Entry } from "../lib/api";

type Props = {
  course: Entry;
  lessons: Entry[];
  activeLesson: Entry;
  items: Entry[];
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
  return value(lesson, "title") || "未命名课程";
}

export function DialogueCourseClassroom({
  course,
  lessons,
  activeLesson,
  items,
  isPreview,
  previewCount,
  lockedLesson,
  onSelectLesson,
  onLockLesson,
  onCloseUpgrade,
}: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const sections = useMemo(() => dialogueSections(items), [items]);
  const topicId = Number(course.topic_id);
  const fallbackTo =
    Number.isInteger(topicId) && topicId > 0
      ? `/course-topics/${topicId}`
      : "/daily-speaking";
  const matchingLessons = lessons.filter((lesson) =>
    `${lessonTitle(lesson)} ${value(lesson, "title_en")} ${value(lesson, "summary")}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  return (
    <div className="study-dialogue course-dialogue-classroom">
      <main className="dialogue-page">
        <header className="dialogue-topbar">
          <Link
            to={fallbackTo}
            aria-label="返回上一页"
            onClick={(event) => {
              event.preventDefault();
              if (window.history.state?.idx > 0) navigate(-1);
              else navigate(fallbackTo);
            }}
          >
            ←
          </Link>
          <strong>Happy English · 日常口语对话</strong>
          <span />
        </header>
        <section className="dialogue-hero">
          <p>DAILY SPOKEN DIALOGUES</p>
          <h1>{value(course, "title")}</h1>
          <div>
            {lessonTitle(activeLesson)} ·{" "}
            {value(activeLesson, "summary") || "实用表达、情景对话与开口练习"}
          </div>
          {isPreview && (
            <aside className="course-dialogue-preview">
              前 {previewCount} 课可试看 · 升级会员即可解锁后续课程
            </aside>
          )}
          <i aria-hidden="true">🛍️</i>
        </section>
        <section className="dialogue-layout">
          <aside className="dialogue-nav">
            <section className="lesson-picker" aria-label="选择课程">
              <label htmlFor="course-dialogue-search">LESSON · 课程</label>
              <input
                id="course-dialogue-search"
                type="search"
                placeholder="搜索章节或课程名称"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <small aria-live="polite">
                共 {matchingLessons.length} 门课程
              </small>
              <div
                className="lesson-results"
                role="listbox"
                aria-label="课程列表"
              >
                {matchingLessons.map((lesson) => {
                  const locked = isLocked(lesson);
                  const active = lesson.id === activeLesson.id;
                  return (
                    <button
                      className={`lesson-option${active ? " active" : ""}${locked ? " is-locked" : ""}`}
                      key={lesson.id}
                      onClick={() =>
                        locked ? onLockLesson(lesson) : onSelectLesson(lesson)
                      }
                      role="option"
                      aria-selected={active}
                      type="button"
                    >
                      <span>{value(lesson, "summary")}</span>
                      <strong>{lessonTitle(lesson)}</strong>
                      {locked && <em>🔒 会员解锁</em>}
                    </button>
                  );
                })}
                {!matchingLessons.length && (
                  <p className="lesson-no-results">没有找到匹配的课程</p>
                )}
              </div>
            </section>
            <p>本课内容</p>
            <nav aria-label="本课章节">
              {sections.map((section, index) => (
                <a href={`#${section.code}`} key={section.code}>
                  {index + 1}. {value(section.items[0], "section_title")}
                </a>
              ))}
            </nav>
          </aside>
          <DialogueLessonContent items={items} />
        </section>
      </main>

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
            <span>升级会员即可解锁这节课和后续全部课程。</span>
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
