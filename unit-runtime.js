/* unit-runtime.js — מנוע אחד לכל יחידות הלימוד (04.09.2026).
 *
 * הדף מספק את התוכן (HTML סטטי + JSON ב-#unitData), והקובץ הזה מספק את ההתנהגות:
 * ניווט בין דפים, התקדמות (מקומית + שרת), שאלה פתוחה בכל דף, זיהוי תמונות, מפה אילמת,
 * מצגת, בוחן, מאגר בגרות עם מחוון, 10 סוגי משחקים מונחי-נתונים, והמאמן.
 * אותה פדגוגיה ואותם כללי השלמה בכל היחידות (הסטנדרט של מישור החוף, 05.09.2026).
 *
 * חוזה הדף (ר' docs/UNIT_TEMPLATE.md):
 *   <body data-unit-id="haamakim" data-unit-label="העמקים" data-unit-file="valleys.html" data-legacy-prefix="valleys">
 *   <section class="lesson-page" data-page-panel="overview" data-page-title="1. ...">  (דף אחד לכל section)
 *   #unitData = {"slides":[...], "quiz":[...], "exam":[...], "openHints":{...}, "games":[...]}
 *   סוגי דפים: תוכן (ברירת מחדל), images, presentation, practice, games (סיכום משחקים), exam (מאגר בגרות).
 *   סוג הדף נקבע לפי ה-id או לפי data-page-kind.
 */
(() => {
  const API = 'https://script.google.com/macros/s/AKfycbwf3-MNZBBi64zXcNH7wfhBRoEBl9brtQ9QRI4Won5RmUIOrl_WBivN6uI5NAp6Mc0h/exec';
  const IMAGE_BASE = 'https://nisan1234-afk.github.io/jerusalem-tour/images/';
  const PASS_RATIO = 0.6; // ציון עובר בבוחן, כמו בבקאנד (BAGRUT_PASS_RATIO)
  const MIN_WORDS = 12; // אורך מינימלי לתשובה פתוחה לפני שליחה לבדיקה
  const EXAM_MIN_WORDS = 8; // סעיף בגרות יכול להיות קצר ("ציינו שני אתרים")
  const EXAM_PASS_RATIO = 2 / 3; // כמה מרכיבי המחוון צריכים להופיע כדי שסעיף ייחשב "עבר"
  window.API = API;

  const body = document.body;
  const UNIT = {
    id: body.dataset.unitId,
    label: body.dataset.unitLabel || document.title.split('|')[0].trim(),
    file: body.dataset.unitFile || location.pathname.split('/').pop(),
    legacy: body.dataset.legacyPrefix || '',
  };
  if (!UNIT.id) {
    console.error('unit-runtime: חסר data-unit-id על <body>');
    return;
  }
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const DATA = (() => {
    try {
      return JSON.parse($('unitData')?.textContent || '{}');
    } catch (e) {
      console.error('unit-runtime: #unitData אינו JSON תקין', e);
      return {};
    }
  })();
  const SLIDES = DATA.slides || [];
  const QUIZ = DATA.quiz || [];
  const EXAM = DATA.exam || [];
  const OPEN_HINTS = DATA.openHints || {};
  const GAMES = Array.isArray(DATA.games) ? DATA.games.filter((g) => g && g.id && g.type) : [];
  const EXAM_KEYS = EXAM.flatMap((q, qi) => (q.parts || []).map((_, pi) => qi + '-' + pi));

  const panels = $$('[data-page-panel]');
  const pages = panels.map((p) => p.dataset.pagePanel);
  const panelOf = (id) => panels.find((p) => p.dataset.pagePanel === id);
  const kindOf = (id) => {
    const explicit = panelOf(id)?.dataset.pageKind;
    if (explicit) return explicit;
    if (id === 'open-practice') return 'exam';
    return ['images', 'presentation', 'practice', 'games'].includes(id) ? id : 'content';
  };
  const gamesOn = (pageId) => GAMES.filter((g) => g.page === pageId);

  // ---------- משתמש ו-API ----------
  function getUser() {
    try {
      return JSON.parse(sessionStorage.getItem('kitahUser') || 'null');
    } catch (_) {
      return null;
    }
  }
  function sessionProblem() {
    const user = getUser();
    if (!user?.token) return 'נדרשת כניסה דרך כיתה פלוס.';
    if (window.kitahSession?.isExpired()) return 'הכניסה פגה. היכנסו מחדש כדי לשמור.';
    return '';
  }
  async function api(action, params = {}) {
    const problem = sessionProblem();
    if (problem) throw new Error(problem);
    let res, data;
    try {
      res = await fetch(API, { method: 'POST', body: JSON.stringify({ action, token: getUser().token, ...params }) });
      data = await res.json();
    } catch (_) {
      throw new Error('אין חיבור לשרת כרגע. נסו שוב בעוד רגע.');
    }
    if (!data.ok) throw new Error(data.error || 'שגיאה');
    return data.data;
  }
  const quietly = (promise) => promise.catch(() => {});

  // ---------- מצב והתקדמות ----------
  const STORE_KEY = 'tb:v1:' + UNIT.id;
  function loadState() {
    let s = null;
    try {
      s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    } catch (_) {
      /* ignore */
    }
    if (s) return s;
    // הגירה חד-פעמית ממפתחות של הגרסאות הקודמות (valleys-progress, jerusalem-progress וכו')
    s = { done: [], submitted: [], failed: {}, recognized: [], matched: [], slidesSeen: 0, quiz: null, games: [], examPassed: [], drafts: {} };
    if (UNIT.legacy) {
      try {
        const old = JSON.parse(localStorage.getItem(UNIT.legacy + '-progress') || 'null');
        if (Array.isArray(old)) s.done = old;
        else if (old && Array.isArray(old.done)) s.done = old.done;
        const imgs = JSON.parse(localStorage.getItem(UNIT.legacy + '-images') || '[]');
        if (Array.isArray(imgs)) s.recognized = imgs;
      } catch (_) {
        /* ignore */
      }
    }
    // מפתחות ישנים נוספים (מישור החוף לפני המנוע): data-legacy-extra='{"games":"...","submitted":"...","examPassed":"...","draftsPages":"...","draftsExam":"..."}'
    try {
      const extra = JSON.parse(body.dataset.legacyExtra || 'null');
      if (extra) {
        const read = (k) => (k ? JSON.parse(localStorage.getItem(k) || 'null') : null);
        for (const field of ['games', 'submitted', 'examPassed']) {
          const v = read(extra[field]);
          if (Array.isArray(v)) s[field] = [...new Set([...s[field], ...v.map(String)])];
        }
        const dp = read(extra.draftsPages);
        if (dp && typeof dp === 'object') Object.entries(dp).forEach(([k, v]) => v && (s.drafts[k] = String(v)));
        const de = read(extra.draftsExam);
        if (de && typeof de === 'object') Object.entries(de).forEach(([k, v]) => v && (s.drafts['exam-' + k] = String(v)));
      }
    } catch (_) {
      /* ignore */
    }
    return s;
  }
  const state = loadState();
  for (const field of ['games', 'examPassed']) if (!Array.isArray(state[field])) state[field] = [];
  if (!state.drafts || typeof state.drafts !== 'object') state.drafts = {};
  let syncTimer = null;
  let lastSyncedDone = -1;
  // שמירה מקומית בכל שינוי; לשרת רק כשמספר הדפים שהושלמו השתנה (לא בכל שקופית או תמונה)
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (_) {
      /* ignore */
    }
    renderProgress();
    if (state.done.length === lastSyncedDone) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      lastSyncedDone = state.done.length;
      quietly(api('saveBagrutUnitProgress', { unit_id: UNIT.id, pages_done: state.done.length, page_total: pages.length }));
    }, 800);
  }
  function renderProgress() {
    const pct = pages.length ? Math.round((state.done.length / pages.length) * 100) : 0;
    if ($('unitPercent')) $('unitPercent').textContent = pct + '%';
    if ($('unitMeter')) $('unitMeter').style.width = pct + '%';
    $$('#pageNav button').forEach((b) => b.classList.toggle('done', state.done.includes(b.dataset.page)));
  }

  // ---------- ניווט ----------
  let current = 0;
  const nav = $('pageNav');
  if (nav && !nav.querySelector('button')) {
    panels.forEach((p, i) => {
      const b = document.createElement('button');
      b.dataset.page = p.dataset.pagePanel;
      b.textContent = p.dataset.pageTitle || i + 1 + '. ' + (p.querySelector('h2')?.textContent || p.dataset.pagePanel);
      nav.appendChild(b);
    });
  }
  $$('#pageNav button').forEach((b) => b.addEventListener('click', () => show(pages.indexOf(b.dataset.page))));
  function show(index) {
    current = Math.max(0, Math.min(pages.length - 1, index));
    const id = pages[current];
    panels.forEach((p) => (p.hidden = p.dataset.pagePanel !== id));
    $$('#pageNav button').forEach((b) => b.classList.toggle('active', b.dataset.page === id));
    if ($('pageCounter')) $('pageCounter').textContent = 'דף ' + (current + 1) + ' מתוך ' + pages.length;
    if ($('prevPage')) $('prevPage').disabled = current === 0;
    if ($('nextPage')) $('nextPage').disabled = current === pages.length - 1;
    history.replaceState(null, '', '#' + id);
    const pageLabel = ($$('#pageNav button').find((b) => b.dataset.page === id)?.textContent || id).trim().replace(/^\d+\.\s*/, '');
    try {
      localStorage.setItem(
        'tourismLastVisit',
        JSON.stringify({ unitId: UNIT.id, label: UNIT.label, file: UNIT.file, hash: id, pageIndex: current, pageTotal: pages.length, pageLabel, ts: Date.now() })
      );
      const map = JSON.parse(localStorage.getItem('tourismUnitProgress') || '{}');
      map[UNIT.id] = { pageIndex: current, pageTotal: pages.length, ts: Date.now() };
      localStorage.setItem('tourismUnitProgress', JSON.stringify(map));
    } catch (_) {
      /* ignore */
    }
    (document.querySelector('.unit-main') || window).scrollTo({ top: 0, behavior: 'smooth' });
    $('unitRail')?.classList.remove('open');
  }
  panels.forEach((p, i) => {
    const kicker = p.querySelector('.lesson-kicker');
    if (kicker) kicker.textContent = 'דף ' + (i + 1) + ' מתוך ' + pages.length;
  });
  $('prevPage')?.addEventListener('click', () => show(current - 1));
  $('nextPage')?.addEventListener('click', () => show(current + 1));
  $('menuToggle')?.addEventListener('click', () => $('unitRail')?.classList.toggle('open'));
  window.addEventListener('popstate', () => show(pages.indexOf(location.hash.slice(1))));

  // ---------- כללי השלמה אחידים ----------
  function gamesBlocker(id) {
    const missing = gamesOn(id).filter((g) => !state.games.includes(g.id)).length;
    return missing ? 'נשארו ' + missing + ' פעילויות להשלמה לפני שהדף יסומן.' : '';
  }
  function completionBlocker(panel) {
    const id = panel.dataset.pagePanel;
    switch (kindOf(id)) {
      case 'images': {
        const cards = $$('[data-recognition]', panel);
        const targets = $$('[data-match-target]', panel);
        if (cards.some((c) => !state.recognized.includes(c.dataset.recognition))) return 'חשפו את כל התמונות לפני שממשיכים.';
        if (targets.some((t) => !state.matched.includes(t.dataset.matchTarget))) return 'שבצו את כל הפריטים במפה לפני שממשיכים.';
        return gamesBlocker(id);
      }
      case 'presentation':
        return SLIDES.length && state.slidesSeen < SLIDES.length ? 'עברו על כל השקופיות עד הסוף.' : '';
      case 'practice':
        if (QUIZ.length) return state.quiz && state.quiz.best / state.quiz.total >= PASS_RATIO ? '' : 'צריך לעבור את הבוחן (60 ומעלה). אפשר לנסות שוב.';
        if (EXAM.length) return state.submitted.includes('exam') ? '' : 'שלחו לפחות סעיף אחד לבדיקה.';
        return '';
      case 'games': {
        const missing = GAMES.filter((g) => !state.games.includes(g.id)).length;
        return missing ? 'נשארו ' + missing + ' משחקים להשלמה בדפי היחידה.' : '';
      }
      case 'exam': {
        const passed = EXAM_KEYS.filter((k) => state.examPassed.includes(k)).length;
        return passed < EXAM_KEYS.length ? 'עברו ' + passed + ' מתוך ' + EXAM_KEYS.length + ' סעיפים. השלימו את כולם כדי לסמן את הדף.' : '';
      }
      default: {
        const hasQuestion = panel.querySelector('.check-card textarea');
        if (hasQuestion && !state.submitted.includes(id) && (state.failed[id] || 0) < 2) return 'ענו על שאלת הדף ושלחו לבדיקה לפני שממשיכים.'; // אחרי שני כשלי שרת לא חוסמים את הלמידה
        return gamesBlocker(id);
      }
    }
  }
  function notice(panel, text) {
    let note = panel.querySelector('.page-gate-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'page-gate-note';
      panel.querySelector('.complete-page')?.before(note);
    }
    note.textContent = text;
    note.hidden = !text;
  }
  $$('.complete-page').forEach((button) =>
    button.addEventListener('click', () => {
      const panel = button.closest('[data-page-panel]');
      const id = panel.dataset.pagePanel;
      const blocker = completionBlocker(panel);
      if (blocker) {
        notice(panel, blocker);
        const target = /פעילויות|משחקים/.test(blocker) ? panel.querySelector('.chapter-practice, [data-games-slot]') : panel.querySelector('.check-card, .visual-grid, .slide-deck, #unitQuiz, #examBank');
        (target || panel).scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      notice(panel, '');
      if (!state.done.includes(id)) state.done.push(id);
      save();
      if (current < pages.length - 1) show(current + 1);
    })
  );

  // ---------- שאלות פתוחות (בכל דף) ----------
  function wordCount(text) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }
  // טיוטות: מה שנכתב בתיבה נשמר מקומית, כדי שרענון או פקיעת כניסה לא ימחקו תשובה באמצע
  let draftTimer = null;
  function bindDraft(textarea, key) {
    if (state.drafts[key] && !textarea.value) textarea.value = state.drafts[key];
    textarea.addEventListener('input', () => {
      state.drafts[key] = textarea.value;
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => {
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(state));
        } catch (_) {
          /* ignore */
        }
      }, 400);
    });
  }
  function rubricScore(answer, criteria) {
    const normalized = answer.replace(/[״׳]/g, '').toLowerCase();
    const checks = (criteria || []).map(([label, terms]) => ({ label, met: (terms || []).some((t) => normalized.includes(String(t).replace(/[״׳]/g, '').toLowerCase())) }));
    const met = checks.filter((c) => c.met).length;
    return { checks, met, total: checks.length, words: wordCount(answer) };
  }
  function hintReport(answer, hints) {
    if (!Array.isArray(hints) || !hints.length) return '';
    const normalized = answer.replace(/[״׳]/g, '').toLowerCase();
    const items = hints.map(([label, terms]) => {
      const met = (terms || []).some((t) => normalized.includes(String(t).replace(/[״׳]/g, '').toLowerCase()));
      return `<li class="${met ? 'met' : 'missing'}">${met ? 'נמצא' : 'כדאי להוסיף'}: ${escapeHtml(label)}</li>`;
    });
    return '<ul class="exam-hints">' + items.join('') + '</ul>';
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  async function submitOpen({ question, textarea, feedback, key, hints }) {
    const answer = textarea.value.trim();
    if (wordCount(answer) < MIN_WORDS) {
      feedback.className = 'answer-feedback needs-work';
      feedback.textContent = 'כדאי לכתוב תשובה מלאה יותר (לפחות ' + MIN_WORDS + ' מילים) לפני הבדיקה.';
      return;
    }
    const problem = sessionProblem();
    if (problem) {
      feedback.className = 'answer-feedback needs-work';
      feedback.textContent = problem + ' התשובה נשארה בתיבה.';
      return;
    }
    feedback.className = 'answer-feedback loading';
    feedback.textContent = 'שולח לבדיקה…';
    try {
      const data = await api('submitOpenAnswer', { unit_id: UNIT.id, question, answer });
      const statusLine =
        data?.status === 'pending_review' ? 'נשמר ✓ · הבודק לא היה בטוח, התשובה ממתינה לבדיקת המורה.' : 'נשמר בכיתה פלוס ✓';
      feedback.className = 'answer-feedback success';
      feedback.innerHTML =
        (data?.feedback ? '<b>משוב הבוט:</b> ' + escapeHtml(data.feedback).replace(/\n/g, '<br>') + '<br>' : '') +
        '<small>' + statusLine + '</small>' +
        hintReport(answer, hints);
      if (!state.submitted.includes(key)) state.submitted.push(key);
      save();
    } catch (e) {
      state.failed[key] = (state.failed[key] || 0) + 1;
      save();
      feedback.className = 'answer-feedback needs-work';
      feedback.textContent = 'השליחה נכשלה (' + e.message + '). התשובה נשארה בתיבה, נסו לשלוח שוב.';
    }
  }
  panels.forEach((panel) => {
    const card = panel.querySelector('.check-card');
    const textarea = card?.querySelector('textarea');
    const button = card?.querySelector('.check-open');
    if (!textarea || !button) return;
    const pageId = panel.dataset.pagePanel;
    const feedback = card.querySelector('.answer-feedback') || card.appendChild(Object.assign(document.createElement('div'), { className: 'answer-feedback' }));
    const question = card.querySelector('label')?.textContent.trim() || textarea.dataset.openQuestion || textarea.dataset.question || 'שאלת דף';
    bindDraft(textarea, pageId);
    button.addEventListener('click', () => submitOpen({ question, textarea, feedback, key: pageId, hints: OPEN_HINTS[pageId] }));
  });

  // ---------- זיהוי תמונות + מפה אילמת ----------
  const recognitionCards = $$('[data-recognition]');
  function renderRecognition() {
    recognitionCards.forEach((card) => card.classList.toggle('revealed', state.recognized.includes(card.dataset.recognition)));
    if ($('recognitionProgress')) $('recognitionProgress').textContent = state.recognized.length + ' מתוך ' + recognitionCards.length + ' אתרים נחשפו';
  }
  recognitionCards.forEach((card) =>
    card.addEventListener('click', () => {
      const site = card.dataset.recognition;
      if (!state.recognized.includes(site)) {
        state.recognized.push(site);
        save();
        quietly(api('saveSiteKnown', { site, region: UNIT.id, known: true }));
      }
      renderRecognition();
    })
  );
  renderRecognition();

  let selectedLabel = '';
  const matchLabels = $$('[data-match-label]');
  const matchTargets = $$('[data-match-target]');
  function renderMatch() {
    matchLabels.forEach((b) => {
      b.classList.toggle('selected', b.dataset.matchLabel === selectedLabel);
      b.disabled = state.matched.includes(b.dataset.matchLabel);
    });
    matchTargets.forEach((t) => {
      const done = state.matched.includes(t.dataset.matchTarget);
      t.classList.toggle('placed', done);
      t.textContent = done ? '✓' : '?';
    });
    if ($('matchFeedback') && matchTargets.length) $('matchFeedback').textContent = state.matched.length + ' מתוך ' + matchTargets.length + ' שובצו';
  }
  matchLabels.forEach((b) =>
    b.addEventListener('click', () => {
      selectedLabel = b.dataset.matchLabel;
      renderMatch();
    })
  );
  matchTargets.forEach((t) =>
    t.addEventListener('click', () => {
      const fb = $('matchFeedback');
      if (!selectedLabel) {
        if (fb) fb.textContent = 'בחרו קודם שם מהרשימה';
        return;
      }
      if (selectedLabel !== t.dataset.matchTarget) {
        if (fb) fb.textContent = 'לא כאן — נסו אזור אחר';
        return;
      }
      state.matched.push(selectedLabel);
      selectedLabel = '';
      save();
      renderMatch();
    })
  );
  if (matchTargets.length) renderMatch();

  // ---------- מצגת ----------
  let slide = 0;
  function slideImage(src) {
    return /^https?:/.test(src) ? src : IMAGE_BASE + src;
  }
  function renderSlide() {
    const stage = $('slideStage');
    if (!stage || !SLIDES.length) return;
    const s = SLIDES[slide];
    stage.innerHTML =
      '<article class="region-slide"><div>' +
      (s.k ? '<span>' + escapeHtml(s.k) + '</span>' : '<span>' + escapeHtml(UNIT.label) + '</span>') +
      '<h3>' + escapeHtml(s.t) + '</h3><p>' + escapeHtml(s.p) + '</p>' + (s.accent ? '<b class="slide-accent">' + escapeHtml(s.accent) + '</b>' : '') + '</div>' +
      (s.img ? '<img src="' + escapeHtml(slideImage(s.img)) + '" alt="' + escapeHtml(s.alt || s.t) + '">' : '') +
      '</article>';
    if ($('slideCount')) $('slideCount').textContent = slide + 1 + ' / ' + SLIDES.length;
    if ($('prevSlide')) $('prevSlide').disabled = slide === 0;
    if ($('nextSlide')) $('nextSlide').disabled = slide === SLIDES.length - 1;
    if (slide + 1 > state.slidesSeen) {
      state.slidesSeen = slide + 1;
      save();
    }
    if ($('presentationFeedback')) $('presentationFeedback').textContent = state.slidesSeen >= SLIDES.length ? 'המצגת הושלמה ✓' : 'עברו על כל השקופיות כדי להשלים את הדף.';
  }
  $('prevSlide')?.addEventListener('click', () => {
    if (slide > 0) slide--;
    renderSlide();
  });
  $('nextSlide')?.addEventListener('click', () => {
    if (slide < SLIDES.length - 1) slide++;
    renderSlide();
  });
  $('fullscreenSlides')?.addEventListener('click', () => document.querySelector('.slide-deck')?.requestFullscreen?.());
  renderSlide();

  // ---------- בוחן ----------
  const quizBox = $('unitQuiz');
  let qIndex = 0,
    qScore = 0,
    qResults = [];
  function renderQuizIntro() {
    if (!quizBox) return;
    if (!QUIZ.length) {
      quizBox.innerHTML = '<div class="quiz-card"><p class="quiz-kicker">בוחן</p><h3>הבוחן ליחידה זו יתווסף כשהשאלות יאושרו על ידי המורה.</h3></div>';
      return;
    }
    const best = state.quiz ? Math.round((state.quiz.best / state.quiz.total) * 100) : null;
    quizBox.innerHTML =
      '<div class="quiz-card"><p class="quiz-kicker">בוחן מסכם · ' + QUIZ.length + ' שאלות</p>' +
      '<h3>' + (best === null ? 'בודקים מוכנות?' : 'הציון הטוב ביותר שלך: ' + best) + '</h3>' +
      '<p class="quiz-feedback">ציון עובר: 60. אפשר לנסות שוב ללא הגבלה.</p>' +
      '<button class="button button-primary" id="startQuiz">' + (best === null ? 'התחלת הבוחן' : 'ניסיון נוסף') + '</button></div>';
    $('startQuiz').addEventListener('click', () => {
      qIndex = 0;
      qScore = 0;
      qResults = [];
      renderQuestion();
    });
  }
  function renderQuestion() {
    const x = QUIZ[qIndex];
    quizBox.innerHTML =
      '<div class="quiz-card"><p class="quiz-kicker" id="quizKicker">שאלה ' + (qIndex + 1) + ' מתוך ' + QUIZ.length + '</p>' +
      '<h3 id="questionText">' + escapeHtml(x.q) + '</h3><div class="answer-list" id="answerList"></div>' +
      '<p class="quiz-feedback" id="quizFeedback"></p><button class="button button-primary" id="nextQuestion" disabled>' +
      (qIndex === QUIZ.length - 1 ? 'סיום הבוחן' : 'לשאלה הבאה') + '</button></div>';
    const list = $('answerList');
    // סדר התשובות מעורבב בכל הצגה, כדי שהמיקום לא ילמד את התשובה
    const order = x.a.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((i) => {
      const label = x.a[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', () => {
        const ok = i === x.correct;
        qResults[qIndex] = { index: qIndex, correct: ok };
        if (ok) qScore++;
        $$('#answerList button').forEach((n, j) => {
          n.disabled = true;
          if (order[j] === x.correct) n.classList.add('correct');
        });
        if (!ok) b.classList.add('wrong');
        $('quizFeedback').textContent = (ok ? 'נכון! ' : 'לא מדויק. ') + (x.explain || '');
        $('nextQuestion').disabled = false;
      });
      list.appendChild(b);
    });
    $('nextQuestion').addEventListener('click', () => {
      if (qIndex < QUIZ.length - 1) {
        qIndex++;
        renderQuestion();
      } else finishQuiz();
    });
  }
  function finishQuiz() {
    const pct = Math.round((qScore / QUIZ.length) * 100);
    const passed = qScore / QUIZ.length >= PASS_RATIO;
    if (!state.quiz || qScore > state.quiz.best) state.quiz = { best: qScore, total: QUIZ.length };
    save();
    quietly(api('saveBagrutQuizResult', { unit_id: UNIT.id, score: qScore, total: QUIZ.length }));
    quietly(api('updateBagrutMistakes', { unit_id: UNIT.id, results: qResults }));
    quizBox.innerHTML =
      '<div class="quiz-card"><p class="quiz-kicker">תוצאה</p><h3>הציון שלך: ' + pct + '</h3>' +
      '<p class="quiz-feedback">' + (passed ? 'עברתם את הבוחן ✓ אפשר לסמן את הדף כהושלם.' : 'עדיין לא 60. כדאי לחזור לדפי התוכן ולנסות שוב.') + '</p>' +
      '<button class="button button-primary" id="startQuiz">ניסיון נוסף</button></div>';
    $('startQuiz').addEventListener('click', () => {
      qIndex = 0;
      qScore = 0;
      qResults = [];
      renderQuestion();
    });
  }
  renderQuizIntro();

  // ---------- מאגר בגרות (סעיפים עם מחוון) ----------
  // כל סעיף נבדק מיד מול המחוון (רכיבים שחייבים להופיע) ונשלח לבוט למשוב. סעיף "עבר" כשרוב הרכיבים
  // נמצאו ויש מספיק מילים; זה מה שמשלים דף מסוג exam. בלי מחוון (c) הסעיף עובר עם השליחה לשרת.
  const examBox = $('examBank');
  function partOf(qi, pi) {
    const part = (EXAM[qi]?.parts || [])[pi];
    return typeof part === 'string' ? { q: part, c: null } : part || { q: '', c: null };
  }
  function renderExamProgress() {
    const box = $('examProgress');
    if (!box || !EXAM.length) return;
    const doneQ = EXAM.filter((q, qi) => (q.parts || []).every((_, pi) => state.examPassed.includes(qi + '-' + pi))).length;
    box.innerHTML = '<b>' + doneQ + ' מתוך ' + EXAM.length + ' שאלות הושלמו</b><div class="meter"><i style="width:' + Math.round((doneQ / EXAM.length) * 100) + '%"></i></div>';
    $$('.exam-question', examBox).forEach((art, qi) => art.classList.toggle('answer-complete', (EXAM[qi].parts || []).every((_, pi) => state.examPassed.includes(qi + '-' + pi))));
    $$('.exam-part', examBox).forEach((box) => {
      const key = box.querySelector('textarea')?.dataset.exam;
      box.classList.toggle('part-complete', state.examPassed.includes(key));
      const stateEl = box.querySelector('.exam-part-state');
      if (stateEl) stateEl.textContent = state.examPassed.includes(key) ? 'הסעיף עבר ✓' : 'טרם עבר';
    });
  }
  async function submitExamPart(qi, pi, box) {
    const part = partOf(qi, pi);
    const key = qi + '-' + pi;
    const textarea = box.querySelector('textarea');
    const feedback = box.querySelector('.answer-feedback');
    const answer = textarea.value.trim();
    const words = wordCount(answer);
    if (words < EXAM_MIN_WORDS) {
      feedback.className = 'answer-feedback needs-work';
      feedback.textContent = 'כדאי לכתוב תשובה מלאה יותר (לפחות ' + EXAM_MIN_WORDS + ' מילים) לפני הבדיקה.';
      return;
    }
    let passed;
    let local = '';
    if (Array.isArray(part.c) && part.c.length) {
      const r = rubricScore(answer, part.c);
      passed = r.met / r.total >= EXAM_PASS_RATIO;
      local =
        '<b>' + (passed ? 'התשובה בכיוון הנכון ✓' : 'כדאי לשפר את התשובה') + '</b> <small>נמצאו ' + r.met + ' מתוך ' + r.total + ' רכיבים · ' + r.words + ' מילים</small>' +
        '<ul class="exam-hints">' + r.checks.map((c) => '<li class="' + (c.met ? 'met' : 'missing') + '">' + (c.met ? 'נמצא' : 'חסר') + ': ' + escapeHtml(c.label) + '</li>').join('') + '</ul>';
      feedback.className = 'answer-feedback ' + (passed ? 'success' : 'needs-work');
      feedback.innerHTML = local + '<small class="server-note">שולח לבוט למשוב…</small>';
    } else {
      feedback.className = 'answer-feedback loading';
      feedback.textContent = 'שולח לבדיקה…';
    }
    if (passed && !state.examPassed.includes(key)) state.examPassed.push(key);
    if (passed === false) state.examPassed = state.examPassed.filter((k) => k !== key);
    save();
    renderExamProgress();
    const problem = sessionProblem();
    const note = (text) => {
      const el = feedback.querySelector('.server-note');
      if (el) el.textContent = text;
      else feedback.textContent = text;
    };
    if (problem) {
      note(problem + ' התשובה נשארה בתיבה.');
      return;
    }
    try {
      const data = await api('submitOpenAnswer', { unit_id: UNIT.id, question: part.q, answer });
      const statusLine = data?.status === 'pending_review' ? 'נשמר ✓ · הבודק לא היה בטוח, התשובה ממתינה לבדיקת המורה.' : 'נשמר בכיתה פלוס ✓';
      if (passed === undefined) {
        passed = true;
        if (!state.examPassed.includes(key)) state.examPassed.push(key);
        feedback.className = 'answer-feedback success';
      }
      if (!state.submitted.includes('exam')) state.submitted.push('exam');
      save();
      renderExamProgress();
      const bot = data?.feedback ? '<b>משוב הבוט:</b> ' + escapeHtml(data.feedback).replace(/\n/g, '<br>') + '<br>' : '';
      feedback.innerHTML = (local || '') + bot + '<small>' + statusLine + '</small>';
    } catch (e) {
      state.failed.exam = (state.failed.exam || 0) + 1;
      save();
      note((local ? 'הבדיקה המקומית הושלמה; ' : '') + 'השליחה נכשלה (' + e.message + '). התשובה נשארה בתיבה, נסו לשלוח שוב.');
    }
  }
  if (examBox) {
    if (!EXAM.length) examBox.innerHTML = '<p class="quiz-feedback">שאלות בגרות ליחידה זו יתווספו כשיאומתו מול מסמך המקור.</p>';
    else examBox.innerHTML = EXAM.map(
      (q, qi) =>
        '<article class="exam-question"><div class="question-label"><span>שאלה ' + (qi + 1) + '</span>' + (q.topic ? '<em>' + escapeHtml(q.topic) + '</em>' : '') + '</div><h3>' + escapeHtml(q.title) + '</h3>' +
        (q.parts || [])
          .map((part, pi) => {
            const text = typeof part === 'string' ? part : part.q;
            return (
              '<div class="exam-part"><label><b>' + String.fromCharCode(1488 + pi) + '.</b> ' + escapeHtml(text) + '</label>' +
              '<textarea data-exam="' + qi + '-' + pi + '" placeholder="כתבו תשובה מלאה לסעיף..."></textarea>' +
              '<div class="answer-meta"><small class="exam-part-state">טרם עבר</small></div>' +
              '<button type="button" class="check-exam">בדיקת הסעיף</button><div class="answer-feedback"></div></div>'
            );
          })
          .join('') +
        '</article>'
    ).join('');
    $$('.exam-part', examBox).forEach((box) => {
      const textarea = box.querySelector('textarea');
      bindDraft(textarea, 'exam-' + textarea.dataset.exam);
      box.querySelector('.check-exam').addEventListener('click', () => {
        const [qi, pi] = textarea.dataset.exam.split('-').map(Number);
        submitExamPart(qi, pi, box);
      });
    });
    renderExamProgress();
  }

  // ---------- משחקים מונחי-נתונים (DATA.games) ----------
  // כל משחק הוא {id, type, page, title, intro, ...נתונים}. המנוע מצייר אותו בתוך הדף (ב-[data-games-slot]
  // או בבלוק "תרגול בתוך היחידה" לפני כפתור "סיימתי"), ומסמן אותו כהושלם ב-state.games.
  // 10 סוגים: match, clues, order, memory, puzzle, map, streak, speed, silent-map, recognition.
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };
  function gameDone(game, card) {
    if (!state.games.includes(game.id)) {
      state.games.push(game.id);
      save();
    }
    card.classList.add('game-complete');
    renderGamesSummary();
  }
  const GAME_TYPES = {
    // התאמה דרך select: פריטים [שם, תשובה]. options = רשימת אפשרויות קבועה (אזורים), או ריק = התשובות מעורבבות (הגדרות)
    match(game, card, body) {
      const options = game.options && game.options.length ? game.options : shuffle(game.items.map((x) => x[1]));
      const grid = el('div', 'match-grid' + (game.options ? ' inline' : ''));
      grid.innerHTML = game.items
        .map((x, i) => '<label><b>' + escapeHtml(x[0]) + '</b><select data-match-item="' + i + '"><option value="">' + escapeHtml(game.placeholder || 'בחרו') + '</option>' + options.map((o) => '<option>' + escapeHtml(o) + '</option>').join('') + '</select></label>')
        .join('');
      body.appendChild(grid);
      const check = el('button', 'button button-outline', 'בדיקה');
      check.type = 'button';
      const fb = el('small', 'game-feedback');
      body.append(fb, check);
      check.addEventListener('click', () => {
        const correct = game.items.filter((x, i) => grid.querySelector('[data-match-item="' + i + '"]').value === x[1]).length;
        fb.textContent = correct + ' מתוך ' + game.items.length + ' התאמות נכונות';
        if (correct === game.items.length) gameDone(game, card);
      });
    },
    // "מי אני?": רמזים עם 3 אפשרויות, סף הצלחה pass (ברירת מחדל: כולם חוץ מאחד)
    clues(game, card, body) {
      const pass = game.pass || Math.max(1, game.items.length - 1);
      let index = 0,
        score = 0;
      const text = el('p', 'game-clue');
      const choices = el('div', 'game-choices');
      const fb = el('small', 'game-feedback');
      const next = el('button', 'button button-outline', 'הרמז הבא');
      next.type = 'button';
      next.disabled = true;
      body.append(text, choices, fb, next);
      const render = () => {
        const c = game.items[index];
        text.textContent = c[0];
        fb.textContent = 'רמז ' + (index + 1) + ' מתוך ' + game.items.length;
        choices.innerHTML = '';
        shuffle(c[1]).forEach((name) => {
          const b = el('button', '', escapeHtml(name));
          b.type = 'button';
          b.addEventListener('click', () => {
            $$('button', choices).forEach((x) => (x.disabled = true));
            const right = c[1][c[2] || 0];
            if (name === right) {
              b.classList.add('correct');
              score++;
            } else {
              b.classList.add('wrong');
              $$('button', choices).find((x) => x.textContent === right)?.classList.add('correct');
            }
            next.disabled = false;
          });
          choices.appendChild(b);
        });
      };
      next.addEventListener('click', () => {
        if (index < game.items.length - 1) {
          index++;
          next.disabled = true;
          render();
          return;
        }
        fb.textContent = 'סיימתם עם ' + score + ' מתוך ' + game.items.length;
        if (score >= pass) gameDone(game, card);
        else {
          index = 0;
          score = 0;
          next.disabled = true;
          setTimeout(render, 900);
        }
      });
      render();
    },
    // סידור תחנות: stops בסדר הנכון; המשתמש בוחר בכל select
    order(game, card, body) {
      const wrap = el('div', 'route-selects');
      const options = shuffle(game.stops);
      wrap.innerHTML = game.stops.map((_, i) => '<select data-order="' + i + '"><option value="">' + escapeHtml(game.placeholder || 'בחרו תחנה') + '</option>' + options.map((o) => '<option>' + escapeHtml(o) + '</option>').join('') + '</select>').join('');
      const check = el('button', 'button button-outline', 'בדיקת המסלול');
      check.type = 'button';
      const fb = el('small', 'game-feedback');
      body.append(wrap, fb, check);
      check.addEventListener('click', () => {
        const ok = game.stops.every((stop, i) => wrap.querySelector('[data-order="' + i + '"]').value === stop);
        fb.textContent = ok ? game.success || 'הסדר נכון ✓' : game.fail || 'בדקו שוב את הסדר.';
        if (ok) gameDone(game, card);
      });
    },
    // זיכרון: זוגות [א, ב]
    memory(game, card, body) {
      const board = el('div', 'memory-board');
      const fb = el('small', 'game-feedback');
      const reset = el('button', 'button button-outline', 'ערבוב מחדש');
      reset.type = 'button';
      body.append(board, fb, reset);
      let open = [],
        locked = false,
        matches = 0;
      const build = () => {
        open = [];
        locked = false;
        matches = 0;
        board.innerHTML = '';
        shuffle(game.pairs.flatMap((p, i) => p.map((text) => ({ pair: i, text })))).forEach((c) => {
          const b = el('button', '', '<span>?</span>');
          b.type = 'button';
          b.dataset.pair = c.pair;
          b.dataset.text = c.text;
          b.addEventListener('click', () => flip(b));
          board.appendChild(b);
        });
        fb.textContent = '0 מתוך ' + game.pairs.length + ' זוגות';
      };
      const flip = (b) => {
        if (locked || b.classList.contains('matched') || b.classList.contains('flipped')) return;
        b.classList.add('flipped');
        b.innerHTML = '<span>' + escapeHtml(b.dataset.text) + '</span>';
        open.push(b);
        if (open.length < 2) return;
        if (open[0].dataset.pair === open[1].dataset.pair) {
          open.forEach((x) => x.classList.add('matched'));
          open = [];
          matches++;
          fb.textContent = matches + ' מתוך ' + game.pairs.length + ' זוגות';
          if (matches === game.pairs.length) gameDone(game, card);
          return;
        }
        locked = true;
        setTimeout(() => {
          open.forEach((x) => {
            x.classList.remove('flipped');
            x.innerHTML = '<span>?</span>';
          });
          open = [];
          locked = false;
        }, 700);
      };
      reset.addEventListener('click', build);
      build();
    },
    // פאזל 3×3: לחיצה על שתי חתיכות מחליפה ביניהן
    puzzle(game, card, body) {
      const board = el('div', 'image-puzzle');
      const fb = el('small', 'game-feedback');
      const reset = el('button', 'button button-outline', 'ערבוב מחדש');
      reset.type = 'button';
      body.append(board, fb, reset);
      let order = [],
        selected = null;
      const src = slideImage(game.img);
      const render = () => {
        board.innerHTML = '';
        order.forEach((piece, pos) => {
          const b = el('button');
          b.type = 'button';
          b.dataset.position = pos;
          b.dataset.piece = piece;
          b.setAttribute('aria-label', 'חתיכה ' + (piece + 1));
          b.style.backgroundImage = 'url(' + src + ')';
          b.style.backgroundPosition = (piece % 3) * 50 + '% ' + Math.floor(piece / 3) * 50 + '%';
          b.addEventListener('click', () => select(b));
          board.appendChild(b);
        });
        fb.textContent = 'הרכיבו את ' + (game.label || 'התמונה');
      };
      const build = () => {
        order = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
        if (order.every((x, i) => x === i)) [order[0], order[1]] = [order[1], order[0]];
        selected = null;
        render();
      };
      const select = (b) => {
        if (!selected) {
          selected = b;
          b.classList.add('selected');
          return;
        }
        const a = Number(selected.dataset.position),
          c = Number(b.dataset.position);
        [order[a], order[c]] = [order[c], order[a]];
        selected = null;
        render();
        if (order.every((x, i) => x === i)) {
          fb.textContent = 'הפאזל הושלם — ' + (game.label || '') + ' ✓';
          gameDone(game, card);
        }
      };
      reset.addEventListener('click', build);
      build();
    },
    // מפה: rounds סיבובים של "מצאו את X" על נקודות ממוספרות; sites = [שם, top%, left%, הסבר]
    map(game, card, body) {
      const rounds = Math.min(game.rounds || 5, game.sites.length);
      const pass = game.pass || Math.max(1, rounds - 1);
      const prompt = el('p', 'game-map-prompt');
      const map = el('div', 'coast-map');
      const credit = el('a', 'map-credit', 'מפה: Wikimedia Commons · CC BY-SA 3.0');
      credit.href = 'https://commons.wikimedia.org/wiki/File:Israel_location_map_current_borders.svg';
      credit.target = '_blank';
      credit.rel = 'noopener';
      const fb = el('small', 'game-feedback');
      const reset = el('button', 'button button-outline', 'משחק חדש');
      reset.type = 'button';
      body.append(prompt, map, credit, fb, reset);
      let round = 0,
        correct = 0,
        targets = [],
        locked = false;
      const build = () => {
        round = 0;
        correct = 0;
        locked = false;
        targets = shuffle(game.sites).slice(0, rounds);
        map.innerHTML = game.sites.map((s, i) => '<button type="button" style="top:' + s[1] + '%;left:' + s[2] + '%" data-map-site="' + i + '" aria-label="נקודה ' + (i + 1) + ' במפה"><i></i><span>' + (i + 1) + '</span></button>').join('');
        $$('[data-map-site]', map).forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.mapSite))));
        fb.textContent = 'בחרו נקודה לפי מיקומה';
        prompt.textContent = 'סיבוב 1 מתוך ' + rounds + ': מצאו את ' + targets[0][0];
      };
      const answer = (index) => {
        if (locked) return;
        locked = true;
        const wanted = targets[round],
          chosen = game.sites[index];
        if (chosen[0] === wanted[0]) {
          correct++;
          fb.textContent = 'נכון — ' + (wanted[3] || wanted[0]) + ' ✓';
        } else fb.textContent = 'לא בדיוק. ' + wanted[0] + ': ' + (wanted[3] || '') + ' בחרתם ' + chosen[0] + '.';
        round++;
        setTimeout(() => {
          locked = false;
          if (round < rounds) {
            prompt.textContent = 'סיבוב ' + (round + 1) + ' מתוך ' + rounds + ': מצאו את ' + targets[round][0];
            return;
          }
          prompt.textContent = 'המסלול הסתיים';
          fb.textContent = correct + ' מתוך ' + rounds + ' נכונות' + (correct >= pass ? ' — מצוין! ✓' : ' — נסו שוב כדי להגיע ל־' + pass);
          if (correct >= pass) gameDone(game, card);
        }, 650);
      };
      reset.addEventListener('click', build);
      build();
    },
    // רצף נכון/לא נכון: items = [היגד, נכון?, הסבר]; צריך target נכונים ברצף
    streak(game, card, body) {
      const target = game.target || 5;
      const statement = el('p', 'game-statement');
      const actions = el('div', 'binary-actions', '<button type="button" data-streak-answer="true">נכון</button><button type="button" data-streak-answer="false">לא נכון</button>');
      const fb = el('small', 'game-feedback');
      const reset = el('button', 'button button-outline', 'התחלה מחדש');
      reset.type = 'button';
      body.append(statement, actions, fb, reset);
      let index = 0,
        count = 0,
        locked = false;
      const render = () => {
        statement.textContent = game.items[index][0];
        fb.textContent = 'רצף נוכחי: ' + count + ' מתוך ' + target;
      };
      const answer = (value) => {
        if (locked) return;
        locked = true;
        const item = game.items[index],
          right = value === Boolean(item[1]);
        count = right ? count + 1 : 0;
        fb.textContent = (right ? 'נכון' : 'לא נכון') + ' — ' + (item[2] || '') + ' רצף: ' + count + '/' + target;
        if (count >= target) {
          gameDone(game, card);
          locked = false;
          return;
        }
        setTimeout(() => {
          index = (index + 1) % game.items.length;
          locked = false;
          render();
        }, 800);
      };
      $$('[data-streak-answer]', actions).forEach((b) => b.addEventListener('click', () => answer(b.dataset.streakAnswer === 'true')));
      reset.addEventListener('click', () => {
        index = 0;
        count = 0;
        locked = false;
        render();
      });
      render();
    },
    // אתגר מהיר: items = [שאלה, [אפשרויות], תשובה, הסבר], seconds שניות, pass נכונות
    speed(game, card, body) {
      const seconds = game.seconds || 45;
      const pass = game.pass || Math.max(1, game.items.length - 1);
      const question = el('p', 'game-speed-question', 'ענו על ' + pass + ' מתוך ' + game.items.length + ' שאלות לפני שהזמן נגמר.');
      const head = el('div', 'speed-head', '<b class="speed-timer">' + seconds + '</b><span class="speed-score">0 / ' + game.items.length + '</span>');
      const choices = el('div', 'game-choices');
      const fb = el('small', 'game-feedback', 'השעון יתחיל בלחיצה');
      const start = el('button', 'button button-outline', 'התחלת האתגר');
      start.type = 'button';
      body.append(question, head, choices, fb, start);
      const timer = head.querySelector('.speed-timer'),
        scoreEl = head.querySelector('.speed-score');
      let index = 0,
        correct = 0,
        left = seconds,
        clock = null,
        active = false,
        locked = false;
      const render = () => {
        const q = game.items[index];
        question.textContent = q[0];
        scoreEl.textContent = correct + ' / ' + game.items.length;
        choices.innerHTML = '';
        shuffle(q[1]).forEach((a) => {
          const b = el('button', '', escapeHtml(a));
          b.type = 'button';
          b.addEventListener('click', () => answer(a));
          choices.appendChild(b);
        });
      };
      const finish = () => {
        clearInterval(clock);
        active = false;
        locked = false;
        start.disabled = false;
        scoreEl.textContent = correct + ' / ' + game.items.length;
        fb.textContent = correct >= pass ? 'הצלחתם באתגר המהיר ✓' : correct + ' נכונות — נסו שוב והגיעו ל־' + pass;
        if (correct >= pass) gameDone(game, card);
      };
      const answer = (a) => {
        if (!active || locked) return;
        locked = true;
        const q = game.items[index],
          right = a === q[2];
        if (right) correct++;
        fb.textContent = right ? 'נכון ✓' : 'התשובה היא ' + q[2] + ' — ' + (q[3] || '');
        $$('button', choices).forEach((b) => (b.disabled = true));
        index++;
        setTimeout(() => {
          locked = false;
          if (index === game.items.length) finish();
          else render();
        }, 500);
      };
      start.addEventListener('click', () => {
        clearInterval(clock);
        index = 0;
        correct = 0;
        left = seconds;
        active = true;
        locked = false;
        start.disabled = true;
        fb.textContent = 'האתגר התחיל';
        timer.textContent = left;
        render();
        clock = setInterval(() => {
          left--;
          timer.textContent = left;
          if (left <= 0) finish();
        }, 1000);
      });
    },
    // מפה אילמת: sites = [שם, top%, left%]; בוחרים שם ואז נקודה (או גרירה)
    'silent-map'(game, card, body) {
      const wrap = el('div', 'silent-map-game');
      const bank = el('div', 'map-label-bank');
      const mapWrap = el('div');
      const map = el('div', 'silent-coast-map');
      const credit = el('a', 'map-credit', 'מפה: Wikimedia Commons · CC BY-SA 3.0');
      credit.href = 'https://commons.wikimedia.org/wiki/File:Israel_location_map_current_borders.svg';
      credit.target = '_blank';
      credit.rel = 'noopener';
      mapWrap.append(map, credit);
      wrap.append(bank, mapWrap);
      const fb = el('small', 'game-feedback');
      const reset = el('button', 'button button-outline', 'איפוס המפה');
      reset.type = 'button';
      body.append(wrap, fb, reset);
      let selected = null,
        placed = new Set();
      const build = () => {
        selected = null;
        placed = new Set();
        bank.innerHTML = shuffle(game.sites).map((s) => '<button type="button" draggable="true" data-silent-label="' + escapeHtml(s[0]) + '">' + escapeHtml(s[0]) + '</button>').join('');
        map.innerHTML = game.sites.map((s, i) => '<button type="button" class="silent-target" style="top:' + s[1] + '%;left:' + s[2] + '%" data-silent-target="' + escapeHtml(s[0]) + '" aria-label="נקודה ריקה ' + (i + 1) + '"><i>' + (i + 1) + '</i><span></span></button>').join('');
        $$('[data-silent-label]', bank).forEach((b) => {
          b.addEventListener('click', () => {
            if (b.disabled) return;
            $$('[data-silent-label]', bank).forEach((x) => x.classList.remove('selected'));
            b.classList.add('selected');
            selected = b.dataset.silentLabel;
            fb.textContent = 'נבחר: ' + selected + '. כעת לחצו על נקודה במפה.';
          });
          b.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', b.dataset.silentLabel));
        });
        $$('[data-silent-target]', map).forEach((t) => {
          t.addEventListener('click', () => place(t, selected));
          t.addEventListener('dragover', (e) => e.preventDefault());
          t.addEventListener('drop', (e) => {
            e.preventDefault();
            place(t, e.dataTransfer.getData('text/plain'));
          });
        });
        fb.textContent = '0 מתוך ' + game.sites.length + ' מקומות שובצו';
      };
      const place = (target, name) => {
        if (!name) {
          fb.textContent = 'בחרו קודם שם מהרשימה';
          return;
        }
        if (placed.has(target.dataset.silentTarget)) {
          fb.textContent = 'הנקודה הזו כבר מלאה.';
          return;
        }
        if (name !== target.dataset.silentTarget) {
          target.classList.add('wrong');
          setTimeout(() => target.classList.remove('wrong'), 500);
          fb.textContent = name + ' אינו מתאים לנקודה הזו — בדקו את המיקום על מפת ישראל.';
          return;
        }
        placed.add(name);
        target.classList.add('filled');
        target.querySelector('span').textContent = name;
        const label = bank.querySelector('[data-silent-label="' + CSS.escape(name) + '"]');
        if (label) {
          label.disabled = true;
          label.classList.remove('selected');
        }
        selected = null;
        fb.textContent = placed.size + ' מתוך ' + game.sites.length + ' מקומות שובצו נכון';
        if (placed.size === game.sites.length) {
          fb.textContent = 'המפה הושלמה במלואה ✓';
          gameDone(game, card);
        }
      };
      reset.addEventListener('click', build);
      build();
    },
    // זיהוי מתמונה: items = [שם האתר, תמונה]; 3 אפשרויות לכל תמונה; כל תשובה נשמרת ב-saveSiteKnown
    recognition(game, card, body) {
      const box = el('div', 'recognition-card', '<img alt="אתר לזיהוי"><div><span class="quiz-kicker recognition-count"></span><h3>איזה אתר מופיע בתמונה?</h3><div class="answer-list game-choices"></div><p class="quiz-feedback"></p><button type="button" class="button button-primary" disabled>לתמונה הבאה</button></div>');
      body.appendChild(box);
      const img = box.querySelector('img'),
        count = box.querySelector('.recognition-count'),
        choices = box.querySelector('.answer-list'),
        fb = box.querySelector('.quiz-feedback'),
        next = box.querySelector('button.button');
      let index = 0,
        correct = 0;
      const render = () => {
        const item = game.items[index];
        img.src = slideImage(item[1]);
        count.textContent = 'תמונה ' + (index + 1) + ' מתוך ' + game.items.length;
        const wrong = shuffle(game.items.filter((x) => x[0] !== item[0])).slice(0, 2).map((x) => x[0]);
        choices.innerHTML = '';
        shuffle([item[0], ...wrong]).forEach((name) => {
          const b = el('button', '', escapeHtml(name));
          b.type = 'button';
          b.addEventListener('click', () => {
            $$('button', choices).forEach((x) => {
              x.disabled = true;
              if (x.textContent === item[0]) x.classList.add('correct');
            });
            const ok = name === item[0];
            if (ok) correct++;
            else b.classList.add('wrong');
            fb.textContent = ok ? 'נכון — זהו ' + item[0] + '.' : 'כמעט. התשובה הנכונה היא ' + item[0] + '.';
            quietly(api('saveSiteKnown', { site: item[0], region: UNIT.id, known: ok }));
            next.disabled = false;
          });
          choices.appendChild(b);
        });
        fb.textContent = '';
        next.disabled = true;
      };
      next.addEventListener('click', () => {
        if (index < game.items.length - 1) {
          index++;
          render();
          return;
        }
        box.querySelector('div').innerHTML = '<span class="eyebrow">האתגר הושלם</span><h3>זיהית ' + correct + ' מתוך ' + game.items.length + ' אתרים</h3><p>אפשר לחזור ליחידה בכל עת ולתרגל שוב.</p>';
        gameDone(game, card);
      });
      render();
    },
  };
  function renderGames() {
    if (!GAMES.length) return;
    const byPage = {};
    GAMES.forEach((g) => (byPage[g.page] = byPage[g.page] || []).push(g));
    Object.entries(byPage).forEach(([pageId, list]) => {
      const panel = panelOf(pageId);
      if (!panel) {
        console.error('unit-runtime: משחק מפנה לדף שלא קיים: ' + pageId);
        return;
      }
      let grid = panel.querySelector('[data-games-slot]');
      if (!grid) {
        const block = el('div', 'chapter-practice', '<div class="chapter-practice-heading"><span>תרגול בתוך היחידה</span><h3>בודקים הבנה לפני שממשיכים</h3><p>השלימו את הפעילויות כדי לסמן את הדף כהושלם.</p></div><div class="chapter-game-grid" data-games-slot></div>');
        (panel.querySelector('.complete-page') || panel).before(block);
        grid = block.querySelector('[data-games-slot]');
      }
      list.forEach((game) => {
        const card = el('article', 'learning-game' + (game.wide ? ' wide-game' : ''));
        card.dataset.gameCard = game.id;
        card.dataset.gameType = game.type;
        card.innerHTML = '<span>משחק ' + (GAMES.indexOf(game) + 1) + '</span><h3>' + escapeHtml(game.title || game.id) + '</h3>' + (game.intro ? '<p>' + escapeHtml(game.intro) + '</p>' : '');
        const bodyEl = el('div', 'game-body');
        card.appendChild(bodyEl);
        const type = GAME_TYPES[game.type];
        if (!type) {
          bodyEl.innerHTML = '<small>סוג משחק לא מוכר: ' + escapeHtml(game.type) + '</small>';
          console.error('unit-runtime: סוג משחק לא מוכר: ' + game.type);
        } else {
          try {
            type(game, card, bodyEl);
          } catch (e) {
            console.error('unit-runtime: משחק ' + game.id + ' נכשל', e);
          }
        }
        if (state.games.includes(game.id)) card.classList.add('game-complete');
        grid.appendChild(card);
      });
    });
  }
  function renderGamesSummary() {
    const box = $('gamesSummary');
    if (!box) return;
    const done = GAMES.filter((g) => state.games.includes(g.id)).length;
    const pageTitle = (id) => ($$('#pageNav button').find((b) => b.dataset.page === id)?.textContent || id).replace(/^\d+\.\s*/, '');
    const byPage = pages.filter((id) => gamesOn(id).length);
    box.innerHTML =
      '<div class="game-status"><b>' + done + ' מתוך ' + GAMES.length + ' משחקים הושלמו</b><div class="meter"><i style="width:' + (GAMES.length ? Math.round((done / GAMES.length) * 100) : 0) + '%"></i></div></div>' +
      '<div class="practice-directory">' +
      byPage.map((id) => {
        const list = gamesOn(id),
          d = list.filter((g) => state.games.includes(g.id)).length;
        return '<a href="#' + id + '" data-goto-page="' + id + '"><span>דף ' + (pages.indexOf(id) + 1) + '</span><b>' + escapeHtml(pageTitle(id)) + '</b><small>' + d + ' מתוך ' + list.length + ' פעילויות</small></a>';
      }).join('') +
      '</div>';
    $$('[data-goto-page]', box).forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault();
        show(pages.indexOf(a.dataset.gotoPage));
      })
    );
  }
  renderGames();
  renderGamesSummary();

  // ---------- המאמן שלי לבגרות ----------
  const coach = $('coachWidget');
  if (coach) {
    $$('[data-coach-open]').forEach((b) => b.addEventListener('click', () => coach.classList.add('open')));
    $$('[data-coach-close]').forEach((b) => b.addEventListener('click', () => coach.classList.remove('open')));
    const log = $('coachLog');
    const appendMsg = (role, text) => {
      const div = document.createElement('div');
      div.className = 'coach-msg coach-msg-' + role;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    };
    $('coachForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('coachInput');
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      appendMsg('user', q);
      const pending = appendMsg('bot', '...חושב, רגע');
      try {
        const token = getUser()?.token || '';
        const res = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'askBagrutBot', question: q, mode: 'qa', bagrut_question: '', token }) });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'שגיאה');
        pending.textContent = data.data.reply;
      } catch (err) {
        pending.textContent = 'המאמן לא זמין כרגע (' + err.message + '). נסו שוב בעוד רגע.';
      }
    });
  }

  // ---------- התחלה ----------
  renderProgress();
  const requested = location.hash.slice(1);
  show(pages.includes(requested) ? pages.indexOf(requested) : 0);
})();
