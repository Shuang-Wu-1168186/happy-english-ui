import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { HomeNavigation } from "../components/Layout";
import { api, entries, value } from "../lib/api";
import type { Entry } from "../lib/api";

function CatalogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="study-home course-catalog-page">
      <HomeNavigation />
      <main className="container course-catalog-main">{children}</main>
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <p className="course-catalog-message">{children}</p>;
}

const personalNotesTopicCode = "my-english-notes";
const privateZoneDescription = "集中查看你的学习笔记、重点卡片和复习内容。";

const fallbackPersonalNotesTopic: Entry = {
  id: 0,
  topic_code: personalNotesTopicCode,
  title: "我的英语笔记",
  description: "整理个人学习笔记、卡片和复习内容。",
};

function isPersonalNotesTopic(topic: Entry) {
  return value(topic, "topic_code") === personalNotesTopicCode;
}

function topicPath(topic: Entry) {
  return isPersonalNotesTopic(topic)
    ? "/learn/notes"
    : `/course-topics/${topic.id}`;
}

function MaterialCards({ materials }: { materials: Entry[] }) {
  if (!materials.length)
    return <Message>这个专题暂时还没有可学习的教材。</Message>;
  return (
    <div className="course-catalog-grid">
      {materials.map((material) => {
        const title = value(material, "title") || "未命名教材";
        const summary = value(material, "summary") || "点击查看词条";
        const card = <>
          <span className="course-catalog-icon" aria-hidden="true">
            📚
          </span>
          <span className="course-catalog-kicker">教材</span>
          <strong>{title}</strong>
          <small>{summary}</small>
          <span className="course-catalog-open">查看词条 <b>→</b></span>
        </>;
        return (
          <Link
            className="course-catalog-card"
            data-material-id={material.id}
            key={material.id}
            to={`/learning-materials/${material.id}`}
          >
            {card}
          </Link>
        );
      })}
    </div>
  );
}

export function CourseTopicCatalog() {
  const { topicId = "" } = useParams();
  const id = Number(topicId);
  const [topic, setTopic] = useState<Entry | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setError("专题地址无效。");
      return;
    }
    let active = true;
    api<Entry>(`/learning/topics/${id}`)
      .then((result) => active && setTopic(result))
      .catch((requestError: Error) => active && setError(requestError.message));
    return () => {
      active = false;
    };
  }, [id]);

  if (error)
    return (
      <CatalogShell>
        <BackButton className="course-back" />
        <Message>{error}</Message>
      </CatalogShell>
    );
  if (!topic)
    return (
      <CatalogShell>
        <Message>正在读取专题课程…</Message>
      </CatalogShell>
    );
  if (isPersonalNotesTopic(topic))
    return <Navigate replace to="/learn/notes" />;
  return (
    <CatalogShell>
      <BackButton className="course-back" />
      <section className="course-catalog-hero">
        <p>LEARNING TOPIC</p>
        <h1>{value(topic, "title")}</h1>
        <span>{value(topic, "description") || "选择一本教材查看词条。"}</span>
      </section>
      <section aria-labelledby="topic-materials-title">
        <div className="course-catalog-heading">
          <p>MATERIALS</p>
          <h2 id="topic-materials-title">选择教材</h2>
        </div>
        <MaterialCards materials={entries(topic, "materials")} />
      </section>
    </CatalogShell>
  );
}

export function CourseModuleCatalog() {
  const { moduleId = "" } = useParams();
  const id = Number(moduleId);
  const [module, setModule] = useState<Entry | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setError("学习区域地址无效。");
      return;
    }
    let active = true;
    api<Entry>(`/learning/modules/${id}`)
      .then((result) => active && setModule(result))
      .catch((requestError: Error) => active && setError(requestError.message));
    return () => {
      active = false;
    };
  }, [id]);

  const topics = useMemo(
    () => (module ? entries(module, "topics") : []),
    [module],
  );
  const isPrivateZone = value(module, "module_code") === "private-zone";
  const displayTopics =
    isPrivateZone && !topics.some(isPersonalNotesTopic)
      ? [fallbackPersonalNotesTopic, ...topics]
      : topics;
  if (error)
    return (
      <CatalogShell>
        <BackButton className="course-back" />
        <Message>{error}</Message>
      </CatalogShell>
    );
  if (!module)
    return (
      <CatalogShell>
        <Message>正在读取学习区域…</Message>
      </CatalogShell>
    );
  return (
    <CatalogShell>
      <BackButton className="course-back" />
      <section className="course-catalog-hero">
        <p>LEARNING AREA</p>
        <h1>{value(module, "name")}</h1>
        <span>
          {isPrivateZone
            ? privateZoneDescription
            : value(module, "description") || "选择一个专题，再进入教材课程。"}
        </span>
      </section>
      <section aria-labelledby="module-topics-title">
        <div className="course-catalog-heading">
          <p>TOPICS</p>
          <h2 id="module-topics-title">
            {isPrivateZone ? "选择你的私人内容" : "选择学习专题"}
          </h2>
        </div>
        {displayTopics.length ? (
          <div className="course-catalog-grid">
            {displayTopics.map((topic) => (
              <Link
                className="course-catalog-card"
                key={topic.id}
                to={topicPath(topic)}
              >
                <span className="course-catalog-icon" aria-hidden="true">
                  {isPersonalNotesTopic(topic) ? "📝" : "🧭"}
                </span>
                <span className="course-catalog-kicker">
                  {isPersonalNotesTopic(topic) ? "私人内容" : "学习专题"}
                </span>
                <strong>{value(topic, "title")}</strong>
                <small>
                  {value(topic, "description") ||
                    (isPersonalNotesTopic(topic)
                      ? "查看你的笔记和复习卡片"
                    : "查看专题内的教材")}
                </small>
                <span className="course-catalog-open">
                  {isPersonalNotesTopic(topic) ? "打开笔记" : "查看教材"}{" "}
                  <b>→</b>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Message>这个学习区域暂时还没有专题。</Message>
        )}
      </section>
    </CatalogShell>
  );
}
