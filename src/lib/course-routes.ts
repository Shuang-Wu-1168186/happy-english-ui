const courseResourceLandings: Record<string, string> = {
  "kids-cards": "/learn/kids-cards",
  phonics: "/foundation",
  textbook: "/",
  "math-cards": "/learn/math-cards",
  sentences: "/",
  dialogues: "/daily-speaking",
  interviews: "/",
  vocabulary: "/",
};

// These two resources already have complete, learner-facing study screens.
// Keep their original cards UI instead of sending a private-zone shortcut to
// the catalogue layer.
const originalStudyResources = new Set(["kids-cards", "math-cards"]);

export function isCourseResource(resource: string) {
  return resource in courseResourceLandings;
}

export function usesOriginalStudyPage(resource: string) {
  return originalStudyResources.has(resource);
}

export function courseLandingPath(resource: string) {
  return courseResourceLandings[resource] || "/";
}
