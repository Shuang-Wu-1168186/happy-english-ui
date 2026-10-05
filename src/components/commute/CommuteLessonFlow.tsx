import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { entries } from "../../lib/api";
import type { Entry } from "../../lib/api";
import { Speak } from "../study/Speech";

type VocabularyCard = {
  term: string;
  meaning: string;
  explanation: string;
  example: string;
  exampleChinese: string;
};

type QuickReplyPractice = {
  question: string;
  questionChinese: string;
  sentence: string;
  answer: string;
  choices: string[];
  explanation: string;
};

type Props = {
  lesson: Entry;
  embedded?: boolean;
  onComplete?: () => void;
};

function asEntry(input: unknown): Entry | null {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Entry)
    : null;
}

function text(input: unknown) {
  return input == null ? "" : String(input).trim();
}

function payloadOf(item: Entry) {
  return asEntry(item.payload) || item;
}

function lessonContent(lesson: Entry): Entry {
  const renderPayload = asEntry(lesson.render_payload);
  const rendered = asEntry(renderPayload?.content);
  if (rendered) return rendered;
  const content = asEntry(lesson.content);
  if (content) return content;
  return { id: lesson.id, sections: entries(lesson, "sections") };
}

function sectionItems(content: Entry, code: string) {
  const section = entries(content, "sections").find(
    (item) => text(item.section_code) === code,
  );
  return section ? entries(section, "items") : [];
}

function listOfText(input: unknown) {
  return Array.isArray(input)
    ? input.map((item) => text(item)).filter(Boolean)
    : [];
}

function normalise(input: string) {
  return input
    .toLowerCase()
    .replace(/[.?!,]/g, "")
    .trim();
}

function readVocabulary(content: Entry): VocabularyCard[] {
  return sectionItems(content, "core_vocabulary")
    .map(payloadOf)
    .map((item) => {
      const example = entries(item, "examples")[0];
      return {
        term: text(item.term),
        meaning: text(item.meaning),
        explanation: text(item.explanation),
        example: text(example?.english),
        exampleChinese: text(example?.chinese),
      };
    })
    .filter((item) => item.term);
}

function readPractice(
  content: Entry,
  vocabulary: VocabularyCard[],
): QuickReplyPractice {
  const item = payloadOf(
    sectionItems(content, "speaking_practice")[0] || { id: 0 },
  );
  const answer = text(item.answer) || vocabulary[0]?.term || "Sounds good";
  const choices = listOfText(item.choices);
  return {
    question:
      text(item.question) || "Choose the reply that fits the situation.",
    questionChinese:
      text(item.question_zh) || "选出你在这个场景里最自然的回应。",
    sentence:
      text(item.sentence) ||
      "Your colleague suggests meeting at six. ______ — I’ll be there.",
    answer,
    choices: choices.length
      ? choices
      : [answer, "Give me a second", "Pick it up later"],
    explanation:
      text(item.explanation) ||
      "Use this short reply when you agree with a suggestion.",
  };
}

function storedStep(key: string, totalSteps: number) {
  if (typeof window === "undefined") return 0;
  try {
    const saved = Number(window.localStorage.getItem(key));
    return Number.isInteger(saved) && saved > 0
      ? Math.min(saved, totalSteps - 1)
      : 0;
  } catch {
    return 0;
  }
}

export function CommuteLessonFlow({
  lesson,
  embedded = false,
  onComplete,
}: Props) {
  const content = useMemo(() => lessonContent(lesson), [lesson]);
  const vocabulary = useMemo(() => readVocabulary(content), [content]);
  const practice = useMemo(
    () => readPractice(content, vocabulary),
    [content, vocabulary],
  );
  const lessonSummary = text(lesson.summary);
  const totalSteps = vocabulary.length + 2;
  const storageKey = `happy-english:commute:${lesson.id}`;
  const [step, setStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [completed, setCompleted] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const contentStepCount = totalSteps - 1;
  const vocabularyIndex = step - 1;
  const currentCard = vocabulary[vocabularyIndex];
  const answerIsCorrect =
    Boolean(selectedAnswer) &&
    normalise(selectedAnswer) === normalise(practice.answer);

  useEffect(() => {
    setStep(storedStep(storageKey, totalSteps));
    setSelectedAnswer("");
    setCompleted(false);
  }, [storageKey, totalSteps]);

  function persist(nextStep: number) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, String(nextStep));
    } catch {
      // A private browser window can reject storage; the lesson remains usable.
    }
  }

  function goTo(nextStep: number) {
    const safeStep = Math.max(0, Math.min(nextStep, totalSteps - 1));
    setStep(safeStep);
    persist(safeStep);
  }

  function complete() {
    setCompleted(true);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Completion does not depend on browser storage.
      }
    }
    onComplete?.();
  }

  function restart() {
    setCompleted(false);
    setSelectedAnswer("");
    goTo(0);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStart.current = event.clientX;
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pointerStart.current == null || completed) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(distance) < 54) return;
    if (distance < 0 && step < totalSteps - 1) goTo(step + 1);
    if (distance > 0 && step > 0) goTo(step - 1);
  }

  if (!vocabulary.length)
    return (
      <section className="commute-flow commute-flow-empty" aria-live="polite">
        <p>这节通勤微课正在准备中。</p>
      </section>
    );

  const progress = completed
    ? 100
    : Math.round((step / contentStepCount) * 100);

  return (
    <section className={`commute-flow${embedded ? " is-embedded" : ""}`}>
      <div className="commute-progress" aria-label={`学习进度 ${progress}%`}>
        <div aria-hidden="true" className="commute-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <span>
          {completed
            ? "已完成"
            : step === 0
              ? "准备开始"
              : `第 ${step} / ${contentStepCount} 步`}
        </span>
      </div>

      <div
        className="commute-flow-card"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {completed ? (
          <div className="commute-complete-card">
            <span aria-hidden="true" className="commute-complete-icon">
              ✓
            </span>
            <p className="commute-eyebrow">THIS STOP, DONE</p>
            <h2>这一站完成了</h2>
            <p>
              你已经练完 {vocabulary.length} 个核心表达。
              {lessonSummary && ` ${lessonSummary}`}
            </p>
            <div className="commute-review-terms" aria-label="本节复习短语">
              {vocabulary.map((item) => (
                <span key={item.term}>{item.term}</span>
              ))}
            </div>
            <button
              className="commute-primary-button"
              onClick={restart}
              type="button"
            >
              再走一遍
            </button>
          </div>
        ) : step === 0 ? (
          <div className="commute-start-card">
            <p className="commute-eyebrow">3 MINUTES · ONE HAND</p>
            <h1>下一站前，练会 {vocabulary.length} 个核心表达</h1>
            <p>
              {lessonSummary ||
                "不用背一大段对话。每张卡只学一个你今天可能会说的短语。"}
            </p>
            <div className="commute-start-points">
              <span>🎧 可听可默读</span>
              <span>↔ 可左右滑动</span>
              <span>▣ 中断后可续学</span>
            </div>
            <button
              className="commute-primary-button"
              onClick={() => goTo(1)}
              type="button"
            >
              开始 3 分钟学习
            </button>
          </div>
        ) : currentCard ? (
          <div className="commute-vocabulary-card">
            <div className="commute-card-heading">
              <span>核心短语</span>
              <span>{String(vocabularyIndex + 1).padStart(2, "0")}</span>
            </div>
            <h2 lang="en">{currentCard.term}</h2>
            <Speak
              className="commute-listen"
              label={`朗读 ${currentCard.term}`}
              text={currentCard.term}
            >
              🔊 听一遍
            </Speak>
            <p className="commute-meaning">{currentCard.meaning}</p>
            <p className="commute-explanation" lang="en">
              {currentCard.explanation}
            </p>
            {currentCard.example && (
              <blockquote className="commute-example">
                <p lang="en">“{currentCard.example}”</p>
                {currentCard.exampleChinese && (
                  <footer>{currentCard.exampleChinese}</footer>
                )}
              </blockquote>
            )}
            <div className="commute-card-actions">
              <button
                className="commute-secondary-button"
                disabled={step === 1}
                onClick={() => goTo(step - 1)}
                type="button"
              >
                上一张
              </button>
              <button
                className="commute-primary-button"
                onClick={() => goTo(step + 1)}
                type="button"
              >
                记住了，下一张
              </button>
            </div>
          </div>
        ) : (
          <div className="commute-practice-card">
            <p className="commute-eyebrow">QUICK REPLY</p>
            <h2>{practice.question}</h2>
            <p>{practice.questionChinese}</p>
            <p className="commute-practice-sentence" lang="en">
              {practice.sentence}
            </p>
            <div
              className="commute-answer-options"
              role="group"
              aria-label="选择最自然的回应"
            >
              {practice.choices.map((choice) => {
                const selected = selectedAnswer === choice;
                const correct =
                  selected && normalise(choice) === normalise(practice.answer);
                return (
                  <button
                    className={`${selected ? "is-selected" : ""}${correct ? " is-correct" : ""}`}
                    key={choice}
                    onClick={() => setSelectedAnswer(choice)}
                    type="button"
                  >
                    <span lang="en">{choice}</span>
                    {correct && <b>✓</b>}
                  </button>
                );
              })}
            </div>
            {selectedAnswer && !answerIsCorrect && (
              <p className="commute-answer-feedback" role="status">
                想一想：看清场景，选出能自然完成这句回应的核心短语。
              </p>
            )}
            {answerIsCorrect && (
              <div className="commute-answer-feedback is-correct" role="status">
                <strong>对，这样接话很自然。</strong>
                <span lang="en">{practice.explanation}</span>
              </div>
            )}
            <div className="commute-card-actions">
              <button
                className="commute-secondary-button"
                onClick={() => goTo(step - 1)}
                type="button"
              >
                上一张
              </button>
              <button
                className="commute-primary-button"
                disabled={!answerIsCorrect}
                onClick={complete}
                type="button"
              >
                完成本节
              </button>
            </div>
          </div>
        )}
      </div>

      {!completed && step > 0 && (
        <p className="commute-save-note" aria-live="polite">
          已自动保存到第 {step} 步，随时可以关掉页面。
        </p>
      )}
    </section>
  );
}
