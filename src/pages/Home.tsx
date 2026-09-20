import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { modules } from "../lib/modules";
import { originalModules } from "../lib/original-modules";
import { HomeNavigation } from "../components/Layout";

const groups = [
  {
    id: "student",
    icon: "🎒",
    title: "学生课本",
    description: "教材、自然拼读与基础学习内容",
    keys: ["kids-cards", "phonics", "textbook"],
  },
  {
    id: "notes",
    icon: "📝",
    title: "学习笔记",
    description: "知识卡片、笔记与重点复习",
    keys: ["notes", "math-cards"],
  },
  {
    id: "work",
    icon: "💼",
    title: "工作",
    description: "面试、职场表达与专业词汇",
    keys: ["interviews", "vocabulary"],
  },
  {
    id: "daily",
    icon: "☀️",
    title: "日常",
    description: "日常场景表达与实用口语对话",
    keys: ["sentences", "dialogues"],
  },
];

export function Home() {
  const [query, setQuery] = useState("");
  const { user } = useAuth();
  return (
    <div className="study-home">
      <HomeNavigation />
      <main className="container">
        <h1 className="sr-only">探索学习模块</h1>
        <div className="toolbar">
          <input
            className="search"
            type="search"
            aria-label="搜索学习模块"
            placeholder="Search modules later..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <section className="module-groups" aria-label="学习模块导航">
          {groups.map((group) => {
            const keys = group.keys
              .filter(
                (key) =>
                  !["learner", "premium_learner"].includes(user?.role || "") ||
                  originalModules[key].learner_visible,
              )
              .filter((key) =>
                `${originalModules[key].title} ${originalModules[key].description} ${modules.find((m) => m.key === key)?.title}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              );
            if (!keys.length) return null;
            return (
              <details
                className="module-group"
                key={`${group.id}-${Boolean(query)}`}
                open={Boolean(query) || group.id === "daily"}
              >
                <summary className="group-summary">
                  <span className="group-icon">{group.icon}</span>
                  <span className="group-copy">
                    <strong>{group.title}</strong>
                    <small>{group.description}</small>
                  </span>
                  <span className="group-count">{keys.length} modules</span>
                  <span className="group-arrow" aria-hidden="true">
                    ›
                  </span>
                </summary>
                <div className="group-grid grid">
                  {keys.map((key) => {
                    const m = originalModules[key];
                    return (
                      <Link
                        className={`module-card${m.kids ? " kids-module" : ""}`}
                        to={`/learn/${key}`}
                        key={key}
                        aria-label={`${m.title} · ${modules.find((m) => m.key === key)?.title}`}
                      >
                        <div className="module-top">
                          <div className="module-icon">{m.icon}</div>
                          <div className="module-badge">{m.badge}</div>
                        </div>
                        <h3 className="module-title">{m.title}</h3>
                        <p className="module-desc">{m.description}</p>
                        <div className="module-tags">
                          {m.tags.map((tag) => (
                            <span className="mini-tag" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="module-footer">
                          <span className="module-count">{m.count}</span>
                          <span className="module-link">Open</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </details>
            );
          })}
          {query &&
            !Object.entries(originalModules).some(([key, m]) =>
              `${m.title} ${m.description} ${modules.find((x) => x.key === key)?.title}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && <p className="empty">没有匹配的学习模块。</p>}
        </section>
      </main>
    </div>
  );
}
