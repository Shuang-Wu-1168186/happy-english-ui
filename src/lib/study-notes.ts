import type { Entry } from "./api";
import { value } from "./api";

function isStarterNoteCard(item: Entry) {
  return (
    value(item, "item_type") === "knowledge" &&
    value(item, "item_title") === "Study Notes" &&
    value(item, "raw_text") ===
      "Keep useful English in one place and review it regularly."
  );
}

export function visibleStudyNoteCards(items: Entry[]) {
  return items.filter((item) => !isStarterNoteCard(item));
}
