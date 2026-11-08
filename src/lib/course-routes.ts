const courseResourceLandings: Record<string, string> = {
  "kids-cards": "/learn/kids-cards",
  phonics: "/foundation",
  textbook: "/learn/textbook",
  "math-cards": "/learn/math-cards",
  sentences: "/learn/sentences",
  dialogues: "/daily-speaking",
  interviews: "/learn/interviews",
  vocabulary: "/learn/vocabulary",
};

// These resources already have complete learner-facing study screens.  Their
// URLs are also valid private-zone shortcut targets, so do not redirect a
// learner back to the catalogue (or the home page) after they select one.
const originalStudyResources = new Set([
  "sentences",
  "kids-cards",
  "textbook",
  "math-cards",
  "vocabulary",
  "interviews",
]);

export function isCourseResource(resource: string) {
  return resource in courseResourceLandings;
}

export function usesOriginalStudyPage(resource: string) {
  return originalStudyResources.has(resource);
}

export function courseLandingPath(resource: string) {
  return courseResourceLandings[resource] || "/";
}
