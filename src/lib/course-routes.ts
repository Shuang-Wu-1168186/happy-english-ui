const courseResourceLandings: Record<string, string> = {
  "kids-cards": "/",
  phonics: "/foundation",
  textbook: "/",
  "math-cards": "/",
  sentences: "/",
  dialogues: "/daily-speaking",
  interviews: "/",
  vocabulary: "/",
};

export function isCourseResource(resource: string) {
  return resource in courseResourceLandings;
}

export function courseLandingPath(resource: string) {
  return courseResourceLandings[resource] || "/";
}
