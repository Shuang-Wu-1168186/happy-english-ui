import { Link, useSearchParams } from "react-router-dom";
import { entries, value } from "../../lib/api";
import type { Entry } from "../../lib/api";
import { useStudyItem } from "../../lib/study";
import { Speak } from "./Speech";
const avatars: Record<string, string> = {
  baobao: "baobao",
  maomao: "maomao",
  yangyang: "yangyang",
  "ms wang": "ms-wang",
  lingling: "lingling",
  guoguo: "guoguo",
  mike: "mike",
  sara: "sara",
};
function Article({ lesson }: { lesson: Entry }) {
  const detail = useStudyItem("textbook", lesson.id);
  const blocks: {
    speaker: string;
    sentences: { item: Entry; text: string }[];
  }[] = [];
  entries(detail?.item || lesson, "sentences").forEach((item) => {
    const source = value(item, "english_text").trim(),
      colon = source.indexOf(":");
    const speaker = colon >= 0 ? source.slice(0, colon).trim() : "",
      text = colon >= 0 ? source.slice(colon + 1).trim() : source;
    if (blocks.at(-1)?.speaker !== speaker)
      blocks.push({ speaker, sentences: [] });
    blocks.at(-1)!.sentences.push({ item, text });
  });
  return (
    <>
      <section className="lesson-heading">
        <p>
          {value(lesson, "unit_name")} · {value(lesson, "lesson_name")}
        </p>
        <h2>{value(lesson, "title")}</h2>
        {value(lesson, "title_cn") && (
          <strong>{value(lesson, "title_cn")}</strong>
        )}
        {value(lesson, "summary") && <div>{value(lesson, "summary")}</div>}
      </section>
      <article
        className="lesson-article"
        aria-label={`${value(lesson, "title")} 中英对照课文`}
      >
        {detail?.error && <p role="alert">{detail.error}</p>}
        {!detail && <p className="textbook-empty">正在加载…</p>}
        {blocks.map((block, i) => (
          <section
            key={i}
            className={`speech-block ${block.speaker ? "has-speaker" : "narration-block"}`}
            data-speaker={block.speaker.toLowerCase() || "narration"}
          >
            {block.speaker && (
              <div className="speaker-heading">
                <span
                  className={`speaker-avatar${avatars[block.speaker.toLowerCase()] ? ` speaker-avatar-${avatars[block.speaker.toLowerCase()]}` : ""}`}
                  aria-hidden="true"
                />
                <h3>{block.speaker}</h3>
              </div>
            )}
            <div className="speech-content">
              {block.sentences.map(({ item, text }, j) => (
                <div className="article-sentence" key={item.id || j}>
                  <div className="article-english-row">
                    <p lang="en">{text}</p>
                    <Speak
                      className="sentence-audio"
                      text={text}
                      label={`播放 ${block.speaker} 的英文句子`}
                    />
                  </div>
                  <p className="sentence-chinese">
                    {value(item, "chinese_text")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
        {detail?.item && !blocks.length && (
          <p className="textbook-empty">这篇课文还没有录入句子。</p>
        )}
      </article>
    </>
  );
}
export function Textbook({
  items,
  initialId,
}: {
  items: Entry[];
  initialId?: number;
}) {
  const [params, setParams] = useSearchParams();
  const units = [...new Set(items.map((i) => value(i, "unit_name")))];
  const initial = items.find((i) => i.id === initialId);
  const unit =
    params.get("unit") || value(initial || items[0] || { id: 0 }, "unit_name");
  const lessons = items.filter((i) => value(i, "unit_name") === unit);
  const lesson =
    lessons.find(
      (i) => i.id === (Number(params.get("lesson_id")) || initialId),
    ) || lessons[0];
  return (
    <div className="study-textbook">
      <main className="textbook-page">
        <header className="textbook-topbar">
          <Link to="/" aria-label="返回学习主页">
            ←
          </Link>
          <strong>Happy English · Textbook</strong>
          <span />
        </header>
        <section className="textbook-hero">
          <p>ENGLISH TEXTBOOK</p>
          <h1>英语教材课文</h1>
          <div>逐句阅读 · 中英对照 · 点击听读</div>
        </section>
        <section className="textbook-panel">
          <div className="filter-section">
            <div className="filter-heading">
              <span>UNIT</span>
              <small>选择单元</small>
            </div>
            <div className="filter-list" role="tablist" aria-label="教材单元">
              {units.map((u) => (
                <a
                  key={u}
                  className={`filter-chip${u === unit ? " active" : ""}`}
                  href={`?unit=${encodeURIComponent(u)}`}
                  role="tab"
                  aria-selected={u === unit}
                  onClick={(e) => {
                    e.preventDefault();
                    setParams({ unit: u });
                  }}
                >
                  {u}{" "}
                  <b>
                    {items.filter((i) => value(i, "unit_name") === u).length}
                  </b>
                </a>
              ))}
            </div>
          </div>
          {lessons.length > 0 && (
            <div className="filter-section lesson-filter">
              <div className="filter-heading">
                <span>LESSON</span>
                <small>选择课文</small>
              </div>
              <div className="filter-list" role="tablist" aria-label="教材课文">
                {lessons.map((l) => (
                  <a
                    key={l.id}
                    className={`filter-chip${l.id === lesson?.id ? " active" : ""}`}
                    href={`?unit=${encodeURIComponent(unit)}&lesson_id=${l.id}`}
                    role="tab"
                    aria-selected={l.id === lesson?.id}
                    onClick={(e) => {
                      e.preventDefault();
                      setParams({ unit, lesson_id: String(l.id) });
                    }}
                  >
                    {value(l, "lesson_name")}
                    {l.title ? ` · ${value(l, "title")}` : ""}
                  </a>
                ))}
              </div>
            </div>
          )}
          {lesson ? (
            <Article key={lesson.id} lesson={lesson} />
          ) : (
            <p className="textbook-empty">尚未录入教材课文。</p>
          )}
        </section>
      </main>
    </div>
  );
}
