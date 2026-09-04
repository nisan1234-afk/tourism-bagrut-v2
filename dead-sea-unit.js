(() => {
  const API =
    'https://script.google.com/macros/s/AKfycbwf3-MNZBBi64zXcNH7wfhBRoEBl9brtQ9QRI4Won5RmUIOrl_WBivN6uI5NAp6Mc0h/exec';
  window.API = API;
  const pages = ['overview', 'north', 'center', 'south', 'images', 'presentation', 'practice'],
    $ = (id) => document.getElementById(id),
    state = JSON.parse(localStorage.getItem('dead-sea-progress') || '{"done":[]}');
  let current = Math.max(0, pages.indexOf(location.hash.slice(1)));
  function save() {
    localStorage.setItem('dead-sea-progress', JSON.stringify(state));
    progress();
  }
  function progress() {
    const n = Math.round((state.done.length / pages.length) * 100);
    $('unitPercent').textContent = n + '%';
    $('unitMeter').style.width = n + '%';
    document
      .querySelectorAll('[data-page]')
      .forEach((b) => b.classList.toggle('done', state.done.includes(b.dataset.page)));
  }
  function show(i) {
    current = Math.max(0, Math.min(pages.length - 1, i));
    const id = pages[current];
    document.querySelectorAll('[data-page-panel]').forEach((p) => (p.hidden = p.dataset.pagePanel !== id));
    document.querySelectorAll('[data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === id));
    $('pageCounter').textContent = 'דף ' + (current + 1) + ' מתוך ' + pages.length;
    $('prevPage').disabled = current === 0;
    $('nextPage').disabled = current === pages.length - 1;
    history.replaceState(null, '', '#' + id);
    try {
      localStorage.setItem(
        'tourismLastVisit',
        JSON.stringify({
          unitId: 'yam_hamelach',
          label: 'ים המלח ומדבר יהודה',
          file: 'dead-sea.html',
          hash: id,
          pageIndex: current,
          pageTotal: pages.length,
          pageLabel: (document.querySelector('[data-page="' + id + '"]')?.textContent || id)
            .trim()
            .replace(/^\d+\.\s*/, ''),
          ts: Date.now(),
        })
      );
      const tuMap = JSON.parse(localStorage.getItem('tourismUnitProgress') || '{}');
      tuMap['yam_hamelach'] = { pageIndex: current, pageTotal: pages.length, ts: Date.now() };
      localStorage.setItem('tourismUnitProgress', JSON.stringify(tuMap));
    } catch (_) {}
    scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('[data-page]').forEach(
    (b) =>
      (b.onclick = () => {
        show(pages.indexOf(b.dataset.page));
        $('unitRail').classList.remove('open');
      })
  );
  document.querySelectorAll('.complete-page').forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.closest('[data-page-panel]').dataset.pagePanel;
        if (!state.done.includes(id)) state.done.push(id);
        save();
        if (current < pages.length - 1) show(current + 1);
      })
  );
  $('prevPage').onclick = () => show(current - 1);
  $('nextPage').onclick = () => show(current + 1);
  $('menuToggle').onclick = () => $('unitRail').classList.toggle('open');
  const seen = new Set(JSON.parse(localStorage.getItem('dead-sea-images') || '[]'));
  document.querySelectorAll('[data-recognition]').forEach((card) => {
    if (seen.has(card.dataset.recognition)) card.classList.add('revealed');
    card.onclick = () => {
      card.classList.add('revealed');
      seen.add(card.dataset.recognition);
      localStorage.setItem('dead-sea-images', JSON.stringify([...seen]));
    };
  });
  const slides = [
    ['בקע וצל גשם', 'ים המלח הוא הנקודה היבשתית הנמוכה בעולם', 'image56.jpg'],
    ['צפון האזור', 'קאסר אל־יהוד, נבי מוסא, קרנטל וקומראן', 'image51.png'],
    ['נווה מדבר', 'עין גדי מחברת מים, טבע והתיישבות קדומה', 'image53.png'],
    ['מבצר במדבר', 'מצדה: הורדוס, המרד הגדול ומערכת מים', 'image52.png'],
    ['מלח ומרפא', 'מינרלים, בוץ, שמש ואוויר כבסיס לתיירות מרפא', 'image55.png'],
    ['האתגר', 'ירידת מפלס, בולענים ופיתוח תיירותי אחראי', 'image50.jpg'],
  ];
  let slide = 0;
  function renderSlide() {
    const s = slides[slide];
    $('deadSeaSlideStage').innerHTML =
      '<article class="region-slide"><div><span>ים המלח ומדבר יהודה</span><h3>' +
      s[0] +
      '</h3><p>' +
      s[1] +
      '</p></div><img src="https://nisan1234-afk.github.io/jerusalem-tour/images/' +
      s[2] +
      '" alt=""></article>';
    $('deadSeaSlideCount').textContent = slide + 1 + ' / ' + slides.length;
  }
  $('deadSeaPrevSlide').onclick = () => {
    slide = (slide - 1 + slides.length) % slides.length;
    renderSlide();
  };
  $('deadSeaNextSlide').onclick = () => {
    slide = (slide + 1) % slides.length;
    renderSlide();
  };
  $('deadSeaFullscreen').onclick = () => document.querySelector('.slide-deck').requestFullscreen?.();
  renderSlide();
  const practice = [
    'הסבירו את הקשר בין הבקע הסורי־אפריקאי, מצוק ההעתקים וים המלח.',
    'הציעו מסלול יום המשלב אתר מורשת, אתר טבע ואתר דתי באזור. נמקו את הסדר.',
    'הציגו שלושה גורמים שהפכו את ים המלח למוקד של תיירות מרפא.',
    'השוו בין מצדה לקומראן מבחינת התקופה, הממצאים והעניין לתייר.',
    'הסבירו כיצד ירידת מפלס ים המלח משפיעה על התיירות ועל התשתיות.',
  ];
  $('deadSeaPractice').innerHTML =
    '<article class="exam-question"><h3>שאלות חזרה מסכמות</h3>' +
    practice
      .map(
        (q, i) =>
          '<div class="exam-part"><label><b>' +
          (i + 1) +
          '.</b> ' +
          q +
          '</label><textarea data-question="' +
          q +
          '" data-key="practice-' +
          i +
          '"></textarea><button class="check-exam">בדיקת התשובה</button><div class="answer-feedback"></div></div>'
      )
      .join('') +
    '</article>';
  async function submit(textarea, feedback) {
    const answer = textarea.value.trim();
    if (answer.split(/\s+/).length < 10) {
      feedback.textContent = 'כדאי לכתוב תשובה מלאה ומנומקת יותר.';
      feedback.className = 'answer-feedback needs-work';
      return;
    }
    const session = JSON.parse(sessionStorage.getItem('kitahUser') || 'null');
    if (!session?.token) {
      localStorage.setItem('dead-sea-' + (textarea.dataset.key || textarea.dataset.openQuestion), answer);
      feedback.textContent = 'נשמר במכשיר. לאחר התחברות התשובה תוכל להישמר גם למורה.';
      feedback.className = 'answer-feedback local';
      return;
    }
    feedback.textContent = 'בודק את התשובה…';
    try {
      const r = await fetch(window.API, {
          method: 'POST',
          body: JSON.stringify({
            action: 'submitOpenAnswer',
            token: session.token,
            unit_id: 'yam_hamelach',
            question: textarea.dataset.question || textarea.dataset.openQuestion,
            answer,
          }),
        }),
        d = await r.json();
      if (!d.ok) throw new Error(d.error || 'שגיאה');
      feedback.textContent = d.data?.feedback || 'התשובה נשלחה ונשמרה.';
      feedback.className = 'answer-feedback success';
    } catch (e) {
      feedback.textContent = 'הבדיקה אינה זמינה כרגע; התשובה נשמרה במכשיר.';
      feedback.className = 'answer-feedback local';
      localStorage.setItem('dead-sea-' + (textarea.dataset.key || textarea.dataset.openQuestion), answer);
    }
  }
  document.querySelectorAll('.check-open,.check-exam').forEach(
    (b) =>
      (b.onclick = () => {
        const box = b.parentElement;
        submit(box.querySelector('textarea'), box.querySelector('.answer-feedback'));
      })
  );
  progress();
  show(current);
})();

/* ===== "המאמן שלי לבגרות" — צ'אט עזרה, עונה אך ורק מתוך חומר הלימוד (askBagrutBot, endpoint פתוח בלי login) ===== */
async function callBagrutBot(question, mode, bagrutQuestion) {
  let res, data;
  try {
    res = await fetch(window.API, {
      method: 'POST',
      body: JSON.stringify({
        action: 'askBagrutBot',
        question,
        mode: mode || 'qa',
        bagrut_question: bagrutQuestion || '',
      }),
    });
    data = await res.json();
  } catch (netErr) {
    throw new Error('אין חיבור לשרת כרגע, נסו שוב בעוד רגע');
  }
  if (!data.ok) throw new Error(data.error || 'שגיאה');
  return data.data.reply;
}
function toggleCoachWidget(open) {
  document.getElementById('coachWidget')?.classList.toggle('open', open);
}
function appendCoachMsg(role, text) {
  const log = document.getElementById('coachLog');
  if (!log) return null;
  const div = document.createElement('div');
  div.className = 'coach-msg coach-msg-' + role;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}
async function sendCoachQuestion(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('coachInput'),
    q = input.value.trim();
  if (!q) return;
  input.value = '';
  appendCoachMsg('user', q);
  const pending = appendCoachMsg('bot', '...חושב, רגע');
  try {
    pending.textContent = await callBagrutBot(q, 'qa', '');
  } catch (err) {
    pending.textContent = 'שגיאה: ' + err.message;
  }
}
