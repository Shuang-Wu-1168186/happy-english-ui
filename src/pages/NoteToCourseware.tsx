import { useEffect, useState } from "react";
import { api, entries, value } from "../lib/api";
import type { Entry } from "../lib/api";
import { PutAsideStyleCourseware } from "../components/courseware/PutAsideStyleCourseware";

export function NoteToCourseware() {
  const [notes, setNotes] = useState<Entry[]>([]);
  const [topics, setTopics] = useState<Entry[]>([]);
  const [items, setItems] = useState<Entry[]>([]);
  const [noteId, setNoteId] = useState("");
  const [itemId, setItemId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [preview, setPreview] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void Promise.all([
      api<{ items: Entry[] }>("/admin/courseware/source-notes"),
      api<{ items: Entry[] }>("/admin/learning-topics"),
    ]).then(([sourceNotes, sourceTopics]) => {
      setNotes(sourceNotes.items);
      setTopics(sourceTopics.items);
      const phraseTopic = sourceTopics.items.find((topic) => value(topic, "topic_code") === "phrase-courseware");
      setTopicId(String(phraseTopic?.id || sourceTopics.items[0]?.id || ""));
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  async function selectNote(nextId: string) {
    setNoteId(nextId); setItemId(""); setItems([]); setPreview(null); setMessage("");
    if (!nextId) return;
    try {
      const result = await api<{ items: Entry[] }>(`/admin/courseware/source-notes/${nextId}/items`);
      setItems(result.items);
    } catch (reason) { setError((reason as Error).message); }
  }

  async function selectItem(nextId: string) {
    setItemId(nextId); setPreview(null); setMessage("");
    if (!nextId) return;
    setBusy(true); setError("");
    try { setPreview(await api<Entry>("/admin/courseware/note-preview", "POST", { note_item_id: Number(nextId) })); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  async function generate() {
    if (!itemId || !topicId) return;
    setBusy(true); setError("");
    try {
      const result = await api<Entry>("/admin/courseware/from-note-item", "POST", { note_item_id: Number(itemId), topic_id: Number(topicId) });
      const generatedLessons = entries(result, "lessons");
      const splitLabels = generatedLessons.map((lesson) => value(lesson, "phrase")).filter(Boolean);
      if (splitLabels.length > 1) {
        setMessage(result.rebuilt === true
          ? `已更新 ${splitLabels.length} 条独立课时：${splitLabels.join("、")}。`
          : `已生成 ${splitLabels.length} 条独立课时：${splitLabels.join("、")}。`);
      } else {
        setMessage(result.rebuilt === true
          ? `已更新教材 #${result.material_id} 的课件区块。`
          : `已生成教材 #${result.material_id}、课时 #${result.lesson_id} 和课程 #${result.course_id}。`);
      }
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  const blocks = entries(preview || { id: 0 }, "blocks");
  const previewEntries = entries(preview || { id: 0 }, "entries");
  const coursewarePreviews = previewEntries.length
    ? previewEntries
    : [{ id: 0, phrase: "", blocks } as Entry];
  return <main className="note-to-courseware">
    <header><p>CONTENT WORKBENCH</p><h1>笔记转教材</h1><span>选择笔记词条，确认右侧课件预览后生成教材、课时和可追溯的课件区块。</span></header>
    {error && <p className="error">{error}</p>}
    {message && <p className="note-courseware-success">{message}</p>}
    <div className="note-courseware-grid">
      <section className="note-courseware-controls">
        <label>选择笔记<select value={noteId} onChange={(event) => void selectNote(event.target.value)}><option value="">请选择笔记</option>{notes.map((note) => <option key={note.id} value={note.id}>{value(note, "title") || `笔记 #${note.id}`}</option>)}</select></label>
        <label>选择词条<select disabled={!noteId} value={itemId} onChange={(event) => void selectItem(event.target.value)}><option value="">请选择词条</option>{items.map((item) => <option key={item.id} value={item.id}>{value(item, "english_text") || value(item, "raw_text") || value(item, "item_title")}</option>)}</select></label>
        <label>生成到专题<select value={topicId} onChange={(event) => setTopicId(event.target.value)}><option value="">请选择专题</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{value(topic, "title")}</option>)}</select></label>
        <button disabled={!preview || busy || !topicId} onClick={() => void generate()} type="button">{busy ? "正在生成…" : `确认生成${coursewarePreviews.length > 1 ? ` ${coursewarePreviews.length} 条课时` : "教材"}`}</button>
        <small>确认后会创建 `learning_material`、`learning_material_lesson`、`courseware_block`、`courseware_block_source` 与学习课程记录。</small>
      </section>
      <section className="note-courseware-preview">
        {!preview ? <p>{busy ? "正在生成预览…" : "从左侧选择词条后，在这里查看课件预览。"}</p> : coursewarePreviews.map((entry, index) => <div className="note-courseware-preview-entry" key={`${value(entry, "phrase")}-${index}`}>
          {coursewarePreviews.length > 1 && <header><span>独立课时 {index + 1} / {coursewarePreviews.length}</span><strong>{value(entry, "phrase")}</strong></header>}
          <PutAsideStyleCourseware blocks={entries(entry, "blocks")} preview />
        </div>)}
      </section>
    </div>
  </main>;
}
