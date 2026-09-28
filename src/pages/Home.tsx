import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HomeNavigation } from "../components/Layout";
import { api } from "../lib/api";
import { courseLandingPath, isCourseResource } from "../lib/course-routes";
import type { Entry } from "../lib/api";
import { useAuth } from "../lib/auth-context";

type CatalogResponse = { items?: Entry[] };
type StudyTimeSummary = { total_active_seconds?: number; days?: Entry[] };
type ReviewResponse = { items?: Entry[] };

type LearningArea = {
  id: string;
  code: string;
  title: string;
  english: string;
  description: string;
  icon: string;
  color: string;
  resource: string;
  path: string;
};

type CourseCard = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  icon: string;
  path: string;
};

type ContinueCard = {
  title: string;
  subtitle: string;
  progress: string;
  path: string;
};

type ReviewCard = {
  id: string;
  label: string;
  prompt: string;
  answer: string;
  path: string;
};

const fallbackAreas: LearningArea[] = [
  {
    id: "beginner-english",
    code: "beginner-english",
    title: "入门英语",
    english: "Beginner English",
    description: "从自然拼读开始，建立英文发音和阅读的第一步。",
    icon: "🔤",
    color: "#249b7e",
    resource: "phonics",
    path: "/foundation",
  },
  {
    id: "elementary-english",
    code: "elementary-english",
    title: "初级英语",
    english: "Elementary English",
    description: "通过真实生活场景的日常口语对话，逐步建立表达能力。",
    icon: "💬",
    color: "#e65d80",
    resource: "dialogues",
    path: "/daily-speaking",
  },
  {
    id: "intermediate-english",
    code: "intermediate-english",
    title: "中级英语",
    english: "Intermediate English",
    description: "课程正在筹备中。",
    icon: "📘",
    color: "#4f8dd8",
    resource: "intermediate",
    path: "/course-modules/3",
  },
  {
    id: "advanced-english",
    code: "advanced-english",
    title: "进阶英语",
    english: "Advanced English",
    description: "课程正在筹备中。",
    icon: "🚀",
    color: "#8b5cf6",
    resource: "advanced",
    path: "/course-modules/4",
  },
  {
    id: "higher-english",
    code: "higher-english",
    title: "高级英语",
    english: "Higher English",
    description: "课程正在筹备中。",
    icon: "🏅",
    color: "#d69a2d",
    resource: "higher",
    path: "/course-modules/5",
  },
  {
    id: "private-zone",
    code: "private-zone",
    title: "私人专区",
    english: "Private Zone",
    description: "集中查看你的学习笔记、重点卡片和复习内容。",
    icon: "🔒",
    color: "#64748b",
    resource: "private",
    path: "/course-modules/6",
  },
];

const starterCourses: CourseCard[] = [
  {
    id: "starter-phonics",
    title: "自然拼读专区",
    subtitle: "从字母、音素和拼读规律开始，练出见词能读的能力。",
    meta: "入门英语 · 自然拼读",
    icon: "🔤",
    path: "/foundation",
  },
  {
    id: "starter-dialogue",
    title: "日常口语专区",
    subtitle: "在真实场景里听、读、练习自然的英语对话。",
    meta: "初级英语 · 情景对话",
    icon: "🎧",
    path: "/daily-speaking",
  },
];

const supportedResources = new Set([
  "sentences",
  "kids-cards",
  "phonics",
  "textbook",
  "dialogues",
  "notes",
  "note-items",
  "vocabulary",
  "interviews",
  "math-cards",
]);

function read(entry: Entry | null | undefined, key: string) {
  const raw = entry?.[key];
  return raw == null ? "" : String(raw);
}

function readNumber(entry: Entry | null | undefined, key: string) {
  const number = Number(entry?.[key]);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function localDate() {
  return dateFor(new Date());
}

function weekStartDate() {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return dateFor(start);
}

function dateFor(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function contentPath(entry: Entry | null | undefined) {
  const resource =
    read(entry, "course_content_resource") || read(entry, "content_resource");
  if (!supportedResources.has(resource)) return "";
  const id =
    readNumber(entry, "last_item_id") ||
    readNumber(entry, "course_content_reference_id") ||
    readNumber(entry, "content_reference_id");
  return isCourseResource(resource)
    ? courseLandingPath(resource)
    : `/learn/${resource}${id ? `/${id}` : ""}`;
}

function reviewFromEntry(entry: Entry): ReviewCard | null {
  const resource = read(entry, "resource");
  const itemId = readNumber(entry, "item_id");
  const prompt = read(entry, "prompt");
  const answer = read(entry, "answer");
  if (!supportedResources.has(resource) || !itemId || !prompt || !answer)
    return null;
  return {
    id: `review-${entry.id}`,
    label: read(entry, "label") || "近 7 天复习",
    prompt,
    answer,
    path: isCourseResource(resource)
      ? courseLandingPath(resource)
      : `/learn/${resource}/${itemId}`,
  };
}

function areaFromCatalog(entry: Entry, index: number): LearningArea {
  const fallback =
    fallbackAreas.find((area) => area.code === read(entry, "module_code")) ||
    fallbackAreas[index % fallbackAreas.length];
  const code = read(entry, "module_code") || fallback.code;
  const resource = read(entry, "route_key") || fallback.resource;
  const catalogId = readNumber(entry, "id");
  return {
    id: `area-${entry.id}`,
    code,
    title: read(entry, "name") || fallback.title,
    english: read(entry, "name_en") || fallback.english,
    description:
      code === "private-zone"
        ? fallback.description
        : read(entry, "description") || fallback.description,
    icon: read(entry, "icon") || fallback.icon,
    color: read(entry, "color") || fallback.color,
    resource,
    path:
      code === "beginner-english"
        ? "/foundation"
        : code === "elementary-english"
          ? "/daily-speaking"
          : catalogId
            ? `/course-modules/${catalogId}`
            : fallback.path,
  };
}

function courseFromCatalog(entry: Entry, index: number): CourseCard | null {
  const courseId = readNumber(entry, "id");
  if (!courseId) return null;
  const fallback = starterCourses[index % starterCourses.length];
  const minutes = readNumber(entry, "estimated_minutes");
  return {
    id: `course-${entry.id}`,
    title: read(entry, "title") || fallback.title,
    subtitle: read(entry, "summary") || fallback.subtitle,
    meta: `${read(entry, "difficulty_code") || read(entry, "course_type") || "课程"}${minutes ? ` · 约 ${minutes} 分钟` : ""}`,
    icon: fallback.icon,
    path: `/courses/${courseId}`,
  };
}

function continueFromCourse(entry: Entry | null) {
  if (!entry) return null;
  const courseId = readNumber(entry, "course_id");
  const path = courseId ? `/courses/${courseId}` : contentPath(entry);
  if (!path) return null;
  const total = readNumber(entry, "total_item_count");
  const completed = readNumber(entry, "completed_item_count");
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return {
    title: read(entry, "course_title") || "继续你的课程",
    subtitle:
      read(entry, "course_title_en") || "回到上次学习的位置，继续完成这一节。",
    progress: total ? `已完成 ${percent}%` : "已记录学习进度",
    path,
  } satisfies ContinueCard;
}

function continueFromLegacy(entry: Entry | undefined) {
  if (!entry) return null;
  const resource =
    read(entry, "content_type") === "english_note" ? "note-items" : "sentences";
  const itemId = readNumber(entry, "item_id");
  if (!itemId) return null;
  return {
    title: resource === "note-items" ? "继续复习学习笔记" : "继续日常英语练习",
    subtitle: "回到上次学习的位置，继续积累一点点。",
    progress: entry.completed ? "已完成，继续复习" : "上次学习到这里",
    path: isCourseResource(resource)
      ? courseLandingPath(resource)
      : `/learn/${resource}/${itemId}`,
  } satisfies ContinueCard;
}

const defaultContinue: ContinueCard = {
  title: "从入门英语开始",
  subtitle: "从自然拼读开始，完成今天的第一小步。",
  progress: "从自然拼读开始",
  path: "/foundation",
};

export function Home() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState(fallbackAreas);
  const [courses, setCourses] = useState(starterCourses);
  const [continueCard, setContinueCard] = useState(defaultContinue);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [progressCount, setProgressCount] = useState(0);
  const [studyDays, setStudyDays] = useState(0);
  const [reviewItems, setReviewItems] = useState<ReviewCard[]>([]);
  const [revealedReviews, setRevealedReviews] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    let current = true;
    const today = localDate();
    const weekStart = weekStartDate();
    async function loadHome() {
      const [
        catalog,
        progress,
        resume,
        studyTime,
        courseCatalog,
        legacyProgress,
        review,
      ] = await Promise.all([
        api<CatalogResponse>("/learning/modules").catch(() => ({ items: [] })),
        api<CatalogResponse>("/learning/progress").catch(() => ({ items: [] })),
        api<Entry | null>("/learning/progress/continue").catch(() => null),
        api<StudyTimeSummary>(
          `/learning/study-time?start_date=${weekStart}&end_date=${today}`,
        ).catch(() => ({}) as StudyTimeSummary),
        api<CatalogResponse>("/learning/courses").catch(() => ({ items: [] })),
        api<Entry[]>("/progress").catch(() => []),
        api<ReviewResponse>("/learning/review-items?days=7&limit=3").catch(
          () => ({ items: [] }),
        ),
      ]);
      if (!current) return;

      const catalogAreas = (catalog.items || []).map(areaFromCatalog);
      const catalogCourses = (courseCatalog.items || [])
        .map(courseFromCatalog)
        .filter((course): course is CourseCard => course !== null)
        .slice(0, 3);
      const learningProgress = progress.items || [];
      const legacy = Array.isArray(legacyProgress) ? legacyProgress : [];
      const days = Array.isArray(studyTime.days) ? studyTime.days : [];
      const recentReviews = (review.items || [])
        .map(reviewFromEntry)
        .filter((item): item is ReviewCard => item !== null);
      const todaySummary = days.find(
        (day) => read(day, "study_date").slice(0, 10) === today,
      );
      const seconds = Number(todaySummary?.active_seconds || 0);

      setAreas(catalogAreas.length ? catalogAreas : fallbackAreas);
      setCourses(catalogCourses.length ? catalogCourses : starterCourses);
      setContinueCard(
        continueFromCourse(resume) ||
          continueFromLegacy(legacy[0]) ||
          defaultContinue,
      );
      setTodayMinutes(seconds > 0 ? Math.max(1, Math.ceil(seconds / 60)) : 0);
      setProgressCount(learningProgress.length + legacy.length);
      setStudyDays(days.length);
      setReviewItems(recentReviews);
      setRevealedReviews({});
      setLoading(false);
    }
    void loadHome();
    return () => {
      current = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleAreas = useMemo(
    () =>
      areas.filter((area) =>
        `${area.title} ${area.english} ${area.description}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [areas, normalizedQuery],
  );
  const visibleCourses = useMemo(
    () =>
      courses.filter((course) =>
        `${course.title} ${course.subtitle} ${course.meta}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [courses, normalizedQuery],
  );
  const displayName = user?.full_name || user?.username || "同学";
  const toggleReview = (id: string) => {
    setRevealedReviews((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <div className="study-home">
      <HomeNavigation />
      <main className="home-dashboard container">
        <h1 className="sr-only">Happy English 学习首页</h1>
        <section className="home-hero" aria-labelledby="home-welcome">
          <div className="home-hero-copy">
            <p className="home-eyebrow">YOUR LEARNING SPACE</p>
            <h2 id="home-welcome">你好，{displayName}。</h2>
            <p>不必一次学很多，从今天的一小步开始就好。</p>
          </div>
          <div className="home-hero-stats" aria-label="今日学习概览">
            <div>
              <strong>{todayMinutes}</strong>
              <span>今日分钟</span>
            </div>
            <div>
              <strong>{progressCount}</strong>
              <span>学习记录</span>
            </div>
            <div>
              <strong>{studyDays}</strong>
              <span>本周学习天</span>
            </div>
          </div>
        </section>

        <section className="continue-learning" aria-labelledby="continue-title">
          <div className="continue-icon" aria-hidden="true">
            ▶
          </div>
          <div className="continue-copy">
            <p className="section-kicker">CONTINUE LEARNING</p>
            <h2 id="continue-title">{continueCard.title}</h2>
            <p>{continueCard.subtitle}</p>
          </div>
          <div className="continue-action">
            <span>{continueCard.progress}</span>
            <Link to={continueCard.path}>
              继续学习 <b>→</b>
            </Link>
          </div>
        </section>

        <section className="recent-review" aria-labelledby="review-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">RECENTLY LEARNED</p>
              <h2 id="review-title">考考自己：近 7 天学过的单词和短语</h2>
            </div>
            <span className="section-note">先想一想，再看释义</span>
          </div>
          {reviewItems.length ? (
            <div className="review-grid">
              {reviewItems.map((item) => {
                const revealed = Boolean(revealedReviews[item.id]);
                return (
                  <article className="review-card" key={item.id}>
                    <span className="review-label">{item.label}</span>
                    <strong lang="en">{item.prompt}</strong>
                    <button
                      className={`review-reveal${revealed ? " is-revealed" : ""}`}
                      type="button"
                      aria-pressed={revealed}
                      onClick={() => toggleReview(item.id)}
                    >
                      {revealed ? item.answer : "点击查看释义"}
                    </button>
                    <Link className="review-open" to={item.path}>
                      回到内容 <b>→</b>
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="review-empty">
              <span>近 7 天还没有可复习的单词或短语。</span>
              <Link to="/foundation">
                去学自然拼读 <b>→</b>
              </Link>
            </div>
          )}
        </section>

        <section className="learning-areas" aria-labelledby="areas-title">
          <div className="section-heading area-heading">
            <div>
              <p className="section-kicker">EXPLORE BY AREA</p>
              <h2 id="areas-title">选择你的学习区域</h2>
            </div>
            <label className="home-search">
              <span className="sr-only">搜索学习区域或课程</span>
              <input
                type="search"
                placeholder="搜索学习内容"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          <div className="area-grid module-groups" aria-busy={loading}>
            {visibleAreas.map((area) => (
              <Link
                className="learning-area-card module-card"
                to={area.path}
                key={area.id}
              >
                <span className="area-icon" style={{ color: area.color }}>
                  {area.icon}
                </span>
                <span className="area-english">{area.english}</span>
                <strong>{area.title}</strong>
                <small>{area.description}</small>
                <span className="area-open">
                  进入学习 <b>→</b>
                </span>
              </Link>
            ))}
          </div>
          {!visibleAreas.length && !visibleCourses.length && (
            <p className="home-empty">
              没有找到匹配的学习内容，换一个关键词试试。
            </p>
          )}
        </section>

        <section
          className="recommended-courses"
          aria-labelledby="courses-title"
        >
          <div className="section-heading">
            <div>
              <p className="section-kicker">PICK UP A SHORT LESSON</p>
              <h2 id="courses-title">为你推荐</h2>
            </div>
          </div>
          <div className="course-grid">
            {visibleCourses.map((course) => (
              <Link className="course-card" key={course.id} to={course.path}>
                <span className="course-icon">{course.icon}</span>
                <span className="course-meta">{course.meta}</span>
                <strong>{course.title}</strong>
                <small>{course.subtitle}</small>
                <span className="course-open">
                  开始这节课 <b>→</b>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
