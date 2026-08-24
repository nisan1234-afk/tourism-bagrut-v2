(() => {
  const API = 'https://script.google.com/macros/s/AKfycbwf3-MNZBBi64zXcNH7wfhBRoEBl9brtQ9QRI4Won5RmUIOrl_WBivN6uI5NAp6Mc0h/exec';
  const pages = ['overview','heritage','water','settlement','images','presentation','practice'];
  const state = JSON.parse(localStorage.getItem('valleys-progress') || '{"done":[]}');
  const $ = id => document.getElementById(id);
  let current = Math.max(0, pages.indexOf(location.hash.slice(1)));

  function save(){ localStorage.setItem('valleys-progress', JSON.stringify(state)); renderProgress(); }
  function renderProgress(){
    const value = Math.round((state.done.length / pages.length) * 100);
    $('unitPercent').textContent = value + '%'; $('unitMeter').style.width = value + '%';
    document.querySelectorAll('[data-page]').forEach(b => b.classList.toggle('done', state.done.includes(b.dataset.page)));
  }
  function show(index){
    current = Math.max(0, Math.min(pages.length - 1, index));
    const id = pages[current];
    document.querySelectorAll('[data-page-panel]').forEach(p => p.hidden = p.dataset.pagePanel !== id);
    document.querySelectorAll('[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === id));
    $('pageCounter').textContent = `דף ${current + 1} מתוך ${pages.length}`;
    $('prevPage').disabled = current === 0; $('nextPage').disabled = current === pages.length - 1;
    history.replaceState(null, '', '#' + id); document.querySelector('.unit-main').scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => show(pages.indexOf(b.dataset.page)));
  document.querySelectorAll('.complete-page').forEach(b => b.onclick = () => { const id=b.closest('[data-page-panel]').dataset.pagePanel; if(!state.done.includes(id)) state.done.push(id); save(); if(current < pages.length-1) show(current+1); });
  $('prevPage').onclick=()=>show(current-1); $('nextPage').onclick=()=>show(current+1);
  $('menuToggle').onclick=()=>$('unitRail').classList.toggle('open');

  const recognized = new Set(JSON.parse(localStorage.getItem('valleys-images') || '[]'));
  document.querySelectorAll('[data-recognition]').forEach(card => {
    if(recognized.has(card.dataset.recognition)) card.classList.add('revealed');
    card.onclick=()=>{ card.classList.add('revealed'); recognized.add(card.dataset.recognition); localStorage.setItem('valleys-images',JSON.stringify([...recognized])); };
  });

  const slides = [
    ['שלושה עמקים','יזרעאל במערב • חרוד במרכז • בית שאן במזרח','image107.jpg'],
    ['צומת דרכים היסטורי','מגידו שלטה על מעבר עירון ועל דרך הים','image114.jpg'],
    ['עיר רומית בעמק','בית שאן מציגה תיאטרון, רחובות עמודים ובתי מרחץ','image109.jpg'],
    ['מים למרגלות הגלבוע','גן השלושה ופארק המעיינות הם בסיס לתיירות נופש וטבע','image111.jpg'],
    ['התיישבות וחלוציות','נהלל, חומה ומגדל, רכבת העמק ונהריים'],
    ['מסכמים','נוף + דרכים + מים = חקלאות, יישוב ותיירות']
  ];
  let slide=0;
  function renderSlide(){ const [h,p,img]=slides[slide]; $('valleySlideStage').innerHTML=`${img?`<img src="https://nisan1234-afk.github.io/jerusalem-tour/images/${img}" alt="">`:''}<div><small>העמקים</small><h3>${h}</h3><p>${p}</p></div>`; $('valleySlideCount').textContent=`${slide+1} / ${slides.length}`; }
  $('valleyPrevSlide').onclick=()=>{slide=(slide-1+slides.length)%slides.length;renderSlide()};
  $('valleyNextSlide').onclick=()=>{slide=(slide+1)%slides.length;renderSlide()};
  $('valleyFullscreen').onclick=()=>document.querySelector('.slide-deck').requestFullscreen?.(); renderSlide();

  const exams = [
    {title:'שאלת בגרות — היכרות עם החבל', parts:[
      'ציינו את שמות שלושת העמקים המרכיבים את חבל העמקים.',
      'הציגו צורת התיישבות כפרית אחת האופיינית לאזור והסבירו את מאפייניה.',
      'ציינו שתי ערים באזור והציגו תפקיד תיירותי או אזורי של כל אחת.',
      'הציגו שני אתרי תיירות המבוססים על מים.',
      'הציגו אתר תיירות אחד שאינו מבוסס על מים.',
      'הסבירו כיצד תנאי השטח תרמו להתפתחות החקלאות באזור.'
    ]},
    {title:'שאלת בגרות — תכנון מסלול', parts:[
      'בחרו שני אתרים ארכיאולוגיים בחבל העמקים ותארו את הייחוד של כל אחד.',
      'בחרו שני אתרי טבע בחבל ותארו את הייחוד של כל אחד.',
      'הציעו מסלול יום לקבוצת תלמידים הכולל שלושה אתרים מסוגים שונים.',
      'הסבירו את סדר האתרים שבחרתם במסלול.',
      'שלבו במסלול אתר הקשור לתולדות ההתיישבות והסבירו את תרומתו.',
      'הציעו פעילות מסכמת שבאמצעותה תבדקו מה הקבוצה למדה.'
    ]}
  ];
  $('valleyExamBank').innerHTML = exams.map((q,qi)=>`<article class="exam-question"><h3>${q.title}</h3>${q.parts.map((p,pi)=>`<div class="exam-part"><label><b>${String.fromCharCode(1488+pi)}.</b> ${p}</label><textarea data-exam="${qi}-${pi}" data-question="${p}"></textarea><button class="check-exam">בדיקת הסעיף</button><div class="answer-feedback"></div></div>`).join('')}</article>`).join('');

  async function submit(textarea, feedback){
    const answer=textarea.value.trim(); if(answer.length<12){feedback.textContent='כדאי לכתוב תשובה מלאה ומנומקת יותר.';feedback.className='answer-feedback needs-work';return;}
    feedback.textContent='בודק את התשובה…'; feedback.className='answer-feedback loading';
    const session=JSON.parse(sessionStorage.getItem('kitaPlusUser')||'null');
    if(!session){feedback.textContent='התשובה נשמרה במכשיר. התחברו כדי לקבל בדיקת בוט ולשמור למורה.';feedback.className='answer-feedback local';localStorage.setItem('valley-answer-'+(textarea.dataset.exam||textarea.dataset.openQuestion),answer);return;}
    try{
      const params=new URLSearchParams({action:'submitOpenAnswer',unit_id:'haamakim',question:textarea.dataset.question||textarea.dataset.openQuestion,answer});
      const res=await fetch(API+'?'+params); const data=await res.json();
      feedback.textContent=data.feedback||data.message||'התשובה נשלחה ונשמרה לבדיקה.'; feedback.className='answer-feedback success';
    }catch(e){feedback.textContent='התשובה נשמרה במכשיר ותישלח בחיבור הבא.';feedback.className='answer-feedback local';localStorage.setItem('valley-answer-'+(textarea.dataset.exam||textarea.dataset.openQuestion),answer);}
  }
  document.querySelectorAll('.check-open,.check-exam').forEach(b=>b.onclick=()=>{const box=b.parentElement;submit(box.querySelector('textarea'),box.querySelector('.answer-feedback'));});
  renderProgress(); show(current);
})();

