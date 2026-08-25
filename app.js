const sidebar = document.getElementById('sidebar');
const menuButton = document.getElementById('menuButton');
const overlay = document.getElementById('overlay');

function getKitahUser() {
  try { return JSON.parse(sessionStorage.getItem('kitahUser') || 'null'); }
  catch (_) { return null; }
}

function isStaffUser(user) {
  if (!user) return false;
  const roles = user.roles || [user.role];
  return roles.some((role) => ['admin', 'school_admin', 'teacher', 'homeroom'].includes(role));
}

document.querySelectorAll('.teacher-only-link').forEach((link) => {
  link.hidden = !isStaffUser(getKitahUser());
});

function setMenu(open) {
  sidebar.classList.toggle('open', open);
  overlay.classList.toggle('show', open);
  menuButton.setAttribute('aria-expanded', String(open));
}

if (menuButton && sidebar) menuButton.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
if (overlay) overlay.addEventListener('click', () => setMenu(false));

const REVIEW_API = 'https://script.google.com/macros/s/AKfycbwf3-MNZBBi64zXcNH7wfhBRoEBl9brtQ9QRI4Won5RmUIOrl_WBivN6uI5NAp6Mc0h/exec';

function escapeReviewText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function reviewApi(action, params = {}) {
  const user = getKitahUser();
  const res = await fetch(REVIEW_API, { method: 'POST', body: JSON.stringify({ action, token: user?.token, ...params }) });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'שגיאה');
  return data.data;
}

function showReviewNotice(notices) {
  if (!notices.length) return;
  const [notice, ...rest] = notices;
  const approved = notice.status === 'approved';
  const box = document.createElement('div');
  box.className = 'review-notice-banner';
  box.innerHTML = `<div class="review-notice-card">
    <span>המורה בדק/ה תשובה שלך</span>
    <h3>${approved ? 'התשובה אושרה ✓' : 'התשובה הוחזרה לתיקון'}</h3>
    ${notice.question ? `<p>${escapeReviewText(notice.question)}</p>` : ''}
    ${notice.teacher_note ? `<blockquote>${escapeReviewText(notice.teacher_note)}</blockquote>` : ''}
    <button type="button" class="button button-primary" data-ack-notice>הבנתי</button>
  </div>`;
  document.body.appendChild(box);
  box.querySelector('[data-ack-notice]').addEventListener('click', async () => {
    box.remove();
    try { await reviewApi('ackReviewNotice', { answer_key: notice.answer_key }); } catch (_) { /* לא חוסם UX */ }
    showReviewNotice(rest);
  });
}

async function checkReviewNotices() {
  const user = getKitahUser();
  if (!user?.token) return;
  try {
    const data = await reviewApi('getMyReviewNotices');
    showReviewNotice(data.notices || []);
  } catch (_) { /* שקט — לא חוסם את הדף */ }
}

checkReviewNotices();

