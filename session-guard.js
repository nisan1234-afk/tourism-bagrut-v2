/* שומר סשן: טוקן Google ID תקף כשעה. הקובץ הזה נטען בכל דף אחרי שער הכניסה,
 * ומטפל במה שהשער לא בודק: טוקן שכבר פג (הפניה להאב עם חזרה לאותו דף),
 * והתראה 3 דקות לפני הפקיעה כדי שהתלמיד ישמור ויתחבר מחדש בלי לאבד עבודה. */
(function () {
  var HUB = 'https://nisan1234-afk.github.io/';

  function parseToken(token) {
    try {
      var payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (payload.length % 4) payload += '=';
      return JSON.parse(atob(payload));
    } catch (_) {
      return {};
    }
  }
  function getUser() {
    try {
      return JSON.parse(sessionStorage.getItem('kitahUser') || 'null');
    } catch (_) {
      return null;
    }
  }
  function expiresAt() {
    var user = getUser();
    if (!user || !user.token) return 0;
    var exp = parseToken(user.token).exp;
    return exp ? exp * 1000 : 0;
  }
  function relogin() {
    sessionStorage.removeItem('kitahUser');
    location.replace(HUB + '?return=' + encodeURIComponent(location.href));
  }
  function showBanner(text) {
    if (!document.body) {
      // הסקריפט נטען ב-<head>; אם הטיימר פג לפני שה-body קיים, מחכים ל-DOM
      document.addEventListener('DOMContentLoaded', function () { showBanner(text); }, { once: true });
      return;
    }
    var banner = document.getElementById('sessionExpiryBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'sessionExpiryBanner';
      banner.className = 'session-expiry-banner';
      banner.setAttribute('role', 'status');
      var span = document.createElement('span');
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'כניסה מחדש';
      button.addEventListener('click', relogin);
      banner.appendChild(span);
      banner.appendChild(button);
      document.body.appendChild(banner);
    }
    banner.querySelector('span').textContent = text;
  }

  var expMs = expiresAt();
  if (expMs && expMs < Date.now()) {
    relogin();
    return;
  }
  if (expMs) {
    var untilExpiry = expMs - Date.now();
    setTimeout(function () {
      showBanner('הכניסה שלך עומדת לפוג בעוד כמה דקות. שמרו את מה שכתבתם והיכנסו מחדש.');
    }, Math.max(0, untilExpiry - 3 * 60 * 1000));
    setTimeout(function () {
      showBanner('הכניסה פגה. כדי לשמור תשובות יש להיכנס מחדש.');
    }, Math.max(0, untilExpiry));
  }

  window.kitahSession = {
    user: getUser,
    isExpired: function () {
      var e = expiresAt();
      return !!e && e < Date.now();
    },
    relogin: relogin,
  };
})();
