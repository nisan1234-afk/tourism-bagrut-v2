/* unit-runtime.js — מנוע אחד לכל יחידות הלימוד (04.09.2026).
 *
 * הדף מספק את התוכן (HTML סטטי + JSON ב-#unitData), והקובץ הזה מספק את ההתנהגות:
 * ניווט בין דפים, התקדמות (מקומית + שרת), שאלה פתוחה בכל דף, זיהוי תמונות, מפה אילמת,
 * מצגת, בוחן, תרגול בגרות והמאמן. אותה פדגוגיה ואותם כללי השלמה בכל היחידות.
 *
 * חוזה הדף (ר' docs/UNIT_TEMPLATE.md):
 *   <body data-unit-id="haamakim" data-unit-label="העמקים" data-unit-file="valleys.html" data-legacy-prefix="valleys">
 *   <section class="lesson-page" data-page-panel="overview" data-page-title="1. ...">  (דף אחד לכל section)
 *   #unitData = {"slides":[...], "quiz":[...], "exam":[...], "openHints":{...}}
 */
(() => {
  const API = 'https://script.google.com/macros/s/AKfycbwf3-MNZBBi64zXcNH7wfhBRoEBl9brtQ9QRI4Won5RmUIOrl_WBivN6uI5NAp6Mc0h/exec';
  const IMAGE_BASE = 'https://nisan1234-afk.github.io/jerusalem-tour/images/';
  const PASS_RATIO = 0.6; // ציון עובר בבוחן, כמו בבקאנד (BAGRUT_PASS_RATIO)
  const MIN_WORDS = 12; // אורך מינימלי לתשובה פתוחה לפני שליחה לבדיקה
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

  const panels = $$('[data-page-panel]');
  const pages = panels.map((p) => p.dataset.pagePanel);
  const kindOf = (id) => (['images', 'presentation', 'practice'].includes(id) ? id : 'content');

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
    s = { done: [], submitted: [], failed: {}, recognized: [], matched: [], slidesSeen: 0, quiz: null };
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
    return s;
  }
  const state = loadState();
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
  function completionBlocker(panel) {
    const id = panel.dataset.pagePanel;
    switch (kindOf(id)) {
      case 'images': {
        const cards = $$('[data-recognition]', panel);
        const targets = $$('[data-match-target]', panel);
        if (cards.some((c) => !state.recognized.includes(c.dataset.recognition))) return 'חשפו את כל התמונות לפני שממשיכים.';
        if (targets.some((t) => !state.matched.includes(t.dataset.matchTarget))) return 'שבצו את כל הפריטים במפה לפני שממשיכים.';
        return '';
      }
      case 'presentation':
        return SLIDES.length && state.slidesSeen < SLIDES.length ? 'עברו על כל השקופיות עד הסוף.' : '';
      case 'practice':
        if (QUIZ.length) return state.quiz && state.quiz.best / state.quiz.total >= PASS_RATIO ? '' : 'צריך לעבור את הבוחן (60 ומעלה). אפשר לנסות שוב.';
        if (EXAM.length) return state.submitted.includes('exam') ? '' : 'שלחו לפחות סעיף אחד לבדיקה.';
        return '';
      default: {
        const hasQuestion = panel.querySelector('.check-card textarea');
        if (!hasQuestion) return '';
        if (state.submitted.includes(id)) return '';
        if ((state.failed[id] || 0) >= 2) return ''; // השרת לא זמין פעמיים — לא חוסמים את הלמידה
        return 'ענו על שאלת הדף ושלחו לבדיקה לפני שממשיכים.';
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
        (panel.querySelector('.check-card, .visual-grid, .slide-deck, #unitQuiz') || panel).scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      '<h3>' + escapeHtml(s.t) + '</h3><p>' + escapeHtml(s.p) + '</p></div>' +
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

  // ---------- תרגול בגרות (סעיפים) ----------
  const examBox = $('examBank');
  if (examBox) {
    if (!EXAM.length) examBox.innerHTML = '<p class="quiz-feedback">שאלות בגרות ליחידה זו יתווספו כשיאומתו מול מסמך המקור.</p>';
    else examBox.innerHTML = EXAM.map(
      (q, qi) =>
        '<article class="exam-question"><h3>' + escapeHtml(q.title) + '</h3>' +
        (q.parts || [])
          .map((part, pi) => {
            const text = typeof part === 'string' ? part : part.q;
            return (
              '<div class="exam-part"><label><b>' + String.fromCharCode(1488 + pi) + '.</b> ' + escapeHtml(text) + '</label>' +
              '<textarea data-exam="' + qi + '-' + pi + '" placeholder="כתבו תשובה מלאה לסעיף..."></textarea>' +
              '<button type="button" class="check-exam">בדיקת הסעיף</button><div class="answer-feedback"></div></div>'
            );
          })
          .join('') +
        '</article>'
    ).join('');
    $$('.check-exam', examBox).forEach((button) =>
      button.addEventListener('click', () => {
        const box = button.closest('.exam-part');
        const [qi, pi] = box.querySelector('textarea').dataset.exam.split('-').map(Number);
        const part = EXAM[qi].parts[pi];
        submitOpen({
          question: typeof part === 'string' ? part : part.q,
          textarea: box.querySelector('textarea'),
          feedback: box.querySelector('.answer-feedback'),
          key: 'exam',
          hints: typeof part === 'string' ? null : part.c,
        });
      })
    );
  }

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
