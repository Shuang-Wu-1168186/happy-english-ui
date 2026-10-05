import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommuteLessonFlow } from "../components/commute/CommuteLessonFlow";
import { asset, entries, value } from "../lib/api";
import type { Entry } from "../lib/api";

type Props = {
  course: Entry;
  lessons: Entry[];
  activeLesson: Entry;
  isPreview: boolean;
  previewCount: number;
  lockedLesson: Entry | null;
  onCloseUpgrade: () => void;
  onLockLesson: (lesson: Entry) => void;
  onSelectLesson: (lesson: Entry) => void;
};

function read(entry: Entry | null | undefined, key: string) {
  return value(entry, key).trim();
}

function isLocked(lesson: Entry) {
  return lesson.is_locked === true || lesson.access_state === "locked";
}

function lessonTitle(lesson: Entry) {
  return read(lesson, "title") || read(lesson, "title_en") || "未命名课时";
}

function generatedCommuteIllustration(lesson: Entry) {
  const code = read(lesson, "lesson_code");
  if (code === "commute-quick-replies-01")
    return "/static/commute-covers/quick-replies.svg";
  return /^commute-c\d{2}-l\d{2}-[a-z0-9-]+$/.test(code)
    ? `/static/commute-covers/${code}.svg`
    : "";
}

export function CommuteCourseClassroom({
  course,
  lessons,
  activeLesson,
  isPreview,
  previewCount,
  lockedLesson,
  onCloseUpgrade,
  onLockLesson,
  onSelectLesson,
}: Props) {
  const navigate = useNavigate();
  const [showLessonList, setShowLessonList] = useState(false);
  const activeIndex = Math.max(
    0,
    lessons.findIndex((lesson) => lesson.id === activeLesson.id),
  );
  const topic = useMemo(() => entries(course, "topics")[0] || null, [course]);
  const topicId = Number(course.topic_id || topic?.id || 0);
  const fallbackTo =
    Number.isInteger(topicId) && topicId > 0
      ? `/course-topics/${topicId}`
      : "/learning";
  const previousLesson = lessons[activeIndex - 1];
  const nextLesson = lessons[activeIndex + 1];
  const illustrationUrl =
    read(activeLesson, "illustration_url") ||
    generatedCommuteIllustration(activeLesson) ||
    read(course, "cover_url");

  function leaveClassroom() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(fallbackTo);
  }

  function chooseLesson(lesson: Entry) {
    setShowLessonList(false);
    if (isLocked(lesson)) onLockLesson(lesson);
    else onSelectLesson(lesson);
  }

  return (
    <div className="commute-course-app">
      <main className="commute-course-shell">
        <header className="commute-course-topbar">
          <button
            aria-label="返回上一页"
            onClick={leaveClassroom}
            type="button"
          >
            ← 返回
          </button>
          <div>
            <span>COMMUTE MICRO ENGLISH</span>
            <strong>{read(course, "title") || "地铁通勤英语"}</strong>
          </div>
          <button
            aria-expanded={showLessonList}
            aria-haspopup="dialog"
            onClick={() => setShowLessonList(true)}
            type="button"
          >
            课表
          </button>
        </header>

        <section
          className="commute-course-intro"
          aria-labelledby="commute-lesson-title"
        >
          <div>
            <p>
              第 {String(activeIndex + 1).padStart(2, "0")} 课 ·{" "}
              {read(activeLesson, "estimated_minutes") || "3"} 分钟
            </p>
            <h1 id="commute-lesson-title">{lessonTitle(activeLesson)}</h1>
            {read(activeLesson, "summary") && (
              <span>{read(activeLesson, "summary")}</span>
            )}
          </div>
          {illustrationUrl ? (
            <img
              alt={`${lessonTitle(activeLesson)} 的配图`}
              className="commute-course-illustration"
              src={asset(illustrationUrl)}
            />
          ) : (
            <i aria-hidden="true">🚇</i>
          )}
        </section>

        {isPreview && (
          <p className="commute-preview-note">
            前 {previewCount} 课可预览，后续课时需要会员解锁。
          </p>
        )}

        <CommuteLessonFlow lesson={activeLesson} />

        {(previousLesson || nextLesson) && (
          <nav className="commute-lesson-switcher" aria-label="切换课时">
            <button
              disabled={!previousLesson}
              onClick={() => previousLesson && chooseLesson(previousLesson)}
              type="button"
            >
              ← 上一课
            </button>
            <span>
              {activeIndex + 1} / {lessons.length}
            </span>
            <button
              disabled={!nextLesson}
              onClick={() => nextLesson && chooseLesson(nextLesson)}
              type="button"
            >
              下一课 →
            </button>
          </nav>
        )}
      </main>

      {showLessonList && (
        <div
          className="commute-sheet-backdrop"
          role="presentation"
          onClick={() => setShowLessonList(false)}
        >
          <section
            aria-label="课时目录"
            aria-modal="true"
            className="commute-lesson-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="commute-sheet-heading">
              <div>
                <span>LESSON LIST</span>
                <h2>{read(course, "title")}</h2>
              </div>
              <button
                aria-label="关闭课时目录"
                onClick={() => setShowLessonList(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="commute-sheet-lessons">
              {lessons.map((lesson, index) => {
                const active = lesson.id === activeLesson.id;
                const locked = isLocked(lesson);
                return (
                  <button
                    className={`${active ? "is-active" : ""}${locked ? " is-locked" : ""}`}
                    key={lesson.id}
                    onClick={() => chooseLesson(lesson)}
                    type="button"
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{lessonTitle(lesson)}</strong>
                    {locked && <em>🔒</em>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {lockedLesson && (
        <div className="course-upgrade-backdrop" role="presentation">
          <section
            aria-labelledby="commute-upgrade-title"
            aria-modal="true"
            className="course-upgrade-dialog"
            role="dialog"
          >
            <span aria-hidden="true" className="course-upgrade-icon">
              🔒
            </span>
            <p>会员课程</p>
            <h2 id="commute-upgrade-title">{lessonTitle(lockedLesson)}</h2>
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
