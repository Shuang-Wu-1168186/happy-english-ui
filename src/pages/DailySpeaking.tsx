import { TopicZone } from "./TopicZone";
import type { TopicZoneConfig } from "./TopicZone";

const dailySpeakingConfig: TopicZoneConfig = {
  moduleCode: "elementary-english",
  title: "初级英语",
  eyebrow: "ELEMENTARY ENGLISH",
  introduction: "通过真实生活场景的日常口语对话，逐步建立表达能力。",
  topicsHeading: "选择日常口语专区",
  heroBackground:
    "radial-gradient(circle at 88% 16%, rgba(255, 255, 255, 0.34), transparent 11rem), linear-gradient(128deg, #d75e84, #f194ab)",
  heroShadow: "0 20px 42px rgba(196, 74, 111, 0.2)",
  actionColor: "#b6496c",
  topics: {
    "daily-speaking-dialogues": {
      title: "日常口语专区",
      english: "Daily Spoken English",
      description: "围绕购物、出行和社交等真实场景，练习自然回应。",
      icon: "🎧",
      color: "#e7f3f9",
      resource: "dialogues",
    },
  },
};

export function DailySpeaking() {
  return <TopicZone config={dailySpeakingConfig} />;
}
