// ========== תיירות דיגיטלית: קוד כיתה + "ממתינים לשיבוץ" (10.2026) ==========
// כמו קוד הכיתה של תיירות לבגרות, אבל לכיתות של תיירות דיגיטלית (טאב classes בגיליון TOURISM).
// תלמיד/ה שמקליד/ה את הקוד בדף הכניסה לא נכנס/ת ישר לקבוצה: הוא/היא נוסף/ת לרשימת
// "ממתינים לשיבוץ" של הכיתה, והמורה משבץ/ת לקבוצה מהדשבורד (addMember / addGroup מוחקים מהרשימה).
// אותו שדה קוד בדף הכניסה משרת את שתי המערכות, ולכן קוד חייב להיות ייחודי בשתיהן יחד.

function ensureTourismClassCodesSheet_(ss) {
  return ensureSheetWithHeaders(ss, 'class_join_codes', ['code', 'class_id', 'teacher_email', 'status', 'created_date']);
}

function ensureTourismWaitingSheet_(ss) {
  return ensureSheetWithHeaders(ss, 'class_waiting', ['email', 'name', 'class_id', 'teacher_email', 'joined_at']);
}

function tourismActiveClassCodes_(ss) {
  return sheetToObjects(ensureTourismClassCodesSheet_(ss)).filter(c => String(c.status || 'active') === 'active');
}

/** הקודים הפעילים של המורה, רק לכיתות שעדיין קיימות. */
function tourismClassCodesOf_(ss, teacherEmail) {
  const classIds = new Set(sheetToObjects(ensureClassesSheet(ss)).filter(c => c.teacher_email == teacherEmail).map(c => c.class_id));
  return tourismActiveClassCodes_(ss)
    .filter(c => c.teacher_email == teacherEmail && classIds.has(c.class_id))
    .map(c => ({ code: String(c.code), class_id: String(c.class_id) }));
}

function tourismWaitingOf_(ss, teacherEmail) {
  return sheetToObjects(ensureTourismWaitingSheet_(ss))
    .filter(w => w.teacher_email == teacherEmail)
    .map(w => ({ email: String(w.email), name: String(w.name || ''), class_id: String(w.class_id || ''), joined_at: w.joined_at || '' }));
}

/** האם הקוד תפוס (פעיל) באחת משתי המערכות, אצל מישהו אחר מהכיתה הזו. */
function classCodeTakenAnywhere_(codeNorm, ownerTeacher, ownClassId) {
  const ss = SpreadsheetApp.openById(SHEETS.TOURISM);
  const tourismTaken = tourismActiveClassCodes_(ss).some(c =>
    bagrutNormalizeCode_(c.code) === codeNorm && !(c.teacher_email == ownerTeacher && String(c.class_id) === String(ownClassId)));
  if (tourismTaken) return true;
  const bss = SpreadsheetApp.openById(BAGRUT_SHEET_ID);
  return bagrutActiveClassCodes_(bss).some(c => bagrutNormalizeCode_(c.code) === codeNorm);
}

/** קובע (או מחליף) את קוד ההרשמה של כיתה. הקוד הקודם של הכיתה מסומן inactive. */
function setTourismClassCode({ verifiedEmail, class_id, code }) {
  requireRole(verifiedEmail, ['teacher', 'admin', 'school_admin']);
  const codeNorm = bagrutNormalizeCode_(code);
  if (!/^[a-z0-9א-ת\-]{4,20}$/.test(codeNorm)) throw new Error('הקוד צריך להיות 4-20 תווים: אותיות, ספרות או מקף, בלי רווחים');
  return withLock(() => {
    const ss = SpreadsheetApp.openById(SHEETS.TOURISM);
    const cls = sheetToObjects(ensureClassesSheet(ss)).find(c => c.class_id === class_id && c.teacher_email == verifiedEmail);
    if (!cls) throw new Error('כיתה לא נמצאה');
    if (classCodeTakenAnywhere_(codeNorm, verifiedEmail, class_id)) throw new Error('הקוד הזה כבר בשימוש. בחרו קוד אחר.');
    const sheet = ensureTourismClassCodesSheet_(ss);
    const rows = sheetToObjects(sheet);
    const statusIdx = getHeaders(sheet).indexOf('status');
    rows.forEach((r, i) => {
      if (r.teacher_email == verifiedEmail && String(r.class_id) === String(class_id) && String(r.status || 'active') === 'active') {
        sheet.getRange(i + 2, statusIdx + 1).setValue('inactive');
      }
    });
    appendRow(sheet, { code: codeNorm, class_id, teacher_email: verifiedEmail, status: 'active', created_date: new Date().toISOString() });
    return { code: codeNorm, class_id, class_codes: tourismClassCodesOf_(ss, verifiedEmail) };
  });
}

/**
 * נקרא מתוך registerBagrutStudent (שכבר מחזיקה את הנעילה ואימתה את הטוקן) כשהקוד לא נמצא
 * בתיירות לבגרות. מחזיר null אם גם כאן הקוד לא מוכר.
 */
function registerTourismWaitingLocked_(codeNorm, email, name) {
  const ss = SpreadsheetApp.openById(SHEETS.TOURISM);
  const match = tourismActiveClassCodes_(ss).find(c => bagrutNormalizeCode_(c.code) === codeNorm);
  if (!match) return null;
  const cls = sheetToObjects(ensureClassesSheet(ss)).find(c => c.class_id === match.class_id);
  if (!cls) return null; // הכיתה נמחקה: הקוד כבר לא תקף
  const className = String(cls.class_name || '');
  const emailNorm = stripInvisible_(email);

  const inGroup = sheetToObjects(ss.getSheetByName('groups')).some(g =>
    g.teacher_email == match.teacher_email && String(g.members || '').split(',').map(stripInvisible_).includes(emailNorm));
  if (inGroup) return { registered: false, already: true, class_name: className, name };

  const sheet = ensureTourismWaitingSheet_(ss);
  const waiting = sheetToObjects(sheet).find(w => stripInvisible_(w.email) === emailNorm && w.teacher_email == match.teacher_email);
  if (waiting) return { registered: false, already: true, waiting: true, class_name: className, name };

  appendRow(sheet, { email, name, class_id: match.class_id, teacher_email: match.teacher_email, joined_at: new Date().toISOString() });
  return { registered: true, waiting: true, class_name: className, name };
}

/** מוחק את התלמיד/ה מרשימת הממתינים של המורה (אחרי שיבוץ, או כשהמורה מוחק/ת ידנית). */
function removeFromTourismWaiting_(ss, teacherEmail, emails) {
  const sheet = ss.getSheetByName('class_waiting');
  if (!sheet) return;
  const targets = new Set(emails.map(stripInvisible_));
  const rows = sheetToObjects(sheet);
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].teacher_email == teacherEmail && targets.has(stripInvisible_(rows[i].email))) sheet.deleteRow(i + 2);
  }
}

function dismissWaitingStudent({ verifiedEmail, email }) {
  requireRole(verifiedEmail, ['teacher', 'admin', 'school_admin']);
  return withLock(() => {
    const ss = SpreadsheetApp.openById(SHEETS.TOURISM);
    removeFromTourismWaiting_(ss, verifiedEmail, [String(email || '')]);
    return { removed: true };
  });
}

/** תלמיד/ה שממתין/ה לשיבוץ (אצל מורה כלשהו). מחזיר את שם הכיתה, או null. */
function tourismWaitingClassName_(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEETS.TOURISM);
    const sheet = ss.getSheetByName('class_waiting');
    if (!sheet) return null;
    const emailNorm = stripInvisible_(email);
    const w = sheetToObjects(sheet).find(r => stripInvisible_(r.email) === emailNorm);
    if (!w) return null;
    const cls = sheetToObjects(ensureClassesSheet(ss)).find(c => c.class_id === w.class_id);
    return cls ? String(cls.class_name || '') : '';
  } catch (e) {
    return null;
  }
}
