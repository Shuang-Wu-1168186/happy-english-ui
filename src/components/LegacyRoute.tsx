import { Navigate, useLocation } from "react-router-dom";
// Preserve bookmarks from the Flask application while React owns navigation.
export function LegacyRoute() {
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const routes: Record<string, string> = {
    "/english/home": "/",
    "/english/cards": "/learn/sentences",
    "/english/notes": "/learn/notes",
    "/english/kids-cards": "/learn/kids-cards",
    "/english/phonics": "/learn/phonics",
    "/english/textbook": "/learn/textbook",
    "/english/daily-spoken-dialogue": "/learn/dialogues",
    "/english/math-cards": "/learn/math-cards",
    "/english/vocabulary-cards": "/learn/vocabulary",
    "/english/interview-cards": "/learn/interviews",
    "/english/content/create": "/admin/content",
  };
  let to = routes[pathname];
  if (pathname === "/english/note-cards")
    to = params.get("item_id")
      ? `/learn/note-items/${params.get("item_id")}`
      : params.get("note_id")
        ? `/learn/notes/${params.get("note_id")}`
        : "/learn/notes";
  if (pathname === "/english/interview-question/manage") {
    to = "/admin/content";
    params.set("resource", "interviews");
    if (params.has("question_id")) params.set("id", params.get("question_id")!);
  }
  if (!to) return <Navigate to="/" replace />;
  return (
    <Navigate
      to={`${to}${params.size ? `${to.includes("?") ? "&" : "?"}${params}` : ""}`}
      replace
    />
  );
}
