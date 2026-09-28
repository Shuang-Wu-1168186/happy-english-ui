import { Speak } from "../study/Speech";
import { entries, value } from "../../lib/api";
import type { Entry } from "../../lib/api";

function data(input: unknown): Entry {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Entry)
    : { id: 0 };
}

function Sentence({ item }: { item: Entry }) {
  const english = value(item, "english");
  return (
    <div className="put-aside-sentence">
      <div className="put-aside-sentence-en">
        <p lang="en">{english}</p>
        {/[A-Za-z]/.test(english) && (
          <Speak className="put-aside-speak" label={`朗读：${english}`} text={english}>
            🔊
          </Speak>
        )}
      </div>
      <span>{value(item, "chinese")}</span>
    </div>
  );
}

export function PutAsideStyleCourseware({
  blocks,
  preview = false,
}: {
  blocks: Entry[];
  preview?: boolean;
}) {
  const block = (type: string) => blocks.find((item) => value(item, "block_type") === type);
  const hero = data(block("hero")?.payload);
  const usage = data(block("usage_group")?.payload);
  const dialogue = data(block("dialogue")?.payload);
  const comparison = data(block("comparison")?.payload);
  const output = data(block("output")?.payload);
  const recap = data(block("recap")?.payload);
  const tones = ["physical", "decision", "reserve"];

  return (
    <section className="put-aside-courseware" aria-label={preview ? "课件预览" : "课件"}>
      <section className="put-aside-hero">
        <div className="put-aside-hero-copy">
          <p>PHRASE LESSON · {preview ? "PREVIEW" : "01"}</p>
          <h2>{value(hero, "phrase")}</h2>
          <strong>{value(hero, "meaning")}</strong>
          <div className="put-aside-memory-line">
            <span>{value(hero, "memory")}</span>
            <b aria-hidden="true">📄 → ➡️ → 📚</b>
          </div>
        </div>
        <aside className="put-aside-key-sentence" aria-label="先记住这一句">
          <p>先记住这一句</p>
          <Sentence item={data(hero.key_sentence)} />
        </aside>
      </section>

      <nav className="put-aside-learning-path" aria-label="课件学习顺序">
        <span>理解画面</span><b aria-hidden="true">→</b><span>看见用法</span>
        <b aria-hidden="true">→</b><span>进入场景</span><b aria-hidden="true">→</b><span>自己开口</span>
      </nav>

      {block("usage_group") && (
        <section className="put-aside-section">
          <div className="put-aside-section-heading">
            <p>THREE USES</p>
            <h2>{value(block("usage_group"), "title") || "一个画面，延伸出三种用法"}</h2>
            <span>{value(usage, "intro") || "先抓住共同感觉，再通过不同对象区分意思。"}</span>
          </div>
          <div className="put-aside-use-grid">
            {entries(usage, "uses").map((use, index) => (
              <article className={`put-aside-use-card is-${tones[index % tones.length]}`} key={`${value(use, "title")}-${index}`}>
                <div className="put-aside-use-card-head"><span>{String(index + 1).padStart(2, "0")}</span><p>{value(use, "title")}</p></div>
                <strong>{value(use, "description")}</strong>
                <div className="put-aside-example-list">
                  {entries(use, "examples").map((example, exampleIndex) => <Sentence item={example} key={`${value(example, "english")}-${exampleIndex}`} />)}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {block("dialogue") && (
        <section className="put-aside-dialogue-section">
          <div className="put-aside-dialogue-intro">
            <p>SCENE PRACTICE</p>
            <h2>{value(block("dialogue"), "title") || `情景对话：${value(dialogue, "scene")}`}</h2>
            <span>{value(dialogue, "intro") || "把不同用法放进同一个情景，连续听见它们。"}</span>
            <div className="put-aside-collocations">
              {entries(dialogue, "collocations").map((item, index) => <span key={`${typeof item === "string" ? item : value(item, "value")}-${index}`}>{typeof item === "string" ? item : value(item, "value")}</span>)}
            </div>
          </div>
          <div className="put-aside-dialogue-card">
            {entries(dialogue, "lines").map((line, index) => <article className={`put-aside-dialogue-line is-speaker-${index % 2}`} key={`${value(line, "english")}-${index}`}><span>{value(line, "speaker")}</span><Sentence item={line} /></article>)}
          </div>
        </section>
      )}

      {block("comparison") && (
        <section className="put-aside-contrast-section">
          <div className="put-aside-section-heading"><p>DON’T MIX THEM UP</p><h2>{value(block("comparison"), "title") || "易混表达"}</h2><span>{value(comparison, "intro") || "通过相近表达，确认这条表达真正的使用边界。"}</span></div>
          <div className="put-aside-contrast-grid">
            {entries(comparison, "items").slice(0, 2).map((item, index) => <article className={`put-aside-contrast-card ${index ? "is-set" : "is-put"}`} key={`${value(item, "expression")}-${index}`}><div><h3>{value(item, "expression")}</h3><span>{value(item, "label")}</span></div><strong>{value(item, "meaning")}</strong><Sentence item={item} /></article>)}
          </div>
        </section>
      )}

      {block("output") && (
        <section className="put-aside-output-section">
          <div><p>YOUR TURN</p><h2>{value(block("output"), "title") || "轮到你开口"}</h2><span>{value(output, "instruction")}</span></div>
          <div className="put-aside-patterns">{entries(output, "patterns").map((pattern, index) => <p lang="en" key={`${typeof pattern === "string" ? pattern : value(pattern, "value")}-${index}`}>{typeof pattern === "string" ? pattern : value(pattern, "value")}</p>)}</div>
        </section>
      )}

      {block("recap") && <footer className="put-aside-recap"><div><p>ONE-LINE RECAP</p><strong>{value(recap, "summary")}</strong></div><Sentence item={data(recap.key_sentence)} /></footer>}
    </section>
  );
}
