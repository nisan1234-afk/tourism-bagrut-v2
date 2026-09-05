// בדיקת תקן: כל יחידה חייבת לעמוד באותו מבנה פדגוגי (docs/UNIT_STANDARD_SPEC_HE.md).
// נכשל אם יחידה חסרה רכיב חובה; מזהיר על פערי תוכן שממתינים למורה (תמונות, בוחן).
// הרצה: npm run standard
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const UNITS_DIR = new URL('../units/', import.meta.url).pathname;
// סוגי משחקים שהמנוע מכיר (unit-runtime.js, GAME_TYPES)
const GAME_TYPES = new Set(['match', 'clues', 'order', 'memory', 'puzzle', 'map', 'streak', 'speed', 'silent-map', 'recognition']);

let failures = 0;
const fail = (file, msg) => {
  failures++;
  console.log(`FAIL ${file}: ${msg}`);
};
const warn = (file, msg) => console.log(`warn ${file}: ${msg}`);
const count = (s, re) => (s.match(re) || []).length;

for (const file of readdirSync(UNITS_DIR).filter((f) => f.endsWith('.html')).sort()) {
  const html = readFileSync(join(UNITS_DIR, file), 'utf8');
  const problems = failures;

  // מעטפת משותפת לכל יחידה
  if (!/session-guard\.js/.test(html)) fail(file, 'חסר session-guard.js (פקיעת טוקן)');
  if (!/app\.js\?v=/.test(html)) fail(file, 'חסר app.js (התראות מורה)');
  if (!/content-overrides\.js/.test(html)) fail(file, 'חסר content-overrides.js (עריכת תוכן למורה)');
  if (!/id="coachWidget"/.test(html)) fail(file, 'חסר ווידג׳ט המאמן');
  if (!/class="access-gate"/.test(html)) fail(file, 'חסר שער כניסה');

  // חוזה המנוע המשותף
  if (!/<body[^>]*data-unit-id="[a-z_]+"/.test(html)) fail(file, 'חסר data-unit-id על body');
  if (!/data-unit-label="[^"]+"/.test(html)) fail(file, 'חסר data-unit-label');
  if (!/unit-runtime\.js/.test(html)) fail(file, 'לא טוען את unit-runtime.js');
  if (!/id="pageNav"/.test(html)) fail(file, 'חסר #pageNav');
  for (const id of ['unitMeter', 'unitPercent', 'prevPage', 'nextPage', 'pageCounter', 'menuToggle', 'unitRail', 'coachForm', 'coachInput', 'coachLog']) {
    if (!html.includes(`id="${id}"`)) fail(file, `חסר #${id}`);
  }
  if (/onclick=/.test(html)) fail(file, 'onclick אינליין (המנוע מחבר מאזינים בעצמו)');

  const panels = [...html.matchAll(/<section class="lesson-page[^"]*" data-page-panel="([a-z-]+)"(?: data-page-kind="([a-z]+)")?>([\s\S]*?)<\/section>/g)].map((m) => [m[0], m[1], m[3], m[2] || (m[1] === 'open-practice' ? 'exam' : ['images', 'presentation', 'practice', 'games'].includes(m[1]) ? m[1] : 'content')]);
  const ids = panels.map((m) => m[1]);
  if (panels.length < 6) fail(file, `רק ${panels.length} דפים (מינימום 6: תוכן, תמונות, מצגת, תרגול)`);
  for (const required of ['images', 'presentation', 'practice']) if (!ids.includes(required)) fail(file, `חסר דף ${required}`);
  const navButtons = count(html, /<button data-page="[a-z-]+">/g);
  if (navButtons && navButtons !== panels.length) fail(file, `כפתורי ניווט (${navButtons}) לא תואמים לדפים (${panels.length})`);

  for (const [, id, inner, kind] of panels) {
    if (!/class="complete-page"/.test(inner)) fail(file, `דף ${id}: חסר כפתור "סיימתי"`);
    if (kind === 'games' && !/id="gamesSummary"/.test(inner)) fail(file, `דף ${id}: דף משחקים בלי #gamesSummary`);
    if (kind === 'exam' && !/id="examBank"/.test(inner)) fail(file, `דף ${id}: דף מאגר בלי #examBank`);
    if (kind !== 'content') continue;
    if (!/class="check-card"/.test(inner)) fail(file, `דף ${id}: חסרה שאלת סיום (check-card)`);
    if (!/<textarea[^>]*data-open-question=/.test(inner)) fail(file, `דף ${id}: חסר textarea[data-open-question]`);
    if (!/class="check-open"/.test(inner)) fail(file, `דף ${id}: חסר כפתור בדיקה`);
    if (!/class="answer-feedback"/.test(inner)) fail(file, `דף ${id}: חסר answer-feedback`);
    if (!/<h2[^>]*data-field-key=/.test(inner)) fail(file, `דף ${id}: הכותרת בלי data-field-key (לא ניתנת לעריכה)`);
  }

  const images = panels.find((p) => p[1] === 'images');
  if (images) {
    const cards = count(images[2], /data-recognition="/g);
    // צילומי אתרים ונופים רק מהמאגר; תמונות עיצוב/אביזר (מפה אילמת וכו') מסומנות data-decor ופטורות (הבהרת נסים, 04.09)
    const external = [...images[2].matchAll(/<img src="(https?:\/\/[^"]+)"([^>]*)>/g)].filter((m) => !/data-decor/.test(m[2])).map((m) => m[1]).filter((u) => !u.startsWith('https://nisan1234-afk.github.io/'));
    if (external.length) fail(file, `צילומי אתר ממקור לא מאושר: ${external.join(', ')}`);
    if (!cards && !/data-games-slot/.test(images[2])) warn(file, 'דף התמונות ריק — ממתין לתמונות מאושרות מהמאגר');
  }
  const presentation = panels.find((p) => p[1] === 'presentation');
  if (presentation && !/id="slideStage"/.test(presentation[2])) fail(file, 'דף המצגת בלי #slideStage');
  const practice = panels.find((p) => p[1] === 'practice');
  if (practice && !/id="unitQuiz"/.test(practice[2])) fail(file, 'דף התרגול בלי #unitQuiz');
  // מאגר הבגרות: בדף התרגול, או בדף נפרד מסוג exam (הסטנדרט של מישור החוף)
  if (!panels.some((p) => /id="examBank"/.test(p[2]))) fail(file, 'אין #examBank באף דף');

  const dataMatch = html.match(/<script type="application\/json" id="unitData">([\s\S]*?)<\/script>/);
  if (!dataMatch) fail(file, 'חסר #unitData');
  else {
    let data;
    try {
      data = JSON.parse(dataMatch[1].replace(/<\\\//g, '</'));
    } catch (e) {
      fail(file, 'unitData אינו JSON תקין: ' + e.message);
    }
    if (data) {
      if (!Array.isArray(data.slides) || data.slides.length < 3) fail(file, 'פחות מ-3 שקופיות');
      for (const s of data.slides || []) if (!s.t || !s.p) fail(file, 'שקופית בלי כותרת/טקסט');
      if (!Array.isArray(data.exam) || !data.exam.length) fail(file, 'אין שאלות בגרות/תרגול');
      const parts = (data.exam || []).reduce((n, q) => n + (q.parts || []).length, 0);
      if (parts < 3) fail(file, `רק ${parts} סעיפי תרגול (מינימום 3)`);
      if (!Array.isArray(data.quiz)) fail(file, 'quiz אינו מערך');
      else if (data.quiz.length === 0) warn(file, 'אין בוחן — הדף מציג "יתווסף כשיאושר". ממתין לשאלות מאושרות מהמורה');
      else if (data.quiz.length < 10) fail(file, `בוחן קצר מדי (${data.quiz.length}, מינימום 10)`);
      for (const q of data.quiz || []) {
        if (!q.q || !Array.isArray(q.a) || q.a.length < 2 || typeof q.correct !== 'number' || q.correct >= q.a.length) fail(file, 'שאלת בוחן פגומה: ' + (q.q || '?').slice(0, 40));
      }
      // משחקים: כל משחק חייב id ייחודי, סוג מוכר ודף קיים; דף games חייב לפחות משחק אחד ביחידה
      const games = Array.isArray(data.games) ? data.games : [];
      const gameIds = new Set();
      for (const g of games) {
        if (!g.id || gameIds.has(g.id)) fail(file, 'משחק בלי id ייחודי: ' + JSON.stringify(g.id));
        gameIds.add(g.id);
        if (!GAME_TYPES.has(g.type)) fail(file, `משחק ${g.id}: סוג לא מוכר "${g.type}"`);
        if (!ids.includes(g.page)) fail(file, `משחק ${g.id}: מפנה לדף שלא קיים "${g.page}"`);
      }
      if (ids.includes('games') && !games.length) fail(file, 'יש דף games אבל אין משחקים ב-unitData');
    }
  }

  const gameCount = (html.match(/"type":"(match|clues|order|memory|puzzle|map|streak|speed|silent-map|recognition)"/g) || []).length;
  console.log(`${failures === problems ? 'ok  ' : '    '} ${file} (${panels.length} דפים, ${gameCount} משחקים)`);
}

if (failures) {
  console.error(`\n${failures} הפרות תקן`);
  process.exit(1);
}
console.log('\nכל היחידות עומדות בתקן');
