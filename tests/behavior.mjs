// בדיקת התנהגות של המנוע המשותף (unit-runtime.js) בדפדפן אמיתי, בלי שרת:
// כללי ההשלמה, ניווט, זיהוי תמונות, מפה אילמת, מצגת ובוחן — באותה צורה בכל יחידה.
// הרצה: npm run behavior
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };
const now = Math.floor(Date.now() / 1000);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const USER = { name: 'תלמיד בדיקה', email: 'smoke.student@example.com', roles: ['student'], role: 'student', token: `${b64({ alg: 'none' })}.${b64({ email: 'smoke.student@example.com', exp: now + 3600 })}.sig` };
const LONG_ANSWER = 'זו תשובה ארוכה מספיק לבדיקה שכוללת לפחות שתים עשרה מילים כדי לעבור את סף האורך המינימלי של המנוע.';

async function serve() {
  const server = createServer(async (req, res) => {
    let file = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404); res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
async function launch() {
  try { return await chromium.launch(); }
  catch { return chromium.launch({ executablePath: ['/opt/pw-browsers/chromium', '/usr/bin/chromium'].find((p) => existsSync(p)) }); }
}


// פותר משחקים: מפעיל כל משחק דרך הממשק כמו תלמיד (הנתונים נקראים מ-#unitData, כמו שהתלמיד יכול)
async function solveGame(page, panel, game, expect) {
  const card = panel.locator(`[data-game-card="${game.id}"]`);
  expect((await card.count()) === 1, `משחק ${game.id}: הכרטיס לא צויר`);
  const click = (loc) => loc.dispatchEvent('click');
  switch (game.type) {
    case 'match': {
      for (let i = 0; i < game.items.length; i++) await card.locator(`[data-match-item="${i}"]`).selectOption({ label: game.items[i][1] });
      await click(card.locator('button', { hasText: 'בדיקה' }).last());
      break;
    }
    case 'clues': {
      for (const item of game.items) {
        await click(card.locator('.game-choices button', { hasText: item[1][item[2] || 0] }).first());
        await click(card.locator('button', { hasText: 'הרמז הבא' }));
        await page.waitForTimeout(30);
      }
      break;
    }
    case 'order': {
      for (let i = 0; i < game.stops.length; i++) await card.locator(`[data-order="${i}"]`).selectOption({ label: game.stops[i] });
      await click(card.locator('button', { hasText: 'בדיקת המסלול' }));
      break;
    }
    case 'memory': {
      for (let pair = 0; pair < game.pairs.length; pair++) {
        const two = card.locator(`.memory-board button[data-pair="${pair}"]`);
        await click(two.nth(0));
        await click(two.nth(1));
      }
      break;
    }
    case 'puzzle': {
      // מחליפים עד שכל חתיכה במקומה (לכל היותר 9 החלפות)
      for (let round = 0; round < 12; round++) {
        const order = await card.locator('.image-puzzle button').evaluateAll((els) => els.map((e) => Number(e.dataset.piece)));
        const pos = order.findIndex((piece, i) => piece !== i);
        if (pos === -1) break;
        const from = order.indexOf(pos); // איפה נמצאת החתיכה שצריכה להיות ב-pos
        await click(card.locator(`.image-puzzle button[data-position="${pos}"]`));
        await click(card.locator(`.image-puzzle button[data-position="${from}"]`));
      }
      break;
    }
    case 'map': {
      const rounds = Math.min(game.rounds || 5, game.sites.length);
      for (let r = 0; r < rounds; r++) {
        const prompt = await card.locator('.game-map-prompt').textContent();
        const idx = game.sites.findIndex((s) => prompt.endsWith(s[0]));
        expect(idx >= 0, `משחק ${game.id}: לא זוהה היעד בהנחיה "${prompt}"`);
        await click(card.locator(`[data-map-site="${idx}"]`));
        await page.waitForTimeout(700);
      }
      break;
    }
    case 'streak': {
      for (let n = 0; n < (game.target || 5); n++) {
        const text = await card.locator('.game-statement').textContent();
        const item = game.items.find((x) => x[0] === text);
        await click(card.locator(`[data-streak-answer="${item[1] ? 'true' : 'false'}"]`));
        await page.waitForTimeout(850);
      }
      break;
    }
    case 'speed': {
      await click(card.locator('button', { hasText: 'התחלת האתגר' }));
      for (const item of game.items) {
        await click(card.locator('.game-choices button', { hasText: item[2] }).first());
        await page.waitForTimeout(550);
      }
      break;
    }
    case 'silent-map': {
      for (const s of game.sites) {
        await click(card.locator(`[data-silent-label="${s[0]}"]`));
        await click(card.locator(`[data-silent-target="${s[0]}"]`));
      }
      break;
    }
    case 'recognition': {
      for (const item of game.items) {
        await click(card.locator('.answer-list button', { hasText: item[0] }).first());
        await click(card.locator('button.button-primary'));
      }
      break;
    }
    default:
      expect(false, `משחק ${game.id}: סוג לא מוכר בבדיקה ${game.type}`);
  }
  await page.waitForTimeout(50);
  expect((await card.getAttribute('class')).includes('game-complete'), `משחק ${game.id} (${game.type}): לא סומן כהושלם אחרי פתרון נכון`);
}

const { server, origin } = await serve();
const browser = await launch();
const unitFiles = (await readdir(join(ROOT, 'units'))).filter((f) => f.endsWith('.html'));
let failures = 0;

for (const file of unitFiles) {
  const html = await readFile(join(ROOT, 'units', file), 'utf8');
  if (!html.includes('unit-runtime.js')) { console.log(`skip ${file} (מנוע ישן)`); continue; }
  const data = JSON.parse(html.match(/<script type="application\/json" id="unitData">([\s\S]*?)<\/script>/)[1].replace(/<\\\//g, '</'));
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript((u) => sessionStorage.setItem('kitahUser', JSON.stringify(u)), USER);
  // השרת חסום: כל קריאת API נכשלת. המנוע חייב להישאר שמיש ולא לשקר על שמירה.
  await context.route('**/*', (route) => (route.request().url().startsWith(origin) ? route.continue() : route.abort()));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const problems = [];
  const expect = (cond, msg) => { if (!cond) problems.push(msg); };

  await page.goto(`${origin}/units/${file}`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const pages = await page.$$eval('[data-page-panel]', (els) => els.map((e) => e.dataset.pagePanel));
  expect((await page.textContent('#pageCounter')).includes(`מתוך ${pages.length}`), 'מונה הדפים לא תואם למספר הדפים');
  expect((await page.textContent('#unitPercent')) === '0%', 'התקדמות התחלתית אינה 0%');
  expect((await page.$$eval('[data-page-panel]', (els) => els.filter((e) => !e.hidden).length)) === 1, 'יותר מדף אחד גלוי');
  // כרטיס המוכנות זהה בכל יחידה: מצויר בראש הדף הראשון, מצביע על הדף הראשון שלא הושלם
  expect((await page.locator('#unitHome .readiness-card strong').textContent()) === '0%', 'כרטיס המוכנות לא מתחיל מ-0%');
  expect((await page.locator('#unitHome [data-goto-page]').getAttribute('data-goto-page')) === pages[0], 'המשימה הבאה בהתחלה אינה הדף הראשון');
  expect((await page.locator('#unitHome li.done').count()) === 0, 'סימני מוכנות דלוקים לפני שהתחילו');

  const games = Array.isArray(data.games) ? data.games : [];
  const kinds = await page.$$eval('[data-page-panel]', (els) => Object.fromEntries(els.map((e) => [e.dataset.pagePanel, e.dataset.pageKind || (e.dataset.pagePanel === 'open-practice' ? 'exam' : ['images', 'presentation', 'practice', 'games'].includes(e.dataset.pagePanel) ? e.dataset.pagePanel : 'content')])));
  for (const id of pages) {
    await page.click(`#pageNav button[data-page="${id}"]`);
    const panel = page.locator(`[data-page-panel="${id}"]`);
    const complete = { click: () => panel.locator('.complete-page').click({ force: true }) };
    const pageGames = games.filter((g) => g.page === id);
    const kind = kinds[id];
    if (kind === 'games') {
      // דף סיכום: נחסם עד שכל המשחקים ביחידה הושלמו (הם מושלמים בדפים הקודמים)
      expect((await panel.locator('#gamesSummary .practice-directory a').count()) > 0, `${id}: דף הסיכום ריק`);
      const remaining = games.filter((g) => pages.indexOf(g.page) > pages.indexOf(id)).length;
      await complete.click();
      if (remaining) {
        expect(await panel.locator('.page-gate-note:not([hidden])').count() === 1, `${id}: לא נחסם כשנשארו משחקים`);
        continue; // יושלם בסוף
      }
    } else if (kind === 'exam') {
      const parts = await panel.locator('#examBank .exam-part').count();
      expect(parts >= 3, `${id}: פחות מ-3 סעיפי בגרות`);
      await complete.click();
      expect(await panel.locator('.page-gate-note:not([hidden])').count() === 1, `${id}: לא נחסם לפני מענה על הסעיפים`);
      // סעיף עם מחוון עובר גם בלי שרת (הבדיקה מקומית), והשליחה לשרת מדווחת כשל בכנות
      const first = panel.locator('#examBank .exam-part').first();
      await first.locator('textarea').fill('קצר מדי');
      await first.locator('.check-exam').click({ force: true });
      expect((await first.locator('.answer-feedback').textContent()).includes('לפחות'), `${id}: סעיף קצר לא נדחה`);
      for (let qi = 0; qi < data.exam.length; qi++) {
        for (let pi = 0; pi < data.exam[qi].parts.length; pi++) {
          const part = data.exam[qi].parts[pi];
          const terms = (part.c || []).map((c) => c[1][0]).join(' ');
          const box = panel.locator(`textarea[data-exam="${qi}-${pi}"]`).locator('..');
          await box.locator('textarea').fill(`${terms} ${LONG_ANSWER}`);
          await box.locator('.check-exam').click({ force: true });
        }
      }
      await page.waitForTimeout(300);
      const fb = await first.locator('.answer-feedback').textContent();
      expect(fb.includes('נמצאו') || fb.includes('נכשלה'), `${id}: אין משוב מקומי/כשל שרת בסעיף (${fb.slice(0, 60)})`);
      const progress = await panel.locator('#examProgress').textContent();
      expect(progress.startsWith(`${data.exam.length} מתוך ${data.exam.length}`), `${id}: מד המאגר לא הגיע לסוף (${progress})`);
      await complete.click();
    } else if (['images', 'presentation', 'practice'].includes(id)) {
      if (id === 'images') {
        const cards = panel.locator('[data-recognition]');
        const targets = panel.locator('[data-match-target]');
        if ((await cards.count()) || (await targets.count())) {
          await complete.click();
          expect(await panel.locator('.page-gate-note:not([hidden])').count() === 1, `${id}: לא נחסם לפני חשיפת התמונות`);
        }
        for (let i = 0; i < (await cards.count()); i++) await cards.nth(i).click({ force: true });
        if (await cards.count()) expect((await cards.first().getAttribute('class')).includes('revealed'), `${id}: תמונה לא סומנה כנחשפה`);
        for (let i = 0; i < (await targets.count()); i++) {
          const key = await targets.nth(i).getAttribute('data-match-target');
          await panel.locator(`[data-match-label="${key}"]`).click({ force: true });
          await targets.nth(i).dispatchEvent('click'); // המפה חסומה בבדיקה, היעדים חופפים
        }
        if (await targets.count()) expect((await panel.locator('#matchFeedback').textContent()).startsWith(`${await targets.count()} מתוך`), `${id}: המפה האילמת לא הושלמה`);
        if (pageGames.length) {
          await complete.click();
          expect(await panel.locator('.page-gate-note:not([hidden])').count() === 1, `${id}: לא נחסם לפני המשחקים`);
          for (const g of pageGames) await solveGame(page, panel, g, expect);
        }
      }
      if (id === 'presentation' && data.slides.length) {
        await complete.click();
        expect(await panel.locator('.page-gate-note:not([hidden])').count() === 1, `${id}: לא נחסם לפני סוף המצגת`);
        for (let i = 1; i < data.slides.length; i++) await page.click('#nextSlide');
        expect((await page.textContent('#slideCount')).trim() === `${data.slides.length} / ${data.slides.length}`, `${id}: מונה השקופיות שגוי`);
      }
      if (id === 'practice') {
        if (data.quiz.length) {
          await complete.click();
          expect(await panel.locator('.page-gate-note:not([hidden])').count() === 1, `${id}: לא נחסם לפני הבוחן`);
          await page.click('#startQuiz');
          for (const q of data.quiz) {
            await page.locator('#answerList button', { hasText: q.a[q.correct] }).first().click();
            await page.click('#nextQuestion');
          }
          expect((await page.textContent('#unitQuiz')).includes('הציון שלך: 100'), `${id}: ציון מלא לא הוצג`);
        } else {
          expect((await panel.locator('#examBank .exam-part').count()) >= 3, `${id}: פחות מ-3 סעיפי תרגול`);
          await complete.click();
          expect(await panel.locator('.page-gate-note:not([hidden])').count() === 1, `${id}: לא נחסם לפני שליחת סעיף`);
          // בלי שרת אי אפשר לשלוח סעיף — מדמים שני כשלים דרך שאלת סיום? לא: כאן בודקים שהחסימה כנה ועוצרים.
          continue;
        }
      }
      await complete.click();
    } else {
      const textarea = panel.locator('.check-card textarea');
      await complete.click();
      expect(await panel.locator('.page-gate-note:not([hidden])').count() === 1, `${id}: לא נחסם לפני מענה על שאלת הדף`);
      await textarea.fill('קצר');
      await panel.locator('.check-open').click();
      expect((await panel.locator('.answer-feedback').textContent()).includes('לפחות'), `${id}: תשובה קצרה לא נדחתה`);
      await textarea.fill(LONG_ANSWER);
      await panel.locator('.check-open').click();
      await page.waitForTimeout(200);
      const fb = await panel.locator('.answer-feedback').textContent();
      expect(fb.includes('השליחה נכשלה') && fb.includes('נשארה בתיבה'), `${id}: כשל שרת לא דווח בכנות (${fb.slice(0, 60)})`);
      await panel.locator('.check-open').click();
      await page.waitForTimeout(200);
      if (pageGames.length) {
        await complete.click();
        expect(await panel.locator('.page-gate-note:not([hidden])').count() === 1, `${id}: לא נחסם לפני המשחקים`);
        for (const g of pageGames) await solveGame(page, panel, g, expect);
      }
      await complete.click(); // אחרי שני כשלי שרת (ואחרי המשחקים) מותר להמשיך
    }
    const done = await page.$$eval('#pageNav button.done', (els) => els.map((e) => e.dataset.page));
    if (!(id === 'practice' && !data.quiz.length) && kind !== 'games') expect(done.includes(id), `${id}: הדף לא סומן כהושלם`);
  }

  if (pages.includes('games')) {
    await page.click('#pageNav button[data-page="games"]');
    const summary = await page.textContent('#gamesSummary');
    expect(summary.startsWith(`${games.length} מתוך ${games.length}`), `games: הסיכום לא מראה שכל המשחקים הושלמו (${summary.slice(0, 40)})`);
    await page.locator('[data-page-panel="games"] .complete-page').click({ force: true });
  }
  const pct = await page.textContent('#unitPercent');
  const expected = data.quiz.length ? '100%' : `${Math.round(((pages.length - 1) / pages.length) * 100)}%`;
  expect(pct === expected, `התקדמות סופית ${pct}, ציפיתי ${expected}`);
  await page.click(`#pageNav button[data-page="${pages[0]}"]`);
  expect((await page.locator('#unitHome .readiness-card strong').textContent()) === expected, 'כרטיס המוכנות לא מציג את ההתקדמות הסופית');
  const doneMarks = await page.locator('#unitHome li.done').count();
  expect(doneMarks === (data.quiz.length ? 3 : 2), `סימני מוכנות: ${doneMarks} (ציפיתי ${data.quiz.length ? 3 : 2})`);
  if (data.quiz.length) expect((await page.locator('#unitHome h2').textContent()).includes('סיימת'), 'אחרי 100% הכרטיס לא מברך על סיום');
  // רענון: המצב נשמר מקומית
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(200);
  expect((await page.textContent('#unitPercent')) === expected, 'ההתקדמות לא שרדה רענון');
  if (errors.length) problems.push('שגיאות JS: ' + errors.join(' | '));

  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${file} (${pages.length} דפים, בוחן ${data.quiz.length}, משחקים ${games.length})`);
  problems.forEach((p) => console.log('      - ' + p));
  if (problems.length) failures++;
  await context.close();
}

// בוחן שעבר לפני העדכון (בלי סימון דף): הדף מסומן רטרואקטיבית בטעינה
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript((u) => { sessionStorage.setItem('kitahUser', JSON.stringify(u)); localStorage.setItem('tb:v1:yerushalayim', JSON.stringify({ done: ['overview'], submitted: ['overview'], failed: {}, recognized: [], matched: [], slidesSeen: 0, quiz: { best: 15, total: 20 } })); }, USER);
  await context.route('**/*', (route) => (route.request().url().startsWith(origin) ? route.continue() : route.abort()));
  const page = await context.newPage();
  await page.goto(`${origin}/units/jerusalem.html`, { waitUntil: 'load' });
  await page.waitForTimeout(200);
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('tb:v1:yerushalayim')).done);
  const ok = done.includes('practice') && (await page.locator('#pageNav button[data-page="practice"].done').count()) === 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} רטרואקטיבי: בוחן שעבר מסמן את דף התרגול בטעינה`);
  if (!ok) failures++;
  await context.close();
}

// שרת שלא עונה: הממשק חייב להשתחרר אחרי ה-timeout עם הודעה כנה, והתשובה נשארת בתיבה (דוח בדיקה חיה 05.09)
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript((u) => { sessionStorage.setItem('kitahUser', JSON.stringify(u)); window.TB_API_TIMEOUT_MS = 1500; }, USER);
  await context.route('**/*', (route) => {
    if (route.request().url().startsWith(origin)) return route.continue();
    if (route.request().url().includes('script.google.com')) return new Promise(() => {}); // תלוי לנצח
    return route.abort();
  });
  const page = await context.newPage();
  const problems = [];
  await page.goto(`${origin}/units/jerusalem.html`, { waitUntil: 'load' });
  const panel = page.locator('[data-page-panel]').first();
  await panel.locator('.check-card textarea').fill(LONG_ANSWER);
  await panel.locator('.check-open').click();
  await page.waitForTimeout(300);
  if (!(await panel.locator('.answer-feedback').textContent()).includes('שולח')) problems.push('לא הוצג "שולח לבדיקה…" בזמן ההמתנה');
  await page.waitForTimeout(1700);
  const fb = await panel.locator('.answer-feedback').textContent();
  if (!fb.includes('לא ענה בזמן') || !fb.includes('נשארה בתיבה')) problems.push('אחרי timeout אין הודעה כנה (' + fb.slice(0, 80) + ')');
  if ((await panel.locator('.check-card textarea').inputValue()) !== LONG_ANSWER) problems.push('התשובה נמחקה מהתיבה אחרי timeout');
  console.log(`${problems.length ? 'FAIL' : 'ok  '} timeout: שרת שלא עונה משחרר את הממשק תוך ${1.5}s`);
  problems.forEach((p) => console.log('      - ' + p));
  if (problems.length) failures++;
  await context.close();
}

await browser.close();
server.close();
if (failures) { console.error(`\n${failures} יחידות נכשלו`); process.exit(1); }
console.log('\nכל היחידות מתנהגות לפי התקן');
