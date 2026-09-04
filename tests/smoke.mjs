// בדיקת עשן: פותח כל דף באתר עם משתמש מזויף ב-sessionStorage, ונכשל על כל
// שגיאת JavaScript, שגיאת console, או קובץ מקומי (js/css/תמונה) שלא נטען.
// קריאות לשרת החיצוני (Apps Script, גופנים, תמונות מ-jerusalem-tour) לא נספרות
// כשגיאה, כי הן תלויות ברשת ולא בקוד שלנו.
//
// הרצה: npm run smoke   (דורש: npm i, ו-chromium של Playwright)

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PAGES = [
  '/index.html',
  '/teacher.html',
  '/units/coastal-plain.html',
  '/units/jerusalem.html',
  '/units/valleys.html',
  '/units/dead-sea.html',
  '/units/galilee.html',
];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

function fakeJwt(payload) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}
const HOUR = 3600;
const now = Math.floor(Date.now() / 1000);
const USERS = {
  student: { name: 'תלמיד בדיקה', email: 'smoke.student@example.com', roles: ['student'], role: 'student', token: fakeJwt({ email: 'smoke.student@example.com', exp: now + HOUR }) },
  teacher: { name: 'מורה בדיקה', email: 'smoke.teacher@example.com', roles: ['teacher'], role: 'teacher', token: fakeJwt({ email: 'smoke.teacher@example.com', exp: now + HOUR }) },
};

async function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = join(ROOT, decodeURIComponent(url.pathname));
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function launch() {
  try { return await chromium.launch(); }
  catch {
    const exe = ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p));
    return chromium.launch({ executablePath: exe });
  }
}

const { server, origin } = await serve();
const browser = await launch();
let failures = 0;

for (const path of PAGES) {
  const user = path === '/teacher.html' ? USERS.teacher : USERS.student;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((u) => sessionStorage.setItem('kitahUser', JSON.stringify(u)), user);
  const page = await context.newPage();
  const problems = [];
  // בקשות חיצוניות (Apps Script, גופנים, תמונות) נחסמות: הבדיקה הרמטית ובודקת רק את הקוד שלנו.
  await context.route('**/*', (route) => (route.request().url().startsWith(origin) ? route.continue() : route.abort()));
  page.on('pageerror', (e) => problems.push('שגיאת JS: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = m.location()?.url || '';
    if (/Failed to load resource/.test(m.text()) && !loc.startsWith(origin)) return; // משאב חיצוני שנחסם
    problems.push('console.error: ' + m.text() + (loc ? ' @ ' + loc.replace(origin, '') : ''));
  });
  page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400) problems.push(`קובץ מקומי חסר (${r.status()}): ${r.url().replace(origin, '')}`); });
  page.on('requestfailed', (r) => { if (r.url().startsWith(origin)) problems.push('בקשה מקומית נכשלה: ' + r.url().replace(origin, '')); });

  await page.goto(origin + path, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const gated = await page.evaluate(() => document.documentElement.classList.contains('page-authorized') || document.documentElement.classList.contains('teacher-authorized'));
  if (!gated) problems.push('שער הכניסה לא נפתח למרות kitahUser ב-sessionStorage');
  const redirected = !page.url().startsWith(origin);
  if (redirected) problems.push('הדף הפנה החוצה: ' + page.url());

  const label = problems.length ? 'FAIL' : 'ok  ';
  console.log(`${label} ${path}`);
  problems.forEach((p) => console.log('      - ' + p));
  if (problems.length) failures++;
  await context.close();
}

await browser.close();
server.close();
if (failures) { console.error(`\n${failures} דפים נכשלו`); process.exit(1); }
console.log('\nכל הדפים עברו');
