import { value } from "../../lib/api";
import type { Entry } from "../../lib/api";

export function isCourseLocked(item: Entry | null | undefined) {
  return item?.is_locked === true || item?.access_state === "locked";
}

export function courseItemTitle(item: Entry) {
  return (
    value(item, "course_lesson_title") ||
    value(item, "title") ||
    value(item, "term") ||
    value(item, "word") ||
    "会员课程"
  );
}

export function CourseLockedContent({
  item,
  onUnlock,
}: {
  item: Entry;
  onUnlock?: () => void;
}) {
  const summary =
    value(item, "course_lesson_summary") ||
    value(item, "summary") ||
    "升级会员即可继续学习这项内容。";

  return (
    <section className="course-locked-content" aria-label="会员课程已锁定">
      <span aria-hidden="true" className="course-locked-icon">
        🔒
      </span>
      <p>会员课程</p>
      <h3>{courseItemTitle(item)}</h3>
      <small>{summary}</small>
      {onUnlock && (
        <button onClick={onUnlock} type="button">
          升级会员解锁
        </button>
      )}
    </section>
  );
}
