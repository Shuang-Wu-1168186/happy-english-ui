import { PutAsideStyleCourseware } from "../courseware/PutAsideStyleCourseware";
import { DialogueLessonContent } from "../study/Dialogue";
import { Speak } from "../study/Speech";
import { entries, value } from "../../lib/api";
import type { Entry } from "../../lib/api";
import {
  resolveMaterialTemplate,
  type MaterialTemplateDefinition,
} from "../../lib/material-templates";

function objectEntry(input: unknown): Entry | null {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Entry)
    : null;
}

function read(entry: Entry | null | undefined, key: string) {
  return value(entry, key).trim();
}

function contentOf(lesson: Entry) {
  const renderPayload = objectEntry(lesson.render_payload);
  const rendered = renderPayload?.content;
  if (Array.isArray(rendered)) return { id: lesson.id, items: rendered } as Entry;
  const fromRenderPayload = objectEntry(rendered);
  if (fromRenderPayload) return fromRenderPayload;
  const source = objectEntry(lesson.source_content);
  if (source) return source;
  const content = lesson.content;
  if (Array.isArray(content)) return { id: lesson.id, items: content };
  return objectEntry(content);
}

function rowsOf(content: Entry | null) {
  if (!content) return [];
  for (const key of ["items", "sentences", "sections", "examples", "blocks"]) {
    const rows = entries(content, key);
    if (rows.length) return rows;
  }
  return [content];
}

function firstText(row: Entry, fields: string[]) {
  return fields.map((field) => read(row, field)).find(Boolean) || "";
}

function canSpeak(text: string) {
  return /[A-Za-z]/.test(text);
}

function SourceTemplateContent({
  lesson,
  template,
}: {
  lesson: Entry;
  template: MaterialTemplateDefinition;
}) {
  const rows = rowsOf(contentOf(lesson));
  if (!rows.length)
    return <p className="course-content-empty">这一课暂时没有可展示的学习内容。</p>;

  return (
    <section
      className={`material-template-source material-template-${template.code}`}
      aria-label={template.name}
    >
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
          "english",
          "en",
          "text",
          "word",
          "term",
          "pattern_text",
        ]);
        const chinese = firstText(row, [
          "chinese_text",
          "chinese",
          "cn",
          "translation",
          "chinese_meaning",
          "answer",
          "summary",
        ]);
        const explanation = firstText(row, [
          "explanation",
          "learning_tip",
          "description",
          "key_points",
          "note",
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
    </section>
  );
}

export function MaterialTemplateRenderer({
  lesson,
  material,
}: {
  lesson: Entry | null;
  material?: Entry | null;
}) {
  if (!lesson)
    return <p className="course-content-empty">请选择左侧课时开始学习。</p>;

  const template = resolveMaterialTemplate(lesson?.template ? lesson : material);
  const content = contentOf(lesson);
  if (template.code === "put-aside") {
    const blocks = entries(content || { id: 0 }, "blocks");
    return blocks.length ? (
      <PutAsideStyleCourseware blocks={blocks} />
    ) : (
      <p className="course-content-empty">这节课还没有可展示的课件区块。</p>
    );
  }
  if (template.code === "dialogue") {
    const items = entries(content || { id: 0 }, "items");
    return items.length ? (
      <DialogueLessonContent items={items} />
    ) : (
      <p className="course-content-empty">这节对话还没有可展示的内容。</p>
    );
  }
  return <SourceTemplateContent lesson={lesson} template={template} />;
}
