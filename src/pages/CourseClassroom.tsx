import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { HomeNavigation } from "../components/Layout";
import { PrivateZoneFavorite } from "../components/PrivateZoneFavorite";
import { Speak } from "../components/study/Speech";
import { api, asset, entries, value } from "../lib/api";
import type { Entry } from "../lib/api";
import { DialogueCourseClassroom } from "./DialogueCourseClassroom";
import { CommuteCourseClassroom } from "./CommuteCourseClassroom";
import { InterviewCourseClassroom } from "./InterviewCourseClassroom";
import { OriginalCourseClassroom } from "./OriginalCourseClassroom";
import { PutAsideStyleCourseware } from "../components/courseware/PutAsideStyleCourseware";
import { MaterialTemplateRenderer } from "../components/material-templates/MaterialTemplateRenderer";
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
  const renderPayload = lesson?.render_payload;
  if (renderPayload && typeof renderPayload === "object" && !Array.isArray(renderPayload)) {
    const rendered = (renderPayload as Entry).content;
    if (Array.isArray(rendered))
      return { id: Number(lesson?.id || 0), items: rendered };
    if (rendered && typeof rendered === "object") return rendered as Entry;
  }
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

function sourceUnitFor(lesson: Entry): number | null {
  const content = contentFor(lesson);
  const source = objectEntry(content?.source);
  const sourceUnit = read(source, "source_unit");
  if (!sourceUnit) return null;
  const originalUnit = Number(sourceUnit);
  return Number.isInteger(originalUnit) && originalUnit >= 0
    ? originalUnit
    : null;
}

function sourcePageKindFor(lesson: Entry) {
  const content = contentFor(lesson);
  return read(objectEntry(content?.source), "page_kind");
}

function isVocabularyPage(lesson: Entry) {
  return ["story-words", "word-list"].includes(sourcePageKindFor(lesson));
}

function isWordlyWiseLesson(lesson: Entry) {
  const content = contentFor(lesson);
  const source = objectEntry(content?.source);
  return /wordly\s+wise\s+3000/i.test(
    `${read(source, "document")} ${read(lesson, "title_en")}`,
  );
}

function coursewareBlocks(lesson: Entry | undefined) {
  return entries(lesson || { id: 0 }, "courseware_blocks").filter(
    (block) => read(block, "block_type") && Object.keys(objectEntry(block.payload)).length,
  );
}

type ContentRowDetails = {
  title: string;
  english: string;
  chinese: string;
  example: string;
  sourceText: string;
  partOfSpeech: string;
  wordFamily: string;
  wordForms: string;
  explanation: string;
};

function contentRowDetails(row: Entry): ContentRowDetails {
  return {
    title: firstText(row, [
      "item_title",
      "title",
      "question",
      "term",
      "word",
      "pattern_text",
      "section_title",
      "label",
    ]),
    english: firstText(row, ["english_text", "en", "english", "text"]),
    chinese: firstText(row, [
      "chinese_text",
      "cn",
      "chinese_meaning",
      "translation",
      "answer",
      "summary",
    ]),
    example: firstText(row, ["example_sentence", "example", "sentence"]),
    sourceText: read(row, "source_text"),
    partOfSpeech: read(row, "part_of_speech"),
    wordFamily: read(row, "word_family"),
    wordForms: read(row, "word_forms"),
    explanation: firstText(row, [
      "explanation",
      "learning_tip",
      "description",
      "key_points",
    ]),
  };
}

function vocabularyNumberFor(title: string) {
  const match = title.match(/^\s*(\d+)\s*[·.]\s*.+?\s*$/);
  return match ? Number(match[1]) : null;
}

function vocabularyWordFor(title: string, english: string) {
  return english || title.replace(/^\s*\d+\s*[·.]\s*/, "");
}

type SourceParagraph = {
  text: string;
  isExample: boolean;
};

function isSourceDefinition(text: string) {
  return (
    /^\d+\.\s/.test(text) ||
    /^(?:[A-Za-z][A-Za-z'-]*\s+){1,4}\d+\.\s/.test(text) ||
    /^(?:(?:[A-Za-z][A-Za-z'-]*\s+){0,3})?(?:n|v|adj|adv|pron|prep|conj|interj)\.(?:\s|,|$)/i.test(
      text,
    )
  );
}

function sourceParagraphsFor(sourceText: string): SourceParagraph[] {
  const paragraphs = sourceText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.map((text, index) => ({
    text,
    isExample:
      !isSourceDefinition(text) &&
      (index === paragraphs.length - 1 || isSourceDefinition(paragraphs[index + 1])),
  }));
}

function WordlyWiseSourceText({
  sourceText,
  word,
}: {
  sourceText: string;
  word: string;
}) {
  return (
    <div className="course-vocabulary-source">
      <span className="course-vocabulary-source-heading">原书释义与例句</span>
      {sourceParagraphsFor(sourceText).map((paragraph, paragraphIndex) => {
        if (paragraph.isExample && canSpeak(paragraph.text))
          return (
            <Speak
              className="course-vocabulary-source-example"
              key={`${word}-source-${paragraphIndex}`}
              label={`朗读 ${word} 的例句`}
              text={paragraph.text}
            >
              <span className="course-vocabulary-source-kind">例句</span>
              <span className="course-vocabulary-source-example-text">
                {paragraph.text}
              </span>
              <span
                aria-hidden="true"
                className="course-vocabulary-source-example-icon"
              >
                🔊
              </span>
            </Speak>
          );

        return (
          <div
            className="course-vocabulary-source-definition"
            key={`${word}-source-${paragraphIndex}`}
            lang="en"
          >
            <span className="course-vocabulary-source-kind">释义</span>
            <p>{paragraph.text}</p>
          </div>
        );
      })}
    </div>
  );
}

function CourseContentRow({ row, index }: { row: Entry; index: number }) {
  const { title, english, chinese, example, explanation } = contentRowDetails(row);
  return (
    <article className="course-content-row" key={`${row.id || title || "row"}-${index}`}>
      {title && (
        <div className="course-content-title-line">
          <h3>{title}</h3>
          {canSpeak(title) && !english && (
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
      {example && <p className="course-content-example">例句：{example}</p>}
      {explanation && <p className="course-content-explanation">{explanation}</p>}
      {!title && !english && !chinese && !example && !explanation && (
        <p className="course-content-empty">本课内容已准备好。</p>
      )}
    </article>
  );
}

function VocabularyWordGrid({
  rows,
  wordlyWise,
}: {
  rows: Array<{ row: Entry; index: number }>;
  wordlyWise: boolean;
}) {
  return (
    <section
      className={`course-vocabulary${wordlyWise ? " course-vocabulary--wordly-wise" : ""}`}
      aria-label="本课单词列表"
    >
      <div className="course-vocabulary-heading">
        <div>
          <p>WORD BANK · 词汇卡</p>
          <h3>本课单词</h3>
        </div>
        <span className="course-vocabulary-count">{rows.length} 个单词</span>
      </div>
      <div className="course-vocabulary-grid">
        {rows.map(({ row, index }) => {
          const {
            title,
            english,
            chinese,
            example,
            sourceText,
            partOfSpeech,
            wordFamily,
            wordForms,
          } = contentRowDetails(row);
          const number = vocabularyNumberFor(title);
          const word = vocabularyWordFor(title, english);
          const colorTheme = ((number || index + 1) - 1) % 4;
          return (
            <article
              className={`course-vocabulary-card${
                wordlyWise ? ` course-vocabulary-card--theme-${colorTheme}` : ""
              }`}
              key={`${row.id || word || "word"}-${index}`}
            >
              <span className="course-vocabulary-number">
                {String(number || index + 1).padStart(2, "0")}
              </span>
              <div className="course-vocabulary-copy">
                <div className="course-vocabulary-word-line">
                  <h4 lang="en">{word}</h4>
                  {canSpeak(word) && (
                    <Speak
                      className="course-vocabulary-listen"
                      label={`朗读 ${word}`}
                      text={word}
                    >
                      🔊
                    </Speak>
                  )}
                </div>
                {sourceText ? (
                  wordlyWise ? (
                    <WordlyWiseSourceText sourceText={sourceText} word={word} />
                  ) : (
                    <div className="course-vocabulary-source">
                      <span>原书释义与例句</span>
                      {sourceText.split(/\n{2,}/).map((paragraph, paragraphIndex) => (
                        <p key={`${word}-source-${paragraphIndex}`} lang="en">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )
                ) : (
                  <>
                    {partOfSpeech && (
                      <span className="course-vocabulary-part-of-speech">
                        词性 · {partOfSpeech}
                      </span>
                    )}
                    {chinese && <p className="course-vocabulary-meaning">{chinese}</p>}
                    {(wordFamily || wordForms) && (
                      <div className="course-vocabulary-study">
                        {wordFamily && (
                          <div className="course-vocabulary-study-row">
                            <span title="Word family">词族</span>
                            <p>{wordFamily}</p>
                          </div>
                        )}
                        {wordForms && (
                          <div className="course-vocabulary-study-row">
                            <span title="Word forms">变形</span>
                            <p>{wordForms}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {example && (
                      <div className="course-vocabulary-example" lang="en">
                        <span>例句</span>
                        {wordlyWise && canSpeak(example) ? (
                          <Speak
                            className="course-vocabulary-example-listen"
                            label={`朗读 ${word} 的例句`}
                            text={example}
                          >
                            <span>{example}</span>
                            <span aria-hidden="true">🔊</span>
                          </Speak>
                        ) : (
                          example
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function LessonBody({
  lesson,
  wordlyWise = false,
}: {
  lesson: Entry;
  wordlyWise?: boolean;
}) {
  const content = contentFor(lesson);
  if (!content)
    return (
      <p className="course-content-empty">这一课暂时没有可展示的学习内容。</p>
    );

  const rows = contentItems(content);
  const vocabularyRows =
    isVocabularyPage(lesson)
      ? rows
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => vocabularyNumberFor(contentRowDetails(row).title) !== null)
      : [];

  if (!vocabularyRows.length)
    return (
      <div className="course-content-rows">
        {rows.map((row, index) => (
          <CourseContentRow index={index} key={`${row.id || "row"}-${index}`} row={row} />
        ))}
      </div>
    );

  const firstVocabularyIndex = vocabularyRows[0].index;
  const lastVocabularyIndex = vocabularyRows[vocabularyRows.length - 1].index;
  const rowsBefore = rows.slice(0, firstVocabularyIndex);
  const rowsAfter = rows.slice(lastVocabularyIndex + 1);
  const rowsBetween = rows
    .slice(firstVocabularyIndex, lastVocabularyIndex + 1)
    .filter((row) => vocabularyNumberFor(contentRowDetails(row).title) === null);

  return (
    <div className="course-content-rows">
      {rowsBefore.map((row, index) => (
        <CourseContentRow index={index} key={`${row.id || "row"}-${index}`} row={row} />
      ))}
      <VocabularyWordGrid
        rows={vocabularyRows}
        wordlyWise={wordlyWise || isWordlyWiseLesson(lesson)}
      />
      {rowsBetween.map((row, index) => (
        <CourseContentRow
          index={firstVocabularyIndex + index}
          key={`${row.id || "row"}-${firstVocabularyIndex + index}`}
          row={row}
        />
      ))}
      {rowsAfter.map((row, index) => (
        <CourseContentRow
          index={lastVocabularyIndex + 1 + index}
          key={`${row.id || "row"}-${lastVocabularyIndex + 1 + index}`}
          row={row}
        />
      ))}
    </div>
  );
}

function LessonIllustration({ lesson }: { lesson: Entry }) {
  const url = read(lesson, "illustration_url");
  if (!url) return null;
  const title = read(lesson, "title") || read(lesson, "title_en") || "本课";
  return (
    <figure className="course-lesson-illustration">
      <img alt={`${title} 的原页教材`} src={asset(url)} />
      <figcaption>本课原页教材</figcaption>
    </figure>
  );
}

export function CourseClassroom() {
  const { courseId = "" } = useParams();
  const id = Number(courseId);
  const [course, setCourse] = useState<Entry | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedOriginalUnit, setSelectedOriginalUnit] = useState<number | "all">(
    "all",
  );
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
  const originalUnits = useMemo(
    () =>
      [...new Set(lessons.map(sourceUnitFor).filter((unit): unit is number => (unit || 0) > 0))]
        .sort((left, right) => left - right),
    [lessons],
  );
  const hasAppendix = useMemo(
    () => lessons.some((lesson) => sourceUnitFor(lesson) === 0),
    [lessons],
  );
  const visibleLessons = useMemo(
    () =>
      selectedOriginalUnit === "all"
        ? lessons
        : lessons.filter(
            (lesson) => sourceUnitFor(lesson) === selectedOriginalUnit,
          ),
    [lessons, selectedOriginalUnit],
  );
  const activeLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) || lessons[0];
  const previewCount = Number(course?.preview_lesson_count || 0);
  const isPreview = course?.access_state === "preview";
  const activeTemplate = resolveMaterialTemplate(activeLesson);
  const activeStructuredLesson =
    read(objectEntry(activeLesson?.render_payload), "content_kind") ===
    "structured";
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

  if (activeLesson && activeTemplate.code === "commute")
    return (
      <>
        <CommuteCourseClassroom
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
        <PrivateZoneFavorite resourceId={Number(course.id)} resourceType="course" />
      </>
    );

  if (
    activeLesson &&
    activeTemplate.code === "dialogue" &&
    activeDialogueItems.length
  )
    return (
      <>
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
        <PrivateZoneFavorite resourceId={Number(course.id)} resourceType="course" />
      </>
    );

  if (activeLesson && activeInterviewLesson)
    return (
      <>
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
        <PrivateZoneFavorite resourceId={Number(course.id)} resourceType="course" />
      </>
    );

  if (activeLesson && activeOriginalCourseResource)
    return (
      <>
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
        <PrivateZoneFavorite resourceId={Number(course.id)} resourceType="course" />
      </>
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
                <span>
                  {selectedOriginalUnit === "all"
                    ? `共 ${lessons.length} 课`
                    : `${visibleLessons.length} / ${lessons.length} 课`}
                </span>
              </div>
              {originalUnits.length > 0 && (
                <div className="course-unit-filter" aria-label="按原书单元筛选">
                  <button
                    className={
                      selectedOriginalUnit === "all" ? "is-active" : ""
                    }
                    onClick={() => {
                      setSelectedOriginalUnit("all");
                      const first = lessons[0];
                      if (first) setSelectedLessonId(first.id);
                    }}
                    type="button"
                  >
                    全部
                  </button>
                  {originalUnits.map((unit) => (
                    <button
                      className={
                        selectedOriginalUnit === unit ? "is-active" : ""
                      }
                      key={unit}
                      onClick={() => {
                        setSelectedOriginalUnit(unit);
                        const first = lessons.find(
                          (lesson) => sourceUnitFor(lesson) === unit,
                        );
                        if (first) setSelectedLessonId(first.id);
                      }}
                      type="button"
                    >
                      Unit {unit}
                    </button>
                  ))}
                  {hasAppendix && (
                    <button
                      className={selectedOriginalUnit === 0 ? "is-active" : ""}
                      onClick={() => {
                        setSelectedOriginalUnit(0);
                        const first = lessons.find(
                          (lesson) => sourceUnitFor(lesson) === 0,
                        );
                        if (first) setSelectedLessonId(first.id);
                      }}
                      type="button"
                    >
                      附录
                    </button>
                  )}
                </div>
              )}
              <div className="course-lesson-list">
                {visibleLessons.map((lesson) => {
                  const locked = isLocked(lesson);
                  const active = lesson.id === activeLesson?.id;
                  const lessonSummary = read(lesson, "summary");
                  const lessonIndex = lessons.findIndex(
                    (candidate) => candidate.id === lesson.id,
                  );
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
                        {String(lessonIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="course-lesson-copy">
                        <strong>{read(lesson, "title")}</strong>
                        {(locked || lessonSummary) && (
                          <small>
                            {locked ? "🔒 会员解锁" : lessonSummary}
                          </small>
                        )}
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
              <LessonIllustration lesson={activeLesson} />
              {activeLesson &&
                (activeTemplate.code === "mind-map" || activeStructuredLesson ? (
                  <MaterialTemplateRenderer lesson={activeLesson} />
                ) : activeCoursewareBlocks.length ? (
                  <PutAsideStyleCourseware blocks={activeCoursewareBlocks} />
                ) : (
                  <LessonBody lesson={activeLesson} />
                ))}
            </article>
          </section>
        ) : (
          <p className="course-content-empty">
            这门课程暂时还没有可学习的课时。
          </p>
        )}
      </main>

      <PrivateZoneFavorite resourceId={Number(course.id)} resourceType="course" />

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
