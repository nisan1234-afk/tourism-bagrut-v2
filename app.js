const sidebar = document.getElementById('sidebar');
const menuButton = document.getElementById('menuButton');
const overlay = document.getElementById('overlay');
const loginDialog = document.getElementById('loginDialog');
const dialogText = document.getElementById('dialogText');
const KITA_PLUS_URL = 'https://nisan1234-afk.github.io/';

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

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-login-feature]');
  if (!trigger) return;
  event.preventDefault();
  const feature = trigger.dataset.loginFeature;
  dialogText.textContent = `כדי לפתוח את ${feature}, לשמור התקדמות ולקבל חוויה אישית — מתחברים דרך כיתה פלוס.`;
  if (loginDialog) loginDialog.showModal();
});

document.getElementById('dialogClose')?.addEventListener('click', () => loginDialog.close());
document.getElementById('continueGuest')?.addEventListener('click', () => loginDialog.close());
document.querySelector('.login-dialog .button-primary')?.addEventListener('click', () => {
  window.location.href = KITA_PLUS_URL;
});

