export const NOTE_REGISTER_LABELS: Record<string, string> = {
  common_spoken: "常用口语",
  formal_spoken: "正式口语",
  written: "书面语",
  mixed: "多语体对照",
  neutral: "中性表达",
  reference: "术语/知识点",
};

export const NOTE_REGISTER_OPTIONS = Object.entries(NOTE_REGISTER_LABELS);

export const NOTE_SCENARIO_LABELS: Record<string, string> = {
  daily_life: "日常生活",
  friends_social: "朋友社交",
  workplace: "职场沟通",
  meeting_presentation: "会议/演示",
  customer_service: "客户服务",
  interview: "求职面试",
  travel_service: "出行服务",
  email_writing: "邮件写作",
  report_writing: "报告写作",
  academic: "学术/课堂",
  technical: "技术沟通",
  health_medical: "医疗健康",
  online_chat: "线上交流",
  general: "通用场景",
};

export const NOTE_SCENARIO_OPTIONS = Object.entries(NOTE_SCENARIO_LABELS);

export function noteScenarioCodes(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
}
