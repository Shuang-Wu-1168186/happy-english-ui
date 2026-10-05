import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { HomeNavigation } from "../components/Layout";
import { api, value } from "../lib/api";
import { courseLandingPath } from "../lib/course-routes";
import type { Entry } from "../lib/api";

type CatalogResponse = { items?: Entry[] };

type TopicZoneTopic = {
  code: string;
  catalogId?: number;
  title: string;
  english: string;
  description: string;
  icon: string;
  color: string;
  resource: string;
  path?: string;
};

export type TopicZoneConfig = {
  moduleCode: string;
  title: string;
  eyebrow: string;
  introduction: string;
  topicsHeading: string;
  heroBackground: string;
  heroShadow: string;
  actionColor: string;
  topics: Record<string, Omit<TopicZoneTopic, "code">>;
};

function fallbackTopics(config: TopicZoneConfig): TopicZoneTopic[] {
  return Object.entries(config.topics).map(([code, topic]) => ({
    code,
    ...topic,
  }));
}

function topicFromCatalog(
  entry: Entry,
  config: TopicZoneConfig,
): TopicZoneTopic | null {
  const code = value(entry, "topic_code");
  const fallback = config.topics[code] || {
    title: value(entry, "title") || "学习专题",
    english: value(entry, "title_en") || "Learning Topic",
    description: value(entry, "description") || "查看专题内的教材课程。",
    icon: "📚",
    color: "#edf3ff",
    resource: "",
  };
  return {
    code,
    catalogId: entry.id,
    title: value(entry, "title") || fallback.title,
    english: value(entry, "title_en") || fallback.english,
    description: value(entry, "description") || fallback.description,
    icon: fallback.icon,
    color: fallback.color,
    resource: fallback.resource,
  };
}

export function TopicZone({ config }: { config: TopicZoneConfig }) {
  const [topics, setTopics] = useState(() => fallbackTopics(config));

  useEffect(() => {
    let current = true;
    async function loadTopics() {
      try {
        const modules = await api<CatalogResponse>("/learning/modules");
        const module = (modules.items || []).find(
          (item) => value(item, "module_code") === config.moduleCode,
        );
        if (!module) return;
        const detail = await api<Entry>(`/learning/modules/${module.id}`);
        const catalogTopics = Array.isArray(detail.topics)
          ? (detail.topics as Entry[])
          : [];
        const mapped = catalogTopics
          .map((topic) => topicFromCatalog(topic, config))
          .filter((topic): topic is TopicZoneTopic => topic !== null);
        if (current && mapped.length) setTopics(mapped);
      } catch {
        // The static entries keep this zone usable while its catalogue is being migrated.
      }
    }
    void loadTopics();
    return () => {
      current = false;
    };
  }, [config]);

  return (
    <div
      className={`study-home topic-zone-page ${config.moduleCode}-zone-page`}
    >
      <HomeNavigation />
      <main className="topic-zone-dashboard container">
        <BackButton className="topic-zone-back" />
        <section
          className="topic-zone-hero"
          aria-labelledby="topic-zone-title"
          style={{
            background: config.heroBackground,
            boxShadow: config.heroShadow,
          }}
        >
          <p>{config.eyebrow}</p>
          <h1 id="topic-zone-title">{config.title}</h1>
          <span>{config.introduction}</span>
        </section>

        <section
          className="topic-zone-topics"
          aria-labelledby="topic-zone-topics-title"
        >
          <div className="topic-zone-heading">
            <p>CHOOSE A DIRECTION</p>
            <h2 id="topic-zone-topics-title">{config.topicsHeading}</h2>
          </div>
          <div className="topic-zone-grid">
            {topics.map((topic) => (
              <Link
                className="topic-zone-card"
                key={topic.code}
                to={
                  topic.catalogId
                    ? `/course-topics/${topic.catalogId}`
                    : topic.path || courseLandingPath(topic.resource)
                }
                style={{ background: topic.color }}
              >
                <span className="topic-zone-icon" aria-hidden="true">
                  {topic.icon}
                </span>
                <span className="topic-zone-en">{topic.english}</span>
                <strong>{topic.title}</strong>
                <small>{topic.description}</small>
                <span
                  className="topic-zone-open"
                  style={{ color: config.actionColor }}
                >
                  开始学习 <b>→</b>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
