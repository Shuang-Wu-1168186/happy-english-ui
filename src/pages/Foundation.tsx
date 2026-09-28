import { TopicZone } from "./TopicZone";
import type { TopicZoneConfig } from "./TopicZone";

const foundationConfig: TopicZoneConfig = {
  moduleCode: "beginner-english",
  title: "入门英语",
  eyebrow: "BEGINNER ENGLISH",
  introduction: "从自然拼读开始，建立英文发音和阅读的第一步。",
  topicsHeading: "选择自然拼读专区",
  heroBackground:
    "radial-gradient(circle at 88% 16%, rgba(255, 255, 255, 0.42), transparent 11rem), linear-gradient(128deg, #2b9b7d, #5ec09e)",
  heroShadow: "0 20px 42px rgba(45, 152, 120, 0.18)",
  actionColor: "#277f68",
  topics: {
    "natural-phonics": {
      title: "自然拼读专区",
      english: "Natural Phonics",
      description: "从字母、音素和拼读规律开始，练出见词能读的能力。",
      icon: "🔤",
      color: "#f0e9ff",
      resource: "phonics",
    },
  },
};

export function Foundation() {
  return <TopicZone config={foundationConfig} />;
}
