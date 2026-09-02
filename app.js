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

function renderLastVisit() {
  let last = null;
  try { last = JSON.parse(localStorage.getItem('tourismLastVisit') || 'null'); } catch (_) { /* ignore */ }
  const resumeButton = document.getElementById('resumeButton');
  const journeySection = document.getElementById('journeySection');
  if (!last || !last.file) return;
  const href = 'units/' + last.file + (last.hash ? '#' + last.hash : '');
  if (resumeButton) {
    resumeButton.textContent = '';
    resumeButton.append('המשך ב' + last.label + ' ');
    const arrow = document.createElement('span');
    arrow.textContent = '←';
    resumeButton.appendChild(arrow);
    resumeButton.addEventListener('click', () => { location.href = href; });
  }
  if (journeySection) {
    const pct = last.pageTotal ? Math.round(((last.pageIndex + 1) / last.pageTotal) * 100) : 0;
    journeySection.hidden = false;
    journeySection.querySelector('#journeyUnitName').textContent = last.label;
    journeySection.querySelector('#journeyPageInfo').textContent = (last.pageLabel || '') + ' · דף ' + (last.pageIndex + 1) + ' מתוך ' + last.pageTotal;
    journeySection.querySelector('#journeyPercent').textContent = pct + '%';
    journeySection.querySelector('#journeyMeterBar').style.width = pct + '%';
    const resumeBtn = journeySection.querySelector('#journeyResumeBtn');
    if (resumeBtn) resumeBtn.addEventListener('click', () => { location.href = href; });
  }
}

renderLastVisit();

function renderUnitGrid() {
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem('tourismUnitProgress') || '{}'); } catch (_) { /* ignore */ }
  document.querySelectorAll('.unit-card[data-unit-id]').forEach((card) => {
    const rec = progress[card.dataset.unitId];
    const bar = card.querySelector('[data-mini-bar]');
    const label = card.querySelector('[data-mini-label]');
    if (!rec || !rec.pageTotal) { card.dataset.status = 'new'; return; }
    const pct = Math.round(((rec.pageIndex + 1) / rec.pageTotal) * 100);
    const done = rec.pageIndex + 1 >= rec.pageTotal;
    card.dataset.status = done ? 'done' : 'progress';
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = done ? 'הושלם' : pct + '%';
  });
}

function applyUnitFilter(filter) {
  const cards = document.querySelectorAll('.unit-card[data-unit-id]');
  let visibleCount = 0;
  cards.forEach((card) => {
    const status = card.dataset.status || 'new';
    const show = filter === 'all' || (filter === 'progress' && status === 'progress') || (filter === 'done' && status === 'done');
    card.hidden = !show;
    if (show) visibleCount++;
  });
  const empty = document.getElementById('unitFilterEmpty');
  if (empty) empty.hidden = visibleCount > 0;
}

function setupUnitFilters() {
  const buttons = document.querySelectorAll('.view-switch button[data-filter]');
  buttons.forEach((btn) => btn.addEventListener('click', () => {
    buttons.forEach((b) => b.classList.toggle('selected', b === btn));
    applyUnitFilter(btn.dataset.filter);
  }));
}

function setupUnitSearch() {
  const toggle = document.getElementById('searchToggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    let input = document.getElementById('unitSearchInput');
    if (input) { input.focus(); return; }
    input = document.createElement('input');
    input.type = 'search';
    input.id = 'unitSearchInput';
    input.className = 'topbar-search-input';
    input.placeholder = 'חיפוש יחידה…';
    input.addEventListener('input', () => {
      const q = input.value.trim();
      document.querySelectorAll('.unit-card[data-unit-id]').forEach((card) => {
        const title = card.querySelector('h3')?.textContent || '';
        card.hidden = Boolean(q) && !title.includes(q);
      });
      const empty = document.getElementById('unitFilterEmpty');
      if (empty) empty.hidden = document.querySelectorAll('.unit-card[data-unit-id]:not([hidden])').length > 0;
    });
    toggle.replaceWith(input);
    input.focus();
  });
}

renderUnitGrid();
setupUnitFilters();
setupUnitSearch();

