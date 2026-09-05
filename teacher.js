// טאב "תובנות": נבנה מנתוני הכיתה שמגיעים מהשרת (getBagrutTeacherDashboard), לא מה-localStorage
// של המורה. עד 04.09.2026 הטאב הציג את הניסיונות של הדפדפן המקומי בלבד (ממצא A2 בסקירה).
const UNIT_LABELS = { mishor_hachof: 'מישור החוף', yerushalayim: 'ירושלים', haamakim: 'העמקים', yam_hamelach: 'ים המלח ומדבר יהודה', galil: 'הגליל', hashivut: 'חשיבות התיירות' };
const UNIT_LINKS = { mishor_hachof: 'units/coastal-plain.html', yerushalayim: 'units/jerusalem.html', haamakim: 'units/valleys.html', yam_hamelach: 'units/dead-sea.html', galil: 'units/galilee.html' };
const WEEK = 7 * 24 * 60 * 60 * 1000; // פעילות = כל שמירה לשרת: דף שהושלם, תשובה, בוחן, תמונה
// היחידה הנוכחית = היחידה עם הפעילות האחרונה. ברשימת התלמידים מציגים אותה, כי ממוצע על 5 יחידות
// (8% אחרי 40% ביחידה אחת) לא אומר למורה כלום בתחילת שנה (דוח B, 05.09).
function currentUnitOf(student) {
  const active = (student.units || []).filter((u) => u.last_activity && !isNaN(new Date(u.last_activity).getTime()));
  if (!active.length) return null;
  const latest = (list) => list.reduce((a, b) => (new Date(b.last_activity).getTime() > new Date(a.last_activity).getTime() ? b : a));
  // יחידה שבה יש התקדמות אמיתית (דף שהושלם או בוחן) קודמת ליחידה שרק נפתחה או שנענתה בה שאלה (דוח B, 05.09)
  const withProgress = active.filter((u) => (Number(u.percent) || 0) > 0 || (Number(u.attempts) || 0) > 0);
  return latest(withProgress.length ? withProgress : active);
}
function lastActivityOf(student) {
  const times = [student.last_active, ...(student.units || []).map((u) => u.last_activity)].filter(Boolean).map((t) => new Date(t).getTime()).filter((t) => !isNaN(t));
  return times.length ? Math.max(...times) : 0;
}
function renderInsights(students, pendingCount) {
  const stats = document.getElementById('teacherStats');
  if (!stats) return;
  const total = students.length;
  const activeWeek = students.filter((s) => Date.now() - lastActivityOf(s) < WEEK).length;
  const avg = total ? Math.round(students.reduce((sum, s) => sum + (Number(s.percent) || 0), 0) / total) : 0;
  const passedAny = students.filter((s) => (s.units || []).some((u) => u.completed)).length;
  const DAY = 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const activeToday = students.filter((s) => lastActivityOf(s) >= startOfToday.getTime());
  const missingToday = students.filter((s) => lastActivityOf(s) < startOfToday.getTime());
  stats.innerHTML =
    `<article><span>פעילים היום</span><b>${activeToday.length}</b><small>${missingToday.length ? 'לא נראו היום: ' + missingToday.slice(0, 8).map((s) => safe(s.name || s.email)).join(', ') + (missingToday.length > 8 ? ' ועוד ' + (missingToday.length - 8) : '') : 'כל הכיתה פעילה היום'}</small></article>` +
    `<article><span>פעילים השבוע</span><b>${activeWeek}</b><small>מתוך ${total} תלמידים רשומים</small></article>` +
    `<article><span>התקדמות ממוצעת</span><b>${avg}%</b><small>ממוצע אחוזי היחידות לכל תלמיד/ה</small></article>` +
    `<article><span>עברו בוחן</span><b>${passedAny}</b><small>לפחות ביחידה אחת (60 ומעלה)</small></article>` +
    `<article><span>ממתינות לבדיקתך</span><b>${pendingCount ?? '—'}</b><small>תשובות פתוחות שהבוט לא היה בטוח לגביהן</small></article>`;

  // מוקדי קושי: היחידות עם הציון הממוצע הנמוך ביותר בבוחן, בין מי שניגש
  const perUnit = {};
  students.forEach((s) =>
    (s.units || []).forEach((u) => {
      const rec = (perUnit[u.unit_id] = perUnit[u.unit_id] || { unit_id: u.unit_id, name: u.name || UNIT_LABELS[u.unit_id] || u.unit_id, attempted: 0, passed: 0, scoreSum: 0, started: 0, percentSum: 0 });
      if (u.attempts > 0 && u.total_questions) {
        rec.attempted++;
        rec.scoreSum += Math.round((u.best_score / u.total_questions) * 100);
      }
      if (u.completed) rec.passed++;
      if ((Number(u.percent) || 0) > 0 || u.attempts > 0) rec.started++;
      rec.percentSum += Number(u.percent) || 0;
    })
  );
  const units = Object.values(perUnit).filter((u) => u.unit_id !== 'hashivut');
  const difficulties = units.filter((u) => u.attempted > 0).map((u) => ({ ...u, avgScore: Math.round(u.scoreSum / u.attempted) })).sort((a, b) => a.avgScore - b.avgScore);
  document.getElementById('difficultyList').innerHTML = difficulties.length
    ? difficulties
        .slice(0, 6)
        .map((u, i) => `<div><i>${i + 1}</i><span><b>${safe(u.name)}</b><small>ממוצע בוחן ${u.avgScore} · ${u.passed} מתוך ${u.attempted} עברו</small></span><em style="--difficulty:${100 - u.avgScore}%"></em></div>`)
        .join('')
    : '<p class="empty-state">עדיין אף תלמיד/ה לא ניגש/ה לבוחן. הקושי לפי יחידה יופיע אחרי הבוחנים הראשונים.</p>';

  const weakest = difficulties[0];
  const notStarted = units.filter((u) => total && u.started === 0);
  document.getElementById('teacherAction').innerHTML = weakest && weakest.avgScore < 70
    ? `<span class="action-number">01</span><h3>לחזור בקצרה על: ${safe(weakest.name)}</h3><p>הציון הממוצע בבוחן ${weakest.avgScore}. פתחו את המצגת של היחידה בכיתה, ובקשו ניסיון נוסף בבוחן אחרי החזרה.</p><a class="button button-primary" href="${UNIT_LINKS[weakest.unit_id] || 'index.html'}#presentation">פתיחת המצגת</a>`
    : notStarted.length && total
      ? `<span class="action-number">01</span><h3>להתחיל את ${safe(notStarted[0].name)}</h3><p>אף תלמיד/ה עדיין לא התחיל/ה את היחידה. הפנו אליה בשיעור הבא.</p><a class="button button-primary" href="${UNIT_LINKS[notStarted[0].unit_id] || 'index.html'}">פתיחת היחידה</a>`
      : `<span class="action-number">01</span><h3>לאסוף נתונים ראשונים</h3><p>כשהתלמידים יענו על שאלות דף ויעשו בוחן, כאן תופיע המלצה לפי הקושי שחוזר.</p><a class="button button-primary" href="index.html#units">ליחידות הלימוד</a>`;

  document.getElementById('questionPerformance').innerHTML = units.length
    ? units
        .map((u) => {
          const avgPct = total ? Math.round(u.percentSum / total) : 0;
          return `<div><span><b>${safe(u.name)}</b><small>${u.started} התחילו · ${u.passed} עברו בוחן</small></span><div class="part-dots"></div><strong>${avgPct}%</strong><em>${u.attempted ? 'ממוצע בוחן ' + Math.round(u.scoreSum / u.attempted) : 'טרם נבחנו'}</em></div>`;
        })
        .join('')
    : '<p class="empty-state">אין עדיין תלמידים רשומים.</p>';
}

// דוח שיעור: מי היה פעיל ביום נתון, מה עשה, ומי לא נראה. מאותם נתוני דשבורד (בלי קריאה נוספת לשרת).
// "פעילות" = שמירה לשרת (דף שהושלם, בוחן, תשובה פתוחה, תמונה). לכל יחידה נשמר רק המועד האחרון,
// ולכן לתאריך שאינו היום הדוח חלקי, וזה נאמר למורה בדף.
function localDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayRange(dateStr) {
  const [y, m, d] = String(dateStr || '').split('-').map(Number);
  const start = y && m && d ? new Date(y, m - 1, d) : new Date();
  start.setHours(0, 0, 0, 0);
  return { start: start.getTime(), end: start.getTime() + 24 * 60 * 60 * 1000 };
}
function lessonReportRows(students, dateStr) {
  const { start, end } = dayRange(dateStr);
  const inDay = (t) => {
    const ms = t ? new Date(t).getTime() : NaN;
    return !isNaN(ms) && ms >= start && ms < end;
  };
  return students.map((s) => {
    const units = (s.units || []).filter((u) => inDay(u.last_activity));
    const active = units.length > 0 || inDay(s.last_active);
    const done = units.map((u) => {
      const name = u.name || UNIT_LABELS[u.unit_id] || u.unit_id;
      const quiz = u.attempts > 0 && u.total_questions ? ` · בוחן ${u.best_score}/${u.total_questions}` : '';
      return `${name} (${Number(u.percent) || 0}%${quiz})`;
    });
    if (active && !done.length) done.push('תשובה פתוחה או פעילות ללא דף שהושלם');
    return { student: s, active, done, unitIds: units.map((u) => u.unit_id) };
  });
}
function renderLessonReport(students, dateStr) {
  const body = document.getElementById('reportBody');
  if (!body) return;
  const summary = document.getElementById('reportSummary');
  const absentBox = document.getElementById('reportAbsent');
  if (!students.length) {
    summary.innerHTML = '<p class="empty-state">אין תלמידים רשומים, ולכן אין עדיין דוח.</p>';
    body.innerHTML = '';
    absentBox.textContent = '';
    return;
  }
  const rows = lessonReportRows(students, dateStr);
  const active = rows.filter((r) => r.active);
  const absent = rows.filter((r) => !r.active);
  const unitCount = {};
  active.forEach((r) => r.unitIds.forEach((id) => (unitCount[id] = (unitCount[id] || 0) + 1)));
  const topUnit = Object.entries(unitCount).sort((a, b) => b[1] - a[1])[0];
  summary.innerHTML =
    `<article><span>פעילים</span><b>${active.length}</b><small>מתוך ${rows.length}</small></article>` +
    `<article><span>לא נראו</span><b>${absent.length}</b><small>${absent.length ? 'הרשימה למטה' : 'כולם היו כאן'}</small></article>` +
    `<article><span>היחידה שעבדו בה הכי הרבה</span><b>${topUnit ? safe(UNIT_LABELS[topUnit[0]] || topUnit[0]) : '—'}</b><small>${topUnit ? topUnit[1] + ' תלמידים' : 'אין פעילות ביום זה'}</small></article>`;
  body.innerHTML = active.length
    ? active
        .map(
          ({ student: s, done }) =>
            `<tr><td><b>${safe(s.name || 'ללא שם')}</b><small>${safe(s.class_name || s.email || '')}</small></td><td>${done.map(safe).join('<br>')}</td><td>${safe(s.percent ?? 0)}%</td><td>${safe(s.openAnswerCount ?? 0)}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="4">אף תלמיד/ה לא היה/תה פעיל/ה בתאריך הזה.</td></tr>';
  absentBox.innerHTML = absent.length
    ? `<b>לא נראו (${absent.length}):</b> ${absent.map((r) => safe(r.student.name || r.student.email)).join(', ')}`
    : '';
}
function lessonReportCSV(students, dateStr) {
  const rows = lessonReportRows(students, dateStr);
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  return [
    ['תאריך', 'שם', 'דוא״ל', 'כיתה', 'פעיל/ה', 'מה נעשה', 'התקדמות כללית', 'ציון מיטבי', 'תשובות פתוחות'].map(q),
    ...rows.map(({ student: s, active, done }) =>
      [dateStr, s.name, s.email, s.class_name, active ? 'כן' : 'לא', done.join(' | '), (s.percent ?? 0) + '%', s.best_score ?? '', s.openAnswerCount ?? 0].map(q)
    ),
  ];
}
function currentReportDate() {
  const input = document.getElementById('reportDate');
  if (input && !input.value) input.value = localDateKey(Date.now());
  return input ? input.value : localDateKey(Date.now());
}
const TEACHER_API =
  'https://script.google.com/macros/s/AKfycbwf3-MNZBBi64zXcNH7wfhBRoEBl9brtQ9QRI4Won5RmUIOrl_WBivN6uI5NAp6Mc0h/exec';
let teacherUser = null,
  roster = [];
try {
  teacherUser = JSON.parse(sessionStorage.getItem('kitahUser') || 'null');
} catch (_) {}
if (teacherUser)
  document.getElementById('teacherUserName').textContent = teacherUser.name || teacherUser.email || 'מורה';
function switchTeacherTab(id) {
  document
    .querySelectorAll('[data-teacher-tab]')
    .forEach((x) => x.classList.toggle('active', x.dataset.teacherTab === id));
  document
    .querySelectorAll('[data-teacher-tab-button]')
    .forEach((x) => x.classList.toggle('active', x.dataset.teacherTabButton === id));
}
document
  .querySelectorAll('[data-teacher-tab-button]')
  .forEach((b) => b.addEventListener('click', () => switchTeacherTab(b.dataset.teacherTabButton)));
document
  .querySelectorAll('[data-open-teacher-tab]')
  .forEach((b) => b.addEventListener('click', () => switchTeacherTab(b.dataset.openTeacherTab)));
async function teacherAPI(action, params = {}) {
  const response = await fetch(TEACHER_API, {
      method: 'POST',
      body: JSON.stringify({ action, token: teacherUser?.token, ...params }),
    }),
    data = await response.json();
  if (!data.ok) throw new Error(data.error || 'שגיאה בחיבור');
  return data.data;
}
function safe(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );
}
function renderRoster() {
  const body = document.getElementById('studentsBody');
  document.getElementById('rosterSummary').innerHTML = `<b>${roster.length}</b><span>תלמידים רשומים במקצוע</span>`;
  body.innerHTML = roster.length
    ? roster
        .map(
          (s) =>
            `<tr><td><b>${safe(s.name || 'ללא שם')}</b><small>${safe(s.email || '')}</small></td><td>${safe(s.class_name || '—')}</td><td>${(() => {
              const cu = currentUnitOf(s);
              return cu ? `<b>${safe(cu.percent ?? 0)}%</b><small>${safe(cu.name || cu.unit_id)} · כללי ${safe(s.percent ?? 0)}%</small>` : '<small>טרם התחיל/ה</small>';
            })()}</td><td>${safe(s.best_score ?? '—')}</td><td>${s.last_active ? new Date(s.last_active).toLocaleDateString('he-IL') : 'טרם התחיל/ה'}</td><td><div class="row-actions"><button class="table-action" data-student-answers="${safe(s.email)}">תשובות</button><button class="table-action" data-change-email="${safe(s.email)}" data-student-name="${safe(s.name || s.email)}">שינוי מייל</button><button class="table-action danger" data-remove-student="${safe(s.email)}" data-student-name="${safe(s.name || s.email)}">הסרה</button></div></td></tr>`
        )
        .join('')
    : '<tr><td colspan="6">אין תלמידים רשומים עדיין.</td></tr>';
  // דופק הכיתה לפי היחידה הנוכחית של כל תלמיד/ה (לא ממוצע על כל היחידות)
  const progress = roster.map((s) => Number(currentUnitOf(s)?.percent ?? 0) || 0),
    notStarted = roster.filter((s) => !currentUnitOf(s)).length,
    needsHelp = roster.filter(
      (s, i) => currentUnitOf(s) && (progress[i] < 40 || (s.best_score == null ? 100 : Number(s.best_score)) < 60)
    ).length,
    onTrack = Math.max(0, roster.length - notStarted - needsHelp),
    averageProgress = progress.length ? Math.round(progress.reduce((a, b) => a + b, 0) / progress.length) : 0; // ממוצע ההתקדמות ביחידה הנוכחית
  document.getElementById('classPulse').innerHTML =
    `<article><span>טרם התחילו</span><b>${notStarted}</b></article><article><span>זקוקים לחיזוק</span><b>${needsHelp}</b></article><article><span>בדרך הנכונה</span><b>${onTrack}</b></article><article><span>ממוצע ביחידה הנוכחית</span><b>${averageProgress}%</b></article>`;
  document
    .querySelectorAll('[data-student-answers]')
    .forEach((b) => b.addEventListener('click', () => openStudentAnswers(b.dataset.studentAnswers)));
  document
    .querySelectorAll('[data-remove-student]')
    .forEach((b) => b.addEventListener('click', () => removeStudent(b.dataset.removeStudent, b.dataset.studentName)));
  document
    .querySelectorAll('[data-change-email]')
    .forEach((b) => b.addEventListener('click', () => changeStudentEmail(b.dataset.changeEmail, b.dataset.studentName)));
}
// שינוי מייל: ההתקדמות, הבחנים והתשובות עוברות למייל החדש (הכול מזוהה לפי מייל בשרת).
async function changeStudentEmail(email, name) {
  const next = window.prompt(`מייל חדש עבור ${name}:\nההתקדמות, הבחנים והתשובות יעברו למייל החדש.`, email);
  if (next == null) return;
  const new_email = next.trim();
  if (!new_email || new_email.toLowerCase() === String(email).toLowerCase()) return;
  const chip = document.getElementById('teacherDataState');
  chip.textContent = 'מעדכן מייל…';
  try {
    const data = await teacherAPI('updateBagrutStudentEmail', { email, new_email });
    const moved = Object.values(data.changed || {}).reduce((a, b) => a + Number(b || 0), 0) - 1;
    chip.textContent = `המייל עודכן${moved > 0 ? ' · ' + moved + ' רשומות התקדמות הועברו' : ''}`;
    await loadClassroom();
    chip.textContent = `המייל של ${name} עודכן`;
  } catch (e) {
    chip.textContent = 'שינוי המייל נכשל: ' + e.message;
    window.alert('שינוי המייל נכשל: ' + e.message);
  }
}
async function loadClassroom() {
  if (!teacherUser?.token) {
    document.getElementById('teacherDataState').textContent = 'נדרשת כניסה מחדש';
    document.getElementById('overviewMessage').textContent = 'כדי לטעון את נתוני הכיתה יש להיכנס דרך כיתה פלוס.';
    document.getElementById('studentsBody').innerHTML =
      '<tr><td colspan="6">נתוני התלמידים יוצגו לאחר כניסה דרך כיתה פלוס.</td></tr>';
    return;
  }
  try {
    const data = await teacherAPI('getBagrutTeacherDashboard');
    roster = data.students || [];
    renderRoster();
    renderInsights(roster, window.__pendingCount);
    renderLessonReport(roster, currentReportDate());
    document.getElementById('teacherDataState').textContent = 'מחובר לכיתה פלוס';
    document.getElementById('overviewMessage').textContent = roster.length
      ? `${roster.length} תלמידים רשומים. עברו לרשימה כדי לזהות מי טרם התחיל ומי זקוק לחיזוק.`
      : 'עדיין אין תלמידים רשומים במקצוע.';
  } catch (e) {
    document.getElementById('teacherDataState').textContent = 'החיבור דורש בדיקה';
    renderInsights([], undefined);
    renderLessonReport([], currentReportDate());
    document.getElementById('overviewMessage').textContent = 'לא הצלחנו לטעון את נתוני הכיתה: ' + e.message;
    document.getElementById('studentsBody').innerHTML = '<tr><td colspan="6">' + e.message + '</td></tr>';
  }
}
document
  .getElementById('toggleStudentForm')
  .addEventListener(
    'click',
    () => (document.getElementById('studentAddForm').hidden = !document.getElementById('studentAddForm').hidden)
  );
document
  .getElementById('toggleBulkForm')
  .addEventListener(
    'click',
    () => (document.getElementById('studentBulkForm').hidden = !document.getElementById('studentBulkForm').hidden)
  );
document.getElementById('studentAddForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const feedback = document.getElementById('studentFormFeedback');
  feedback.textContent = 'שומר…';
  try {
    await teacherAPI('addBagrutStudent', {
      name: document.getElementById('newStudentName').value.trim(),
      email: document.getElementById('newStudentEmail').value.trim(),
      class_name: document.getElementById('newStudentClass').value.trim(),
    });
    e.target.reset();
    feedback.textContent = 'התלמיד/ה נוספו';
    await loadClassroom();
  } catch (err) {
    feedback.textContent = 'שגיאה: ' + err.message;
  }
});
function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.join(',')).join('\r\n'),
    blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
document.getElementById('downloadBulkTemplate').addEventListener('click', () =>
  downloadCSV('תבנית_ייבוא_תלמידים.csv', [
    ['שם', 'דוא"ל', 'כיתה'],
    ['נועה ישראלי', 'noa@example.com', 'י"א 1'],
  ])
);
document.getElementById('studentBulkForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const feedback = document.getElementById('bulkFormFeedback'),
    file = document.getElementById('bulkFile').files[0];
  if (!file) {
    feedback.textContent = 'בחרו קובץ קודם.';
    return;
  }
  feedback.textContent = 'קורא את הקובץ…';
  let students;
  try {
    const text = (await file.text()).replace(/^﻿/, ''),
      lines = text
        .split(/\r?\n/)
        .map((x) => x.trim())
        .filter(Boolean);
    students = lines
      .map((line) => {
        const [name, email, class_name = ''] = line.split(/[,\t]/).map((x) => x.trim().replace(/^"|"$/g, ''));
        return { name, email, class_name };
      })
      .filter((s) => s.name && s.email.includes('@'));
  } catch (err) {
    feedback.textContent = 'שגיאה בקריאת הקובץ: ' + err.message;
    return;
  }
  if (!students.length) {
    feedback.textContent = 'לא נמצאו שורות תקינות בקובץ (שם + דוא״ל).';
    return;
  }
  feedback.textContent = `מוסיף ${students.length} תלמידים…`;
  try {
    await teacherAPI('addBagrutStudentsBulk', { students });
    e.target.reset();
    feedback.textContent = 'הרשימה נוספה בהצלחה';
    await loadClassroom();
  } catch (err) {
    feedback.textContent = 'שגיאה: ' + err.message;
  }
});
async function removeStudent(email, name) {
  if (!confirm(`להסיר את ${name} מרשימת תלמידי תיירות?`)) return;
  try {
    await teacherAPI('removeBagrutStudent', { studentEmail: email, email });
    await loadClassroom();
  } catch (err) {
    alert('לא ניתן להסיר: ' + err.message);
  }
}
function reviewStatusLabel(status) {
  return (
    {
      auto: 'נבדק אוטומטית',
      pending_review: 'ממתין לבדיקה',
      approved: 'אושרה',
      returned: 'הוחזרה לתיקון',
      rejected: 'נדחתה',
    }[status] || 'טרם נבדק'
  );
}
function reviewStatusClass(status) {
  return { auto: 'ok', approved: 'ok', pending_review: 'warn', returned: 'warn', rejected: 'bad' }[status] || '';
}
async function openStudentAnswers(email) {
  switchTeacherTab('answers');
  const state = document.getElementById('answersState');
  state.textContent = 'טוען תשובות…';
  try {
    const data = await teacherAPI('getBagrutStudentOpenAnswers', { studentEmail: email }),
      answers = data.answers || data || [];
    state.innerHTML = answers.length
      ? answers
          .map(
            (a) =>
              `<article class="student-answer-card"><span class="review-badge ${reviewStatusClass(a.status)}">${reviewStatusLabel(a.status)}</span> <span>${safe(a.unit_name || a.unit_id || 'יחידה')}</span><h3>${safe(a.question || 'שאלה פתוחה')}</h3><p>${safe(a.answer || a.answer_text || '')}</p>${a.teacher_note ? `<blockquote>הערת מורה: ${safe(a.teacher_note)}</blockquote>` : ''}<small>${a.timestamp ? new Date(a.timestamp).toLocaleString('he-IL') : a.created_at ? new Date(a.created_at).toLocaleString('he-IL') : ''}</small></article>`
          )
          .join('')
      : 'אין עדיין תשובות פתוחות לתלמיד/ה זה.';
  } catch (e) {
    state.textContent = 'שגיאה: ' + e.message;
  }
}
async function loadPendingReviews() {
  const box = document.getElementById('pendingReviewsState'),
    countChip = document.getElementById('pendingCount');
  if (!teacherUser?.token) {
    box.innerHTML = '<div class="empty-state">נדרשת כניסה מחדש דרך כיתה פלוס.</div>';
    countChip.textContent = '—';
    return;
  }
  try {
    const data = await teacherAPI('getBagrutPendingReviewsForTeacher'),
      pending = data.pending || [];
    window.__pendingCount = pending.length;
    if (roster.length) renderInsights(roster, pending.length);
    countChip.textContent = pending.length ? `${pending.length} ממתינות` : 'הכל נבדק';
    box.innerHTML = pending.length
      ? pending
          .map(
            (r) =>
              `<article class="review-queue-card" data-answer-key="${safe(r.answer_key)}"><div class="review-queue-head"><span class="review-badge warn">ממתין לבדיקה</span><small>${safe(r.email)} · ${safe(r.unit_id)}</small></div><h3>${safe(r.question || 'שאלה פתוחה')}</h3><textarea class="review-note" placeholder="הערה לתלמיד/ה (לא חובה)"></textarea><div class="review-actions"><button class="button button-primary" data-review-decision="approved" type="button">✓ אישור</button><button class="button button-outline" data-review-decision="returned" type="button">↩ להחזיר לתיקון</button><button class="button button-outline danger" data-review-decision="rejected" type="button">✗ דחייה</button></div></article>`
          )
          .join('')
      : '<div class="empty-state">אין תשובות שממתינות לבדיקה כרגע 🎉</div>';
    box
      .querySelectorAll('[data-review-decision]')
      .forEach((btn) => btn.addEventListener('click', () => submitReview(btn)));
  } catch (e) {
    box.innerHTML = '<div class="empty-state">שגיאה בטעינת התשובות הממתינות: ' + e.message + '</div>';
    countChip.textContent = 'שגיאה';
  }
}
async function submitReview(btn) {
  const card = btn.closest('[data-answer-key]'),
    answerKey = card.dataset.answerKey,
    decision = btn.dataset.reviewDecision,
    note = card.querySelector('.review-note').value.trim();
  card.querySelectorAll('button').forEach((b) => (b.disabled = true));
  try {
    await teacherAPI('reviewOpenAnswer', { answer_key: answerKey, decision, teacher_note: note });
    await loadPendingReviews();
  } catch (e) {
    alert('שגיאה בשמירת ההחלטה: ' + e.message);
    card.querySelectorAll('button').forEach((b) => (b.disabled = false));
  }
}
const CONTENT_PAGES = [
  { unit_id: 'mishor_hachof', url: 'units/coastal-plain.html', label: 'מישור החוף' },
  { unit_id: 'yerushalayim', url: 'units/jerusalem.html', label: 'ירושלים' },
  { unit_id: 'haamakim', url: 'units/valleys.html', label: 'העמקים' },
  { unit_id: 'yam_hamelach', url: 'units/dead-sea.html', label: 'ים המלח ומדבר יהודה' },
  { unit_id: 'galil', url: 'units/galilee.html', label: 'הגליל' },
];
async function discoverEditableFields() {
  const results = [];
  for (const page of CONTENT_PAGES) {
    try {
      const html = await fetch(page.url).then((r) => r.text());
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('[data-field-key]').forEach((el) => {
        const key = el.getAttribute('data-field-key'),
          parts = key.split('__'),
          pageId = parts.length === 3 ? parts[1] : 'כללי';
        results.push({
          unit_id: page.unit_id,
          unitLabel: page.label,
          field_key: key,
          tag: el.tagName.toLowerCase(),
          pageId,
          default: el.textContent.trim(),
        });
      });
    } catch (e) {
      /* עמוד לא זמין כרגע — מדלגים עליו בסריקה הזו */
    }
  }
  return results;
}
let discoveredFields = [];
async function loadEditContent() {
  const box = document.getElementById('editContentState');
  if (!teacherUser?.token) {
    box.innerHTML = '<div class="empty-state">נדרשת כניסה מחדש דרך כיתה פלוס.</div>';
    return;
  }
  box.innerHTML = '<div class="empty-state">סורק את תוכן היחידות…</div>';
  try {
    const [fields, overridesData] = await Promise.all([discoverEditableFields(), teacherAPI('getAllContentOverrides')]);
    discoveredFields = fields;
    const saved = overridesData.overrides || [],
      byKey = {};
    saved.forEach((r) => {
      byKey[r.unit_id + '|' + r.field_key] = r.text;
    });
    if (!fields.length) {
      box.innerHTML = '<div class="empty-state">לא נמצאו שדות עריכה כרגע.</div>';
      return;
    }
    const groups = {};
    fields.forEach((f) => {
      groups[f.unit_id] = groups[f.unit_id] || { label: f.unitLabel, pages: {} };
      groups[f.unit_id].pages[f.pageId] = groups[f.unit_id].pages[f.pageId] || [];
      groups[f.unit_id].pages[f.pageId].push(f);
    });
    box.innerHTML =
      '<input type="search" id="editContentSearch" class="search-input" placeholder="חיפוש בטקסטים הניתנים לעריכה…">' +
      Object.values(groups)
        .map(
          (g) =>
            `<details class="edit-unit-group"><summary>${safe(g.label)} <small>(${Object.values(g.pages).reduce((s, a) => s + a.length, 0)} שדות)</small></summary>${Object.entries(
              g.pages
            )
              .map(
                ([pageId, list]) =>
                  `<div class="edit-page-group"><h4>עמוד: ${safe(pageId)}</h4>${list
                    .map((f) => {
                      const current = byKey[f.unit_id + '|' + f.field_key];
                      return `<article class="edit-content-card" data-unit-id="${f.unit_id}" data-field-key="${f.field_key}"><span class="edit-field-tag">${f.tag}</span><textarea class="review-note">${safe(current ?? f.default)}</textarea><div class="review-actions"><button class="button button-primary" data-save-field type="button">שמירה</button><button class="button button-outline" data-reset-field type="button">איפוס לברירת המחדל</button><small class="edit-content-status"></small></div></article>`;
                    })
                    .join('')}</div>`
              )
              .join('')}</details>`
        )
        .join('');
    box.querySelectorAll('[data-save-field]').forEach((btn) => btn.addEventListener('click', () => saveField(btn)));
    box.querySelectorAll('[data-reset-field]').forEach((btn) => btn.addEventListener('click', () => resetField(btn)));
    document.getElementById('editContentSearch').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      box.querySelectorAll('.edit-content-card').forEach((card) => {
        const hay = (card.querySelector('textarea').value + ' ' + card.dataset.fieldKey).toLowerCase();
        card.style.display = !q || hay.includes(q) ? '' : 'none';
      });
    });
  } catch (e) {
    box.innerHTML = '<div class="empty-state">שגיאה בסריקת התוכן: ' + e.message + '</div>';
  }
}
async function saveField(btn) {
  const card = btn.closest('[data-field-key]'),
    unit_id = card.dataset.unitId,
    field_key = card.dataset.fieldKey,
    text = card.querySelector('textarea').value,
    status = card.querySelector('.edit-content-status');
  status.textContent = 'שומר…';
  btn.disabled = true;
  try {
    await teacherAPI('saveContentOverride', { unit_id, field_key, text });
    status.textContent = 'נשמר ✓';
  } catch (e) {
    status.textContent = 'שגיאה: ' + e.message;
  }
  btn.disabled = false;
}
async function resetField(btn) {
  const card = btn.closest('[data-field-key]'),
    unit_id = card.dataset.unitId,
    field_key = card.dataset.fieldKey,
    field = discoveredFields.find((f) => f.unit_id === unit_id && f.field_key === field_key),
    status = card.querySelector('.edit-content-status');
  card.querySelector('textarea').value = field ? field.default : '';
  status.textContent = 'שומר…';
  btn.disabled = true;
  try {
    await teacherAPI('saveContentOverride', { unit_id, field_key, text: '' });
    status.textContent = 'אופס לברירת המחדל ✓';
  } catch (e) {
    status.textContent = 'שגיאה: ' + e.message;
  }
  btn.disabled = false;
}
loadClassroom();
loadPendingReviews();
loadEditContent();

// ---------- "המשימה להיום" ----------
function renderAssignmentOptions() {
  const select = document.getElementById('assignmentUnit');
  if (!select) return;
  CONTENT_PAGES.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.unit_id;
    opt.textContent = p.label;
    select.appendChild(opt);
  });
}
function renderAssignment(assignment) {
  const box = document.getElementById('assignmentCurrent');
  if (!box) return;
  if (!assignment) {
    box.innerHTML = '<span class="review-badge">אין משימה פעילה</span>';
    return;
  }
  const page = CONTENT_PAGES.find((p) => p.unit_id === assignment.unit_id);
  box.innerHTML = `<span class="review-badge ok">פעילה</span> <b>${safe(assignment.unit_name)}</b>${assignment.note ? ' · ' + safe(assignment.note) : ''} <a href="${page ? page.url : 'index.html'}">לפתיחה ←</a>`;
  document.getElementById('assignmentUnit').value = assignment.unit_id;
  document.getElementById('assignmentNote').value = assignment.note || '';
}
async function loadAssignment() {
  if (!teacherUser?.token || !document.getElementById('assignmentCurrent')) return;
  try {
    const data = await teacherAPI('getBagrutAssignment');
    renderAssignment(data.assignment);
  } catch (e) {
    document.getElementById('assignmentCurrent').textContent = 'לא ניתן לטעון את המשימה: ' + e.message;
  }
}
async function saveAssignment(unit_id) {
  const status = document.getElementById('assignmentStatus');
  const current = document.getElementById('assignmentCurrent');
  status.textContent = 'שומר…';
  // עד שהשרת עונה לא מציגים מצב ישן ("אין משימה פעילה") כאילו הוא עדכני
  if (current) current.innerHTML = '<span class="review-badge">' + (unit_id ? 'מפרסם…' : 'מבטל…') + '</span>';
  try {
    await teacherAPI('setBagrutAssignment', { unit_id, note: document.getElementById('assignmentNote').value.trim() });
    status.textContent = unit_id ? 'פורסם לתלמידים ✓' : 'המשימה בוטלה';
    await loadAssignment();
  } catch (e) {
    status.textContent = 'שגיאה: ' + e.message;
  }
}
renderAssignmentOptions();
document.getElementById('assignmentForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const unit = document.getElementById('assignmentUnit').value;
  if (!unit) {
    document.getElementById('assignmentStatus').textContent = 'בחרו יחידה קודם.';
    return;
  }
  saveAssignment(unit);
});
document.getElementById('assignmentClear')?.addEventListener('click', () => saveAssignment(''));
loadAssignment();
document.getElementById('reportDate')?.addEventListener('change', () => renderLessonReport(roster, currentReportDate()));
document.getElementById('reportCsv')?.addEventListener('click', () => {
  const date = currentReportDate();
  downloadCSV(`דוח-שיעור-${date}.csv`, lessonReportCSV(roster, date));
});

// ---------- מאגר החומר לבוט (סריקה מחדש מהדשבורד) ----------
function renderKnowledgeList(data) {
  const box = document.getElementById('knowledgeList');
  if (!box) return;
  const files = data.files || [];
  if (!files.length) {
    box.innerHTML = '<div class="empty-state">המאגר ריק. לחצו "סריקת חומרים מחדש".</div>';
    return;
  }
  const byFolder = {};
  files.forEach((f) => (byFolder[f.folder || '(שורש)'] = byFolder[f.folder || '(שורש)'] || []).push(f));
  const last = files.map((f) => f.scanned).filter(Boolean).sort().pop();
  box.innerHTML =
    `<p class="knowledge-total"><b>${files.length}</b> קבצים · <b>${Math.round((data.total_chars || 0) / 1000)}K</b> תווים${last ? ' · נסרק לאחרונה ' + new Date(last).toLocaleString('he-IL') : ''}</p>` +
    Object.entries(byFolder)
      .sort((a, b) => a[0].localeCompare(b[0], 'he'))
      .map(([folder, list]) => `<details class="knowledge-folder"><summary><b>${safe(folder)}</b> <small>${list.length} קבצים · ${Math.round(list.reduce((n, f) => n + (Number(f.chars) || 0), 0) / 1000)}K</small></summary><ul>${list.map((f) => `<li>${safe(f.name)} <small>${Math.round((Number(f.chars) || 0) / 1000)}K</small></li>`).join('')}</ul></details>`)
      .join('');
}
async function loadKnowledgeSummary() {
  if (!teacherUser?.token || !document.getElementById('knowledgeList')) return;
  try {
    renderKnowledgeList(await teacherAPI('getBagrutKnowledgeSummary'));
  } catch (e) {
    document.getElementById('knowledgeList').innerHTML = '<div class="empty-state">לא ניתן לטעון את רשימת הקבצים: ' + safe(e.message) + '</div>';
  }
}
document.getElementById('rescanKnowledge')?.addEventListener('click', async () => {
  const btn = document.getElementById('rescanKnowledge'),
    status = document.getElementById('knowledgeStatus');
  btn.disabled = true;
  status.textContent = 'סורק את הדרייב… זה לוקח כמה דקות, אפשר להמשיך לעבוד בינתיים.';
  try {
    const data = await teacherAPI('refreshBagrutKnowledge');
    const skipped = data.skipped || [];
    const deferred = skipped.filter((x) => /נדחה/.test(x.reason)).length;
    status.innerHTML = `נסרקו <b>${data.scanned}</b> קבצים (${Math.round((data.chars || 0) / 1000)}K תווים, ${data.converted ?? '?'} הומרו מחדש, ${data.seconds ?? '?'} שניות).` + (deferred ? ` <b>${deferred} קבצים נדחו להרצה הבאה</b>, לחצו שוב על הכפתור.` : '') + (skipped.length - deferred > 0 ? ` דולגו: ` + skipped.filter((x) => !/נדחה/.test(x.reason)).map((x) => safe(x.name) + ' (' + safe(x.reason) + ')').join(', ') : ' הכול נקלט.');
    await loadKnowledgeSummary();
  } catch (e) {
    status.textContent = /לא ענה בזמן|Failed to fetch|NetworkError/.test(e.message) ? 'הסריקה ממשיכה בשרת. רעננו את הדף בעוד 2–3 דקות כדי לראות את הרשימה המעודכנת.' : 'הסריקה נכשלה: ' + e.message;
  } finally {
    btn.disabled = false;
  }
});
loadKnowledgeSummary();
