import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { HomeNavigation } from "../components/Layout";
import { Speak } from "../components/study/Speech";
import { api, entries, value } from "../lib/api";
import type { Entry } from "../lib/api";
import { DialogueCourseClassroom } from "./DialogueCourseClassroom";
import { InterviewCourseClassroom } from "./InterviewCourseClassroom";
import { OriginalCourseClassroom } from "./OriginalCourseClassroom";
import { PutAsideStyleCourseware } from "../components/courseware/PutAsideStyleCourseware";
import { resolveMaterialTemplate } from "../lib/material-templates";

type OriginalCourseResource =
  | "kids-cards"
  | "math-cards"
  | "phonics"
  | "sentences"
  | "textbook"
  | "vocabulary";

function read(entry: Entry | null | undefined, key: string) {
  return value(entry, key).trim();
}

function isLocked(lesson: Entry | undefined) {
  return lesson?.is_locked === true || lesson?.access_state === "locked";
}

function contentFor(lesson: Entry | undefined): Entry | null {
  const source = lesson?.source_content;
  if (source && typeof source === "object" && !Array.isArray(source))
    return source as Entry;
  const content = lesson?.content;
  if (Array.isArray(content))
    return { id: Number(lesson?.id || 0), items: content };
  if (content && typeof content === "object") return content as Entry;
  return null;
}

function contentItems(content: Entry) {
  for (const key of ["items", "sentences", "sections", "examples", "blocks"]) {
    const items = entries(content, key);
    if (items.length) return items;
  }
  return [content];
}

function dialogueItems(lesson: Entry | undefined) {
  const content = contentFor(lesson);
  return content ? entries(content, "items") : [];
}

function originalCourseResourceForTemplate(
  templateCode: string,
  lesson: Entry | undefined,
): OriginalCourseResource | null {
  const resource = read(lesson, "source_resource") as OriginalCourseResource;
  if (templateCode === "textbook") return "textbook";
  if (templateCode === "phonics") return "phonics";
  if (templateCode === "cards")
    return ["kids-cards", "math-cards", "vocabulary"].includes(resource)
      ? resource
      : null;
  if (templateCode === "standard" && resource === "sentences") return "sentences";
  return null;
}

function firstText(item: Entry, fields: string[]) {
  return fields.map((field) => read(item, field)).find(Boolean) || "";
}

function canSpeak(text: string) {
  return /[A-Za-z]/.test(text);
}

function objectEntry(value: unknown): Entry {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Entry)
    : { id: 0 };
}

function coursewareBlocks(lesson: Entry | undefined) {
  return entries(lesson || { id: 0 }, "courseware_blocks").filter(
    (block) => read(block, "block_type") && Object.keys(objectEntry(block.payload)).length,
  );
}

function LessonBody({ lesson }: { lesson: Entry }) {
  const content = contentFor(lesson);
  if (!content)
    return (
      <p className="course-content-empty">这一课暂时没有可展示的学习内容。</p>
    );

  const rows = contentItems(content);
  return (
    <div className="course-content-rows">
      {rows.map((row, index) => {
        const title = firstText(row, [
          "item_title",
          "title",
          "question",
          "term",
          "word",
          "pattern_text",
          "section_title",
          "label",
        ]);
        const english = firstText(row, [
          "english_text",
          "en",
          "english",
          "text",
        ]);
        const chinese = firstText(row, [
          "chinese_text",
          "cn",
          "chinese_meaning",
          "translation",
          "answer",
          "summary",
        ]);
        const explanation = firstText(row, [
          "explanation",
          "learning_tip",
          "description",
          "key_points",
        ]);
        return (
          <article
            className="course-content-row"
            key={`${row.id || title || "row"}-${index}`}
          >
            {title && (
              <div className="course-content-title-line">
                <h3>{title}</h3>
                {canSpeak(title) && (
                  <Speak
                    className="course-content-listen"
                    label={`朗读 ${title}`}
                    text={title}
                  >
                    🔊
                  </Speak>
                )}
              </div>
            )}
            {english && (
              <div className="course-content-english-line">
                <p className="course-content-english" lang="en">
                  {english}
                </p>
                {english !== title && canSpeak(english) && (
                  <Speak
                    className="course-content-listen"
                    label={`朗读 ${english}`}
                    text={english}
                  >
                    🔊
                  </Speak>
                )}
              </div>
            )}
            {chinese && <p className="course-content-chinese">{chinese}</p>}
            {explanation && (
              <p className="course-content-explanation">{explanation}</p>
            )}
            {!title && !english && !chinese && !explanation && (
              <p className="course-content-empty">本课内容已准备好。</p>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function CourseClassroom() {
  const { courseId = "" } = useParams();
  const id = Number(courseId);
  const [course, setCourse] = useState<Entry | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [lockedLesson, setLockedLesson] = useState<Entry | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!Number.isInteger(id) || id < 1) {
      setError("课程地址无效。");
      return () => {
        active = false;
      };
    }
    api<Entry>(`/learning/courses/${id}/open`, "POST")
      .then((result) => {
        if (!active) return;
        const initial = entries(result, "lessons").find(
          (lesson) => !isLocked(lesson),
        );
        setCourse(result);
        setSelectedLessonId(initial?.id || null);
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const lessons = useMemo(
    () => (course ? entries(course, "lessons") : []),
    [course],
  );
  const materials = useMemo(
    () => (course ? entries(course, "materials") : []),
    [course],
  );
  const activeLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) || lessons[0];
  const previewCount = Number(course?.preview_lesson_count || 0);
  const isPreview = course?.access_state === "preview";
  const activeTemplate = resolveMaterialTemplate(activeLesson);
  const activeDialogueItems = dialogueItems(activeLesson);
  const activeInterviewLesson =
    activeTemplate.code === "interview" && Boolean(contentFor(activeLesson));
  const activeOriginalCourseResource = originalCourseResourceForTemplate(
    activeTemplate.code,
    activeLesson,
  );
  const activeCoursewareBlocks =
    activeTemplate.code === "put-aside" ? coursewareBlocks(activeLesson) : [];

  if (error)
    return (
      <div className="study-home course-classroom">
        <HomeNavigation />
        <main className="container course-classroom-main">
          <BackButton className="course-back" />
          <p className="error" role="alert">
            {error}
          </p>
        </main>
      </div>
    );

  if (!course)
    return (
      <div className="study-home course-classroom">
        <HomeNavigation />
        <main className="container course-classroom-main">
          <p className="course-loading">正在打开课程…</p>
        </main>
      </div>
    );

  if (
    activeLesson &&
    activeTemplate.code === "dialogue" &&
    activeDialogueItems.length
  )
    return (
      <DialogueCourseClassroom
        activeLesson={activeLesson}
        course={course}
        isPreview={isPreview}
        items={activeDialogueItems}
        lessons={lessons}
        lockedLesson={lockedLesson}
        onCloseUpgrade={() => setLockedLesson(null)}
        onLockLesson={setLockedLesson}
        onSelectLesson={(lesson) => setSelectedLessonId(lesson.id)}
        previewCount={previewCount}
      />
    );

  if (activeLesson && activeInterviewLesson)
    return (
      <InterviewCourseClassroom
        activeLesson={activeLesson}
        course={course}
        isPreview={isPreview}
        lessons={lessons}
        lockedLesson={lockedLesson}
        onCloseUpgrade={() => setLockedLesson(null)}
        onLockLesson={setLockedLesson}
        onSelectLesson={(lesson) => setSelectedLessonId(lesson.id)}
        previewCount={previewCount}
      />
    );

  if (activeLesson && activeOriginalCourseResource)
    return (
      <OriginalCourseClassroom
        activeLesson={activeLesson}
        course={course}
        isPreview={isPreview}
        lessons={lessons}
        lockedLesson={lockedLesson}
        onCloseUpgrade={() => setLockedLesson(null)}
        onLockLesson={setLockedLesson}
        onSelectLesson={(lesson) => setSelectedLessonId(lesson.id)}
        previewCount={previewCount}
        resource={activeOriginalCourseResource}
      />
    );

  return (
    <div className="study-home course-classroom">
      <HomeNavigation />
      <main className="container course-classroom-main">
        <BackButton className="course-back" />
        <section className="course-hero" aria-labelledby="course-title">
          <div>
            <p>COURSE CLASSROOM</p>
            <h1 id="course-title">{read(course, "title")}</h1>
            {read(course, "summary") && <span>{read(course, "summary")}</span>}
          </div>
          {isPreview && (
            <aside className="course-preview-badge">
              <strong>前 {previewCount} 课可试看</strong>
              <span>升级会员即可解锁后续全部课程</span>
            </aside>
          )}
        </section>

        {materials.length > 0 && (
          <section
            aria-labelledby="course-materials-title"
            className="course-materials-panel"
          >
            <div className="course-materials-heading">
              <div>
                <p>COURSE MATERIALS</p>
                <h2 id="course-materials-title">教材目录</h2>
              </div>
              <span>共 {materials.length} 本教材</span>
            </div>
            <div className="course-materials-grid">
              {materials.map((material, index) => (
                <article className="course-material-card" key={material.id}>
                  <span className="course-material-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{read(material, "title") || `教材 ${index + 1}`}</h3>
                    <p>
                      {entries(material, "lessons").length} 课
                      {read(material, "summary")
                        ? ` · ${read(material, "summary")}`
                        : ""}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {lessons.length ? (
          <section className="course-layout" aria-label="课程课时">
            <nav className="course-lesson-nav" aria-label="课程目录">
              <div className="course-nav-heading">
                <p>LESSONS · 课程目录</p>
                <span>共 {lessons.length} 课</span>
              </div>
              <div className="course-lesson-list">
                {lessons.map((lesson, index) => {
                  const locked = isLocked(lesson);
                  const active = lesson.id === activeLesson?.id;
                  return (
                    <button
                      className={`course-lesson-button${active ? " is-active" : ""}${locked ? " is-locked" : ""}`}
                      key={lesson.id}
                      onClick={() => {
                        if (locked) setLockedLesson(lesson);
                        else setSelectedLessonId(lesson.id);
                      }}
                      type="button"
                    >
                      <span className="course-lesson-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="course-lesson-copy">
                        <strong>{read(lesson, "title")}</strong>
                        <small>
                          {locked
                            ? "🔒 会员解锁"
                            : read(lesson, "summary") || "开始学习"}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            <article className="course-lesson-content">
              <p className="course-lesson-kicker">
                LESSON{" "}
                {String(
                  lessons.findIndex(
                    (lesson) => lesson.id === activeLesson?.id,
                  ) + 1,
                ).padStart(2, "0")}
              </p>
              <h2>{read(activeLesson, "title")}</h2>
              {read(activeLesson, "summary") && (
                <p className="course-lesson-summary">
                  {read(activeLesson, "summary")}
                </p>
              )}
              {activeLesson && (activeCoursewareBlocks.length ? <PutAsideStyleCourseware blocks={activeCoursewareBlocks} /> : <LessonBody lesson={activeLesson} />)}
            </article>
          </section>
        ) : (
          <p className="course-content-empty">
            这门课程暂时还没有可学习的课时。
          </p>
        )}
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
            <h2 id="upgrade-course-title">{read(lockedLesson, "title")}</h2>
            <span>升级会员即可解锁这节课和后续全部课程。</span>
            <button
              autoFocus
              className="course-upgrade-close"
              onClick={() => setLockedLesson(null)}
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
