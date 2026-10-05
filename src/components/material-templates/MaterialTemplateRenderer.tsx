import { PutAsideStyleCourseware } from "../courseware/PutAsideStyleCourseware";
import { CommuteLessonFlow } from "../commute/CommuteLessonFlow";
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
  if (Array.isArray(rendered))
    return { id: lesson.id, items: rendered } as Entry;
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

function examplesValue(row: Entry): unknown {
  const examples = row.examples;
  if (Array.isArray(examples)) return examples;
  return typeof examples === "string" ? examples.trim() : "";
}

function canSpeak(text: string) {
  return /[A-Za-z]/.test(text);
}

function structuredText(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function dialogueItem(
  sectionCode: string,
  sectionTitle: string,
  entry: Entry,
  values: Entry,
  suffix: string,
) {
  const suffixId = [...suffix].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) % 997,
    0,
  );
  return {
    id: entry.id * 1000 + suffixId,
    section_code: sectionCode,
    section_title: sectionTitle,
    item_title:
      read(entry, "title") ||
      firstText(values, ["title", "term", "pattern", "question", "instruction"]),
    speaker: read(values, "speaker"),
    english_text: firstText(values, [
      "english",
      "term",
      "pattern",
      "question",
      "instruction",
      "text",
    ]),
    chinese_text: firstText(values, [
      "chinese",
      "meaning",
      "question_zh",
      "summary",
    ]),
    pronunciation: firstText(values, ["pronunciation"]),
    explanation: firstText(values, ["explanation", "guidance"]),
    // Structured lessons store each example as { english, chinese }. Keep that
    // shape intact so the study view can render both lines instead of coercing
    // the array into "[object Object]".
    examples: examplesValue(values),
  } satisfies Entry;
}

function legacyDialogueItems(content: Entry | null) {
  const sections = entries(content || { id: 0 }, "sections");
  const byCode = new Map(
    sections.map((section) => [read(section, "section_code"), section]),
  );
  const sectionItems = (code: string) =>
    entries(byCode.get(code) || { id: 0 }, "items");
  const result: Entry[] = [];

  for (const entry of sectionItems("core_vocabulary")) {
    result.push(
      dialogueItem(
        "vocabulary",
        "核心词汇",
        entry,
        objectEntry(entry.payload) || { id: entry.id },
        "vocabulary",
      ),
    );
  }
  for (const entry of sectionItems("situational_dialogues")) {
    const payload = objectEntry(entry.payload) || { id: entry.id };
    const turns = entries(payload, "turns");
    turns.forEach((turn, index) =>
      result.push(
        dialogueItem("dialogue", "情景对话", entry, turn, `dialogue-${index}`),
      ),
    );
  }
  const speakingPracticeItems = sectionItems("speaking_practice");
  const practiceItems = speakingPracticeItems.length
    ? speakingPracticeItems
    : sectionItems("key_sentence_patterns");
  for (const entry of practiceItems) {
    const payload = objectEntry(entry.payload) || { id: entry.id };
    const turns = entries(payload, "turns");
    if (turns.length) {
      turns.forEach((turn, index) =>
        result.push(
          dialogueItem(
            "practice",
            "情景补全对话",
            entry,
            turn,
            `speaking-${index}`,
          ),
        ),
      );
    } else {
      result.push(
        dialogueItem("practice", "情景补全对话", entry, payload, "pattern"),
      );
    }
  }
  for (const entry of sectionItems("mini_exercises")) {
    result.push(
      dialogueItem(
        "discussion",
        "开口讨论",
        entry,
        objectEntry(entry.payload) || { id: entry.id },
        "exercise",
      ),
    );
  }
  for (const entry of sectionItems("useful_tips")) {
    result.push(
      dialogueItem(
        "review",
        "温馨提示",
        entry,
        objectEntry(entry.payload) || { id: entry.id },
        "tip",
      ),
    );
  }
  for (const entry of sectionItems("extended_reading")) {
    result.push(
      dialogueItem(
        "extra",
        "拓展学习",
        entry,
        objectEntry(entry.payload) || { id: entry.id },
        "extra",
      ),
    );
  }
  return result;
}

function StructuredLessonContent({ content }: { content: Entry | null }) {
  const sections = entries(content || { id: 0 }, "sections");
  if (!sections.length)
    return (
      <p className="course-content-empty">这一课暂时没有可展示的学习内容。</p>
    );

  return (
    <section className="material-template-source material-template-structured">
      {sections.map((section, sectionIndex) => {
        const items = entries(section, "items");
        return (
          <section
            className="course-content-row"
            key={
              read(section, "id") ||
              read(section, "section_code") ||
              sectionIndex
            }
          >
            <div className="course-content-title-line">
              <h3>{read(section, "title") || read(section, "title_en")}</h3>
              {read(section, "title_en") &&
                read(section, "title_en") !== read(section, "title") && (
                  <small>{read(section, "title_en")}</small>
                )}
            </div>
            {!items.length ? (
              <p className="course-content-empty">这一部分正在完善。</p>
            ) : (
              items.map((entry, itemIndex) => {
                const payload = objectEntry(entry.payload);
                const payloadEntry = payload || { id: entry.id };
                const title =
                  read(entry, "title") ||
                  firstText(payloadEntry, [
                    "term",
                    "pattern",
                    "question",
                    "instruction",
                    "summary",
                  ]);
                const english = firstText(payloadEntry, [
                  "term",
                  "pattern",
                  "english",
                  "question",
                  "text",
                ]);
                const chinese = firstText(payloadEntry, [
                  "meaning",
                  "chinese",
                  "question_zh",
                  "summary",
                ]);
                const explanation = firstText(payloadEntry, [
                  "explanation",
                  "guidance",
                  "instruction",
                  "memory",
                ]);
                const turns = entries(payload || { id: 0 }, "turns");
                const examples = entries(payload || { id: 0 }, "examples");
                const patterns = Array.isArray(payload?.patterns)
                  ? payload.patterns
                  : [];
                return (
                  <article
                    className="course-content-row"
                    key={
                      read(entry, "id") || read(entry, "item_code") || itemIndex
                    }
                  >
                    {title && <h4>{title}</h4>}
                    {english && (
                      <div className="course-content-english-line">
                        <p className="course-content-english" lang="en">
                          {english}
                        </p>
                        {canSpeak(english) && (
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
                    {chinese && (
                      <p className="course-content-chinese">{chinese}</p>
                    )}
                    {explanation && (
                      <p className="course-content-explanation">
                        {explanation}
                      </p>
                    )}
                    {turns.map((turn, turnIndex) => (
                      <div
                        className="course-content-row"
                        key={`${turn.id || turnIndex}-turn`}
                      >
                        <strong>{read(turn, "speaker")}</strong>
                        <p className="course-content-english" lang="en">
                          {read(turn, "english")}
                        </p>
                        <p className="course-content-chinese">
                          {read(turn, "chinese")}
                        </p>
                      </div>
                    ))}
                    {examples.map((example, exampleIndex) => (
                      <div
                        className="course-content-row"
                        key={`${example.id || exampleIndex}-example`}
                      >
                        <p className="course-content-english" lang="en">
                          {firstText(example, ["english", "en"])}
                        </p>
                        <p className="course-content-chinese">
                          {firstText(example, ["chinese", "cn"])}
                        </p>
                      </div>
                    ))}
                    {patterns.map((pattern, patternIndex) => {
                      const text = structuredText(pattern);
                      return text ? (
                        <p
                          className="course-content-english"
                          key={`${text}-${patternIndex}`}
                          lang="en"
                        >
                          {text}
                        </p>
                      ) : null;
                    })}
                  </article>
                );
              })
            )}
          </section>
        );
      })}
    </section>
  );
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
    return (
      <p className="course-content-empty">这一课暂时没有可展示的学习内容。</p>
    );

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

  const template = resolveMaterialTemplate(
    lesson?.template ? lesson : material,
  );
  const content = contentOf(lesson);
  const renderPayload = objectEntry(lesson.render_payload);
  if (read(renderPayload, "content_kind") === "structured") {
    if (template.code === "commute")
      return <CommuteLessonFlow embedded lesson={lesson} />;
    if (template.code === "dialogue") {
      const items = legacyDialogueItems(content);
      return items.length ? (
        <DialogueLessonContent items={items} />
      ) : (
        <p className="course-content-empty">这节对话还没有可展示的内容。</p>
      );
    }
    return <StructuredLessonContent content={content} />;
  }
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
