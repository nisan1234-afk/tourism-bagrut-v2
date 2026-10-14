/* לשונית "טרוול בוסטר" בדשבורד המורה. נטען אחרי teacher.js ומשתמש ב-teacherAPI ו-safe שלו.
 * נטען רק כשפותחים את הלשונית, ומתרענן כל 30 שניות כל עוד היא פתוחה (מצב כיתה חי בשיעור). */
(function () {
  'use strict';
  var UNITS = (window.TB_UNITS || []).filter(function (u) { return !u.soon; });
  var STUCK_MIN = 8; // אותו שלב יותר מזה = תקוע
  var ACTIVE_MIN = 45; // פעילות אחרונה בטווח הזה = "בשיעור עכשיו"
  var data = null;
  var openEmail = '';
  var timer = null;

  function $(id) { return document.getElementById(id); }
  function unitTitle(id) {
    var u = (window.TB_UNITS || []).find(function (x) { return x.id === id; });
    return u ? u.icon + ' ' + u.title : id;
  }
  function minutesAgo(iso, nowMs) {
    if (!iso) return Infinity;
    return (nowMs - new Date(iso).getTime()) / 60000;
  }
  function agoText(m) {
    if (!isFinite(m)) return '—';
    if (m < 1) return 'עכשיו';
    if (m < 60) return 'לפני ' + Math.round(m) + ' דק׳';
    if (m < 60 * 24) return 'לפני ' + Math.round(m / 60) + ' שע׳';
    return 'לפני ' + Math.round(m / 1440) + ' ימים';
  }

  /** לכל תלמיד/ה: היחידה האחרונה שעבד/ה עליה, האם תקוע/ה, כמה הושלמו, ממתינים לבדיקה. */
  function summarize(s, nowMs) {
    var rows = Object.keys(s.units || {}).map(function (k) { return s.units[k]; });
    var latest = rows.slice().sort(function (a, b) { return String(b.updated_at).localeCompare(String(a.updated_at)); })[0] || null;
    var m = latest ? minutesAgo(latest.updated_at, nowMs) : Infinity;
    var done = rows.filter(function (r) { return r.done; });
    var lastDone = done.slice().sort(function (a, b) { return String(b.completed_at).localeCompare(String(a.completed_at)); })[0];
    return {
      latest: latest,
      minutes: m,
      active: m <= ACTIVE_MIN,
      stuck: latest && !latest.done && m > STUCK_MIN && m <= ACTIVE_MIN,
      done: done.length,
      pending: done.filter(function (r) { return !r.review; }).length,
      fix: done.filter(function (r) { return r.review === 'fix'; }).length,
      lastDocket: lastDone ? lastDone.docket : ''
    };
  }

  function render() {
    if (!data) return;
    var nowMs = new Date(data.now).getTime() || Date.now();
    var list = (data.students || []).map(function (s) { return { s: s, x: summarize(s, nowMs) }; });
    // תקועים קודם, אחר כך פעילים, אחר כך לפי שם
    list.sort(function (a, b) {
      var ra = a.x.stuck ? 0 : a.x.active ? 1 : 2, rb = b.x.stuck ? 0 : b.x.active ? 1 : 2;
      return ra - rb || String(a.s.name).localeCompare(String(b.s.name), 'he');
    });
    var active = list.filter(function (r) { return r.x.active; }).length;
    var stuck = list.filter(function (r) { return r.x.stuck; }).length;
    var pending = list.reduce(function (n, r) { return n + r.x.pending; }, 0);
    $('tbPulse').innerHTML =
      '<article><span>עובדים עכשיו</span><b>' + active + '</b></article>' +
      '<article class="' + (stuck ? 'tb-alert' : '') + '"><span>תקועים (' + STUCK_MIN + '+ דק׳ באותו שלב)</span><b>' + stuck + '</b></article>' +
      '<article><span>יחידות ממתינות לבדיקה</span><b>' + pending + '</b></article>' +
      '<article><span>תלמידים</span><b>' + list.length + '</b></article>';

    $('tbBody').innerHTML = list.length ? list.map(function (r) {
      var s = r.s, x = r.x, l = x.latest;
      var now = !l ? '<small>טרם התחיל/ה</small>' :
        l.done ? '<b>סיים/ה</b><small>' + safe(unitTitle(l.unit_id)) + '</small>' :
        '<b>שלב ' + safe(l.step) + '/' + safe(l.steps_total) + '</b><small>' + safe(unitTitle(l.unit_id)) + '</small>';
      var when = (x.stuck ? '<span class="tb-stuck">⚠ ' : '<span>') + agoText(x.minutes) + '</span>';
      var badges = (x.pending ? ' <span class="tb-chip wait">' + x.pending + ' לבדיקה</span>' : '') + (x.fix ? ' <span class="tb-chip fix">' + x.fix + ' לתיקון</span>' : '');
      return '<tr' + (x.stuck ? ' class="tb-row-stuck"' : '') + '><td><b>' + safe(s.name || 'ללא שם') + '</b><small>' + safe(s.class_name || '') + '</small></td>' +
        '<td>' + now + '</td><td>' + when + '</td><td>' + x.done + '/' + UNITS.length + badges + '</td>' +
        '<td class="tb-docket">' + (x.lastDocket ? '<bdi>' + safe(x.lastDocket) + '</bdi>' : '—') + '</td>' +
        '<td><button class="table-action" data-tb-student="' + safe(s.email) + '">פירוט</button></td></tr>';
    }).join('') : '<tr><td colspan="6">אין תלמידים רשומים.</td></tr>';
    document.querySelectorAll('[data-tb-student]').forEach(function (b) {
      b.addEventListener('click', function () { openEmail = b.getAttribute('data-tb-student'); renderDetail(); });
    });
    // ריענון אוטומטי לא דורס הערה שהמורה באמצע להקליד
    if (!$('tbDetail').contains(document.activeElement)) renderDetail();
  }

  function renderDetail() {
    var box = $('tbDetail');
    var s = openEmail && (data.students || []).find(function (x) { return x.email === openEmail; });
    if (!s) { box.hidden = true; return; }
    box.hidden = false;
    var rows = UNITS.map(function (u) {
      var p = (s.units || {})[u.id];
      if (!p) return '<tr><td>' + safe(u.icon + ' ' + u.title) + '</td><td colspan="4"><small>טרם התחיל/ה</small></td></tr>';
      var status = p.done ? 'הושלמה' : 'שלב ' + p.step + '/' + p.steps_total;
      var review = !p.done ? '' :
        '<div class="tb-review" data-email="' + safe(s.email) + '" data-unit="' + safe(u.id) + '">' +
        '<button class="table-action' + (p.review === 'ok' ? ' on-ok' : '') + '" data-review="ok">נבדק ✓</button>' +
        '<button class="table-action danger' + (p.review === 'fix' ? ' on-fix' : '') + '" data-review="fix">לתיקון ✗</button>' +
        '<input type="text" maxlength="500" placeholder="הערה לתלמיד/ה (מוצגת לו/ה בטלפון)" value="' + safe(p.review_note) + '"></div>';
      return '<tr><td>' + safe(u.icon + ' ' + u.title) + '</td><td>' + status + '</td>' +
        '<td class="tb-docket">' + (p.docket ? '<bdi>' + safe(p.docket) + '</bdi>' : '—') + '</td>' +
        '<td>' + (p.note ? safe(p.note) : '<small>—</small>') + '</td><td>' + review + '</td></tr>';
    }).join('');
    box.innerHTML = '<div class="panel-title"><div><span>פירוט</span><h2>' + safe(s.name || s.email) + '</h2></div>' +
      '<button class="table-action" id="tbDetailClose">סגירה</button></div>' +
      '<p class="edit-content-hint">כדי לבדוק דוקט: בטרוול בוסטר <bdi dir="ltr">Find → By Number</bdi>, ומקלידים את המספר.</p>' +
      '<div class="teacher-table-wrap"><table class="teacher-roster"><thead><tr><th>יחידה</th><th>מצב</th><th>דוקט</th><th>הערת התלמיד/ה</th><th>הבדיקה שלך</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<small id="tbReviewMsg"></small>';
    $('tbDetailClose').addEventListener('click', function () { openEmail = ''; box.hidden = true; });
    box.querySelectorAll('[data-review]').forEach(function (b) {
      b.addEventListener('click', function () { saveReview(b); });
    });
  }

  function saveReview(btn) {
    var wrap = btn.closest('.tb-review');
    var current = btn.classList.contains('on-ok') || btn.classList.contains('on-fix');
    var review = current ? '' : btn.getAttribute('data-review'); // לחיצה שנייה מבטלת סימון
    var note = wrap.querySelector('input').value.trim();
    var msg = $('tbReviewMsg');
    msg.textContent = 'שומר…';
    teacherAPI('reviewTbUnit', { email: wrap.getAttribute('data-email'), unit_id: wrap.getAttribute('data-unit'), review: review, review_note: note })
      .then(function () {
        var s = data.students.find(function (x) { return x.email === wrap.getAttribute('data-email'); });
        var p = s && s.units[wrap.getAttribute('data-unit')];
        if (p) { p.review = review; p.review_note = note; }
        msg.textContent = 'נשמר';
        render();
      })
      .catch(function (e) { msg.textContent = 'שגיאה: ' + e.message; });
  }

  function load() {
    $('tbState').textContent = 'מתעדכן…';
    return teacherAPI('getBagrutTbSummary')
      .then(function (d) {
        data = d;
        render();
        $('tbState').textContent = 'עודכן ' + new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      })
      .catch(function (e) {
        $('tbState').textContent = 'שגיאה';
        $('tbBody').innerHTML = '<tr><td colspan="6">' + safe(e.message) + '</td></tr>';
      });
  }

  function isOpen() {
    var pane = document.querySelector('[data-teacher-tab="tb"]');
    return pane && pane.classList.contains('active');
  }
  function tick() {
    if (isOpen() && document.visibilityState === 'visible') load();
  }
  document.querySelectorAll('[data-teacher-tab-button="tb"]').forEach(function (b) {
    b.addEventListener('click', function () {
      load();
      if (!timer) timer = setInterval(tick, 30000);
    });
  });
  var refresh = $('tbRefresh');
  if (refresh) refresh.addEventListener('click', load);
  var link = $('tbGuideLink');
  if (link) link.textContent = new URL(link.getAttribute('href'), location.href).href;
})();
