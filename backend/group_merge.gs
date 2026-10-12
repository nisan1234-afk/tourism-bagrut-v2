// ========== מיזוג קבוצות (תיירות דיגיטלית, 10.2026) ==========
// "חיבור בדיעבד": קבוצת המקור מצטרפת לקבוצת היעד. שום תוכן לא נמחק:
// - חברים: איחוד.
// - סעיפי הפרויקט (projects): לכל שדה, אם ביעד ריק לוקחים מהמקור; אם בשניהם יש תוכן שונה,
//   התוכן של המקור מצורף מתחת לזה של היעד עם כותרת שם הקבוצה.
// - תשובות ביחידות (lesson_answers): אותו כלל לכל בלוק (בבוחן נשאר היעד, זה רק מצב בחירה).
// - אתר: אם ביעד אין, לוקחים מהמקור.
// - היסטוריה (activity_log, chat_logs, files, findings): עוברת ליעד.
// בסוף שורת קבוצת המקור נמחקת.

function mergeGroups({ verifiedEmail, target_group_id, source_group_id }) {
  requireRole(verifiedEmail, ['teacher', 'admin', 'school_admin']);
  if (!target_group_id || !source_group_id || target_group_id == source_group_id) throw new Error('בחרו שתי קבוצות שונות');
  return withLock(() => {
    const ss = SpreadsheetApp.openById(SHEETS.TOURISM);
    const groupsSheet = ss.getSheetByName('groups');
    const groups = sheetToObjects(groupsSheet);
    const tIdx = groups.findIndex(g => g.group_id == target_group_id && g.teacher_email == verifiedEmail);
    const sIdx = groups.findIndex(g => g.group_id == source_group_id && g.teacher_email == verifiedEmail);
    if (tIdx === -1 || sIdx === -1) throw new Error('קבוצה לא נמצאה');
    const target = groups[tIdx], source = groups[sIdx];
    const sourceName = String(source.group_name || source.group_id);
    const sep = '\n\n— מהקבוצה ' + sourceName + ' —\n';

    // חברים + אתר
    const members = String(target.members || '').split(',').map(m => m.trim()).filter(Boolean);
    String(source.members || '').split(',').map(m => m.trim()).filter(Boolean).forEach(m => {
      if (!members.some(x => stripInvisible_(x) === stripInvisible_(m))) members.push(m);
    });
    const gUpdates = { members: members.join(',') };
    if (!String(target.site_name || '').trim() && String(source.site_name || '').trim()) {
      gUpdates.site_name = source.site_name; gUpdates.site_url = source.site_url || ''; gUpdates.site_score = source.site_score || '';
    }
    setRowFields_(groupsSheet, tIdx, gUpdates);

    mergeProjects_(ss, target_group_id, source_group_id, sep);
    mergeLessonAnswers_(ss, target_group_id, source_group_id, sep);

    // findings: עוברים ליעד, אלא אם ליעד כבר יש ממצא לאותו בלוק
    const fSheet = ss.getSheetByName('findings');
    if (fSheet) {
      const findings = sheetToObjects(fSheet);
      const targetBlocks = new Set(findings.filter(f => f.group_id == target_group_id).map(f => f.block_id));
      for (let i = findings.length - 1; i >= 0; i--) {
        if (findings[i].group_id != source_group_id) continue;
        if (targetBlocks.has(findings[i].block_id)) fSheet.deleteRow(i + 2);
        else setRowFields_(fSheet, i, { group_id: target_group_id });
      }
    }

    ['activity_log', 'chat_logs', 'files'].forEach(name => reassignGroupId_(ss.getSheetByName(name), source_group_id, target_group_id));

    groupsSheet.deleteRow(sIdx + 2);
    return { merged: true, group_id: target_group_id, members };
  });
}

/** כותב כמה עמודות בשורה אחת (rowIdx לפי sheetToObjects, כלומר בלי שורת הכותרת). */
function setRowFields_(sheet, rowIdx, fields) {
  const headers = getHeaders(sheet);
  Object.keys(fields).forEach(key => {
    const col = headers.indexOf(key) + 1;
    if (col > 0) sheet.getRange(rowIdx + 2, col).setValue(fields[key]);
  });
}

function reassignGroupId_(sheet, fromId, toId) {
  if (!sheet) return;
  const headers = getHeaders(sheet);
  const col = headers.indexOf('group_id') + 1;
  if (col < 1) return;
  const rows = sheetToObjects(sheet);
  rows.forEach((r, i) => { if (r.group_id == fromId) sheet.getRange(i + 2, col).setValue(toId); });
}

/** איחוד טקסט: ריק לוקח את השני, זהה נשאר, שונה מצורף מתחת. */
function mergeText_(a, b, sep) {
  const x = String(a == null ? '' : a), y = String(b == null ? '' : b);
  if (!y.trim() || x.trim() === y.trim()) return x;
  if (!x.trim()) return y;
  return x + sep + y;
}

/** סעיף שמור כ-JSON של שדות; ממזגים שדה-שדה. אם אחד מהם לא JSON, ממזגים כטקסט. */
function mergeSectionJson_(a, b, sep) {
  if (!String(b || '').trim()) return a;
  if (!String(a || '').trim()) return b;
  let ja, jb;
  try { ja = JSON.parse(a); jb = JSON.parse(b); } catch (e) { return mergeText_(a, b, sep); }
  if (!ja || !jb || typeof ja !== 'object' || typeof jb !== 'object') return mergeText_(a, b, sep);
  Object.keys(jb).forEach(k => { ja[k] = mergeText_(ja[k], jb[k], sep); });
  return JSON.stringify(ja);
}

function mergeProjects_(ss, targetId, sourceId, sep) {
  const sheet = ss.getSheetByName('projects');
  if (!sheet) return;
  const rows = sheetToObjects(sheet);
  const tIdx = rows.findIndex(p => p.group_id == targetId);
  const sIdx = rows.findIndex(p => p.group_id == sourceId);
  if (sIdx === -1) return;
  if (tIdx === -1) { setRowFields_(sheet, sIdx, { group_id: targetId }); return; }
  const t = rows[tIdx], s = rows[sIdx];
  const updates = {};
  for (let i = 1; i <= 8; i++) {
    const k = 'section_' + i;
    const merged = mergeSectionJson_(t[k], s[k], sep);
    if (merged !== t[k]) updates[k] = merged;
    ['_teacher', '_comment'].forEach(suffix => {
      const key = k + suffix;
      const tv = String(t[key] || '').trim();
      if ((!tv || tv === '{}') && String(s[key] || '').trim()) updates[key] = s[key];
    });
  }
  updates.last_updated = new Date().toISOString();
  setRowFields_(sheet, tIdx, updates);
  sheet.deleteRow(sIdx + 2);
}

function mergeLessonAnswers_(ss, targetId, sourceId, sep) {
  const sheet = ss.getSheetByName('lesson_answers');
  if (!sheet) return;
  const blocks = getLessonBlocksCached_(ss);
  const rows = sheetToObjects(sheet);
  const toDelete = [];
  rows.forEach((s, i) => {
    if (s.group_id != sourceId) return;
    const tIdx = rows.findIndex(r => r.group_id == targetId && r.block_id === s.block_id);
    if (tIdx === -1) { setRowFields_(sheet, i, { group_id: targetId }); return; }
    const block = blocks.find(b => b.block_id === s.block_id);
    const isQuiz = block && block.block_type === 'quiz';
    const t = rows[tIdx];
    if (!isQuiz) {
      const merged = mergeText_(t.answer_text, s.answer_text, sep);
      if (merged !== t.answer_text) setRowFields_(sheet, tIdx, { answer_text: merged, updated_at: new Date().toISOString() });
      if (t.score === '' && s.score !== '') setRowFields_(sheet, tIdx, { score: s.score, score_feedback: s.score_feedback || '' });
    }
    toDelete.push(i);
  });
  toDelete.sort((a, b) => b - a).forEach(i => sheet.deleteRow(i + 2));
}
