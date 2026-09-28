import {
  ArrowRight,
  Check,
  ChevronLeft,
  Ellipsis,
  Volume2,
} from "lucide-react";
import { Speak } from "../components/study/Speech";
import { putAsideCourseware as putAside } from "../lib/put-aside-courseware";

function MiniSentence({
  english,
  chinese,
}: {
  english: string;
  chinese: string;
}) {
  return (
    <div className="mini-course-sentence">
      <div className="mini-course-sentence-en">
        <p lang="en">{english}</p>
        <Speak
          className="mini-course-speak"
          label={`朗读：${english}`}
          text={english}
        >
          <Volume2 aria-hidden="true" size={15} strokeWidth={2.4} />
        </Speak>
      </div>
      <span>{chinese}</span>
    </div>
  );
}

const blockMap = [
  ["hero", "核心短语与记忆画面"],
  ["usage_group", "三种用法"],
  ["dialogue", "工作场景对话"],
  ["comparison", "易混表达"],
  ["output", "开口练习"],
  ["recap", "一句回顾"],
] as const;

export function PutAsideMiniProgramPreview() {
  return (
    <section
      className="mini-course-preview"
      aria-labelledby="mini-course-preview-title"
    >
      <header className="mini-course-preview-heading">
        <div>
          <p>小程序静态样稿 · 单栏课件</p>
          <h1 id="mini-course-preview-title">把一节课收进手机的一屏体验</h1>
          <span>
            按课件区块的学习顺序呈现，把笔记中的释义、例句和情景对话变成连续的移动端阅读体验。
          </span>
        </div>
        <span className="mini-course-preview-size">390 × 844</span>
      </header>

      <div className="mini-course-preview-stage">
        <aside className="mini-course-preview-guide" aria-label="课件区块说明">
          <div>
            <p>COURSEWARE BLOCKS</p>
            <h2>一节课的移动端顺序</h2>
            <span>
              页面沿用 <code>courseware_block</code> 的六类区块；在手机上按单栏连续阅读。
            </span>
          </div>
          <ol>
            {blockMap.map(([code, label], index) => (
              <li key={code}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{label}</strong>
                  <code>{code}</code>
                </div>
              </li>
            ))}
          </ol>
          <p className="mini-course-preview-source">
            文本来源：<strong>english_note_item #1514</strong>
          </p>
        </aside>

        <article className="mini-course-phone" aria-label="put aside 小程序课件预览">
          <header className="mini-course-nav">
            <button aria-label="返回上一页" type="button">
              <ChevronLeft aria-hidden="true" size={23} strokeWidth={2.25} />
            </button>
            <div>
              <p>短语课</p>
              <strong>put aside</strong>
            </div>
            <button aria-label="更多操作" type="button">
              <Ellipsis aria-hidden="true" size={22} strokeWidth={2.25} />
            </button>
          </header>

          <div className="mini-course-scroll">
            <section className="mini-course-hero" aria-labelledby="mini-put-aside-title">
              <div className="mini-course-progress-row">
                <span>LESSON 01</span>
                <b>01 / 01</b>
              </div>
              <div
                aria-label="本节学习进度"
                aria-valuemax={1}
                aria-valuemin={0}
                aria-valuenow={1}
                className="mini-course-progress"
                role="progressbar"
              >
                <span />
              </div>
              <p className="mini-course-kicker">今日短语</p>
              <div className="mini-course-phrase-row">
                <h2 id="mini-put-aside-title">{putAside.phrase}</h2>
                <Speak
                  className="mini-course-hero-speak"
                  label={`朗读：${putAside.phrase}`}
                  text={putAside.phrase}
                >
                  <Volume2 aria-hidden="true" size={18} strokeWidth={2.4} />
                </Speak>
              </div>
              <strong className="mini-course-meaning">{putAside.meaning}</strong>
              <div className="mini-course-memory">
                <span>从一个画面记住</span>
                <strong>{putAside.memory}</strong>
                <b aria-hidden="true">📄 → ➡️ → 📚</b>
              </div>
              <div className="mini-course-key-sentence">
                <p>先记住这一句</p>
                <MiniSentence {...putAside.keySentence} />
              </div>
            </section>

            <nav className="mini-course-path" aria-label="课件学习顺序">
              <span>理解</span>
              <span>用法</span>
              <span>场景</span>
              <span>开口</span>
            </nav>

            <section className="mini-course-section" aria-labelledby="mini-course-uses-title">
              <header className="mini-course-section-heading">
                <span>01</span>
                <div>
                  <p>THREE USES</p>
                  <h2 id="mini-course-uses-title">一个画面，三种用法</h2>
                </div>
              </header>
              <p className="mini-course-section-intro">
                先抓住共同感觉，再通过不同对象区分意思。
              </p>
              <div className="mini-course-use-list">
                {putAside.useCases.map((useCase) => (
                  <article
                    className={`mini-course-use-card is-${useCase.tone}`}
                    key={useCase.number}
                  >
                    <div className="mini-course-use-heading">
                      <span>{useCase.number}</span>
                      <div>
                        <h3>{useCase.title}</h3>
                        <p lang="en">{useCase.description}</p>
                      </div>
                    </div>
                    <div className="mini-course-example-list">
                      {useCase.examples.map((example) => (
                        <MiniSentence key={example.english} {...example} />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section
              className="mini-course-section mini-course-dialogue"
              aria-labelledby="mini-course-dialogue-title"
            >
              <header className="mini-course-section-heading">
                <span>02</span>
                <div>
                  <p>SCENE PRACTICE</p>
                  <h2 id="mini-course-dialogue-title">工作 / IT 场景</h2>
                </div>
              </header>
              <p className="mini-course-section-intro">
                把三个意思放进同一个真实对话。
              </p>
              <div className="mini-course-dialogue-list">
                {putAside.dialogue.map((line, index) => (
                  <article
                    className={`mini-course-dialogue-line is-speaker-${index % 2}`}
                    key={line.english}
                  >
                    <span>{line.speaker}</span>
                    <MiniSentence english={line.english} chinese={line.chinese} />
                  </article>
                ))}
              </div>
            </section>

            <section
              className="mini-course-section mini-course-comparison"
              aria-labelledby="mini-course-comparison-title"
            >
              <header className="mini-course-section-heading">
                <span>03</span>
                <div>
                  <p>DON’T MIX THEM UP</p>
                  <h2 id="mini-course-comparison-title">put aside vs set aside</h2>
                </div>
              </header>
              <p className="mini-course-section-intro">两者非常接近。</p>
              <div className="mini-course-comparison-list">
                <article className="mini-course-comparison-card is-put">
                  <div className="mini-course-comparison-heading">
                    <div>
                      <h3>put aside</h3>
                      <span>{putAside.contrast.putAside.label}</span>
                    </div>
                    <strong>{putAside.contrast.putAside.meaning}</strong>
                  </div>
                  <MiniSentence {...putAside.contrast.putAside} />
                </article>
                <article className="mini-course-comparison-card is-set">
                  <div className="mini-course-comparison-heading">
                    <div>
                      <h3>set aside</h3>
                      <span>{putAside.contrast.setAside.label}</span>
                    </div>
                    <strong>{putAside.contrast.setAside.meaning}</strong>
                  </div>
                  <MiniSentence {...putAside.contrast.setAside} />
                </article>
              </div>
            </section>

            <section className="mini-course-output" aria-labelledby="mini-course-output-title">
              <div className="mini-course-output-heading">
                <span>04</span>
                <div>
                  <p>YOUR TURN</p>
                  <h2 id="mini-course-output-title">轮到你开口</h2>
                </div>
              </div>
              <p>把空格替换成自己的内容。</p>
              <div className="mini-course-patterns" lang="en">
                <p>
                  Let’s put aside <i>________</i> and focus on <i>________</i> first.
                </p>
                <p>
                  We should put aside some time to <i>________</i>.
                </p>
                <p>
                  I try to put aside some <i>________</i> every month.
                </p>
              </div>
            </section>

            <footer className="mini-course-recap">
              <span>ONE-LINE RECAP</span>
              <strong>{putAside.recap}</strong>
              <MiniSentence {...putAside.keySentence} />
            </footer>
          </div>

          <footer className="mini-course-bottom-bar">
            <span>
              <Check aria-hidden="true" size={15} strokeWidth={2.8} />
              已理解
            </span>
            <button type="button">
              下一步
              <ArrowRight aria-hidden="true" size={16} strokeWidth={2.5} />
            </button>
          </footer>
        </article>
      </div>
    </section>
  );
}
