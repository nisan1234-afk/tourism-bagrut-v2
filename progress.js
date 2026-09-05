/* דף "ההתקדמות שלי" לתלמיד/ה: מנתוני השרת (getBagrutMyProgress), לא מה-localStorage,
 * כך שההתקדמות זהה בכל מכשיר. מציג לכל יחידה: דפים, בוחן, וטעויות פעילות ("מה שכחתי"). */
(() => {
  const API = 'https://script.google.com/macros/s/AKfycbwf3-MNZBBi64zXcNH7wfhBRoEBl9brtQ9QRI4Won5RmUIOrl_WBivN6uI5NAp6Mc0h/exec';
  const UNIT_LINKS = {
    mishor_hachof: 'units/coastal-plain.html',
    yerushalayim: 'units/jerusalem.html',
    haamakim: 'units/valleys.html',
    yam_hamelach: 'units/dead-sea.html',
    galil: 'units/galilee.html',
  };
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function getUser() {
    try {
      return JSON.parse(sessionStorage.getItem('kitahUser') || 'null');
    } catch (_) {
      return null;
    }
  }

  async function load() {
    const user = getUser();
    if (user?.name) $('progressTitle').textContent = 'איפה ' + user.name.split(' ')[0] + ' עומד/ת';
    let data;
    try {
      const res = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'getBagrutMyProgress', token: user?.token || '' }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'שגיאה');
      data = json.data;
    } catch (e) {
      $('progressUnits').innerHTML = '<p class="empty-state">לא הצלחתי לטעון את ההתקדמות מכיתה פלוס (' + esc(e.message) + '). נסו לרענן, או היכנסו מחדש.</p>';
      return;
    }
    render(data.units || [], data.mistakes || {});
  }

  function render(units, mistakes) {
    // hashivut קיימת רק באתר הישן ולא נספרת (counts_for_percent=false); מציגים רק יחידות שיש להן דף כאן
    const shown = units.filter((u) => UNIT_LINKS[u.unit_id]);
    const counted = shown.filter((u) => u.counts_for_percent !== false);
    const overall = counted.length ? Math.round(counted.reduce((s, u) => s + (Number(u.percent) || 0), 0) / counted.length) : 0;
    $('overallPercent').textContent = overall + '%';
    $('overallMeter').style.width = overall + '%';

    const started = shown.filter((u) => (Number(u.percent) || 0) > 0 || u.attempts > 0).length;
    const passed = shown.filter((u) => u.completed).length; // בחנים שעברו (הדגל completed = בוחן 60+)
    const scored = shown.filter((u) => u.attempts > 0 && u.total_questions);
    const best = scored.length ? Math.max(...scored.map((u) => Math.round((u.best_score / u.total_questions) * 100))) : null;
    const totalMistakes = Object.values(mistakes).reduce((s, n) => s + (Number(n) || 0), 0);
    $('sumStarted').textContent = started + ' / ' + shown.length;
    $('sumPassed').textContent = passed + ' / ' + shown.length;
    $('sumBest').textContent = best === null ? '—' : best;
    $('sumMistakes').textContent = totalMistakes;

    $('progressUnits').innerHTML = shown
      .map((u) => {
        const pct = Number(u.percent) || 0;
        const score = u.attempts > 0 && u.total_questions ? Math.round((u.best_score / u.total_questions) * 100) : null;
        const m = Number(mistakes[u.unit_id]) || 0;
        // "הושלמה" = כל הדפים; "בתהליך" = דף שהושלם, בוחן, או כל פעילות שנשמרה (גם תשובה פתוחה)
        const unitDone = u.unit_complete === true || (u.page_total > 0 && u.pages_done >= u.page_total);
        const status = unitDone ? 'הושלמה ✓' : pct > 0 || u.attempts > 0 || u.last_activity ? 'בתהליך' : 'טרם התחלת';
        const quizText = score === null ? 'עוד לא ניגשת לבוחן' : 'בוחן: ' + score + (u.completed ? ' · עבר' : ' · צריך 60') + ' · ' + u.attempts + ' ניסיונות';
        return `<article class="progress-unit ${unitDone ? 'done' : ''}">
          <div class="progress-unit-head"><h2>${esc(u.name)}</h2><span class="progress-status">${status}</span></div>
          <div class="meter"><i style="width:${pct}%"></i></div>
          <ul class="progress-facts">
            <li>${pct}% מהיחידה${u.page_total ? ' · ' + u.pages_done + ' מתוך ' + u.page_total + ' דפים' : ''}</li>
            <li>${quizText}</li>
            <li>${m ? m + ' שאלות לחזור עליהן' : 'אין טעויות פתוחות'}</li>
          </ul>
          <div class="progress-unit-actions">
            <a class="button button-primary" href="${UNIT_LINKS[u.unit_id]}">${pct > 0 ? 'להמשיך ←' : 'להתחיל ←'}</a>
            ${score !== null || m ? `<a class="button button-outline" href="${UNIT_LINKS[u.unit_id]}#practice">לבוחן</a>` : ''}
          </div>
        </article>`;
      })
      .join('');

    const worst = shown.filter((u) => Number(mistakes[u.unit_id]) > 0).sort((a, b) => mistakes[b.unit_id] - mistakes[a.unit_id])[0];
    if (worst) {
      $('forgotText').textContent = 'הכי הרבה טעויות פתוחות ב' + worst.name + ' (' + mistakes[worst.unit_id] + '). כל שאלה נסגרת אחרי שעונים עליה נכון פעמיים ברצף.';
      $('forgotLink').href = UNIT_LINKS[worst.unit_id] + '#practice';
      $('progressForgot').hidden = false;
    }
  }

  load();
})();
