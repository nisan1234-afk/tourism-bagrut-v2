/* טרוול בוסטר צעד-צעד: מדריך לטלפון שמונח ליד המחשב.
 * מסלול: #  = רשימת יחידות | #u/<unit>/<i> = מסך בתוך יחידה (0 = פתיחה, 1..n = שלבים, n+1 = סיום ומספר דוקט).
 * כל מעבר שלב נשמר בשרת (saveTbStep) כדי שהמורה יראה בזמן אמת מי איפה ומי תקוע. */
(function () {
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbwf3-MNZBBi64zXcNH7wfhBRoEBl9brtQ9QRI4Won5RmUIOrl_WBivN6uI5NAp6Mc0h/exec';
  var STAFF = ['admin', 'school_admin', 'teacher', 'homeroom'];
  var UNITS = window.TB_UNITS || [];
  var app = document.getElementById('tbApp');
  var syncEl = document.getElementById('tbSync');

  var user = null;
  try { user = JSON.parse(sessionStorage.getItem('kitahUser') || 'null'); } catch (_) {}
  var roles = user ? user.roles || [user.role] : [];
  var preview = roles.some(function (r) { return STAFF.indexOf(r) !== -1; });
  var progress = {}; // unit_id -> שורת התקדמות מהשרת
  var loaded = false;
  var loadError = '';
  var pendingStep = null; // שמירת שלב שנכשלה, לניסיון חוזר

  if (user) document.getElementById('tbUser').textContent = user.name || user.email || 'כיתה פלוס';
  if (preview) document.getElementById('tbPreview').hidden = false;

  // ---------- עזרים ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // [[Term]] -> צ׳יפ באנגלית משמאל לימין, כך שהעברית מסביב לא מתהפכת
  function rich(s) {
    return esc(s).replace(/\[\[(.+?)\]\]/g, '<bdi class="term" dir="ltr">$1</bdi>');
  }
  function unitById(id) {
    for (var i = 0; i < UNITS.length; i++) if (UNITS[i].id === id) return UNITS[i];
    return null;
  }
  function store(key, val) {
    try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null'); localStorage.setItem(key, JSON.stringify(val)); } catch (_) { return null; }
  }
  function setSync(text, bad) {
    if (!text) { syncEl.hidden = true; return; }
    syncEl.hidden = false;
    syncEl.textContent = text;
    syncEl.classList.toggle('bad', !!bad);
  }

  function api(action, params) {
    var body = { action: action, token: user && user.token };
    for (var k in params) body[k] = params[k];
    return fetch(API, { method: 'POST', body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (!d.ok) throw new Error(d.error || 'שגיאה'); return d.data; });
  }

  function saveStep(unit, step) {
    var p = progress[unit.id] || (progress[unit.id] = { unit_id: unit.id, step: 0, max_step: 0, steps_total: unit.steps.length });
    p.step = step;
    p.max_step = Math.max(p.max_step || 0, step);
    p.steps_total = unit.steps.length;
    store('tbLast', { unit: unit.id, i: step });
    if (preview) return;
    pendingStep = { unit_id: unit.id, step: step, steps_total: unit.steps.length };
    flushStep();
  }
  function flushStep() {
    if (!pendingStep || (window.kitahSession && window.kitahSession.isExpired())) return;
    var sending = pendingStep;
    api('saveTbStep', sending).then(function () {
      if (pendingStep === sending) pendingStep = null;
      setSync('');
    }).catch(function () {
      setSync('לא נשמר, ננסה שוב', true);
    });
  }
  setInterval(flushStep, 20000);

  // ---------- מסך מלא: נעילת מסך דלוק בזמן עבודה ----------
  var wakeLock = null;
  function keepAwake(on) {
    if (!('wakeLock' in navigator)) return;
    if (on && !wakeLock) {
      navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; w.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {});
    } else if (!on && wakeLock) { wakeLock.release(); wakeLock = null; }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && /^#u\//.test(location.hash)) keepAwake(true);
  });

  // ---------- תצוגות ----------
  function statusOf(unit) {
    var p = progress[unit.id];
    if (!p) return { label: 'עוד לא התחלת', pct: 0 };
    if (p.done) {
      var b = p.review === 'ok' ? '<span class="badge ok">נבדק ✓</span>' : p.review === 'fix' ? '<span class="badge fix">לתיקון</span>' : '<span class="badge wait">ממתין לבדיקה</span>';
      return { label: 'הושלמה · דוקט <bdi>' + esc(p.docket) + '</bdi>' + b, pct: 100, p: p };
    }
    var n = unit.steps ? unit.steps.length : p.steps_total || 1;
    var at = Math.min(p.step || 0, n);
    return { label: 'בשלב ' + at + ' מתוך ' + n, pct: Math.round(((p.max_step || 0) / n) * 100), p: p };
  }

  function renderHome() {
    keepAwake(false);
    var html = '<section class="tb-hello"><h1>שלום' + (user && user.name ? ' ' + esc(user.name.split(' ')[0]) : '') + '</h1>' +
      '<p>הטלפון ליד המחשב: כאן רואים מה לעשות בכל שלב, ובמחשב עושים את זה בטרוול בוסטר. לוחצים על צילום כדי להגדיל אותו.</p></section>';
    if (loadError) html += '<p class="tb-error">' + esc(loadError) + '</p>';

    var last = store('tbLast');
    var lastUnit = last && unitById(last.unit);
    if (lastUnit && !lastUnit.soon && !(progress[lastUnit.id] && progress[lastUnit.id].done)) {
      html += '<div class="tb-resume"><span>להמשיך מאיפה שעצרת?<br><b>' + esc(lastUnit.title) + '</b></span>' +
        '<a class="btn btn-primary" href="#u/' + lastUnit.id + '/' + (last.i || 0) + '">המשך</a></div>';
    }

    var tracks = {};
    UNITS.forEach(function (u) { (tracks[u.track] = tracks[u.track] || []).push(u); });
    Object.keys(tracks).forEach(function (t) {
      html += '<div class="tb-track">' + (t === 'FIT' ? 'FIT · לקוח פרטי' : 'קבוצות') + '</div><ul class="tb-units">';
      tracks[t].forEach(function (u) {
        if (u.soon) {
          html += '<li><button class="tb-unit" disabled><span class="ic">' + u.icon + '</span><span><b>' + esc(u.title) + '</b><small>בקרוב</small></span><span></span></button></li>';
          return;
        }
        var s = statusOf(u);
        var fix = s.p && s.p.review === 'fix' && s.p.review_note ? '<p class="tb-fixnote">הערת המורה: ' + esc(s.p.review_note) + '</p>' : '';
        html += '<li><button class="tb-unit" data-open="' + u.id + '"><span class="ic">' + u.icon + '</span><span><b>' + esc(u.title) + '</b><small>' + s.label + '</small>' +
          '<span class="tb-meter"><i style="width:' + s.pct + '%"></i></span>' + fix + '</span><span class="go">←</span></button></li>';
      });
      html += '</ul>';
    });
    app.innerHTML = html;
    app.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () {
        var u = unitById(b.getAttribute('data-open'));
        var p = progress[u.id];
        var i = p && !p.done && p.step ? p.step : 0;
        location.hash = 'u/' + u.id + '/' + i;
      });
    });
    window.scrollTo(0, 0);
  }

  // תצוגה ממוקדת: בטלפון צילום רחב קטן מדי לקריאה, אז מראים רק את האזור סביב ההדגשות
  // (אם כולן קרובות זו לזו). נגיעה מגדילה את הצילום המלא.
  function focusBox(hl) {
    if (!hl || !hl.length) return null;
    var x0 = 100, y0 = 100, x1 = 0, y1 = 0;
    hl.forEach(function (h) { x0 = Math.min(x0, h[0]); y0 = Math.min(y0, h[1]); x1 = Math.max(x1, h[0] + h[2]); y1 = Math.max(y1, h[1] + h[3]); });
    var padX = 10, padY = 14;
    x0 = Math.max(0, x0 - padX); x1 = Math.min(100, x1 + padX);
    y0 = Math.max(0, y0 - padY); y1 = Math.min(100, y1 + padY);
    if (x1 - x0 > 72) return null; // ההדגשות פרושות על כל הרוחב, אין טעם לחתוך
    return [x0, y0, x1 - x0, y1 - y0];
  }
  function stageHtml(step, box) {
    var hls = (step.hl || []).map(function (h) {
      return '<span class="hl" style="left:' + h[0] + '%;top:' + h[1] + '%;width:' + h[2] + '%;height:' + h[3] + '%"></span>';
    }).join('');
    var st = box ? ' style="width:' + (10000 / box[2]) + '%;height:' + (10000 / box[3]) + '%;left:' + (-box[0] * 100 / box[2]) + '%;top:' + (-box[1] * 100 / box[3]) + '%"' : '';
    return '<div class="tb-stage' + (box ? ' cropped' : '') + '"' + st + '><img src="img/' + esc(step.img) + '.webp" alt="צילום מסך: ' + esc(step.title) + '">' + hls + '</div>';
  }
  function shotHtml(step) {
    if (!step.img) return '';
    var box = focusBox(step.hl);
    return '<figure style="margin:12px 0 0"><div class="tb-shot' + (box ? ' is-cropped' : '') + '" data-zoom role="button" tabindex="0" aria-label="הגדלת הצילום"' +
      (box ? ' data-box="' + box.join(',') + '"' : '') + '>' + stageHtml(step, box) + '</div>' +
      '<small class="tb-shot-hint">' + (box ? 'מוצג רק האזור החשוב · נגיעה מראה את כל המסך' : 'הסימון הכתום = איפה לוחצים · נגיעה מגדילה') + '</small></figure>';
  }
  // גובה התצוגה הממוקדת נקבע לפי יחס התמונה, שידוע רק אחרי טעינה
  function sizeCrops() {
    app.querySelectorAll('.tb-shot.is-cropped').forEach(function (el) {
      var img = el.querySelector('img');
      var box = el.getAttribute('data-box').split(',').map(Number);
      var set = function () {
        if (!img.naturalWidth) return;
        el.style.aspectRatio = (img.naturalWidth * box[2]) / (img.naturalHeight * box[3]);
      };
      if (img.complete) set(); else img.addEventListener('load', set);
    });
  }

  function headHtml(unit, i) {
    var n = unit.steps.length;
    var label = i === 0 ? 'פתיחה' : i > n ? 'סיום' : 'שלב ' + i + ' מתוך ' + n;
    var pct = Math.round((Math.min(i, n) / n) * 100);
    return '<div class="tb-head"><a class="btn btn-ghost" href="#" aria-label="לרשימת היחידות">→</a><div class="t"><small>' + unit.icon + ' ' + esc(unit.title) + '</small><b>' + label + '</b></div></div>' +
      '<div class="tb-progress"><i style="width:' + pct + '%"></i></div>';
  }

  function navHtml(prevHref, nextLabel, nextHref) {
    return '<nav class="tb-nav">' +
      (prevHref ? '<a class="btn" href="' + prevHref + '">הקודם</a>' : '<span></span>') +
      '<a class="btn btn-primary" href="' + nextHref + '" data-next>' + nextLabel + '</a></nav>';
  }

  function renderUnit(unit, i) {
    keepAwake(true);
    var n = unit.steps.length;
    var base = '#u/' + unit.id + '/';
    var html = headHtml(unit, i);
    if (i === 0) {
      html += '<article class="tb-card tb-intro"><h2>' + unit.icon + ' ' + esc(unit.title) + '</h2>' +
        '<p><b>מה עושים:</b> ' + rich(unit.goal) + '</p><div class="tb-why"><b>💡 למה זה חשוב</b>' + rich(unit.why) + '</div>' +
        '<p style="margin-bottom:0">' + n + ' שלבים. בכל שלב: קוראים, עושים במחשב, ולוחצים "עשיתי".</p></article>';
      html += navHtml('', 'מתחילים', base + '1');
    } else if (i <= n) {
      var s = unit.steps[i - 1];
      currentStep = s;
      html += '<article class="tb-card"><h2><span class="num">' + i + '</span>' + esc(s.title) + '</h2>' +
        shotHtml(s) + '<p class="tb-text">' + rich(s.text) + '</p>' +
        (s.trap ? '<div class="tb-trap"><b>⚠️ מלכודת</b>' + rich(s.trap) + '</div>' : '') +
        (s.why ? '<div class="tb-why"><b>💡 למה</b>' + rich(s.why) + '</div>' : '') + '</article>';
      html += navHtml(base + (i - 1), i === n ? 'עשיתי ✓ לסיום' : 'עשיתי ✓ הבא', base + (i + 1));
    } else {
      html += renderCheckpoint(unit);
    }
    app.innerHTML = html;
    if (i >= 1 && i <= n) saveStep(unit, i);
    if (i > n) wireCheckpoint(unit);
    sizeCrops();
    app.querySelectorAll('[data-zoom]').forEach(function (el) {
      el.addEventListener('click', function () { openZoom(el); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') openZoom(el); });
    });
    window.scrollTo(0, 0);
  }

  function renderCheckpoint(unit) {
    var p = progress[unit.id] || {};
    var fix = p.review === 'fix' && p.review_note ? '<p class="tb-fixnote">הערת המורה: ' + esc(p.review_note) + '</p>' : '';
    return '<article class="tb-card"><h2>🏁 סיום: מספר הדוקט</h2>' +
      '<p class="tb-text">מקלידים את מספר הדוקט מהכותרת בטרוול בוסטר. המורה יראה אותו ויבדוק את העבודה שלכם.</p>' + fix +
      '<form class="tb-form" id="tbDone" novalidate>' +
      '<label for="tbDocket">מספר דוקט</label><input id="tbDocket" inputmode="numeric" autocomplete="off" maxlength="9" placeholder="152843" value="' + esc(p.docket || '') + '">' +
      '<label for="tbNote">משהו היה לא ברור? (לא חובה)</label><textarea id="tbNote" rows="3" maxlength="500">' + esc(p.note || '') + '</textarea>' +
      '<p class="msg" id="tbMsg"></p><button class="btn btn-primary" style="width:100%" type="submit">שליחה למורה</button></form></article>' +
      '<nav class="tb-nav"><a class="btn" href="#u/' + unit.id + '/' + unit.steps.length + '">הקודם</a><a class="btn" href="#">לרשימה</a></nav>';
  }

  function wireCheckpoint(unit) {
    var form = document.getElementById('tbDone');
    var input = document.getElementById('tbDocket');
    var msg = document.getElementById('tbMsg');
    input.addEventListener('input', function () { input.value = input.value.replace(/[^\d]/g, ''); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var docket = input.value.trim();
      if (!/^\d{3,9}$/.test(docket)) { msg.textContent = 'מספר הדוקט הוא רק ספרות (למשל 152843).'; input.focus(); return; }
      var note = document.getElementById('tbNote').value.trim();
      var btn = form.querySelector('button');
      btn.disabled = true;
      msg.textContent = '';
      var done = function () {
        progress[unit.id] = Object.assign(progress[unit.id] || {}, { unit_id: unit.id, done: true, docket: docket, note: note, step: unit.steps.length, max_step: unit.steps.length, steps_total: unit.steps.length });
        if (progress[unit.id].review === 'fix') progress[unit.id].review = '';
        store('tbLast', null);
        renderDone(unit, docket);
      };
      if (preview) { done(); return; }
      api('completeTbUnit', { unit_id: unit.id, docket: docket, note: note, steps_total: unit.steps.length })
        .then(done)
        .catch(function (err) { btn.disabled = false; msg.textContent = 'לא נשמר: ' + err.message; });
    });
  }

  function renderDone(unit, docket) {
    keepAwake(false);
    var idx = UNITS.indexOf(unit);
    var next = null;
    for (var k = idx + 1; k < UNITS.length; k++) if (!UNITS[k].soon) { next = UNITS[k]; break; }
    app.innerHTML = '<article class="tb-card tb-done"><div class="big">🎉</div><h2>כל הכבוד!</h2>' +
      '<p class="tb-text">היחידה נשלחה למורה עם דוקט</p><div class="docket">' + esc(docket) + '</div>' +
      '<p class="tb-text">בבחינה: בסוף כל חלק קוראים לבוחן ומשאירים את הכול פתוח על המסך.</p></article>' +
      '<nav class="tb-nav"><a class="btn" href="#">לרשימה</a>' +
      (next ? '<a class="btn btn-primary" href="#u/' + next.id + '/0">ליחידה הבאה</a>' : '<a class="btn btn-primary" href="#">סיום</a>') + '</nav>';
    window.scrollTo(0, 0);
  }

  // ---------- הגדלה ----------
  var zoom = document.getElementById('tbZoom');
  var zoomShot = document.getElementById('tbZoomShot');
  var currentStep = null;
  function openZoom() {
    if (!currentStep) return;
    zoomShot.innerHTML = stageHtml(currentStep, null);
    zoom.hidden = false;
  }
  function closeZoom() { zoom.hidden = true; zoomShot.innerHTML = ''; }
  zoom.querySelector('.tb-zoom-close').addEventListener('click', closeZoom);
  zoomShot.addEventListener('click', closeZoom);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !zoom.hidden) closeZoom(); });

  // ---------- החלקה: ימינה = הבא (כמו דפדוף בספר בעברית), שמאלה = הקודם ----------
  var touch = null;
  app.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  app.addEventListener('touchend', function (e) {
    if (!touch || !zoom.hidden) return;
    var dx = e.changedTouches[0].clientX - touch.x;
    var dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    var nav = document.querySelector('.tb-nav');
    if (!nav) return;
    var target = dx > 0 ? nav.querySelector('[data-next]') : nav.querySelector('a.btn:not(.btn-primary)');
    if (target && target.getAttribute('href') && target.getAttribute('href') !== '#') location.hash = target.getAttribute('href').slice(1);
  }, { passive: true });

  // ---------- ניתוב ----------
  function route() {
    if (!zoom.hidden) closeZoom();
    var m = /^#u\/([a-z0-9-]+)\/(\d+)$/.exec(location.hash);
    var unit = m && unitById(m[1]);
    if (unit && !unit.soon) {
      var i = Math.max(0, Math.min(Number(m[2]), unit.steps.length + 1));
      renderUnit(unit, i);
    } else if (!loaded) {
      app.innerHTML = '<p class="tb-loading">טוען את ההתקדמות שלך…</p>';
    } else {
      renderHome();
    }
  }
  window.addEventListener('hashchange', route);
  document.querySelectorAll('[data-home]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); location.hash = ''; }); });

  route();
  var loading = preview ? Promise.resolve({ units: {} }) : api('getMyTbProgress', {});
  loading.then(function (d) { progress = d.units || {}; })
    .catch(function (err) { loadError = 'לא הצלחנו לטעון התקדמות: ' + err.message; })
    .then(function () { loaded = true; if (!/^#u\//.test(location.hash)) renderHome(); });
})();
