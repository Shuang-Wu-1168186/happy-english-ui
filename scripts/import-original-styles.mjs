// Re-run when importing an updated original UI: node scripts/import-original-styles.mjs /path/to/HappyEnglish
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
const original = path.join(
  process.argv[2] || "/Users/wushuang/Desktop/606GIS/HappyEnglish",
  "loginapp",
);
const sources = {
  home: "templates/home.html",
  cards: "static/css/english_cards.css",
  notes: "templates/english/notes.html",
  "note-detail": "templates/english/note_cards.html",
  kids: "static/css/kids_cards.css",
  phonics: "static/css/phonics.css",
  textbook: "static/css/textbook.css",
  dialogue: "static/css/daily_spoken_dialogue.css",
  math: "static/css/math_cards.css",
  interview: "templates/interview_cards/card_list.html",
  login: "templates/auth/login.html",
  userbase: "templates/userbase.html",
  editor: "templates/english/english_note_item_create.html",
  "interview-editor": "templates/interview_cards/manage_form.html",
};
function scopeCss(css, scope) {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (rule.parent.type === "atrule" && /keyframes$/.test(rule.parent.name))
      return;
    rule.selectors = rule.selectors.map((selector) => {
      if (selector === ":root" || selector === "body" || selector === "html")
        return scope;
      if (selector.startsWith("body ")) return scope + selector.slice(4);
      return `${scope} ${selector}`;
    });
  });
  return root
    .toString()
    .replaceAll("../images/", "/original/images/")
    .replaceAll("/static/login_bg.jpg", "/original/login_bg.jpg");
}
for (const [name, source] of Object.entries(sources)) {
  let css = fs.readFileSync(path.join(original, source), "utf8");
  if (source.endsWith(".html"))
    css = [...css.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
      .map((m) => m[1])
      .join("\n");
  fs.writeFileSync(
    `src/styles/${name}.css`,
    `/* Ported verbatim, with selector scoping, from HappyEnglish/loginapp/${source}. */\n` +
      scopeCss(css, `.study-${name}`),
  );
}
const bootstrap = fs
  .readFileSync("public/vendor/bootstrap.min.css", "utf8")
  .replace(/\/\*# sourceMappingURL=.*?\*\//g, "");
fs.writeFileSync(
  "src/styles/bootstrap.css",
  scopeCss(bootstrap, ".account-ui"),
);
