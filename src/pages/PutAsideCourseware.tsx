import { Speak } from "../components/study/Speech";
import { putAsideCourseware as putAside } from "../lib/put-aside-courseware";

function Sentence({
  english,
  chinese,
  className = "",
}: {
  english: string;
  chinese: string;
  className?: string;
}) {
  return (
    <div className={`put-aside-sentence ${className}`}>
      <div className="put-aside-sentence-en">
        <p lang="en">{english}</p>
        <Speak
          className="put-aside-speak"
          label={`朗读：${english}`}
          text={english}
        >
          🔊
        </Speak>
      </div>
      <span>{chinese}</span>
    </div>
  );
}

export function PutAsideCourseware() {
  return (
    <section className="put-aside-courseware" aria-labelledby="put-aside-title">
      <header className="put-aside-page-heading">
        <div>
          <p>静态课件样稿 · 由现有学习笔记编排</p>
          <h1>把一条笔记做成一节可开口的课</h1>
          <span>
            不改变原卡片内容，只把其中的含义、例句、对比和工作场景按学习顺序重组。
          </span>
        </div>
        <span className="put-aside-static-mark">STATIC COURSEWARE</span>
      </header>

      <section className="put-aside-hero">
        <div className="put-aside-hero-copy">
          <p>PHRASE LESSON · 01</p>
          <h2 id="put-aside-title">{putAside.phrase}</h2>
          <strong>{putAside.meaning}</strong>
          <div className="put-aside-memory-line">
            <span>{putAside.memory}</span>
            <b aria-hidden="true">📄 → ➡️ → 📚</b>
          </div>
        </div>
        <aside className="put-aside-key-sentence" aria-label="先记住这一句">
          <p>先记住这一句</p>
          <Sentence
            chinese="这件事我们现在先放一放。"
            english="Let’s put that aside for now."
          />
        </aside>
      </section>

      <nav className="put-aside-learning-path" aria-label="课件学习顺序">
        <span>理解画面</span>
        <b aria-hidden="true">→</b>
        <span>看见用法</span>
        <b aria-hidden="true">→</b>
        <span>进入场景</span>
        <b aria-hidden="true">→</b>
        <span>自己开口</span>
      </nav>

      <section
        className="put-aside-section"
        aria-labelledby="put-aside-uses-title"
      >
        <div className="put-aside-section-heading">
          <p>THREE USES</p>
          <h2 id="put-aside-uses-title">
            一个“放到旁边”的画面，延伸出三种用法
          </h2>
          <span>先抓住共同感觉，再通过不同对象区分意思。</span>
        </div>
        <div className="put-aside-use-grid">
          {putAside.useCases.map((useCase) => (
            <article
              className={`put-aside-use-card is-${useCase.tone}`}
              key={useCase.number}
            >
              <div className="put-aside-use-card-head">
                <span>{useCase.number}</span>
                <p>{useCase.title}</p>
              </div>
              <strong>{useCase.description}</strong>
              <div className="put-aside-example-list">
                {useCase.examples.map((example) => (
                  <Sentence
                    chinese={example.chinese}
                    english={example.english}
                    key={example.english}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="put-aside-dialogue-section"
        aria-labelledby="put-aside-dialogue-title"
      >
        <div className="put-aside-dialogue-intro">
          <p>SCENE PRACTICE</p>
          <h2 id="put-aside-dialogue-title">情景对话：工作 / IT 场景</h2>
          <span>
            把原笔记里的工作 / IT 例句放进同一个对话，让三个意思连续出现。
          </span>
          <div className="put-aside-collocations" aria-label="常见搭配">
            <span>put aside differences</span>
            <span>put aside concerns</span>
            <span>put aside money</span>
            <span>put aside time</span>
          </div>
        </div>
        <div className="put-aside-dialogue-card">
          {putAside.dialogue.map((line, index) => (
            <article
              className={`put-aside-dialogue-line is-speaker-${index % 2}`}
              key={line.english}
            >
              <span>{line.speaker}</span>
              <Sentence chinese={line.chinese} english={line.english} />
            </article>
          ))}
        </div>
      </section>

      <section
        className="put-aside-contrast-section"
        aria-labelledby="put-aside-contrast-title"
      >
        <div className="put-aside-section-heading">
          <p>DON’T MIX THEM UP</p>
          <h2 id="put-aside-contrast-title">put aside vs set aside</h2>
          <span>两者非常接近。</span>
        </div>
        <div className="put-aside-contrast-grid">
          <article className="put-aside-contrast-card is-put">
            <div>
              <h3>put aside</h3>
              <span>{putAside.contrast.putAside.label}</span>
            </div>
            <strong>{putAside.contrast.putAside.meaning}</strong>
            <Sentence
              chinese={putAside.contrast.putAside.chinese}
              english={putAside.contrast.putAside.english}
            />
          </article>
          <article className="put-aside-contrast-card is-set">
            <div>
              <h3>set aside</h3>
              <span>{putAside.contrast.setAside.label}</span>
            </div>
            <strong>{putAside.contrast.setAside.meaning}</strong>
            <Sentence
              chinese={putAside.contrast.setAside.chinese}
              english={putAside.contrast.setAside.english}
            />
          </article>
        </div>
      </section>

      <section
        className="put-aside-output-section"
        aria-labelledby="put-aside-output-title"
      >
        <div>
          <p>YOUR TURN</p>
          <h2 id="put-aside-output-title">轮到你开口</h2>
          <span>把空格替换成自己的内容，就能把这条短语带进真实对话。</span>
        </div>
        <div className="put-aside-patterns">
          <p lang="en">
            Let’s put aside <i>________</i> and focus on <i>________</i> first.
          </p>
          <p lang="en">
            We should put aside some time to <i>________</i>.
          </p>
          <p lang="en">
            I try to put aside some <i>________</i> every month.
          </p>
        </div>
      </section>

      <footer className="put-aside-recap">
        <div>
          <p>ONE-LINE RECAP</p>
          <strong>
            问题放一边 → 暂时不考虑；钱放一边 → 存起来；时间放一边 → 预留出来
          </strong>
        </div>
        <Sentence
          chinese="这件事我们现在先放一放。"
          english="Let’s put that aside for now."
        />
      </footer>
    </section>
  );
}
