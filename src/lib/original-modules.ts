// Module copy and grouping from the original HappyEnglish learning homepage.
export const originalModules: Record<
  string,
  {
    icon: string;
    badge: string;
    title: string;
    description: string;
    tags: string[];
    count: string;
    kids?: boolean;
    learner_visible?: boolean;
    phonics?: boolean;
  }
> = {
  sentences: {
    icon: "💬",
    badge: "Module 01",
    title: "Everyday Speaking",
    description:
      "Practise useful everyday English for shopping, transport, class, work, and casual conversation.",
    tags: ["Daily life", "Speaking", "Conversation"],
    count: "Everyday cards",
  },
  notes: {
    icon: "📝",
    badge: "Module 02",
    title: "Study Notes",
    description:
      "Review your English note cards, including phrases, grammar, examples, natural expressions, and explanations.",
    tags: ["Notes", "Grammar", "Examples"],
    count: "Note cards",
    learner_visible: true,
  },
  interviews: {
    icon: "🎯",
    badge: "Module 03",
    title: "Professional Interviews",
    description:
      "Prepare for self-introductions, behavioural questions, project stories, and software engineering interview topics.",
    tags: ["Interview", "Behavioural", "Career"],
    count: "Coming soon",
  },
  vocabulary: {
    icon: "📘",
    badge: "Module 04",
    title: "Professional Vocabulary",
    description:
      "Build up professional vocabulary and expressions for interviews, workplace communication, and technical reading.",
    tags: ["Vocabulary", "Professional", "Workplace"],
    count: "Planned",
  },
  "kids-cards": {
    icon: "🌈",
    badge: "New · For kids",
    title: "Kids English Cards",
    description:
      "Build stronger vocabulary with pictures, pronunciation, real sentences, and word families.",
    tags: ["Words", "Sentences", "Real English"],
    count: "Vocabulary cards",
    kids: true,
    learner_visible: true,
  },
  phonics: {
    icon: "🔤",
    badge: "Foundations",
    title: "Natural Phonics",
    description:
      "Learn letter sounds and spelling patterns step by step, then listen and practise with example words.",
    tags: ["Letter sounds", "Blending", "Practice"],
    count: "Video lessons 28–48",
    phonics: true,
    learner_visible: true,
  },
  dialogues: {
    icon: "🛍️",
    badge: "Daily conversation",
    title: "日常口语对话",
    description:
      "Learn practical conversations, useful expressions, and speaking prompts for everyday situations.",
    tags: ["Dialogue", "Speaking", "Daily life"],
    count: "Buying Clothes · Lesson 1",
    learner_visible: true,
  },
  "math-cards": {
    icon: "📐",
    badge: "Math knowledge",
    title: "Math Knowledge Cards",
    description:
      "Review visual math concepts, methods, common mistakes, and worked examples.",
    tags: ["Geometry", "Fractions", "Examples"],
    count: "Knowledge cards",
    learner_visible: true,
  },
  textbook: {
    icon: "📚",
    badge: "Textbook",
    title: "English Textbook",
    description:
      "Read textbook lessons sentence by sentence with Chinese translations and one-tap English audio.",
    tags: ["Units", "Lessons", "Read aloud"],
    count: "Bilingual lessons",
    learner_visible: true,
  },
};
