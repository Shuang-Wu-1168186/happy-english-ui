import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import {
  CommuteCourseClassroom,
  CommuteCourseLoading,
} from "./CommuteCourseClassroom";
import { OriginalCourseClassroom } from "./OriginalCourseClassroom";
import { HomeNavigation } from "../components/Layout";
import { MaterialTemplateRenderer } from "../components/material-templates/MaterialTemplateRenderer";
import { api, entries, value } from "../lib/api";
import type { Entry } from "../lib/api";
import { resolveMaterialTemplate } from "../lib/material-templates";

function read(entry: Entry | null | undefined, key: string) {
  return value(entry, key).trim();
}

function isLocked(lesson: Entry | null | undefined) {
  return lesson?.is_locked === true || lesson?.access_state === "locked";
}

function usesPhonicsLayout(material: Entry | null | undefined) {
  if (!material) return false;
  if (resolveMaterialTemplate(material).code === "phonics") return true;
  const availableLessons = entries(material, "lessons").filter(
    (lesson) => !isLocked(lesson),
  );
  return (
    availableLessons.length > 0 &&
    availableLessons.every((lesson) => read(lesson, "source_resource") === "phonics")
  );
}

export function MaterialLessons() {
  const { materialId = "" } = useParams();
  const id = Number(materialId);
  const [material, setMaterial] = useState<Entry | null>(null);
  const [lessons, setLessons] = useState<Entry[]>([]);
  const [activeLesson, setActiveLesson] = useState<Entry | null>(null);
  const [activeDetail, setActiveDetail] = useState<Entry | null>(null);
  const [lockedLesson, setLockedLesson] = useState<Entry | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMaterial(null);
    setLessons([]);
    setActiveLesson(null);
    setActiveDetail(null);
    setLockedLesson(null);
    setLessonLoading(false);
    setError("");
    if (!Number.isInteger(id) || id < 1) {
      setError("教材地址无效。");
      return;
    }
    let active = true;
    async function loadMaterial() {
      try {
        const summary = await api<Entry>(`/learning/materials/${id}`);
        const isPhonics = usesPhonicsLayout(summary);
        const result = isPhonics
          ? await api<Entry>(
              `/learning/materials/${id}?include_lesson_content=true`,
            )
          : summary;
        if (!active) return;
        const nextLessons = entries(result, "lessons");
        const initialLesson =
          nextLessons.find((lesson) => !isLocked(lesson)) || null;
        setMaterial(result);
        setLessons(nextLessons);
        setActiveLesson(initialLesson);
        setActiveDetail(isPhonics ? initialLesson : null);
      } catch (requestError) {
        if (active) setError((requestError as Error).message);
      }
    }
    void loadMaterial();
    return () => {
      active = false;
    };
  }, [id]);

  async function loadLesson(lesson: Entry) {
    if (!material || lessonLoading) return;
    const previousLesson = activeLesson;
    setActiveLesson(lesson);
    setLessonLoading(true);
    setError("");
    try {
      const detail = await api<Entry>(
        `/learning/materials/${material.id}/lessons/${lesson.id}`,
      );
      if (isLocked(detail)) {
        setLockedLesson(lesson);
      } else {
        setActiveDetail(detail);
      }
    } catch (reason) {
      setActiveDetail(null);
      const message = (reason as Error).message;
      if (isLocked(lesson) || message.includes("需要会员解锁")) {
        setActiveLesson(previousLesson);
        setLockedLesson(lesson);
      } else {
        setActiveDetail(null);
        setError(message);
      }
    } finally {
      setLessonLoading(false);
    }
  }

  useEffect(() => {
    const firstAvailable = lessons.find((lesson) => !isLocked(lesson));
    if (
      material &&
      firstAvailable &&
      !usesPhonicsLayout(material)
    )
      void loadLesson(firstAvailable);
    // The initial lesson is loaded once after the material metadata arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material, lessons]);

  const activeTemplate = resolveMaterialTemplate(activeDetail || material);
  const isPreview = material?.access_state === "preview";
  const previewCount = Number(material?.preview_lesson_count || 2);
  const hasLockedLessons = lessons.some((lesson) => isLocked(lesson));
  const firstAvailableLesson = lessons.find((lesson) => !isLocked(lesson));

  if (
    !error &&
    material &&
    firstAvailableLesson &&
    activeTemplate.code === "commute"
  ) {
    if (!activeDetail) return <CommuteCourseLoading course={material} />;
    return (
      <CommuteCourseClassroom
        activeLesson={activeDetail}
        course={material}
        isPreview={isPreview}
        lessons={lessons}
        lockedLesson={lockedLesson}
        onCloseUpgrade={() => setLockedLesson(null)}
        onLockLesson={setLockedLesson}
        onSelectLesson={(lesson) => void loadLesson(lesson)}
        previewCount={previewCount}
      />
    );
  }

  if (!error && material && activeDetail && usesPhonicsLayout(material))
    return (
      <OriginalCourseClassroom
        activeLesson={activeDetail}
        course={material}
        isPreview={isPreview}
        lessons={lessons}
        lockedLesson={lockedLesson}
        onCloseUpgrade={() => setLockedLesson(null)}
        onLockLesson={setLockedLesson}
        onSelectLesson={(lesson) => void loadLesson(lesson)}
        previewCount={previewCount}
        resource="phonics"
      />
    );

  return (
    <div className="study-home material-lessons-page">
      <HomeNavigation />
      <main className="container material-lessons-main">
        <BackButton className="course-back" />
        {error ? (
          <p className="course-catalog-message" role="alert">
            {error}
          </p>
        ) : !material ? (
          <p className="course-catalog-message" role="status">
            正在读取教材…
          </p>
        ) : (
          <>
            <section className="material-lessons-hero">
              <p>LEARNING MATERIAL</p>
              <h1>{read(material, "title") || "教材"}</h1>
              <span>
                {read(material, "summary") ||
                  `${lessons.length} 个词条，按教材顺序学习。`}
              </span>
              {isPreview && (
                <aside className="course-preview-badge">
                  <strong>前 {previewCount} 节课可预览</strong>
                  <span>后续课程需要会员解锁</span>
                </aside>
              )}
            </section>
            <section
              className="material-learning-space"
              aria-label="教材学习空间"
            >
              <nav className="course-lesson-nav" aria-label="词条目录">
                <div className="course-nav-heading">
                  <p>ENTRIES · 词条目录</p>
                  <span>共 {lessons.length} 条</span>
                </div>
                <div className="course-lesson-list">
                  {lessons.map((lesson, index) => {
                    const selected = lesson.id === activeLesson?.id;
                    const locked = isLocked(lesson);
                    return (
                      <button
                        className={`course-lesson-button${selected ? " is-active" : ""}${locked ? " is-locked" : ""}`}
                        disabled={lessonLoading}
                        key={lesson.id}
                        onClick={() => void loadLesson(lesson)}
                        type="button"
                      >
                        <span className="course-lesson-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="course-lesson-copy">
                          <strong>
                            {read(lesson, "title_en") ||
                              read(lesson, "title") ||
                              `词条 ${index + 1}`}
                          </strong>
                          <small>
                            {locked
                              ? "🔒 会员解锁"
                              : read(lesson, "summary") || "查看课件"}
                          </small>
                        </span>
                        {locked && (
                          <span
                            aria-label="需要会员解锁"
                            className="course-lesson-lock"
                            title="需要会员解锁"
                          >
                            🔒
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </nav>
              <article
                className={`material-learning-content${activeTemplate.code === "dialogue" ? " study-dialogue" : ""}`}
              >
                {lessonLoading && !activeDetail ? (
                  <p className="course-content-empty">正在打开词条课件…</p>
                ) : (
                  activeDetail ? (
                    <MaterialTemplateRenderer
                      lesson={activeDetail}
                      material={material}
                    />
                  ) : (
                    <p className="course-content-empty">
                      {activeLesson
                        ? "该词条暂时没有可展示的课件。"
                        : hasLockedLessons
                          ? "该教材需要会员解锁后才能学习。"
                          : "该教材暂时没有词条。"}
                    </p>
                  )
                )}
              </article>
            </section>
          </>
        )}
      </main>
      {lockedLesson && (
        <div className="course-upgrade-backdrop" role="presentation">
          <section
            aria-labelledby="upgrade-material-title"
            className="course-upgrade-dialog"
            role="dialog"
            aria-modal="true"
          >
            <span aria-hidden="true" className="course-upgrade-icon">
              🔒
            </span>
            <p>会员课程</p>
            <h2 id="upgrade-material-title">
              {read(lockedLesson, "title") ||
                read(lockedLesson, "title_en") ||
                "这节课"}
            </h2>
            <span>前两节课可预览，升级会员即可解锁后续课程。</span>
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
