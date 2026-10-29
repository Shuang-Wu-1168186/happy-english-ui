import { useEffect, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useStudyCatalog, useStudyItem } from "../lib/study";
import { api, entries, idValue, value } from "../lib/api";
import type { ApiId, Entry } from "../lib/api";
import { Kids } from "../components/study/Kids";
import { Phonics } from "../components/study/Phonics";
import { Textbook } from "../components/study/Textbook";
import { MathCards } from "../components/study/Math";
import {
  NoteCollections,
  NoteSearchResults,
  OriginalCards,
} from "../components/study/Cards";
import { modules } from "../lib/modules";
import {
  courseLandingPath,
  isCourseResource,
  usesOriginalStudyPage,
} from "../lib/course-routes";

export function Learning() {
  const { resource = "sentences", id } = useParams();
  if (!modules.some((m) => m.key === resource) && resource !== "note-items")
    return <Message error="找不到这个学习模块。" />;
  if (isCourseResource(resource) && !usesOriginalStudyPage(resource))
    return <Navigate replace to={courseLandingPath(resource)} />;
  if (resource === "notes" && id) return <NoteDetail key={id} id={id} />;
  if (resource === "notes") return <NotesPage />;
  if (resource === "note-items" && id)
    return <NoteItemDetail key={id} id={id} />;
  if (resource === "interviews")
    return <InterviewPage id={id} />;
  return (
    <LearningContent
      key={resource}
      resource={resource}
      id={id}
    />
  );
}
export const Detail = Learning;
function Message({ error }: { error?: string }) {
  return (
    <div className="study-home">
      <main className="container">
        <Link to="/">← Back to modules</Link>
        <p
          className={error ? "error" : "empty"}
          role={error ? "alert" : "status"}
        >
          {error || "正在加载…"}
        </p>
      </main>
    </div>
  );
}

function useNoteResumeItem(noteId: ApiId, enabled: boolean) {
  const [resume, setResume] = useState<{
    noteId: ApiId;
    itemId: ApiId;
    loading: boolean;
  }>({ noteId, itemId: "", loading: enabled });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    api<Entry[]>("/progress")
      .then((progress) => {
        if (!active) return;
        const saved = progress.find(
          (entry) =>
            value(entry, "content_type") === "english_note" &&
            idValue(entry, "parent_id") === noteId,
        );
        setResume({ noteId, itemId: idValue(saved, "item_id"), loading: false });
      })
      .catch(() => {
        if (active) setResume({ noteId, itemId: "", loading: false });
      });
    return () => {
      active = false;
    };
  }, [enabled, noteId]);
  return enabled && resume.noteId === noteId
    ? resume
    : { noteId, itemId: "", loading: enabled };
}

function NoteDetail({ id, initialId }: { id: ApiId; initialId?: ApiId }) {
  const result = useStudyItem("notes", id);
  const resume = useNoteResumeItem(id, !initialId);
  if (!result?.item) return <Message error={result?.error} />;
  if (resume.loading) return <Message />;
  const hasSavedCard = entries(result.item, "items").some(
    (item) => idValue(item) === resume.itemId,
  );
  if (!initialId && resume.itemId && hasSavedCard)
    return <Navigate replace to={`/learn/note-items/${resume.itemId}`} />;
  return (
    <OriginalCards
      items={entries(result.item, "items")}
      resource="note-items"
      note={result.item}
      initialId={initialId}
    />
  );
}
function NoteItemDetail({ id }: { id: ApiId }) {
  const result = useStudyItem("note-items", id);
  if (!result?.item) return <Message error={result?.error} />;
  return <NoteDetail id={idValue(result.item, "note_id")} initialId={id} />;
}
function NotesPage() {
  const [params] = useSearchParams();
  const q = params.get("keyword") || params.get("q") || "";
  const languageRegister = params.get("language_register") || "";
  return (
    <NotesPageContent
      key={`${q}-${languageRegister || "collections"}`}
      query={q}
      languageRegister={languageRegister}
    />
  );
}
function NotesPageContent({
  query,
  languageRegister,
}: {
  query: string;
  languageRegister: string;
}) {
  const resource = query || languageRegister ? "note-items" : "notes";
  const { items, error } = useStudyCatalog(
    resource,
    undefined,
    query,
    languageRegister ? { language_register: languageRegister } : {},
  );
  if (error || !items) return <Message error={error} />;
  return query || languageRegister ? (
    <NoteSearchResults items={items} />
  ) : (
    <NoteCollections items={items} />
  );
}
function InterviewPage({ id }: { id?: ApiId }) {
  const { items, error } = useStudyCatalog("interviews"),
    categories = useStudyCatalog("interview-categories");
  if (!items || !categories.items)
    return <Message error={error || categories.error} />;
  return (
    <OriginalCards
      resource="interviews"
      items={items}
      categories={categories.items}
      initialId={id}
    />
  );
}
function LearningContent({ resource, id }: { resource: string; id?: ApiId }) {
  const { items, error } = useStudyCatalog(resource);
  if (error || !items) return <Message error={error} />;
  if (id && !items.some((i) => idValue(i) === id))
    return <Message error="未找到对应学习内容。" />;
  switch (resource) {
    case "kids-cards":
      return <Kids items={items} initialId={id} />;
    case "phonics":
      return <Phonics items={items} initialId={id} />;
    case "textbook":
      return <Textbook items={items} initialId={id} />;
    case "math-cards":
      return <MathCards items={items} initialId={id} />;
    default:
      return <OriginalCards items={items} resource={resource} initialId={id} />;
  }
}
