import { Link, useParams } from "react-router-dom";
import { useStudyCatalog, useStudyItem } from "../lib/study";
import { entries } from "../lib/api";
import { Kids } from "../components/study/Kids";
import { Phonics } from "../components/study/Phonics";
import { Textbook } from "../components/study/Textbook";
import { Dialogue } from "../components/study/Dialogue";
import { MathCards } from "../components/study/Math";
import { NoteCollections, OriginalCards } from "../components/study/Cards";
import { modules } from "../lib/modules";

export function Learning() {
  const { resource = "sentences", id } = useParams();
  if (!modules.some((m) => m.key === resource) && resource !== "note-items")
    return <Message error="找不到这个学习模块。" />;
  if (resource === "notes" && id) return <NoteDetail key={id} id={id} />;
  if (resource === "note-items" && id)
    return <NoteItemDetail key={id} id={id} />;
  if (resource === "interviews")
    return <InterviewPage id={id ? Number(id) : undefined} />;
  return (
    <LearningContent
      key={resource}
      resource={resource}
      id={id ? Number(id) : undefined}
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

function NoteDetail({ id, initialId }: { id: string; initialId?: number }) {
  const result = useStudyItem("notes", id);
  if (!result?.item) return <Message error={result?.error} />;
  return (
    <OriginalCards
      items={entries(result.item, "items")}
      resource="note-items"
      note={result.item}
      initialId={initialId}
    />
  );
}
function NoteItemDetail({ id }: { id: string }) {
  const result = useStudyItem("note-items", id);
  if (!result?.item) return <Message error={result?.error} />;
  return <NoteDetail id={String(result.item.note_id)} initialId={Number(id)} />;
}
function InterviewPage({ id }: { id?: number }) {
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
function LearningContent({ resource, id }: { resource: string; id?: number }) {
  const { items, error } = useStudyCatalog(resource);
  if (error || !items) return <Message error={error} />;
  if (id && !items.some((i) => i.id === id))
    return <Message error="Content not found." />;
  switch (resource) {
    case "kids-cards":
      return <Kids items={items} initialId={id} />;
    case "phonics":
      return <Phonics items={items} initialId={id} />;
    case "textbook":
      return <Textbook items={items} initialId={id} />;
    case "dialogues":
      return <Dialogue items={items} initialId={id} />;
    case "math-cards":
      return <MathCards items={items} initialId={id} />;
    case "notes":
      return <NoteCollections items={items} />;
    default:
      return <OriginalCards items={items} resource={resource} initialId={id} />;
  }
}
