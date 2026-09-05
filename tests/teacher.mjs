// בדיקת דשבורד המורה מול שרת מדומה: Playwright עונה במקום Apps Script עם נתוני כיתה קבועים,
// ובודק שהרשימה, התובנות ו"דוח שיעור" מציגים את מה שהנתונים אומרים (ולא מה שנוח).
// הרצה: npm run teacher
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };
const now = Math.floor(Date.now() / 1000);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const USER = { name: 'מורה בדיקה', email: 'smoke.teacher@example.com', roles: ['teacher'], role: 'teacher', token: `${b64({ alg: 'none' })}.${b64({ email: 'smoke.teacher@example.com', exp: now + 3600 })}.sig` };

const todayAt = (h) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const daysAgo = (n) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();
const unit = (unit_id, name, extra = {}) => ({ unit_id, name, best_score: 0, total_questions: 20, attempts: 0, completed: false, percent: 0, last_activity: '', ...extra });
const UNITS = ['mishor_hachof:מישור החוף', 'yerushalayim:ירושלים', 'haamakim:העמקים', 'yam_hamelach:ים המלח ומדבר יהודה', 'galil:הגליל', 'hashivut:חשיבות התיירות'].map((s) => s.split(':'));
const student = (name, email, overrides) => {
  const units = UNITS.map(([id, n]) => unit(id, n, overrides[id] || {}));
  const times = units.map((u) => u.last_activity).filter(Boolean).map((t) => new Date(t).getTime());
  return { email, name, class_name: 'י״א 2', units, percent: Math.round(units.slice(0, 5).reduce((s, u) => s + u.percent, 0) / 5), completedCount: units.filter((u) => u.completed).length, openAnswerCount: overrides.open || 0, best_score: overrides.best ?? null, last_active: times.length ? new Date(Math.max(...times)).toISOString() : '' };
};
const STUDENTS = [
  // פעילה היום בשתי יחידות, עברה בוחן בירושלים
  student('דנה כהן', 'dana@example.com', { yerushalayim: { percent: 100, attempts: 1, best_score: 17, completed: true, last_activity: todayAt(9) }, galil: { percent: 40, last_activity: todayAt(10) }, open: 3, best: 85 }),
  // פעיל היום ביחידה אחת
  student('יוסי לוי', 'yossi@example.com', { galil: { percent: 20, last_activity: todayAt(9) }, open: 1 }),
  // פעילה רק לפני 3 ימים: "לא נראתה היום"
  student('נועה בר', 'noa@example.com', { mishor_hachof: { percent: 60, attempts: 2, best_score: 9, last_activity: daysAgo(3) }, best: 45 }),
  // טרם התחיל
  student('אלי שמש', 'eli@example.com', {}),
];
const RESPONSES = {
  getBagrutTeacherDashboard: { students: STUDENTS, stats: { total: 4 }, units: [] },
  getBagrutPendingReviewsForTeacher: { pending: [{ id: 'r1', email: 'dana@example.com', student_name: 'דנה כהן', unit_id: 'yerushalayim', question: 'שאלה', answer: 'תשובה', bot_feedback: 'משוב', timestamp: todayAt(9) }] },
  getBagrutAssignment: { assignment: null },
  getAllContentOverrides: { overrides: {} },
};

async function serve() {
  const server = createServer(async (req, res) => {
    let file = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
async function launch() {
  try { return await chromium.launch(); }
  catch { return chromium.launch({ executablePath: ['/opt/pw-browsers/chromium', '/usr/bin/chromium'].find((p) => existsSync(p)) }); }
}

const { server, origin } = await serve();
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addInitScript((u) => sessionStorage.setItem('kitahUser', JSON.stringify(u)), USER);
const seen = [];
await context.route('**/*', (route) => {
  const req = route.request();
  if (req.url().startsWith(origin)) return route.continue();
  if (req.url().includes('script.google.com') && req.method() === 'POST') {
    let action = '';
    try { action = JSON.parse(req.postData() || '{}').action; } catch {}
    seen.push(action);
    const data = RESPONSES[action];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data ? { ok: true, data } : { ok: false, error: 'פעולה לא מוכרת בבדיקה: ' + action }) });
  }
  return route.abort();
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const problems = [];
const expect = (cond, msg) => { if (!cond) problems.push(msg); };

await page.goto(`${origin}/teacher.html`, { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('teacherDataState')?.textContent === 'מחובר לכיתה פלוס', null, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(400);

expect(seen.includes('getBagrutTeacherDashboard'), 'הדשבורד לא ביקש את נתוני הכיתה');
expect((await page.locator('#studentsBody tr').count()) === 4, 'רשימת התלמידים לא מציגה 4 שורות');
const pulse = await page.textContent('#classPulse');
expect(pulse.includes('טרם התחילו') && /טרם התחילו\s*1/.test(pulse.replace(/\s+/g, ' ')), 'דופק הכיתה: "טרם התחילו" צריך להיות 1');
const stats = (await page.textContent('#teacherStats')).replace(/\s+/g, ' ');
expect(/פעילים היום\s*2/.test(stats), 'תובנות: "פעילים היום" צריך להיות 2');
expect(stats.includes('נועה בר') && stats.includes('אלי שמש'), 'תובנות: "לא נראו היום" צריך לכלול את נועה ואלי');
expect(/ממתינות לבדיקתך\s*1/.test(stats), 'תובנות: תשובה אחת ממתינה');

// דוח שיעור להיום
const summary = (await page.textContent('#reportSummary')).replace(/\s+/g, ' ');
expect(/פעילים\s*2\s*מתוך 4/.test(summary), 'דוח שיעור: 2 מתוך 4 פעילים');
expect(/לא נראו\s*2/.test(summary), 'דוח שיעור: 2 לא נראו');
expect(summary.includes('הגליל') && summary.includes('2 תלמידים'), 'דוח שיעור: היחידה הפעילה ביותר היא הגליל (2)');
const rows = await page.$$eval('#reportBody tr', (trs) => trs.map((tr) => tr.textContent.replace(/\s+/g, ' ')));
expect(rows.length === 2, `דוח שיעור: ציפיתי ל-2 שורות פעילים, יש ${rows.length}`);
const dana = rows.find((r) => r.includes('דנה כהן')) || '';
expect(dana.includes('ירושלים (100% · בוחן 17/20)') && dana.includes('הגליל (40%)'), 'דוח שיעור: השורה של דנה לא מפרטת את שתי היחידות והבוחן');
const danaCells = await page.$$eval('#reportBody tr', (trs) => { const tr = trs.find((t) => t.textContent.includes('דנה כהן')); return tr ? [...tr.children].map((td) => td.textContent.trim()) : []; });
expect(danaCells[2] === '28%' && danaCells[3] === '3', `דוח שיעור: התקדמות/תשובות של דנה (${danaCells.slice(2).join(', ')})`);
const absent = await page.textContent('#reportAbsent');
expect(absent.includes('נועה בר') && absent.includes('אלי שמש') && !absent.includes('דנה'), 'דוח שיעור: רשימת הנעדרים שגויה');
expect((await page.inputValue('#reportDate')).length === 10, 'תאריך הדוח לא אותחל להיום');

// תאריך לפני 3 ימים: רק נועה פעילה
const d = new Date(Date.now() - 3 * 24 * 3600 * 1000);
const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
await page.fill('#reportDate', key);
await page.dispatchEvent('#reportDate', 'change');
const rows3 = await page.$$eval('#reportBody tr', (trs) => trs.map((tr) => tr.textContent.replace(/\s+/g, ' ')));
expect(rows3.length === 1 && rows3[0].includes('נועה בר') && rows3[0].includes('בוחן 9/20'), 'דוח שיעור לתאריך קודם: רק נועה עם הבוחן שלה');
expect((await page.textContent('#reportAbsent')).includes('דנה כהן'), 'דוח שיעור לתאריך קודם: דנה ברשימת הנעדרים');

// CSV: תוכן נכון (ההורדה עצמה נבדקת דרך הפונקציה, לא דרך הדפדפן)
const csv = await page.evaluate((k) => lessonReportCSV(roster, k), key);
expect(csv.length === 5 && csv[0].length === 9, 'CSV: כותרת + 4 שורות, 9 עמודות');
expect(csv.some((r) => r.join(',').includes('נועה בר') && r.join(',').includes('"כן"')), 'CSV: נועה מסומנת פעילה');

if (errors.length) problems.push('שגיאות JS: ' + errors.join(' | '));
console.log(`${problems.length ? 'FAIL' : 'ok  '} teacher.html (דשבורד מול שרת מדומה, 4 תלמידים)`);
problems.forEach((p) => console.log('      - ' + p));
await browser.close();
server.close();
if (problems.length) process.exit(1);
console.log('\nדשבורד המורה מציג את הנתונים נכון');
