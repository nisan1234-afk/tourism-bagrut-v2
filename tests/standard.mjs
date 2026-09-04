// בדיקת תקן: כל יחידה חייבת לעמוד באותו מבנה פדגוגי (docs/UNIT_STANDARD_SPEC_HE.md).
// נכשל אם יחידה חסרה רכיב חובה; מזהיר על פערי תוכן שממתינים למורה (תמונות, בוחן).
// הרצה: npm run standard
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const UNITS_DIR = new URL('../units/', import.meta.url).pathname;
// מישור החוף עדיין על המנוע הישן (unit.js). נבדק רק על המעטפת המשותפת עד שיועבר.
const LEGACY_SHELL_ONLY = new Set(['coastal-plain.html']);

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

  if (LEGACY_SHELL_ONLY.has(file)) {
    warn(file, 'מנוע ישן (unit.js): נבדקת רק המעטפת. נכלל ברשימת ההעברה למנוע המשותף.');
    continue;
  }

  // חוזה המנוע המשותף
  if (!/<body[^>]*data-unit-id="[a-z_]+"/.test(html)) fail(file, 'חסר data-unit-id על body');
  if (!/data-unit-label="[^"]+"/.test(html)) fail(file, 'חסר data-unit-label');
  if (!/unit-runtime\.js/.test(html)) fail(file, 'לא טוען את unit-runtime.js');
  if (!/id="pageNav"/.test(html)) fail(file, 'חסר #pageNav');
  for (const id of ['unitMeter', 'unitPercent', 'prevPage', 'nextPage', 'pageCounter', 'menuToggle', 'unitRail', 'coachForm', 'coachInput', 'coachLog']) {
    if (!html.includes(`id="${id}"`)) fail(file, `חסר #${id}`);
  }
  if (/onclick=/.test(html)) fail(file, 'onclick אינליין (המנוע מחבר מאזינים בעצמו)');

  const panels = [...html.matchAll(/<section class="lesson-page[^"]*" data-page-panel="([a-z]+)">([\s\S]*?)<\/section>/g)];
  const ids = panels.map((m) => m[1]);
  if (panels.length < 6) fail(file, `רק ${panels.length} דפים (מינימום 6: תוכן, תמונות, מצגת, תרגול)`);
  for (const required of ['images', 'presentation', 'practice']) if (!ids.includes(required)) fail(file, `חסר דף ${required}`);
  const navButtons = count(html, /<button data-page="[a-z]+">/g);
  if (navButtons && navButtons !== panels.length) fail(file, `כפתורי ניווט (${navButtons}) לא תואמים לדפים (${panels.length})`);

  for (const [, id, inner] of panels) {
    if (!/class="complete-page"/.test(inner)) fail(file, `דף ${id}: חסר כפתור "סיימתי"`);
    if (['images', 'presentation', 'practice'].includes(id)) continue;
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
    if (!cards) warn(file, 'דף התמונות ריק — ממתין לתמונות מאושרות מהמאגר');
  }
  const presentation = panels.find((p) => p[1] === 'presentation');
  if (presentation && !/id="slideStage"/.test(presentation[2])) fail(file, 'דף המצגת בלי #slideStage');
  const practice = panels.find((p) => p[1] === 'practice');
  if (practice) {
    if (!/id="unitQuiz"/.test(practice[2])) fail(file, 'דף התרגול בלי #unitQuiz');
    if (!/id="examBank"/.test(practice[2])) fail(file, 'דף התרגול בלי #examBank');
  }

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
    }
  }

  console.log(`${failures === problems ? 'ok  ' : '    '} ${file} (${panels.length} דפים)`);
}

if (failures) {
  console.error(`\n${failures} הפרות תקן`);
  process.exit(1);
}
console.log('\nכל היחידות עומדות בתקן');
