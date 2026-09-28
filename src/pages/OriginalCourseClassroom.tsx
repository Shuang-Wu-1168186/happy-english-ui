import { useMemo, useState } from "react";
import { OriginalCards } from "../components/study/Cards";
import { Kids } from "../components/study/Kids";
import { MathCards } from "../components/study/Math";
import { Phonics } from "../components/study/Phonics";
import { Textbook } from "../components/study/Textbook";
import { value } from "../lib/api";
import type { Entry } from "../lib/api";

type Props = {
  course: Entry;
  lessons: Entry[];
  activeLesson: Entry;
  resource:
    | "kids-cards"
    | "math-cards"
    | "phonics"
    | "sentences"
    | "textbook"
    | "vocabulary";
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
  return (
    value(lesson, "course_lesson_title") ||
    value(lesson, "title") ||
    "未命名课程"
  );
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

function kidsUnitName(course: Entry) {
  const unit = value(course, "title").match(/\bUnit\s*\d+\b/i)?.[0];
  return unit ? unit.replace(/\s+/g, " ") : "会员课程";
}

function textbookNavigation(lesson: Entry) {
  const sortOrder = Number(lesson.sort_order);
  const unit = Math.floor(sortOrder / 100);
  const lessonNumber = sortOrder % 100;
  return {
    unit_name: unit > 0 ? `Unit ${unit}` : "课程目录",
    lesson_name: lessonNumber > 0 ? `Lesson ${lessonNumber}` : "会员课程",
  };
}

function lockedCourseItem(
  lesson: Entry,
  resource: Props["resource"],
  course: Entry,
): Entry {
  const title = lessonTitle(lesson);
  const titleEn = value(lesson, "title_en");
  const summary = value(lesson, "summary");
  const base = {
    // Source records use positive IDs. A negative ID keeps a metadata-only
    // locked entry distinct without exposing its source record ID.
    id: -lesson.id,
    title,
    title_en: titleEn,
    summary,
    course_lesson_id: lesson.id,
    course_lesson_title: title,
    course_lesson_summary: summary,
    is_locked: true,
    access_state: "locked",
  };

  if (resource === "kids-cards") {
    return {
      ...base,
      word: titleEn || title,
      translation: summary || title,
      category: `${kidsUnitName(course)} · 会员课程`,
      level: "会员课程",
    };
  }
  if (resource === "textbook") {
    return {
      ...base,
      ...textbookNavigation(lesson),
      title: titleEn || title,
      title_cn: title,
    };
  }
  if (resource === "sentences") {
    return {
      ...base,
      en: titleEn || title,
      cn: summary,
      tag: "会员课程",
    };
  }
  if (resource === "vocabulary") {
    return {
      ...base,
      term: titleEn || title,
      chinese_meaning: summary,
      category: "会员课程",
    };
  }
  return base;
}

function fallbackPath(resource: Props["resource"]) {
  if (["kids-cards", "phonics", "textbook"].includes(resource))
    return "/foundation";
  if (resource === "math-cards") return "/learn/math-cards";
  if (resource === "sentences") return "/daily-speaking";
  return "/workplace";
}

function CourseAccessPanel({
  course,
  lessons,
  isPreview,
  previewCount,
  activeLesson,
  onSelectLesson,
  onLockLesson,
}: Omit<Props, "resource" | "lockedLesson" | "onCloseUpgrade">) {
  const [open, setOpen] = useState(false);
  const availableCount = lessons.filter((lesson) => !isLocked(lesson)).length;

  return (
    <>
      <button
        aria-expanded={open}
        className="course-access-toggle"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span>课程目录</span>
        <small>
          {isPreview
            ? `前 ${previewCount} 课试看`
            : `${availableCount} / ${lessons.length} 课已解锁`}
        </small>
      </button>
      {open && (
        <div className="course-access-modal" role="dialog" aria-modal="true">
          <div
            aria-hidden="true"
            className="course-access-backdrop"
            onClick={() => setOpen(false)}
          />
          <section
            aria-labelledby="course-access-title"
            className="course-access-panel"
          >
            <div className="course-access-heading">
              <div>
                <p>课程目录</p>
                <h2 id="course-access-title">{value(course, "title")}</h2>
              </div>
              <button
                aria-label="关闭课程目录"
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            {isPreview && (
              <p className="course-access-preview">
                前 {previewCount} 课可试看，后续课程需要会员解锁。
              </p>
            )}
            <div className="course-access-list">
              {lessons.map((lesson, index) => {
                const locked = isLocked(lesson);
                return (
                  <button
                    className={`${lesson.id === activeLesson.id ? "is-active" : ""}${locked ? " is-locked" : ""}`}
                    key={lesson.id}
                    onClick={() => {
                      if (locked) onLockLesson(lesson);
                      else onSelectLesson(lesson);
                      setOpen(false);
                    }}
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
    </>
  );
}

function UpgradeDialog({
  lesson,
  onClose,
}: {
  lesson: Entry | null;
  onClose: () => void;
}) {
  if (!lesson) return null;
  return (
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
        <h2 id="upgrade-course-title">{lessonTitle(lesson)}</h2>
        <span>升级会员即可解锁这节课和后续全部课程。</span>
        <button
          autoFocus
          className="course-upgrade-close"
          onClick={onClose}
          type="button"
        >
          我知道了
        </button>
      </section>
    </div>
  );
}

export function OriginalCourseClassroom({
  course,
  lessons,
  activeLesson,
  resource,
  isPreview,
  previewCount,
  lockedLesson,
  onSelectLesson,
  onLockLesson,
  onCloseUpgrade,
}: Props) {
  const items = useMemo(
    () =>
      lessons.flatMap((lesson) => {
        const content = sourceContent(lesson);

        // Phonics has its own lesson navigator. Keep the complete material
        // lesson list in that navigator, even when the API only exposes the
        // first two lesson bodies to a non-member.
        if (resource === "phonics") {
          if (isLocked(lesson)) {
            return [
              {
                ...lockedCourseItem(lesson, resource, course),
                id: lesson.id,
                subtitle: value(lesson, "title_en") || value(lesson, "summary"),
                course_lesson_id: lesson.id,
                course_embedded: true,
              },
            ];
          }
          return content
            ? [
                {
                  ...content,
                  id: lesson.id,
                  course_lesson_id: lesson.id,
                  course_embedded: true,
                  is_locked: false,
                  access_state: "available",
                },
              ]
            : [];
        }

        if (isLocked(lesson))
          return [
            {
              ...lockedCourseItem(lesson, resource, course),
              course_embedded: true,
            },
          ];
        return content
          ? [
              {
                ...content,
                course_lesson_id: lesson.id,
                course_embedded: true,
                is_locked: false,
                access_state: "available",
              },
            ]
          : [];
      }),
    [course, lessons, resource],
  );
  const activeContentId =
    resource === "phonics" ? activeLesson.id : sourceContent(activeLesson)?.id;
  const topicId = Number(course.topic_id);
  const backTo =
    Number.isInteger(topicId) && topicId > 0
      ? `/course-topics/${topicId}`
      : fallbackPath(resource);
  const componentKey = `${resource}-${activeContentId || "first"}-${items.length}`;
  const commonProps = { backTo, initialId: activeContentId };

  return (
    <>
      {resource === "phonics" && (
        <Phonics
          key={componentKey}
          items={items}
          onLockedLesson={onLockLesson}
          onSelectLesson={onSelectLesson}
          {...commonProps}
        />
      )}
      {resource === "textbook" && (
        <Textbook
          embedded
          key={componentKey}
          items={items}
          onLockedLesson={onLockLesson}
          {...commonProps}
        />
      )}
      {resource === "kids-cards" && (
        <Kids
          embedded
          key={componentKey}
          items={items}
          onLockedLesson={onLockLesson}
          {...commonProps}
        />
      )}
      {resource === "math-cards" && (
        <MathCards
          key={componentKey}
          items={items}
          onLockedLesson={onLockLesson}
          {...commonProps}
        />
      )}
      {["sentences", "vocabulary"].includes(resource) && (
        <OriginalCards
          courseEmbedded
          key={componentKey}
          items={items}
          onLockedLesson={onLockLesson}
          resource={resource}
          {...commonProps}
        />
      )}
      <CourseAccessPanel
        activeLesson={activeLesson}
        course={course}
        isPreview={isPreview}
        lessons={lessons}
        onLockLesson={onLockLesson}
        onSelectLesson={onSelectLesson}
        previewCount={previewCount}
      />
      <UpgradeDialog lesson={lockedLesson} onClose={onCloseUpgrade} />
    </>
  );
}
