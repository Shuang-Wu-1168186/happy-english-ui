import { Navigate, useLocation } from "react-router-dom";
import { courseLandingPath } from "../lib/course-routes";
// Preserve bookmarks from the Flask application while React owns navigation.
export function LegacyRoute() {
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const routes: Record<string, string> = {
    "/english/home": "/",
    "/english/cards": courseLandingPath("sentences"),
    "/english/notes": "/learn/notes",
    "/english/kids-cards": courseLandingPath("kids-cards"),
    "/english/phonics": courseLandingPath("phonics"),
    "/english/textbook": courseLandingPath("textbook"),
    "/english/daily-spoken-dialogue": courseLandingPath("dialogues"),
    "/english/math-cards": courseLandingPath("math-cards"),
    "/english/vocabulary-cards": courseLandingPath("vocabulary"),
    "/english/interview-cards": courseLandingPath("interviews"),
    "/english/content/create": "/admin/content/notes",
  };
  let to = routes[pathname];
  if (pathname === "/english/note-cards")
    to = params.get("item_id")
      ? `/learn/note-items/${params.get("item_id")}`
      : params.get("note_id")
        ? `/learn/notes/${params.get("note_id")}`
        : "/learn/notes";
  if (pathname === "/english/interview-question/manage") {
    to = "/admin/content/notes";
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
