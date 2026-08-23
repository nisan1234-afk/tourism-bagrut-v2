const steps = ['overview', 'north', 'carmel', 'telaviv', 'south', 'presentation', 'practice'];
const completed = new Set(JSON.parse(localStorage.getItem('coastal-demo-progress') || '[]'));
const meter = document.getElementById('unitMeter');
const percent = document.getElementById('unitPercent');

function renderProgress() {
  const value = Math.round((completed.size / steps.length) * 100);
  meter.style.width = `${value}%`;
  percent.textContent = `${value}%`;
  document.querySelectorAll('.lesson-nav a').forEach((link) => link.classList.toggle('completed', completed.has(link.dataset.step)));
  document.querySelectorAll('[data-complete]').forEach((button) => {
    const done = completed.has(button.dataset.complete);
    button.classList.toggle('is-complete', done);
    button.textContent = done ? 'החלק הושלם ✓' : 'סיימתי את החלק הזה';
  });
}

document.querySelectorAll('[data-complete]').forEach((button) => button.addEventListener('click', () => {
  completed.add(button.dataset.complete);
  localStorage.setItem('coastal-demo-progress', JSON.stringify([...completed]));
  renderProgress();
}));

const slides = [
  { section: 'מישור החוף', title: 'גיאוגרפיה ונוף', body: 'רצועה מישורית מראש הנקרה ועד רצועת עזה · אורך 190 ק״מ · רוחב 4–40 ק״מ', accent: 'מסע מצפון לדרום' },
  { section: 'החוף הצפוני', title: 'ראש הנקרה ועכו', body: 'נקרות בסלע הגיר, עיר צלבנית תת־קרקעית ומורשת עות׳מאנית מעל הקרקע.', accent: 'טבע ומורשת' },
  { section: 'חיפה והכרמל', title: 'קדושה ונוף', body: 'הגנים הבהאיים, מערת אליהו, מנזר סטלה מאריס והכפרים הדרוזיים.', accent: 'מפגש בין דתות' },
  { section: 'קיסריה', title: 'עיר הורדוס', body: 'תיאטרון רומי, אמת מים, היפודרום וארמון על קו הים.', accent: 'ארכאולוגיה חיה' },
  { section: 'תל אביב–יפו', title: 'ישן וחדש', body: 'נמל יפו, נווה צדק, העיר הלבנה ומרכז התרבות העירונית של ישראל.', accent: 'עיר ללא הפסקה' },
  { section: 'החוף הדרומי', title: 'אשקלון ובית גוברין', body: 'שער כנעני קדום, חוף ים וארץ אלף המערות.', accent: 'מסיימים בדרום' }
];
let slideIndex = 0;
const stage = document.getElementById('slideStage');
function renderSlide() {
  const slide = slides[slideIndex];
  stage.innerHTML = `<div class="web-slide"><span>${slide.section}</span><h3>${slide.title}</h3><p>${slide.body}</p><b>${slide.accent}</b></div>`;
  document.getElementById('slideCounter').textContent = `${slideIndex + 1} / ${slides.length}`;
  document.getElementById('prevSlide').disabled = slideIndex === 0;
  document.getElementById('nextSlide').disabled = slideIndex === slides.length - 1;
  if (slideIndex === slides.length - 1) {
    const finish = document.getElementById('completeSlides');
    finish.disabled = false;
    finish.textContent = 'סיימתי את המצגת';
  }
}
document.getElementById('nextSlide').addEventListener('click', () => { if (slideIndex < slides.length - 1) { slideIndex += 1; renderSlide(); } });
document.getElementById('prevSlide').addEventListener('click', () => { if (slideIndex > 0) { slideIndex -= 1; renderSlide(); } });
document.getElementById('fullScreenSlide').addEventListener('click', () => document.getElementById('slidePlayer').requestFullscreen?.());
document.getElementById('completeSlides').addEventListener('click', () => { completed.add('presentation'); localStorage.setItem('coastal-demo-progress', JSON.stringify([...completed])); renderProgress(); });

const questions = [
  { q: 'מה מאפיין חוף צבירה?', a: ['חוף רחב, ישר וחולי', 'מצוק גיר ובו נקרות', 'לוחות גידוד בלבד'], correct: 0, explain: 'חוף צבירה אופייני לחלק הדרומי והוא רחב, ישר וחולי.' },
  { q: 'מה זיכה את העיר הלבנה בהכרה של UNESCO?', a: ['ריכוז מבני באוהאוס ותכנון עיר גנים', 'נמל הדייגים העתיק', 'מגדל השעון העות׳מאני'], correct: 0, explain: 'הריכוז הגדול של מבנים בסגנון הבינלאומי ותכנון עיר הגנים הם עיקר הייחוד.' },
  { q: 'איזה אתר מכונה ״ארץ אלף המערות״?', a: ['תל אשקלון', 'בית גוברין', 'קיסריה'], correct: 1, explain: 'בית גוברין מוכר בזכות מערות הפעמון, הקולומבריום ומערכות החציבה.' }
];
let questionIndex = 0;
let correctAnswers = 0;
function renderQuestion() {
  const item = questions[questionIndex];
  document.querySelector('.quiz-kicker').textContent = `שאלה ${questionIndex + 1} מתוך ${questions.length}`;
  document.getElementById('questionText').textContent = item.q;
  const list = document.getElementById('answerList');
  list.innerHTML = '';
  item.a.forEach((answer, index) => {
    const button = document.createElement('button');
    button.textContent = answer;
    button.addEventListener('click', () => checkAnswer(index, button));
    list.appendChild(button);
  });
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('nextQuestion').disabled = true;
}
function checkAnswer(index, button) {
  const item = questions[questionIndex];
  document.querySelectorAll('#answerList button').forEach((choice) => { choice.disabled = true; });
  button.classList.add(index === item.correct ? 'correct' : 'wrong');
  if (index === item.correct) correctAnswers += 1;
  document.getElementById('quizFeedback').textContent = item.explain;
  document.getElementById('nextQuestion').disabled = false;
}
document.getElementById('nextQuestion').addEventListener('click', () => {
  if (questionIndex < questions.length - 1) { questionIndex += 1; renderQuestion(); return; }
  const score = Math.round((correctAnswers / questions.length) * 100);
  document.getElementById('quizCard').innerHTML = `<span class="eyebrow">התרגול הסתיים</span><h3>הציון שלך: ${score}</h3><p>${score >= 60 ? 'עברת את שלב התרגול. כל הכבוד.' : 'כדאי לחזור על החומר ולנסות שוב.'}</p>`;
  if (score >= 60) { completed.add('practice'); localStorage.setItem('coastal-demo-progress', JSON.stringify([...completed])); renderProgress(); }
});

const rail = document.getElementById('lessonRail');
document.getElementById('railButton').addEventListener('click', () => rail.classList.toggle('open'));
renderProgress();
renderSlide();
renderQuestion();

