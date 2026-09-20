import { Link } from "react-router-dom";
import { asset, value } from "../../lib/api";
import type { Entry } from "../../lib/api";
import { mathVisuals } from "../../lib/math-visuals";
import { FlipBook } from "./FlipBook";
import type { ReactNode } from "react";
function ChainCancellation() {
  return (
    <>
      <div
        className="chain-cancel-formula"
        role="img"
        aria-label="四除以十五乘九除以四乘八除以九，连锁约分后等于八除以十五"
      >
        <span className="chain-fraction">
          <b className="chain-number cancelled-blue">4</b>
          <i />
          <b className="chain-number">15</b>
        </span>
        <b className="chain-operator">×</b>
        <span className="chain-fraction">
          <b className="chain-number cancelled-orange">9</b>
          <i />
          <b className="chain-number cancelled-blue">4</b>
        </span>
        <b className="chain-operator">×</b>
        <span className="chain-fraction">
          <b className="chain-number">8</b>
          <i />
          <b className="chain-number cancelled-orange">9</b>
        </span>
        <b className="chain-equals">=</b>
        <span className="chain-fraction chain-result">
          <b>8</b>
          <i />
          <b>15</b>
        </span>
      </div>
      <p>
        <b>蓝线：</b>第一个分子 4 与后一个分母 4 约去；<b>橙线：</b>9
        与后一个分母 9 约去。最后只留下第一个分母 15 和最后一个分子 8，结果是{" "}
        <Fractions text="8/15" />。
      </p>
    </>
  );
}
function Fractions({ text }: { text: string }) {
  const result: ReactNode[] = [];
  let start = 0;
  for (const match of text.matchAll(/\b(\d+)\/(\d+)\b/g)) {
    result.push(text.slice(start, match.index));
    result.push(
      <span className="math-fraction" key={match.index}>
        <sup>{match[1]}</sup>
        <sub>{match[2]}</sub>
      </span>,
    );
    start = match.index! + match[0].length;
  }
  result.push(text.slice(start));
  return <>{result}</>;
}
export function MathCards({
  items,
  initialId,
}: {
  items: Entry[];
  initialId?: number;
}) {
  return (
    <div className="study-math">
      <main className="math-page">
        <header className="math-topbar">
          <Link to="/" aria-label="返回学习主页">
            ←
          </Link>
          <strong>Happy English · Math</strong>
          <span />
        </header>
        <section className="math-hero">
          <p>VISUAL MATH NOTES</p>
          <h1>数学知识点卡</h1>
          <div>概念 · 方法 · 易错点 · 示例</div>
        </section>
        {items.length ? (
          <FlipBook
            kind="math"
            items={items}
            initial={Math.max(
              0,
              items.findIndex((i) => i.id === initialId),
            )}
            render={(item, i) => (
              <>
                <div className="math-card-title">
                  <span>{i + 1}</span>
                  <div>
                    <small>{value(item, "category")}</small>
                    <h2>{value(item, "title")}</h2>
                  </div>
                </div>
                <p className="math-summary">
                  <Fractions text={value(item, "summary")} />
                </p>
                {mathVisuals[value(item, "title")] ? (
                  <figure className="math-figure math-formula-figure">
                    <span>图解示例</span>
                    {value(item, "title") === "连锁约分" ? (
                      <ChainCancellation />
                    ) : (
                      <>
                        <strong className="math-expression">
                          <Fractions
                            text={mathVisuals[value(item, "title")][0]}
                          />
                        </strong>
                        <p>
                          <Fractions
                            text={mathVisuals[value(item, "title")][1]}
                          />
                        </p>
                      </>
                    )}
                  </figure>
                ) : (
                  value(item, "example_image_url") && (
                    <figure className="math-figure">
                      <img
                        src={asset(value(item, "example_image_url"))}
                        alt={`${value(item, "title")} 示意图`}
                      />
                    </figure>
                  )
                )}
                <div className="math-sections">
                  <section>
                    <h3>核心知识点</h3>
                    <p>
                      <Fractions text={value(item, "key_points")} />
                    </p>
                  </section>
                  <section className="mistakes">
                    <h3>方法与易错点</h3>
                    <p>
                      <Fractions text={value(item, "common_mistakes")} />
                    </p>
                  </section>
                </div>
                <section className="worked-example">
                  <h3>示例</h3>
                  <p>
                    <b>题目：</b>
                    <Fractions text={value(item, "example_question")} />
                  </p>
                  <p>
                    <b>解答：</b>
                    <Fractions text={value(item, "example_answer")} />
                  </p>
                </section>
              </>
            )}
          />
        ) : (
          <p className="math-empty">还没有数学知识点卡。</p>
        )}
      </main>
    </div>
  );
}
