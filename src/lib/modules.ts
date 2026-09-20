import { value } from "./api";
import type { Entry } from "./api";
export const modules = [
  {
    key: "sentences",
    title: "日常英语",
    en: "Everyday speaking",
    icon: "💬",
    description: "把实用表达带入每一天，从一句开口练起。",
    color: "#ecf2ff",
  },
  {
    key: "kids-cards",
    title: "儿童英语",
    en: "Little explorers",
    icon: "🌈",
    description: "看图片、听发音，用有趣的卡片认识世界。",
    color: "#fff1de",
  },
  {
    key: "phonics",
    title: "自然拼读",
    en: "Hear it. Read it.",
    icon: "🔤",
    description: "发现字母和声音的联系，轻松拼出新单词。",
    color: "#f2eaff",
  },
  {
    key: "textbook",
    title: "英语课本",
    en: "Your English textbook",
    icon: "📖",
    description: "跟着课文逐句学习，积累扎实的语言基础。",
    color: "#e7f5ee",
  },
  {
    key: "dialogues",
    title: "情景对话",
    en: "Real conversations",
    icon: "🎧",
    description: "走进真实场景，练习自然流畅的英语对话。",
    color: "#e7f3f9",
  },
  {
    key: "notes",
    title: "学习笔记",
    en: "Your learning notebook",
    icon: "📝",
    description: "回顾知识点，把每一次收获认真收藏。",
    color: "#fff3d8",
  },
  {
    key: "vocabulary",
    title: "专业词汇",
    en: "Build your vocabulary",
    icon: "🧩",
    description: "理解专业词汇的含义，在例句中学会运用。",
    color: "#f5eaf1",
  },
  {
    key: "interviews",
    title: "面试英语",
    en: "Speak with confidence",
    icon: "💼",
    description: "梳理回答思路，自信讲述你的经历和想法。",
    color: "#e9eefb",
  },
  {
    key: "math-cards",
    title: "数学卡片",
    en: "A little mathematical thinking",
    icon: "📐",
    description: "理解公式和解题过程，让思路更清晰。",
    color: "#eaf5ee",
  },
];
export const editable = [
  "sentences",
  "notes",
  "note-items",
  "vocabulary",
  "interviews",
];

const titleKeys = [
  "word",
  "term",
  "question",
  "item_title",
  "title",
  "en",
  "lesson_title",
  "english_text",
];
export const titleOf = (item: Entry) =>
  titleKeys.map((key) => value(item, key)).find(Boolean) || `#${item.id}`;
