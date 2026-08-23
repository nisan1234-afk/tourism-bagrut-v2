const steps=['overview','north','carmel','telaviv','south','images','presentation','practice'];
const completed=new Set(JSON.parse(localStorage.getItem('coastal-demo-progress')||'[]'));
function renderProgress(){const value=Math.round(completed.size/steps.length*100);document.getElementById('unitMeter').style.width=`${value}%`;document.getElementById('unitPercent').textContent=`${value}%`;document.querySelectorAll('.lesson-nav a').forEach(a=>a.classList.toggle('completed',completed.has(a.dataset.step)));document.querySelectorAll('[data-complete]').forEach(b=>{const done=completed.has(b.dataset.complete);b.classList.toggle('is-complete',done);b.textContent=done?'החלק הושלם ✓':'סיימתי את החלק הזה'});}
function completeStep(step){completed.add(step);localStorage.setItem('coastal-demo-progress',JSON.stringify([...completed]));renderProgress();}
document.querySelectorAll('[data-complete]').forEach(b=>b.addEventListener('click',()=>completeStep(b.dataset.complete)));

const enrichment={
north:['עוד אתרים שחייבים להכיר בצפון',['מוזיאון אסירי המחתרות','בית הכלא הבריטי בעכו שבו נכלאו לוחמי אצ״ל ולח״י; במקום תא הגרדום וסיפור פריצת הכלא.'],['מנהרת הטמפלרים','מנהרה תת־קרקעית של המסדר הטמפלרי המחברת בין המצודה לנמל עכו.'],['בית לוחמי הגטאות','מוזיאון לשואה שהקימו ניצולים שלחמו בגטאות.'],['גן לאומי אכזיב','לגונות וברכות ים, שרידי כפר דייגים, חוף ושטחי קמפינג.'],['מבצר מונפורט','מבצר צלבני בנחל כזיב ובו שרידי מגדל וחומות.'],['מבצר יחיעם','שרידים צלבניים ועות׳מאניים וסיפור מלחמת העצמאות.']],
carmel:['מוקדי הביקור בקיסריה ובכרמל',['התיאטרון הרומי','כ־3,500 מקומות; נבנה בתקופת הורדוס ומשמש גם כיום למופעים.'],['האקוודוקט','אמת מים רומית באורך כ־20 ק״מ שהובילה מים מהכרמל לקיסריה.'],['ההיפודרום וארמון הורדוס','מתחם למרוצי סוסים ושרידי ארמון מפואר על קו הים.'],['בית אהרנסון','בית המשפחה ומרכז סיפורה של מחתרת ניל״י.'],['רמת הנדיב','גני זיכרון וקברי הברון רוטשילד ורעייתו.'],['דלית אל־כרמל ועוספיה','שוק, מטבח, מורשת ואירוח המציגים את התרבות הדרוזית.']],
telaviv:['תרבות, בילוי ומוזיאונים בתל אביב',['נמל תל אביב','נמל ששוקם והפך למתחם פנאי ותרבות.'],['שרונה','מושבה טמפלרית משנת 1871 ובה עשרות מבנים ששומרו.'],['שוק הכרמל ונחלת בנימין','שוק מזון מרכזי ולצדו מדרחוב ויריד אמנים.'],['פארק הירקון','הריאה הירוקה העירונית ובה אגם ומתקני פנאי.'],['מוזיאון אנו','מוזיאון אינטראקטיבי לסיפור העם היהודי והתפוצות.'],['מוזיאוני הפלמ״ח וההגנה','אתרי מורשת על המאבק להקמת המדינה.']],
south:['מה מזהים ומה מסבירים בבגרות',['השער הכנעני באשקלון','שער מקושת בן כ־3,500 שנה, מן הקדומים מסוגו בעולם.'],['ייחוד תל אשקלון','שילוב ארכאולוגיה, חוף ים וטיילת צוק.'],['מערות הפעמון','חללים גדולים שנחצבו בידי אדם בסלע הקירטון.'],['קולומבריום ומקוואות','מתקנים לגידול יונים ובריכות טבילה קדומות בבית גוברין.']]
};
const imageMap={
'מוזיאון אסירי המחתרות':'https://nisan1234-afk.github.io/jerusalem-tour/images/image91.png',
'בית לוחמי הגטאות':'https://nisan1234-afk.github.io/jerusalem-tour/images/image88.png',
'גן לאומי אכזיב':'https://nisan1234-afk.github.io/jerusalem-tour/images/image102.png',
'מבצר מונפורט':'https://nisan1234-afk.github.io/jerusalem-tour/images/image89.png',
'מבצר יחיעם':'https://nisan1234-afk.github.io/jerusalem-tour/images/image90.png',
'התיאטרון הרומי':'https://nisan1234-afk.github.io/jerusalem-tour/images/image60.png',
'האקוודוקט':'https://nisan1234-afk.github.io/jerusalem-tour/images/image58.png',
'בית אהרנסון':'https://nisan1234-afk.github.io/jerusalem-tour/images/image92.png',
'רמת הנדיב':'https://nisan1234-afk.github.io/jerusalem-tour/images/image94.png',
'נמל תל אביב':'https://nisan1234-afk.github.io/jerusalem-tour/images/image75.png',
'שרונה':'https://nisan1234-afk.github.io/jerusalem-tour/images/image69.png',
'שוק הכרמל ונחלת בנימין':'https://nisan1234-afk.github.io/jerusalem-tour/images/image66.png',
'פארק הירקון':'https://nisan1234-afk.github.io/jerusalem-tour/images/image73.png',
'מוזיאון אנו':'https://nisan1234-afk.github.io/jerusalem-tour/images/image84.png',
'מוזיאוני הפלמ״ח וההגנה':'https://nisan1234-afk.github.io/jerusalem-tour/images/image68.png',
'ייחוד תל אשקלון':'https://nisan1234-afk.github.io/jerusalem-tour/images/image104.png',
'מערות הפעמון':'https://nisan1234-afk.github.io/jerusalem-tour/images/image105.png'
};
Object.entries(enrichment).forEach(([id,g])=>{const s=document.getElementById(id),btn=s?.querySelector('.complete-button');if(!s||!btn)return;const w=document.createElement('div');w.className='expanded-material';w.innerHTML=`<h3>${g[0]}</h3><div class="detail-grid">${g.slice(1).map(c=>`<article>${imageMap[c[0]]?`<img src="${imageMap[c[0]]}" alt="${c[0]}" loading="lazy">`:''}<div><span>חומר חובה</span><h4>${c[0]}</h4><p>${c[1]}</p></div></article>`).join('')}</div>`;s.insertBefore(w,btn)});

const imageChallenge=[
['ראש הנקרה','https://nisan1234-afk.github.io/jerusalem-tour/images/image100.jpg'],
['הגנים הבהאיים בחיפה','https://nisan1234-afk.github.io/jerusalem-tour/images/image98.jpg'],
['אולמות האבירים בעכו','https://nisan1234-afk.github.io/jerusalem-tour/images/image87.png'],
['האקוודוקט בקיסריה','https://nisan1234-afk.github.io/jerusalem-tour/images/image58.png'],
['נמל יפו','https://nisan1234-afk.github.io/jerusalem-tour/images/image64.png'],
['שרונה','https://nisan1234-afk.github.io/jerusalem-tour/images/image69.png'],
['גן לאומי אשקלון','https://nisan1234-afk.github.io/jerusalem-tour/images/image104.png'],
['מערות בית גוברין','https://nisan1234-afk.github.io/jerusalem-tour/images/image105.png']
];
const presentationSection=document.getElementById('presentation');
const imageSection=document.createElement('section');
imageSection.className='learning-block tinted image-practice';
imageSection.id='images';
imageSection.dataset.trackStep='images';
imageSection.innerHTML=`<div class="block-heading"><span class="number">06</span><div><span class="eyebrow">זיהוי אתרים מתמונה</span><h2>רואים, מזהים ומסבירים</h2></div></div><p class="practice-intro">בחרו את שם האתר המופיע בתמונה. לאחר הזיהוי תקבלו גם את פרט המפתח שכדאי לזכור לבגרות.</p><div class="recognition-card"><img id="recognitionImage" alt=""><div><span class="quiz-kicker" id="recognitionCount"></span><h3>איזה אתר מופיע בתמונה?</h3><div class="answer-list" id="recognitionAnswers"></div><p class="quiz-feedback" id="recognitionFeedback"></p><button class="button button-primary" id="nextRecognition" disabled>לתמונה הבאה</button></div></div>`;
presentationSection.parentNode.insertBefore(imageSection,presentationSection);
const presentationNav=document.querySelector('[data-step="presentation"]');
const imageNav=document.createElement('a');
imageNav.href='#images';imageNav.dataset.step='images';
imageNav.innerHTML='<i>6</i><span>זיהוי מתמונה<small>אתגר חזותי</small></span><b>✓</b>';
presentationNav.parentNode.insertBefore(imageNav,presentationNav);
document.querySelectorAll('[data-step="presentation"] i,[data-step="practice"] i').forEach((n,i)=>n.textContent=String(i+7));
let recognitionIndex=0,recognitionCorrect=0;
function renderRecognition(){const item=imageChallenge[recognitionIndex];document.getElementById('recognitionImage').src=item[1];document.getElementById('recognitionImage').alt='אתר לזיהוי';document.getElementById('recognitionCount').textContent=`תמונה ${recognitionIndex+1} מתוך ${imageChallenge.length}`;const wrong=imageChallenge.filter(x=>x[0]!==item[0]).sort(()=>.5-Math.random()).slice(0,2).map(x=>x[0]);const choices=[item[0],...wrong].sort(()=>.5-Math.random());const box=document.getElementById('recognitionAnswers');box.innerHTML='';choices.forEach(name=>{const b=document.createElement('button');b.textContent=name;b.addEventListener('click',()=>{box.querySelectorAll('button').forEach(x=>{x.disabled=true;if(x.textContent===item[0])x.classList.add('correct')});if(name===item[0])recognitionCorrect++;else b.classList.add('wrong');document.getElementById('recognitionFeedback').textContent=name===item[0]?'נכון — זהו '+item[0]+'.':'כמעט. התשובה הנכונה היא '+item[0]+'.';document.getElementById('nextRecognition').disabled=false});box.appendChild(b)});document.getElementById('recognitionFeedback').textContent='';document.getElementById('nextRecognition').disabled=true;}
document.getElementById('nextRecognition').addEventListener('click',()=>{if(recognitionIndex<imageChallenge.length-1){recognitionIndex++;renderRecognition();return}completeStep('images');document.querySelector('.recognition-card>div').innerHTML=`<span class="eyebrow">האתגר הושלם</span><h3>זיהית ${recognitionCorrect} מתוך ${imageChallenge.length} אתרים</h3><p>אפשר לחזור ליחידה בכל עת ולתרגל שוב.</p>`});renderRecognition();

const slides=[
['מישור החוף','חזרה לבגרות','מסע מראש הנקרה ועד הדרום: גיאוגרפיה, ארכאולוגיה, תרבות וטבע.','מתחילים מצפון'],
['גיאוגרפיה ונוף','ראש הנקרה עד עזה','רצועה מישורית לאורך הים התיכון, באורך כ־190 ק״מ.','מפת היחידה'],
['גיאוגרפיה','מישור החוף במספרים','רוחב 4 ק״מ בצפון ועד 40 ק״מ בדרום; נקטע בראש הנקרה ובכרמל.','שאלה 6א'],
['גיאוגרפיה','חוף צבירה וחוף סחיפה','בדרום חוף רחב, ישר וחולי; בצפון מפרצונים ולוחות גידוד.','השוואה חשובה'],
['החוף הצפוני','ראש הנקרה','גלי הים יצרו נקרות בסלע הגיר; באתר רכבל ומיצג אור־קולי.','שאלה 6ב'],
['עכו','עיר מורשת עולמית','שכבה צלבנית תת־קרקעית ושכבה עות׳מאנית מעל הקרקע.','UNESCO'],
['עכו','אולמות, מסגד וחאן','אולמות האבירים, מסגד אל־ג׳זאר וחאן אל־עומדאן.','שאלות 7א ו־9ב'],
['עכו','מורשת ומחתרות','מוזיאון אסירי המחתרות, מנהרת הטמפלרים ובית לוחמי הגטאות.','העבר ממשיך לדבר'],
['חיפה','הגנים הבהאיים','19 טרסות, מקדש הבב וכיפת הזהב; מרכז הדת הבהאית.','UNESCO 2008'],
['חיפה','מערת אליהו וסטלה מאריס','המערה קדושה לארבע דתות; מעליה מרכז המסדר הכרמליתי.','קדושה וצליינות'],
['טבע ומבצרים','אכזיב, מונפורט ויחיעם','לגונות וחוף, מבצר צלבני וסיפור מלחמת העצמאות.','שלושה סוגי ביקור'],
['בדיקת ידע','עכו: ארכאולוגיה וקדושה','אולמות האבירים כאתר ארכאולוגי ומסגד אל־ג׳זאר כאתר קדוש.','מבנה תשובה'],
['קיסריה והכרמל','עיר הורדוס','עיר נמל מפוארת בת כ־2,000 שנה.','עוברים למרכז'],
['קיסריה','מוקדי הביקור','תיאטרון, היפודרום, רחוב צלבני וארמון הורדוס.','ארכאולוגיה חיה'],
['קיסריה','האקוודוקט','אמת מים רומית באורך כ־20 ק״מ שנשמרה לצד החוף.','שאלה 8ב'],
['זכרון יעקב','מושבה, ניל״י ויין','מושבה מ־1882: בית אהרנסון, דרך היין ורמת הנדיב.','שאלות 8ג ו־9א'],
['הכרמל','הכפרים הדרוזיים','דלית אל־כרמל ועוספיה: שוק, מטבח, מורשת ואירוח.','תיירות תרבותית'],
['בדיקת ידע','שני אתרים בקיסריה','התיאטרון והאקוודוקט: בכל תשובה משלבים עובדה והסבר.','תשובת בגרות'],
['תל אביב–יפו','יפו העתיקה','נמל דייגים, סלע אנדרומדה, מגדל השעון ושוק הפשפשים.','ישן וחדש'],
['תל אביב','נווה צדק והעיר הלבנה','נווה צדק מ־1887 ויותר מ־4,000 מבנים בסגנון הבינלאומי.','UNESCO 2003'],
['תל אביב','אתרים ובילוי','הנמל, שרונה, שוק הכרמל, פארק הירקון ונחלת בנימין.','עיר מגוונת'],
['תל אביב','מוזיאונים','אנו, ארץ ישראל, הפלמ״ח וההגנה.','תרבות ומורשת'],
['בדיקת ידע','ייחוד העיר הלבנה','ריכוז מבני הסגנון הבינלאומי ותכנון עיר גנים.','תשובה מלאה'],
['החוף הדרומי','גן לאומי תל אשקלון','שער כנעני ושילוב של ארכאולוגיה, חוף וטיילת.','שאלות 1ב ו־1ג'],
['בית גוברין','ארץ אלף המערות','מערות פעמון, קולומבריום, קברים ומקוואות.','UNESCO'],
['בדיקת ידע','ייחוד בית גוברין','מערכות חציבה מעשה אדם ושימושים מגוונים.','שאלה 5א'],
['תכנון מסלול','יומיים מנהרייה','ראש הנקרה ועכו; למחרת מונפורט, יחיעם ואכזיב.','שאלה 9ג'],
['סיכום','מצפון עד דרום','מזהים אתר, משייכים לאזור ומנסחים עובדה והסבר.','מוכנים לתרגול']
].map(([section,title,body,accent])=>({section,title,body,accent}));
let slideIndex=0;const stage=document.getElementById('slideStage');
function renderSlide(){const s=slides[slideIndex];stage.innerHTML=`<div class="web-slide"><span>${s.section}</span><h3>${s.title}</h3><p>${s.body}</p><b>${s.accent}</b></div>`;document.getElementById('slideCounter').textContent=`${slideIndex+1} / ${slides.length}`;document.getElementById('prevSlide').disabled=slideIndex===0;document.getElementById('nextSlide').disabled=slideIndex===slides.length-1;if(slideIndex===slides.length-1){const f=document.getElementById('completeSlides');f.disabled=false;f.textContent='סיימתי את המצגת';}}
document.getElementById('nextSlide').addEventListener('click',()=>{if(slideIndex<slides.length-1){slideIndex++;renderSlide()}});document.getElementById('prevSlide').addEventListener('click',()=>{if(slideIndex>0){slideIndex--;renderSlide()}});document.getElementById('fullScreenSlide').addEventListener('click',()=>document.getElementById('slidePlayer').requestFullscreen?.());document.getElementById('completeSlides').addEventListener('click',()=>completeStep('presentation'));

const questions=[
['מה מאפיין חוף צבירה?',['חוף רחב, ישר וחולי','מצוק גיר ובו נקרות','לוחות גידוד בלבד'],0,'חוף צבירה אופייני לדרום והוא רחב, ישר וחולי.'],
['כיצד נוצרו הנקרות בראש הנקרה?',['מפעולת גלי הים בסלע הגיר','מחציבה רומית','מרעידת אדמה'],0,'הגלים פעלו לאורך זמן בסלע הגיר.'],
['איזה אתר בעכו הוא צלבני?',['אולמות האבירים','מסגד אל־ג׳זאר','מגדל השעון'],0,'אולמות האבירים הם מתחם צלבני תת־קרקעי.'],
['כמה טרסות יש בגנים הבהאיים?',['19','12','40'],0,'בגנים הבהאיים 19 טרסות.'],
['מה היה תפקיד האקוודוקט?',['הובלת מים לקיסריה','הגנה על הנמל','מרוצי סוסים'],0,'האקוודוקט הוביל מים מהכרמל לקיסריה.'],
['איזה סיפור מוצג בבית אהרנסון?',['מחתרת ניל״י','המסדר הכרמליתי','הקמת הפלמ״ח'],0,'הבית מספר את סיפורה של מחתרת ניל״י.'],
['מה מייחד את העיר הלבנה?',['מבנים בסגנון הבינלאומי ועיר גנים','נמל עתיק','מגדל שעון'],0,'זהו ריכוז גדול של מבני הסגנון הבינלאומי.'],
['איזה מוזיאון מספר את סיפור התפוצות?',['אנו','הפלמ״ח','בית אהרנסון'],0,'מוזיאון אנו עוסק בעם היהודי ובתפוצות.'],
['מה מייחד את תל אשקלון?',['ארכאולוגיה, חוף וטיילת','19 טרסות','אמת מים'],0,'באתר יש שילוב ייחודי של ארכאולוגיה וחוף.'],
['מה מכונה ארץ אלף המערות?',['בית גוברין','תל אשקלון','קיסריה'],0,'בית גוברין מוכר במערות הפעמון ובמערכות החציבה.']
].map(([q,a,correct,explain])=>({q,a,correct,explain}));
let questionIndex=0,correctAnswers=0;
function renderQuestion(){const x=questions[questionIndex];document.querySelector('#quizCard .quiz-kicker').textContent=`שאלה ${questionIndex+1} מתוך ${questions.length}`;document.getElementById('questionText').textContent=x.q;const l=document.getElementById('answerList');l.innerHTML='';x.a.forEach((a,i)=>{const b=document.createElement('button');b.textContent=a;b.addEventListener('click',()=>checkAnswer(i,b));l.appendChild(b)});document.getElementById('quizFeedback').textContent='';const n=document.getElementById('nextQuestion');n.disabled=true;n.textContent=questionIndex===questions.length-1?'לסיום ולקבלת ציון':'לשאלה הבאה';}
function checkAnswer(i,b){const x=questions[questionIndex],buttons=document.querySelectorAll('#answerList button');buttons.forEach(c=>c.disabled=true);b.classList.add(i===x.correct?'correct':'wrong');if(i!==x.correct)buttons[x.correct].classList.add('correct');if(i===x.correct)correctAnswers++;document.getElementById('quizFeedback').textContent=x.explain;document.getElementById('nextQuestion').disabled=false;}
document.getElementById('nextQuestion').addEventListener('click',()=>{if(questionIndex<questions.length-1){questionIndex++;renderQuestion();return}const score=Math.round(correctAnswers/questions.length*100);document.getElementById('quizCard').innerHTML=`<span class="eyebrow">התרגול הסתיים</span><h3>הציון שלך: ${score}</h3><p>${score>=60?'עברת את שלב התרגול. כל הכבוד.':'כדאי לחזור על החומר ולנסות שוב. מספר הניסיונות אינו מוגבל.'}</p><button class="button button-outline" onclick="location.reload()">ניסיון נוסף</button>`;localStorage.setItem('coastal-demo-last-score',String(score));if(score>=60)completeStep('practice')});
const rail=document.getElementById('lessonRail');document.getElementById('railButton').addEventListener('click',()=>rail.classList.toggle('open'));renderProgress();renderSlide();renderQuestion();

