# תבנית יחידה אחידה — חוזה בין דף התוכן למנוע המשותף

מ-04.09.2026 כל יחידת לימוד (מ-05.09 גם מישור החוף) בנויה מאותה תבנית ומופעלת
על ידי קובץ אחד: `unit-runtime.js`. הדף מספק **תוכן בלבד** (HTML סטטי + JSON), והמנוע
מספק את כל ההתנהגות. כך כל יחידה מקבלת אוטומטית את אותה פדגוגיה ואת אותם כללי השלמה.

`npm run standard` נכשל על כל יחידה שסוטה מהחוזה הזה. `npm run behavior` מריץ את
המנוע בדפדפן על כל יחידה ומוודא שכללי ההשלמה עובדים.

## 1. `<body>`

```html
<body class="unit-page protected-page"
      data-unit-id="haamakim"          <!-- unit_id בבקאנד (BAGRUT_UNITS) -->
      data-unit-label="העמקים"          <!-- שם לתצוגה (דף הבית, המאמן) -->
      data-unit-file="valleys.html"     <!-- לחזרה לנקודה האחרונה מדף הבית -->
      data-legacy-prefix="valleys"      <!-- אופציונלי: מפתח localStorage ישן להגירה -->
      data-content-unit="haamakim">     <!-- לעריכת תוכן למורה (content-overrides.js) -->
```

## 2. מעטפת (זהה בכל יחידה)

- `header.unit-topbar` עם `#unitMeter`, `#unitPercent`, `#menuToggle`
- `aside.unit-rail#unitRail` עם כותרת היחידה, `nav#pageNav` (כפתור `data-page="<id>"` לכל דף, או ריק והמנוע ימלא מ-`data-page-title`), וקישור `.back-home`
- `main.unit-main` עם הדפים, ובסופו `footer.lesson-footer` עם `#prevPage`, `#pageCounter`, `#nextPage`
- ווידג'ט המאמן: `button[data-coach-open]`, `#coachWidget` עם `[data-coach-close]`, `#coachLog`, `form#coachForm`, `#coachInput`
- סקריפטים בסוף: `#unitData` (JSON), `../app.js`, `../content-overrides.js`, `../unit-runtime.js`. בראש: שער הכניסה + `../session-guard.js`.
- **אין `onclick` אינליין.** המנוע מחבר מאזינים בעצמו.

## 3. דפים

כל דף הוא `<section class="lesson-page" data-page-panel="<id>">`. הסדר בקובץ הוא סדר הדפים.
`.lesson-kicker` בתוך הדף מתמלא אוטומטית ("דף 3 מתוך 7").

| סוג | id | חובה בתוך הדף | מתי הדף נחשב "הושלם" |
|---|---|---|---|
| תוכן | כל id אחר | `h2[data-field-key]`, `.check-card` עם `label`, `textarea[data-open-question]`, `button.check-open`, `.answer-feedback`, ו-`button.complete-page` | שאלת הדף נשלחה לבדיקה בהצלחה (או שהשרת נכשל פעמיים, כדי לא לחסום למידה) |
| תמונות | `images` | `button.visual-poster[data-recognition="<שם האתר>"]` לכל תמונה; אופציונלי מפה אילמת: `[data-match-label]` + `[data-match-target]` + `#matchFeedback`; `button.complete-page` | כל התמונות נחשפו וכל הפריטים שובצו |
| מצגת | `presentation` | `.slide-deck` עם `#slideStage`, `#prevSlide`, `#slideCount`, `#nextSlide`, `#fullscreenSlides`; `button.complete-page` | הגיעו לשקופית האחרונה |
| תרגול | `practice` | `#unitQuiz`, `button.complete-page` (ו-`#examBank` אם אין דף exam נפרד) | בוחן: ציון 60 ומעלה. בלי בוחן: לפחות סעיף אחד נשלח |
| מאגר בגרות | `open-practice` או `data-page-kind="exam"` | `#examProgress`, `#examBank`, `button.complete-page` | כל הסעיפים עברו את המחוון (רוב הרכיבים נמצאו, 8 מילים לפחות) |
| סיכום משחקים | `games` | `#gamesSummary`, `button.complete-page` | כל המשחקים ביחידה הושלמו |

דף תוכן שיש בו משחקים (`games[].page`) נחשב "הושלם" רק אחרי שאלת הדף **וגם** כל המשחקים שלו.
`#examBank` חייב להופיע באיזשהו דף (תרגול או מאגר). המנוע שומר טיוטות של כל תיבת תשובה מקומית.

צילומי אתרים ונופים רק מ-`https://nisan1234-afk.github.io/jerusalem-tour/images/`. תמונות
עיצוב ואביזרים (מפה אילמת וכו') מכל מקור, מסומנות `data-decor`.

## 4. `#unitData`

```html
<script type="application/json" id="unitData">
{
  "slides": [ { "k": "כותרת עליונה (אופציונלי)", "t": "כותרת", "p": "טקסט", "img": "image107.jpg או URL מלא" } ],
  "quiz":   [ { "q": "שאלה", "a": ["תשובה 1", "תשובה 2", "תשובה 3", "תשובה 4"], "correct": 0, "explain": "הסבר" } ],
  "exam":   [ { "title": "שאלת בגרות — ...", "parts": [ "סעיף כטקסט", { "q": "סעיף", "c": [["רכיב", ["מילה", "מילה"]]] } ] } ],
  "openHints": { "<page id>": [["רכיב", ["מילה", "מילה"]]] }
}
</script>
```

- `quiz` ריק = הדף מציג "הבוחן יתווסף כשיאושר". מינימום 10 שאלות כשקיים. השאלות ל-4 החבלים
  הועברו מ-`tourism11` (20 לכל חבל, מאושרות).
- `c` ו-`openHints` הם **רמזים** שמוצגים אחרי השליחה ("נמצא / כדאי להוסיף"). הם לא נועלים כלום.
  פסק הדין היחיד הוא של הבוט/המורה בשרת.

## 5. מה המנוע שומר

- מקומית: `tb:v1:<unit_id>` = `{ done, submitted, failed, recognized, matched, slidesSeen, quiz, games, examPassed, drafts }`,
  ובנוסף `tourismLastVisit` ו-`tourismUnitProgress` לדף הבית.
- בשרת (עם token): `saveBagrutUnitProgress` בכל השלמת דף, `submitOpenAnswer` בכל שליחה,
  `saveSiteKnown` בכל חשיפת תמונה, `saveBagrutQuizResult` + `updateBagrutMistakes` בסוף בוחן,
  `askBagrutBot` (עם token, מכסה אישית) במאמן.

## 6. להוסיף חבל חדש

1. להעתיק את `units/valleys.html`, לשנות את `<body data-*>`, הכותרות והתוכן.
2. למלא את `#unitData` מחומרי המקור בלבד.
3. לרשום את היחידה ב-`BAGRUT_UNITS` (`backend/bagrut.gs`), בכרטיסי `index.html`, ב-`teacher.html` וב-`CONTENT_PAGES` (`teacher.js`).
4. `npm test`. אם ירוק, היחידה עומדת בתקן.
