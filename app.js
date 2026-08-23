const sidebar = document.getElementById('sidebar');
const menuButton = document.getElementById('menuButton');
const overlay = document.getElementById('overlay');
const loginDialog = document.getElementById('loginDialog');
const dialogText = document.getElementById('dialogText');

function setMenu(open) {
  sidebar.classList.toggle('open', open);
  overlay.classList.toggle('show', open);
  menuButton.setAttribute('aria-expanded', String(open));
}

menuButton.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
overlay.addEventListener('click', () => setMenu(false));

document.querySelectorAll('[data-login-feature]').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    const feature = trigger.dataset.loginFeature;
    dialogText.textContent = `כדי לפתוח את ${feature}, לשמור התקדמות ולקבל חוויה אישית — מתחברים דרך כיתה פלוס.`;
    loginDialog.showModal();
  });
});

document.getElementById('dialogClose').addEventListener('click', () => loginDialog.close());
document.getElementById('continueGuest').addEventListener('click', () => loginDialog.close());

