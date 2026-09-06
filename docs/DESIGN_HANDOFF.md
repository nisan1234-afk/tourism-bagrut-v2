# חבילת מסירה לעיצוב (06.09.2026)

מצורפים 38 צילומי מסך (19 מסכים × מחשב 1280 / טלפון 390) ורשימת הרכיבים למטה.
**הכלל:** מעצבים מחדש את המראה של הרכיבים הקיימים, בשמות ה-class הקיימים. המבנה, הטקסטים וההתנהגות לא משתנים
(בדיקות אוטומטיות אוכפות את זה). התוצר המצופה: קובץ משתנים + מפרט לכל רכיב + צילומי מסך של המצב המעוצב.

## משתני העיצוב הקיימים (`styles.css`, `:root`)

| משתנה | ערך | שימוש |
|---|---|---|
| `--forest` | #173d37 | צבע ראשי: סרגל צד, כפתורים ראשיים, כותרות מודגשות |
| `--forest-2` | #24584f | גוון משני של הראשי |
| `--mint` | #dcebe4 | רקעים רכים, בלוק "תרגול בתוך היחידה" |
| `--sand` | #f2eadc | רקע חם לכרטיסים משניים, תגיות |
| `--cream` | #fbf8f1 | רקע הדף |
| `--ink` | #1d2c29 | טקסט |
| `--muted` | #687672 | טקסט משני |
| `--line` | #d9dfda | גבולות |
| `--gold` | #c68c3a | הדגשות, מספור, "משחק 3", eyebrow |
| `--shadow` | 0 18px 50px rgba(23,61,55,.11) | צל כרטיסים |

גופנים: `Assistant` (גוף), `Frank Ruhl Libre` (כותרות). מ-Google Fonts. RTL בכל האתר.
צבעי מצב שאינם משתנים היום (מועמדים למשתנים חדשים): נכון `#dff1e7/#5e9978`, שגוי `#f6e1dd/#b96d61`, הושלם `#79aa8f`.

## רכיבים לפי מסך (שמות class)

### מעטפת יחידה (כל 5 היחידות זהות)
- `header.unit-topbar` עם `.brand`, `.unit-progress-head` (`.meter > i`, `#unitPercent`), `#menuToggle`
- `aside.unit-rail` (`#unitRail`): כותרת, `nav#pageNav > button` (מצבים: `.active`, `.done`), `.back-home`
- `main.unit-main`, `footer.lesson-footer` (`#prevPage`, `#pageCounter`, `#nextPage`)
- כרטיס המוכנות `#unitHome.student-coach-home`: `.coach-welcome` (h2, p, `.coach-actions .button-large`), `.readiness-card` (strong, `.meter`, `ul li.done`, `.coach-help`)
- המאמן: `.coach-toggle`, `.coach-widget` (`.coach-widget-head`, `.coach-widget-sub`, `.coach-log`, `.coach-msg-user/.coach-msg-bot`, `.coach-widget-form`)

### דף תוכן (`section.lesson-page`)
- `.lesson-kicker`, `.block-heading` (`.number`, `.eyebrow`, h2), `.lesson-lead`, `.unit-contract` (div + aside עם ul, `.content-levels b/em`)
- בלוקי תוכן: `.content-grid.two > .content-panel`, `.site-grid > .site-card` (`.site-index`, h3, p, ul), `.fact-grid > article` (b, p), `.highlight-quote`, `.story-layout`, `.timeline`, `.compare-panel`, `.visual-story-strip > .visual-poster` (img, figcaption), `.expanded-material .detail-grid`, `.deep-read`, `.chapter-checkpoint`, `.media-source-note`
- שאלת דף: `.check-card` (h3, label, textarea, `button.check-open`, `.answer-feedback` במצבים `.loading/.success/.needs-work`, `ul.exam-hints li.met/.missing`, `.relogin-inline`)
- `.page-gate-note` (הודעת חסימה), `button.complete-page`

### משחקים (`.chapter-practice > .chapter-practice-heading + .chapter-game-grid`)
- כרטיס: `article.learning-game[data-game-type]` (`> span` "משחק N", h3, p, `.game-body`, `small.game-feedback`, `.button-outline`), `.game-complete`, `.wide-game`
- match: `.match-grid(.inline) label > b + select` · clues/speed/recognition: `.game-choices button.correct/.wrong` · order: `.route-selects select`
- memory: `.memory-board button.flipped/.matched` · puzzle: `.image-puzzle button.selected` · map: `.coast-map button i/span`, `.map-credit`
- streak: `.game-statement`, `.binary-actions button` · speed: `.speed-head .speed-timer/.speed-score`
- silent-map: `.silent-map-game`, `.map-label-bank button.selected/:disabled`, `.silent-coast-map .silent-target.filled/.wrong (i, span)`
- recognition: `.recognition-card` (img, `.recognition-count`, `.answer-list`, `.quiz-feedback`)
- דף סיכום משחקים: `#gamesSummary .game-status`, `.practice-directory a (span,b,small)`

### דף תמונות (ירושלים)
- `.visual-story-strip.jerusalem-recognition > button.visual-poster.revealed`, `#recognitionProgress`
- מפה אילמת סטטית: `.jerusalem-silent-map`, `.silent-map-labels button.selected`, `.old-city-map [data-match-target].placed`, `#matchFeedback`

### מצגת
- `.slide-deck > .slide-stage > article.region-slide` (span, h3, p, `.slide-accent`, img), `.slide-controls button`, `#presentationFeedback`

### בוחן ומאגר בגרות
- `#unitQuiz .quiz-card` (`.quiz-kicker`, h3, `.answer-list button.correct/.wrong`, `.quiz-feedback`, `#nextQuestion`, `#startQuiz`)
- `.bank-progress#examProgress` (b, `.meter`), `#examBank article.exam-question(.answer-complete)` (`.question-label span/em`, h3, `.exam-part(.part-complete)` label, textarea, `.answer-meta .exam-part-state`, `button.check-exam`, `.answer-feedback`)

### דף הבית (`index.html`)
- `.topbar`, `.hero` (`.hero-visual`), כרטיסי יחידות `.unit-card` (`.unit-cover`, `.unit-meta`, `.button`), `.today-task` (המשימה להיום), `.section-heading`, `.footer`

### ההתקדמות שלי (`progress.html`)
- `.progress-summary article`, `.progress-unit(.done)` (`.progress-unit-head`, `.progress-status`, `.meter`, `.progress-facts`, `.progress-unit-actions`), `.progress-forgot`

### דשבורד המורה (`teacher.html`)
- `.teacher-topbar`, `.teacher-tabs button.active`, `.teacher-tab-pane`, `.teacher-panel`, `.panel-title`, `.demo-chip`
- סקירה: `.management-hero`, `.quick-actions`, `.assignment-form`, `.assignment-current .review-badge(.ok)`, `.class-pulse article`, `.lesson-report` (`.lesson-report-tools input[type=date]`, `.lesson-report-summary article`, `.teacher-roster.lesson-report-table`, `.lesson-report-absent`, `.lesson-report-note`)
- תלמידים: `.student-toolbar`, `.student-add-form`, `.student-bulk-form`, `.teacher-roster-summary`, `.teacher-table-wrap table.teacher-roster` (td b/small, `.row-actions .table-action(.danger)`)
- תשובות: `.review-queue .review-card` (`.review-badge`, `.review-actions`), `#answersState`
- תובנות: `.teacher-stats article`, `.difficulty-list`, `.action-panel`, `.question-performance`
- עריכת תוכן: `.edit-content-hint`, `.edit-content-list`, `.knowledge-panel` (`.knowledge-summary`, `.knowledge-list`, `#rescanKnowledge`)

### משותף
- כפתורים: `.button`, `.button-primary`, `.button-outline`, `.button-large`, `.table-action`
- `.meter > i` (מד התקדמות), `.eyebrow`, `.empty-state`, `.session-expiry-banner`, `:focus-visible` (מסגרת פוקוס)
- שער כניסה: `.access-gate`, `.teacher-access-gate` (`.dialog-mark`)

## מגבלות שהעיצוב חייב לכבד
1. רוחב 390px בלי גלילה אופקית (נבדק אוטומטית). 2. ניגודיות AA. 3. מצבי נכון/שגוי/הושלם מובחנים גם בלי צבע (סימן/מסגרת).
4. סרגל הצד ביחידה נסגר לתפריט בטלפון (`.unit-rail.open`). 5. אין להוסיף/להסיר אלמנטים; מותר CSS בלבד, כולל `::before/::after`.
