// בדיקת "טרוול בוסטר צעד-צעד" מול שרת מדומה: מסלול תלמיד בטלפון (שמירת שלבים, מספר דוקט)
// ולשונית המורה (מי איפה, תקועים, סימון בדיקה). מצלם גם מסכים ל-/tmp לבדיקה בעין.
// הרצה: npm run tb
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const SHOTS = process.env.TB_SHOTS || '';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const now = Math.floor(Date.now() / 1000);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (email) => `${b64({ alg: 'none' })}.${b64({ email, exp: now + 3600 })}.sig`;
const STUDENT = { name: 'דני כהן', email: 'dani@example.com', roles: ['student'], role: 'student', token: token('dani@example.com') };
const TEACHER = { name: 'מורה', email: 't@example.com', roles: ['teacher'], role: 'teacher', token: token('t@example.com') };

const problems = [];
const expect = (cond, msg) => { if (!cond) problems.push(msg); };

// כל צילום שמוזכר ביחידות קיים בתיקייה, וכל הדגשה בתוך גבולות התמונה
const ctx = { window: {} };
vm.runInNewContext(readFileSync(join(ROOT, 'tb/units.js'), 'utf8'), ctx);
const UNITS = ctx.window.TB_UNITS;
for (const u of UNITS) {
  expect(/^(fit|grp)-[a-z0-9-]{2,30}$/.test(u.id), `מזהה יחידה לא תואם לשרת: ${u.id}`);
  for (const s of u.steps || []) {
    if (s.img) expect(existsSync(join(ROOT, 'tb/img', s.img + '.webp')), `חסר צילום ${s.img}.webp (${u.id})`);
    for (const h of s.hl || []) expect(h.length === 4 && h[0] >= 0 && h[1] >= 0 && h[0] + h[2] <= 100.5 && h[1] + h[3] <= 100.5, `הדגשה מחוץ לתמונה ב-${u.id}: ${s.title}`);
  }
}
const fit1 = UNITS.find((u) => u.id === 'fit-hotel1');
const N = fit1.steps.length;

const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
const SUMMARY = {
  now: new Date().toISOString(),
  students: [
    { email: 'dani@example.com', name: 'דני כהן', class_name: 'י״ב', units: { 'fit-hotel1': { unit_id: 'fit-hotel1', step: 6, max_step: 6, steps_total: N, done: false, updated_at: minsAgo(12), docket: '', review: '' } } },
    { email: 'noa@example.com', name: 'נועה לוי', class_name: 'י״ב', units: {
      'fit-hotel1': { unit_id: 'fit-hotel1', step: N, max_step: N, steps_total: N, done: true, docket: '152843', note: 'לא מצאתי Twin', updated_at: minsAgo(20), completed_at: minsAgo(20), review: '' },
      'fit-hotel2': { unit_id: 'fit-hotel2', step: 3, max_step: 3, steps_total: 9, done: false, updated_at: minsAgo(1), docket: '', review: '' } } },
    { email: 'eli@example.com', name: 'אלי שמש', class_name: 'י״ב', units: {} },
  ],
};
const sent = [];
const RESP = {
  getMyTbProgress: { units: { 'fit-hotel2': { unit_id: 'fit-hotel2', step: 9, max_step: 9, steps_total: 9, done: true, docket: '152843', review: 'fix', review_note: 'חסר אישור למלון' } } },
  saveTbStep: { saved: true },
  completeTbUnit: { saved: true },
  getBagrutTbSummary: SUMMARY,
  reviewTbUnit: { saved: true },
  getBagrutTeacherDashboard: { students: [], class_codes: [] },
  getBagrutPendingReviewsForTeacher: { pending: [] },
  getBagrutAssignment: { assignment: null },
  getAllContentOverrides: { overrides: {} },
  getBagrutKnowledgeSummary: { files: [], total_chars: 0 },
  getMyReviewNotices: { notices: [] },
};

const server = createServer(async (req, res) => {
  let file = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: ['/opt/pw-browsers/chromium', '/usr/bin/chromium'].find((p) => existsSync(p)) }); }

async function contextFor(user, viewport) {
  const c = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: viewport.width < 600 });
  await c.addInitScript((u) => sessionStorage.setItem('kitahUser', JSON.stringify(u)), user);
  await c.route('**/*', (route) => {
    const req = route.request();
    if (req.url().startsWith(origin)) return route.continue();
    if (req.url().includes('script.google.com') && req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      sent.push(body);
      const data = RESP[body.action];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data ? { ok: true, data } : { ok: false, error: 'לא מוכר: ' + body.action }) });
    }
    return route.abort();
  });
  return c;
}
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false }); };

// ---------- תלמיד בטלפון ----------
const sc = await contextFor(STUDENT, { width: 390, height: 844 });
const sp = await sc.newPage();
const errors = [];
sp.on('pageerror', (e) => errors.push('תלמיד: ' + e.message));
await sp.goto(`${origin}/tb/`, { waitUntil: 'load' });
await sp.waitForSelector('[data-open="fit-hotel1"]', { timeout: 5000 }).catch(() => {});
await shot(sp, '1-home');
expect(sent.some((b) => b.action === 'getMyTbProgress' && b.token === STUDENT.token), 'התלמיד לא טען התקדמות עם טוקן');
const home = await sp.textContent('#tbApp');
expect(home.includes('הערת המורה: חסר אישור למלון'), 'בית: הערת "לתיקון" של המורה לא מוצגת');
expect(home.includes('דוקט 152843') && home.includes('לתיקון'), 'בית: יחידה שהושלמה לא מציגה דוקט וסימון');
expect((await sp.locator('.tb-unit[disabled]').count()) >= 1, 'בית: יחידות "בקרוב" לא מנוטרלות');

await sp.click('[data-open="fit-hotel1"]');
await sp.waitForSelector('.tb-intro');
await shot(sp, '2-intro');
await sp.click('[data-next]');
await sp.waitForSelector('.tb-card h2 .num');
await sp.click('[data-next]');
await sp.waitForSelector('.tb-shot img');
await sp.waitForFunction(() => document.querySelector('.tb-shot img').complete);
await shot(sp, '3-step2');
expect((await sp.locator('.tb-shot .hl').count()) >= 1, 'שלב 2: אין הדגשה על הצילום');
expect((await sp.locator('.term').count()) >= 1, 'שלב 2: מונחים באנגלית לא מוצגים כצ׳יפ');
const saves = sent.filter((b) => b.action === 'saveTbStep');
expect(saves.some((b) => b.unit_id === 'fit-hotel1' && b.step === 2 && b.steps_total === N), 'שמירת שלב 2 לא נשלחה עם unit_id/step/steps_total');
// הגדלה
await sp.click('.tb-shot');
expect(await sp.isVisible('#tbZoom'), 'נגיעה בצילום לא פותחת הגדלה');
await shot(sp, '4-zoom');
await sp.click('.tb-zoom-close');
// החלקה ימינה = הבא
await sp.evaluate(() => {
  const el = document.getElementById('tbApp');
  const t = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 });
  el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(100)], bubbles: true }));
  el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t(260)], bubbles: true }));
});
await sp.waitForFunction(() => location.hash === '#u/fit-hotel1/3', null, { timeout: 2000 }).catch(() => {});
expect((await sp.evaluate(() => location.hash)) === '#u/fit-hotel1/3', 'החלקה ימינה לא עברה לשלב הבא');
// מלכודת
await sp.goto(`${origin}/tb/#u/fit-hotel1/9`);
await sp.waitForSelector('.tb-trap');
await shot(sp, '5-trap');
// סיום: מספר דוקט לא תקין ואז תקין
await sp.goto(`${origin}/tb/#u/fit-hotel1/${N + 1}`);
await sp.waitForSelector('#tbDocket');
await sp.fill('#tbDocket', '12');
await sp.click('#tbDone button');
expect((await sp.textContent('#tbMsg')).includes('רק ספרות'), 'סיום: מספר דוקט קצר לא נחסם');
await sp.fill('#tbDocket', '152843');
await sp.fill('#tbNote', 'לא מצאתי Twin');
await shot(sp, '6-checkpoint');
await sp.click('#tbDone button');
await sp.waitForSelector('.tb-done', { timeout: 3000 }).catch(() => {});
await shot(sp, '7-done');
const comp = sent.find((b) => b.action === 'completeTbUnit');
expect(comp && comp.unit_id === 'fit-hotel1' && comp.docket === '152843' && comp.note === 'לא מצאתי Twin' && comp.steps_total === N, 'סיום: completeTbUnit לא נשלח עם דוקט/הערה');
expect((await sp.textContent('#tbApp')).includes('152843'), 'סיום: מסך הסיום לא מציג את הדוקט');
// בלי גלילה אופקית בטלפון
expect(await sp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'יש גלילה אופקית בטלפון');

// ---------- מורה: תצוגה מקדימה לא שומרת ----------
const before = sent.length;
const pc = await contextFor(TEACHER, { width: 390, height: 844 });
const pp = await pc.newPage();
await pp.goto(`${origin}/tb/#u/fit-hotel1/3`);
await pp.waitForSelector('.tb-shot');
expect(await pp.isVisible('#tbPreview'), 'מורה בטלפון: אין הודעת "מצב תצוגה"');
expect(!sent.slice(before).some((b) => b.action === 'saveTbStep'), 'מורה בתצוגה מקדימה שמר התקדמות');

// ---------- לשונית המורה בדשבורד ----------
const tc = await contextFor(TEACHER, { width: 1280, height: 900 });
const tp = await tc.newPage();
tp.on('pageerror', (e) => errors.push('מורה: ' + e.message));
await tp.goto(`${origin}/teacher.html`, { waitUntil: 'load' });
await tp.click('[data-teacher-tab-button="tb"]');
await tp.waitForFunction(() => document.querySelectorAll('#tbBody tr').length === 3, null, { timeout: 5000 }).catch(() => {});
await shot(tp, '8-teacher');
const rows = await tp.$$eval('#tbBody tr', (trs) => trs.map((t) => t.textContent.replace(/\s+/g, ' ')));
expect(rows.length === 3, `מורה: ציפיתי ל-3 שורות, יש ${rows.length}`);
expect(rows[0] && rows[0].includes('דני כהן') && rows[0].includes('⚠'), 'מורה: התקוע (דני, 12 דק׳) לא ראשון/לא מסומן');
expect(rows.some((r) => r.includes('נועה לוי') && r.includes('152843') && r.includes('1 לבדיקה')), 'מורה: נועה לא מציגה דוקט ו"1 לבדיקה"');
expect(rows.some((r) => r.includes('אלי שמש') && r.includes('טרם התחיל')), 'מורה: אלי לא מסומן "טרם התחיל"');
const pulse = (await tp.textContent('#tbPulse')).replace(/\s+/g, ' ');
expect(/עובדים עכשיו\s*2/.test(pulse) && /דק׳ באותו שלב\)\s*1/.test(pulse), `מורה: דופק שגוי (${pulse})`);
await tp.click('[data-tb-student="noa@example.com"]');
await tp.waitForSelector('#tbDetail .tb-review');
await tp.fill('#tbDetail .tb-review input', 'חסר Report and Confirm');
await tp.click('#tbDetail [data-review="fix"]');
await tp.waitForFunction(() => document.getElementById('tbReviewMsg')?.textContent === 'נשמר', null, { timeout: 3000 }).catch(() => {});
await shot(tp, '9-teacher-detail');
const rev = sent.find((b) => b.action === 'reviewTbUnit');
expect(rev && rev.email === 'noa@example.com' && rev.unit_id === 'fit-hotel1' && rev.review === 'fix' && rev.review_note === 'חסר Report and Confirm', 'מורה: סימון "לתיקון" לא נשלח נכון');
expect((await tp.textContent('#tbBody')).includes('1 לתיקון'), 'מורה: אחרי סימון, השורה לא מתעדכנת ל"לתיקון"');

if (errors.length) problems.push('שגיאות JS: ' + errors.join(' | '));
console.log(`${problems.length ? 'FAIL' : 'ok  '} tb/ (מדריך טלפון + לשונית מורה מול שרת מדומה)`);
problems.forEach((p) => console.log('      - ' + p));
await browser.close();
server.close();
if (problems.length) process.exit(1);
