import type { Entry } from "./api";

export type MaterialTemplateCode =
  | "standard"
  | "put-aside"
  | "dialogue"
  | "textbook"
  | "cards"
  | "phonics"
  | "interview";

export type MaterialTemplateDefinition = {
  code: MaterialTemplateCode;
  version: 1;
  name: string;
  contentKind: "courseware" | "dialogue" | "source";
  description: string;
};

// Keep this registry in sync with happy-lingo/services/happy-english/templates.js
// and the backend MATERIAL_TEMPLATE_DEFINITIONS constant.  The database sends
// only code + version; each client resolves that contract to its own renderer.
export const MATERIAL_TEMPLATE_REGISTRY: Record<
  `${MaterialTemplateCode}.v1`,
  MaterialTemplateDefinition
> = {
  "standard.v1": {
    code: "standard",
    version: 1,
    name: "通用课时",
    contentKind: "source",
    description: "适合句子、笔记和自包含内容的通用学习页。",
  },
  "put-aside.v1": {
    code: "put-aside",
    version: 1,
    name: "Put aside 课件",
    contentKind: "courseware",
    description: "按短语、用法、情景和输出区块组织的课件。",
  },
  "dialogue.v1": {
    code: "dialogue",
    version: 1,
    name: "情景对话",
    contentKind: "dialogue",
    description: "按词汇、对话和练习分区展示的口语对话页。",
  },
  "textbook.v1": {
    code: "textbook",
    version: 1,
    name: "课本课文",
    contentKind: "source",
    description: "按单元、课文和中英对照展示的教材页。",
  },
  "cards.v1": {
    code: "cards",
    version: 1,
    name: "单词卡片",
    contentKind: "source",
    description: "适合儿童卡片、数学卡片和词汇卡片的学习页。",
  },
  "phonics.v1": {
    code: "phonics",
    version: 1,
    name: "自然拼读",
    contentKind: "source",
    description: "按音素、示例和小测展示的拼读学习页。",
  },
  "interview.v1": {
    code: "interview",
    version: 1,
    name: "面试练习",
    contentKind: "source",
    description: "按面试问题、答案和要点展示的练习页。",
  },
};

export const MATERIAL_TEMPLATE_CHOICES = Object.values(
  MATERIAL_TEMPLATE_REGISTRY,
);

function objectEntry(input: unknown): Entry | null {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Entry)
    : null;
}

function text(input: unknown) {
  return input == null ? "" : String(input).trim();
}

export function templateKey(template: Entry | null | undefined) {
  const entry = objectEntry(template);
  const renderer = text(entry?.renderer);
  if (renderer && renderer in MATERIAL_TEMPLATE_REGISTRY)
    return renderer as keyof typeof MATERIAL_TEMPLATE_REGISTRY;
  const code = text(entry?.code || entry?.template_code);
  const version = Number(entry?.version || entry?.template_version || 1);
  const key = `${code}.v${version}`;
  return key in MATERIAL_TEMPLATE_REGISTRY
    ? (key as keyof typeof MATERIAL_TEMPLATE_REGISTRY)
    : "standard.v1";
}

export function resolveMaterialTemplate(
  materialOrLesson: Entry | null | undefined,
) {
  const entry = objectEntry(materialOrLesson);
  const template = objectEntry(entry?.template);
  const key = templateKey(template);
  return {
    ...MATERIAL_TEMPLATE_REGISTRY[key],
    key,
    apiTemplate: template,
  };
}

