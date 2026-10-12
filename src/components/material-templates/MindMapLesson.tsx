import { useState } from "react";
import type { Entry } from "../../lib/api";
import { Speak } from "../study/Speech";

type MindMapStudyNote = {
  id: string;
  type: string;
  label: string;
  english: string;
  chinese: string;
};

type MindMapLeaf = {
  id: string;
  word: string;
  chinese: string;
  pronunciation: string;
  memoryLabel: string;
  memoryTip: string;
  studyNotes: MindMapStudyNote[];
  example: string;
  exampleZh: string;
};

type MindMapBranch = {
  id: string;
  label: string;
  labelZh: string;
  emoji: string;
  tone: string;
  prompt: string;
  pronunciation: string;
  memoryLabel: string;
  memoryTip: string;
  studyNotes: MindMapStudyNote[];
  leaves: MindMapLeaf[];
};

type MindMap = {
  title: string;
  titleZh: string;
  subtitle: string;
  centerLabel: string;
  centerZh: string;
  centerEmoji: string;
  centerPronunciation: string;
  centerMemoryLabel: string;
  centerMemoryTip: string;
  branches: MindMapBranch[];
  recallPrompt: string;
  recallAnswer: string;
};

const TONES = new Set(["violet", "rose", "sun", "sky", "mint"]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function list(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function studyNotesOf(value: unknown): MindMapStudyNote[] {
  return list(value)
    .map((rawNote, index) => {
      const note = record(rawNote);
      return {
        id: text(note.id) || `note-${index + 1}`,
        type: text(note.type) || "note",
        label: text(note.label || note.title),
        english: text(note.english || note.term || note.text),
        chinese: text(note.chinese || note.meaning || note.translation),
      };
    })
    .filter((note) => note.english || note.chinese);
}

function mindMapOf(content: Entry | null): MindMap | null {
  const root = record(content?.mind_map);
  if (!Object.keys(root).length) return null;
  const center = record(root.center);
  const branches = list(root.branches)
    .map((rawBranch, branchIndex) => {
      const source = record(rawBranch);
      const id = text(source.id) || `branch-${branchIndex + 1}`;
      const leaves = list(source.leaves)
        .map((rawLeaf, leafIndex) => {
          const leaf = record(rawLeaf);
          return {
            id: text(leaf.id) || `${id}-leaf-${leafIndex + 1}`,
            word: text(leaf.word || leaf.term || leaf.english),
            chinese: text(leaf.chinese || leaf.meaning || leaf.translation),
            pronunciation: text(leaf.pronunciation || leaf.phonetic),
            memoryLabel: text(leaf.memory_label || leaf.memoryLabel),
            memoryTip: text(leaf.memory_tip || leaf.memoryTip || leaf.mnemonic),
            studyNotes: studyNotesOf(leaf.study_notes || leaf.studyNotes),
            example: text(leaf.example || leaf.sentence),
            exampleZh: text(
              leaf.example_zh || leaf.exampleZh || leaf.sentence_zh,
            ),
          };
        })
        .filter((leaf) => leaf.word || leaf.chinese);
      return {
        id,
        label: text(source.label || source.title) || `分支 ${branchIndex + 1}`,
        labelZh: text(source.label_zh || source.labelZh || source.chinese),
        emoji: text(source.emoji) || "✦",
        tone: TONES.has(text(source.tone)) ? text(source.tone) : "violet",
        prompt: text(source.prompt || source.description),
        pronunciation: text(source.pronunciation || source.phonetic),
        memoryLabel: text(source.memory_label || source.memoryLabel),
        memoryTip: text(
          source.memory_tip || source.memoryTip || source.mnemonic,
        ),
        studyNotes: studyNotesOf(source.study_notes || source.studyNotes),
        leaves,
      };
    })
    .filter((branch) => branch.leaves.length);
  if (!branches.length) return null;

  const recall = record(root.recall);
  return {
    title: text(root.title) || text(center.label) || "Mind Map",
    titleZh: text(root.title_zh || root.titleZh) || text(center.label_zh),
    subtitle: text(root.subtitle || root.description),
    centerLabel: text(center.label) || text(root.title) || "Mind Map",
    centerZh: text(center.label_zh || center.labelZh) || text(root.title_zh),
    centerEmoji: text(center.emoji) || "🧠",
    centerPronunciation: text(center.pronunciation || center.phonetic),
    centerMemoryLabel: text(center.memory_label || center.memoryLabel),
    centerMemoryTip: text(
      center.memory_tip || center.memoryTip || center.mnemonic,
    ),
    branches,
    recallPrompt: text(recall.prompt || recall.question),
    recallAnswer: text(recall.answer || recall.guidance),
  };
}

function MindMapStudyNotes({ notes }: { notes: MindMapStudyNote[] }) {
  if (!notes.length) return null;
  return (
    <div className="mind-map-study-note-list">
      {notes.map((note) => (
        <article className="mind-map-study-note" key={note.id}>
          <strong>{note.label || "学习提示"}</strong>
          <div>
            {note.english ? <span lang="en">{note.english}</span> : null}
            {note.chinese ? <small>{note.chinese}</small> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function MindMapLesson({ content }: { content: Entry | null }) {
  const mindMap = mindMapOf(content);
  const firstBranch = mindMap?.branches[0];
  const [activeBranchId, setActiveBranchId] = useState(firstBranch?.id || "");
  const [activeLeafId, setActiveLeafId] = useState(
    firstBranch?.leaves[0]?.id || "",
  );
  const [visitedBranchIds, setVisitedBranchIds] = useState<string[]>([]);
  const [showRecallAnswer, setShowRecallAnswer] = useState(false);

  if (!mindMap)
    return <p className="course-content-empty">这节思维导图课件正在准备中。</p>;

  const activeBranch =
    mindMap.branches.find((branch) => branch.id === activeBranchId) ||
    mindMap.branches[0];
  const activeLeaf =
    activeBranch.leaves.find((leaf) => leaf.id === activeLeafId) ||
    activeBranch.leaves[0];

  function selectBranch(branch: MindMapBranch) {
    setActiveBranchId(branch.id);
    setActiveLeafId(branch.leaves[0]?.id || "");
    setVisitedBranchIds((current) =>
      current.includes(branch.id) ? current : [...current, branch.id],
    );
  }

  return (
    <section className="mind-map-lesson" aria-label="思维导图课件">
      <header className="mind-map-lesson-hero">
        <div>
          <p>MAP EXPLORER · 知识地图</p>
          <h3>
            {mindMap.title}
            {mindMap.titleZh ? <small>{mindMap.titleZh}</small> : null}
          </h3>
          <span>
            {mindMap.subtitle ||
              "从中心词出发，逐条点开关联词，先看关系，再记单词。"}
          </span>
        </div>
        <strong>
          <span>{mindMap.centerEmoji}</span>
          <small>
            {visitedBranchIds.length} / {mindMap.branches.length} 已探索
          </small>
        </strong>
      </header>

      {mindMap.centerPronunciation || mindMap.centerMemoryTip ? (
        <section className="mind-map-center-memory" aria-label="中心词记忆">
          <div>
            <p>中心词记忆</p>
            <h4>
              {mindMap.centerLabel}
              {mindMap.centerPronunciation ? (
                <small>{mindMap.centerPronunciation}</small>
              ) : null}
            </h4>
          </div>
          {mindMap.centerMemoryTip ? (
            <aside>
              <strong>{mindMap.centerMemoryLabel || "发音记忆"}</strong>
              <span>{mindMap.centerMemoryTip}</span>
            </aside>
          ) : null}
        </section>
      ) : null}

      <section className="mind-map-canvas" aria-label="词汇关系图">
        <span aria-hidden="true" className="mind-map-orbit" />
        <span
          aria-hidden="true"
          className="mind-map-spoke mind-map-spoke-top"
        />
        <span
          aria-hidden="true"
          className="mind-map-spoke mind-map-spoke-right"
        />
        <span
          aria-hidden="true"
          className="mind-map-spoke mind-map-spoke-bottom"
        />
        <span
          aria-hidden="true"
          className="mind-map-spoke mind-map-spoke-left"
        />
        <div className="mind-map-center-node">
          <span>{mindMap.centerEmoji}</span>
          <strong>{mindMap.centerLabel}</strong>
          {mindMap.centerZh ? <small>{mindMap.centerZh}</small> : null}
        </div>
        <div
          className={`mind-map-branch-nodes branch-count-${mindMap.branches.length}`}
        >
          {mindMap.branches.map((branch) => {
            const isActive = branch.id === activeBranch.id;
            const isVisited = visitedBranchIds.includes(branch.id);
            return (
              <button
                aria-pressed={isActive}
                className={
                  `mind-map-branch-node is-${branch.tone}` +
                  (isActive ? " is-active" : "") +
                  (isVisited ? " is-visited" : "")
                }
                key={branch.id}
                onClick={() => selectBranch(branch)}
                type="button"
              >
                <span>{branch.emoji}</span>
                <strong>{branch.label}</strong>
                {branch.labelZh ? <small>{branch.labelZh}</small> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className={`mind-map-branch-detail is-${activeBranch.tone}`}>
        <div className="mind-map-detail-heading">
          <span>{activeBranch.emoji}</span>
          <div>
            <p>当前分支</p>
            <h4>
              {activeBranch.label}
              {activeBranch.labelZh ? (
                <small>{activeBranch.labelZh}</small>
              ) : null}
              {activeBranch.pronunciation ? (
                <span className="mind-map-branch-pronunciation">
                  {activeBranch.pronunciation}
                </span>
              ) : null}
            </h4>
          </div>
          <em>{activeBranch.leaves.length} 个词叶</em>
        </div>
        {activeBranch.prompt ? (
          <p className="mind-map-branch-prompt">{activeBranch.prompt}</p>
        ) : null}
        <MindMapStudyNotes notes={activeBranch.studyNotes} />
        <div className="mind-map-leaf-grid">
          {activeBranch.leaves.map((leaf) => (
            <button
              aria-pressed={leaf.id === activeLeaf.id}
              className={
                "mind-map-leaf" +
                (leaf.id === activeLeaf.id ? " is-active" : "")
              }
              key={leaf.id}
              onClick={() => setActiveLeafId(leaf.id)}
              type="button"
            >
              <strong>{leaf.word}</strong>
              <small>{leaf.chinese}</small>
            </button>
          ))}
        </div>
        {activeLeaf ? (
          <article className="mind-map-leaf-focus">
            <div>
              <p>点亮词叶</p>
              <h5>{activeLeaf.word}</h5>
              <span>{activeLeaf.chinese}</span>
              {activeLeaf.pronunciation ? (
                <em className="mind-map-leaf-pronunciation">
                  {activeLeaf.pronunciation}
                </em>
              ) : null}
            </div>
            {activeLeaf.word ? (
              <Speak
                className="mind-map-listen"
                label={`朗读 ${activeLeaf.word}`}
                text={activeLeaf.word}
              >
                🔊
              </Speak>
            ) : null}
            {activeLeaf.example ||
            activeLeaf.memoryTip ||
            activeLeaf.studyNotes.length ? (
              <div className="mind-map-leaf-learning-note">
                {activeLeaf.example ? (
                  <blockquote>
                    <span lang="en">{activeLeaf.example}</span>
                    {activeLeaf.exampleZh ? (
                      <small>{activeLeaf.exampleZh}</small>
                    ) : null}
                  </blockquote>
                ) : null}
                {activeLeaf.memoryTip ? (
                  <aside className="mind-map-leaf-memory">
                    <strong>{activeLeaf.memoryLabel || "发音记忆"}</strong>
                    <span>{activeLeaf.memoryTip}</span>
                  </aside>
                ) : null}
                <MindMapStudyNotes notes={activeLeaf.studyNotes} />
              </div>
            ) : null}
          </article>
        ) : null}
      </section>

      {mindMap.recallPrompt ? (
        <section className="mind-map-recall">
          <p>RECALL · 闭眼想一想</p>
          <h4>{mindMap.recallPrompt}</h4>
          {showRecallAnswer && mindMap.recallAnswer ? (
            <span>{mindMap.recallAnswer}</span>
          ) : (
            <button onClick={() => setShowRecallAnswer(true)} type="button">
              显示提示
            </button>
          )}
        </section>
      ) : null}
    </section>
  );
}
