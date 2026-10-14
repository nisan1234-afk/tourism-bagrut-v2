/**
 * טרוול בוסטר — מדריך צעד-אחר-צעד לטלפון (tb/ באתר) + מעקב למורה.
 *
 * טאב אחד בגיליון הבגרות: tb_progress — שורה לכל תלמיד/ה + יחידה.
 *   step       = השלב שבו התלמיד/ה נמצא/ת עכשיו (למצב כיתה חי)
 *   max_step   = השלב הרחוק ביותר שהגיע/ה אליו (לאחוז התקדמות)
 *   docket     = מספר הדוקט / הצעת המחיר שהוזן בסוף היחידה
 *   review     = '' (ממתין) | 'ok' | 'fix' — סימון המורה אחרי בדיקה בטרוול בוסטר
 *
 * תוכן היחידות עצמו (שלבים, צילומי מסך) יושב בפרונט (tb/units.js). כאן רק נשמרת התקדמות,
 * ולכן מזהה יחידה נבדק לפי תבנית ולא מול רשימה קבועה: הוספת יחידה לא דורשת פריסת בקאנד.
 */

const TB_UNIT_ID_RE = /^(fit|grp)-[a-z0-9-]{2,30}$/;
const TB_HEADERS = ['email', 'unit_id', 'step', 'max_step', 'steps_total', 'done', 'docket', 'note',
  'started_at', 'updated_at', 'completed_at', 'review', 'review_note', 'reviewed_at'];
const TB_STAFF_ROLES = ['teacher', 'homeroom', 'admin', 'school_admin'];

function ensureTbProgressSheet_(ss) {
  return ensureSheetWithHeaders(ss, 'tb_progress', TB_HEADERS);
}

function tbRequireStudent_(ss, email) {
  const emailNorm = stripInvisible_(email);
  if (!sheetToObjects(ensureBagrutStudentsSheet_(ss)).some(s => stripInvisible_(s.email) === emailNorm)) {
    throw new Error('אין לך גישה למקצוע תיירות בגרות. פנה/י למורה כדי שיוסיף/תוסיף אותך.');
  }
  return emailNorm;
}

function tbCheckUnitId_(unit_id) {
  if (!TB_UNIT_ID_RE.test(String(unit_id || ''))) throw new Error('יחידה לא מוכרת');
}

function tbIso_(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function tbRowOut_(r) {
  return {
    unit_id: r.unit_id,
    step: Number(r.step) || 0,
    max_step: Number(r.max_step) || 0,
    steps_total: Number(r.steps_total) || 0,
    done: String(r.done) === 'true',
    docket: r.docket === '' || r.docket == null ? '' : String(r.docket),
    note: r.note ? String(r.note) : '',
    started_at: tbIso_(r.started_at),
    updated_at: tbIso_(r.updated_at),
    completed_at: tbIso_(r.completed_at),
    review: r.review ? String(r.review) : '',
    review_note: r.review_note ? String(r.review_note) : '',
    reviewed_at: tbIso_(r.reviewed_at)
  };
}

/** כותב שדות לשורה קיימת לפי שם עמודה (בלי לגעת בשאר). */
function tbWriteFields_(sheet, headers, rowNum, fields) {
  Object.keys(fields).forEach(k => {
    const col = headers.indexOf(k);
    if (col !== -1) sheet.getRange(rowNum, col + 1).setValue(fields[k]);
  });
}

function getMyTbProgress({ verifiedEmail }) {
  const ss = SpreadsheetApp.openById(BAGRUT_SHEET_ID);
  const emailNorm = tbRequireStudent_(ss, verifiedEmail);
  const units = {};
  sheetToObjects(ensureTbProgressSheet_(ss))
    .filter(r => stripInvisible_(r.email) === emailNorm)
    .forEach(r => { units[r.unit_id] = tbRowOut_(r); });
  return { units: units };
}

/** נקרא בכל מעבר שלב בטלפון. שומר איפה התלמיד/ה עכשיו, כדי שהמורה יראה מי תקוע. */
function saveTbStep({ verifiedEmail, unit_id, step, steps_total }) {
  tbCheckUnitId_(unit_id);
  const stepNum = Math.max(0, Math.min(200, Number(step) || 0));
  const totalNum = Math.max(0, Math.min(200, Number(steps_total) || 0));
  return withLock(() => {
    const ss = SpreadsheetApp.openById(BAGRUT_SHEET_ID);
    const emailNorm = tbRequireStudent_(ss, verifiedEmail);
    const sheet = ensureTbProgressSheet_(ss);
    const headers = getHeaders(sheet);
    const rows = sheetToObjects(sheet);
    const idx = rows.findIndex(r => stripInvisible_(r.email) === emailNorm && r.unit_id === unit_id);
    const now = new Date().toISOString();
    if (idx === -1) {
      appendRow(sheet, {
        email: verifiedEmail, unit_id: unit_id, step: stepNum, max_step: stepNum, steps_total: totalNum,
        done: false, started_at: now, updated_at: now
      });
    } else {
      const prevMax = Number(rows[idx].max_step) || 0;
      tbWriteFields_(sheet, headers, idx + 2, {
        step: stepNum, max_step: Math.max(prevMax, stepNum), steps_total: totalNum || rows[idx].steps_total, updated_at: now
      });
    }
    return { saved: true };
  });
}

/** סוף יחידה: מספר דוקט חובה. הגשה מחדש אחרי "לתיקון" מחזירה את הסימון לממתין. */
function completeTbUnit({ verifiedEmail, unit_id, docket, note, steps_total }) {
  tbCheckUnitId_(unit_id);
  const docketStr = String(docket == null ? '' : docket).replace(/[^\d]/g, '');
  if (!/^\d{3,9}$/.test(docketStr)) throw new Error('מספר דוקט לא תקין (רק ספרות)');
  const noteStr = String(note || '').slice(0, 500);
  const totalNum = Math.max(0, Math.min(200, Number(steps_total) || 0));
  return withLock(() => {
    const ss = SpreadsheetApp.openById(BAGRUT_SHEET_ID);
    const emailNorm = tbRequireStudent_(ss, verifiedEmail);
    const sheet = ensureTbProgressSheet_(ss);
    const headers = getHeaders(sheet);
    const rows = sheetToObjects(sheet);
    const idx = rows.findIndex(r => stripInvisible_(r.email) === emailNorm && r.unit_id === unit_id);
    const now = new Date().toISOString();
    const fields = {
      step: totalNum, max_step: totalNum, steps_total: totalNum, done: true,
      docket: docketStr, note: noteStr, updated_at: now, completed_at: now
    };
    if (idx === -1) {
      appendRow(sheet, Object.assign({ email: verifiedEmail, unit_id: unit_id, started_at: now }, fields));
    } else {
      if (String(rows[idx].review) === 'fix' || String(rows[idx].docket) !== docketStr) {
        fields.review = '';
        fields.reviewed_at = '';
      }
      tbWriteFields_(sheet, headers, idx + 2, fields);
    }
    return { saved: true, docket: docketStr };
  });
}

/** דשבורד המורה: כל התלמידים שלו, ולכל אחד/ת כל היחידות שהתחיל/ה. */
function getBagrutTbSummary({ verifiedEmail }) {
  requireRole(verifiedEmail, TB_STAFF_ROLES);
  const ss = SpreadsheetApp.openById(BAGRUT_SHEET_ID);
  const students = sheetToObjects(ensureBagrutStudentsSheet_(ss)).filter(s => s.teacher_email == verifiedEmail);
  const rows = sheetToObjects(ensureTbProgressSheet_(ss));
  return {
    now: new Date().toISOString(),
    students: students.map(s => {
      const emailNorm = stripInvisible_(s.email);
      const units = {};
      rows.filter(r => stripInvisible_(r.email) === emailNorm).forEach(r => { units[r.unit_id] = tbRowOut_(r); });
      return { email: s.email, name: s.name, class_name: s.class_name, units: units };
    })
  };
}

/** סימון המורה ליחידה של תלמיד/ה: ok = נבדק ותקין, fix = לתיקון (עם הערה), '' = ביטול סימון. */
function reviewTbUnit({ verifiedEmail, email, unit_id, review, review_note }) {
  requireRole(verifiedEmail, TB_STAFF_ROLES);
  tbCheckUnitId_(unit_id);
  const reviewStr = String(review || '');
  if (['ok', 'fix', ''].indexOf(reviewStr) === -1) throw new Error('סימון לא מוכר');
  const noteStr = String(review_note || '').slice(0, 500);
  return withLock(() => {
    const ss = SpreadsheetApp.openById(BAGRUT_SHEET_ID);
    const emailNorm = stripInvisible_(email);
    const mine = sheetToObjects(ensureBagrutStudentsSheet_(ss))
      .some(s => stripInvisible_(s.email) === emailNorm && s.teacher_email == verifiedEmail);
    if (!mine) throw new Error('תלמיד/ה לא נמצא/ה ברשימה שלך');
    const sheet = ensureTbProgressSheet_(ss);
    const headers = getHeaders(sheet);
    const rows = sheetToObjects(sheet);
    const idx = rows.findIndex(r => stripInvisible_(r.email) === emailNorm && r.unit_id === unit_id);
    if (idx === -1) throw new Error('התלמיד/ה עוד לא התחיל/ה את היחידה הזו');
    tbWriteFields_(sheet, headers, idx + 2, {
      review: reviewStr, review_note: noteStr, reviewed_at: reviewStr ? new Date().toISOString() : ''
    });
    return { saved: true };
  });
}
