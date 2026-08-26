# AI Tools Capability Research — for tourism-bagrut-v2 content pipeline

Researched 2026-08-26 via live web search (search results dated Feb–Aug 2026 unless noted). This is not from model training memory — every claim below is sourced to a specific search result. Where I could not find a solid current source, I say so explicitly rather than guessing.

**Context for recommendations:** this project already has a working split — a "B" session (Claude with browser access) does Apps Script deploys/live QA, Codex is restricted to design/CSS drafts only (no direct repo access), and raw teacher material lives in Drive as PDFs/PPTX/DOCX per region/topic. The question is whether/how to add NotebookLM and the Gemini app for the *pre-processing* step (turning raw materials into outlines, flashcard pairs, diagrams) before that content reaches Claude Code for actual site-building.

---

## 1. Claude (chat assistant, not Claude Code)

**Current models (Aug 2026):** Anthropic moved the flagship line to "Sonnet 5" and "Opus 5" during mid-2026, both with a **1M-token context window**; Haiku 4.5 remains at 200K. Opus 4.5 (the prior flagship) was the first model to break 80% on SWE-bench Verified; Opus 5 now leads SWE-bench Verified at ~97% on the independent vals.ai leaderboard. *(Sources: morphllm.com/claude-context-window, secondtalent.com "Every Claude AI Model Compared" Aug 2026, morphllm.com codex-vs-claude-code Aug 2026.)*

**Strengths for this project:**
- **PDF/long-document summarization:** In a head-to-head test summarizing a 220-page technical/policy PDF, Claude was rated the favorite — "took the longest ... but identified what actually mattered and presented it clearly rather than including every detail" (xda-developers.com, 2026 test comparing ChatGPT/Claude/Gemini on the same 200+ page PDF).
- **CSS/UI/design quality:** Multiple 2026 comparisons rank Claude ahead of GPT and Gemini specifically for UI/CSS: "Claude leads by a meaningful margin, GPT sits in the middle, Gemini trails by about ten points" for web design tasks (mindstudio.ai, neelnetworks.com); "Claude is reliable for sophisticated CSS optimization strategies, including performance improvements and maintainable architecture patterns" (appwrite.io blog, 2026).
- **No native image generation.** Anthropic reaffirmed in April 2026 that Claude still has no built-in image model (no DALL-E/Imagen equivalent) — confirmed by godofprompt.ai and blog.stackademic.com, both 2026. It can only produce images by calling an external image-gen tool via MCP, or by generating SVG/HTML/React code directly (which is how Claude Code/Artifacts already draw diagrams in this project).
- **Hallucination caveat on summarization:** a broader 2026 hallucination benchmark found reasoning models including Claude Sonnet 4.5 exceeded 10% hallucination rates specifically on *grounded summarization* tasks — the theory being that reasoning effort adds inferences beyond the source (suprmind.ai hallucination benchmarks page, Aug 2026 update). So even Claude is not risk-free for "just summarize this raw PDF, don't add anything."

**Limitations:** No native RTL fix for Hebrew display — "Hebrew and Arabic show up broken (left-to-right) in ChatGPT, Claude, and Gemini" per a 2026 RTL-focused article; community browser extensions exist as workarounds. No native image/poster generation. 200K context on the free/cheaper tier (Haiku); 1M only on Sonnet 5 / Opus 5.

**Access/cost:** Claude Pro is $20/mo ($17/mo effective annual — the only one of the big three offering a documented annual discount at this tier). Free tier exists with daily caps. *(Source: morphllm.com "ChatGPT vs Claude vs Gemini" June 2026 comparison.)*

---

## 2. GPT / ChatGPT (OpenAI)

**Current models (Aug 2026):** The lineage moved fast in 2026 — GPT-5.1 was fully discontinued from ChatGPT by March 11, 2026; GPT-5.5 became the flagship (released ~April 2026, "designed for complex agentic tasks"); by the time of a May 5, 2026 TechCrunch piece, "GPT-5.5 Instant" was the new ChatGPT default. A further GPT-5.6 family (with sub-models "Sol," "Terra," "Luna") was announced afterward, with Sol as the new top model. *(Sources: help.openai.com model release notes, techcrunch.com May 5 2026, openai.com/index/gpt-5-6.)*

**Strengths for this project:**
- **Long document handling:** Recommended alongside Gemini 3.1 Pro for large-context work like "400-page case files" due to its large token window (tech-insider.org, 2026 practical-use roundup).
- **Image generation:** GPT Image 2 shipped April 21, 2026 (GPT Image 1.5 shipped Dec 16, 2025 with 4x faster generation and better text rendering). OpenAI's own material lists "explainers, posters, labeled diagrams, timelines" as things ChatGPT image generation is now used for — relevant for flowcharts/posters. *(Source: openai.com "The new ChatGPT Images is here," Wikipedia "GPT Image" page, 2026.)*
- **Structured JSON/CSS:** "ChatGPT generates clean CSS-in-JS solutions... GPT struck the best balance in some design comparisons," though its raw UI output is described as more generic-looking than Claude's (appwrite.io, hashbyt Medium piece, 2026).

**Limitations:** Same RTL/Hebrew display bug as the others. Free tier is capped hard: "10 GPT-5.5 messages every 5 hours, then drops to a smaller model" (per a 2026 pricing roundup) — meaningfully more restrictive day-to-day than Claude's or Gemini's free caps as described in the same source.

**Access/cost:** ChatGPT Plus $20/mo, Pro $200/mo for unlimited advanced-reasoning access.

---

## 3. Codex (OpenAI's coding agent)

This is the one already scoped to design/CSS-only drafts with no repo write access in this project's workflow — worth confirming that restriction is a reasonable one and not leaving capability on the table, or alternatively whether it's under- or over-trusted.

**Current state (Aug 2026):** Codex is not a single chat model but an **agent harness** paired with GPT-5.5-family models (moving toward GPT-5.6 "Sol" as the recommended model). It ships in three surfaces: a cloud/ChatGPT-embedded delegate mode (describe a task, it clones the repo into a sandbox, edits, runs tests, opens a PR), a local terminal-first CLI (`npm install -g @openai/codex`, requires `OPENAI_API_KEY`), and IDE extensions (VS Code, and JetBrains natively since Jan 2026). It can spawn up to **8 parallel subagents** in isolated cloud sandboxes for larger tasks. *(Sources: bhavishyapandit9.substack.com "Everything About Codex 2026," contextstudios.ai Codex App vs CLI/IDE 2026, morphllm.com codex-vs-claude-code Aug 2026.)*

**Autonomy levels:** Three explicit modes — "Chat" (suggests, you drive), "Agent," and "Agent (Full Access)" (acts freely: writes across files, runs the test suite, iterates on failures, opens a PR unattended). *(deepstation.ai "What Is OpenAI Codex" 2026.)*

**Head-to-head with Claude Code (the tool actually used for this repo), per an Aug 2026 comparison (morphllm.com):**
- Codex (GPT-5.6 family, "Sol") edges Claude Opus 5 on Terminal-Bench 2.1 (85.8% vs 84.6%) on the independent vals.ai leaderboard.
- Claude Opus 5 leads plain SWE-bench Verified (~97%) and DeepSWE (74%).
- On a documented Express.js refactor task, Codex cost ~$15 vs Claude Code's ~$155 for the same job, but blind reviewers rated Claude Code's output cleaner 67% of the time vs Codex's 25%.
- Verdict from that source: "no single better choice... Claude Code as the primary builder inside the codebase, Codex as the async reviewer and on-ramp" — i.e. Codex trades code quality for speed/cost, which supports keeping it out of direct repo commits for a small, hand-maintained educational site where consistency with existing conventions matters more than throughput.

**Implication for this project:** the current restriction (Codex only returns drafts, never touches the repo) is defensible given the cleanliness gap reported above — Codex is capable of full autonomous multi-file repo edits including opening PRs unattended, so the restriction is a policy choice, not a capability gap.

---

## 4. Gemini (Google)

**Current models (Aug 2026):** Gemini 3 launched as Google's flagship family; **Gemini 3.1 Pro released Feb 19, 2026** with a **1M-token context window** and a 65,536-token output limit ("fundamentally resolves the truncation limitations of earlier models," per Google DeepMind's own model card). Multimodal ingestion: up to 900 images per prompt, up to 8.4 hours of continuous audio, up to 1 hour of video. *(Sources: deepmind.google/models/model-cards/gemini-3-1-pro, ai.google.dev/gemini-api/docs/gemini-3, blog.google Gemini 3 announcement.)*

**Strengths for this project:**
- **Long-context ingestion** is Gemini's clearest structural advantage — 1M tokens standard on the flagship, explicitly positioned for "long-horizon agentic workflows" and multimodal source material, which fits raw teacher decks/PDFs well.
- **Structured JSON output:** Gemini 3 series and gemini-3.1-pro-preview support schema-constrained JSON output (a documented Gemini API feature), which is directly usable for flashcard term/definition pairs or game-data JSON — feed it a JSON Schema and it returns "front"/"back" fields per card reliably, though prompts still need explicit "return raw JSON only, do not wrap in markdown" instructions for clean results (ai.google.dev structured-output docs; datastudios.org piece on Gemini JSON prompting, 2026).
- **Image generation — "Nano Banana Pro":** built on Gemini 3 Pro, released as Google's image model; explicitly marketed for "infographics" and "turn notes into diagrams," with strong accurate multi-language text rendering in images — a real advantage for posters/flowcharts with Hebrew or mixed Hebrew/English labels (blog.google "Nano Banana Pro" 2026, deepmind.google Gemini 3.1 Flash Image page). This is the single most directly relevant finding for the "generate posters/flowcharts" need — Gemini's own material calls out legible in-image text in multiple languages as a differentiator.
- **CSS/design:** "Gemini excels at responsive design implementations... strongest choice for consumer-facing apps where visual appeal is a priority" but trails Claude by "about ten points" overall on web-design comparisons (neelnetworks.com, mindstudio.ai, 2026).

**Limitations:** Gemini's summarization hallucination rate on *grounded* long-document tasks was measured >10% (same category as Claude/GPT) in one 2026 benchmark, though a much older/smaller Gemini-2.0-Flash scored very low (0.7%) on a different, simpler Vectara summarization benchmark — the two numbers aren't measuring the same task, so don't over-read either. Gemini TTS does not support Hebrew per a 2026 Hebrew-AI-tools roundup, and its Hebrew grammar explanations were rated "solid but slightly less rigorous than Claude's" in the same source.

**Access/cost:** Google restructured pricing in June 2026 — entry "AI Plus" tier cut from $7.99 to $4.99/mo with 400GB storage; Google AI Pro ~$19.99/mo; AI Ultra $249.99/mo. Free tier exists (used for the free NotebookLM tier too, see below).

---

## 5. NotebookLM (Google)

This is the most directly relevant tool for the "raw teacher material → structured outline/flashcards" step, since it's the only one of the five that's *natively source-grounded* rather than general chat.

**Current capabilities (Aug 2026), per Studio panel:** one-click generation of Audio Overviews, Video Overviews, **Mind Maps**, **Slide Decks** (with a Feb 18, 2026 update adding single-slide editing without rebuilding the whole deck), **Infographics**, Data Tables, and academic tools — **Quizzes and Flashcards**. An April 2026 "Quiz & Flashcard upgrade" added topic summaries, next-step suggestions, and a regenerate tool, described as turning them into "an adaptive study engine." *(Sources: digitalocean.com "What Is NotebookLM 2026," geeky-gadgets.com "NotebookLM Mind Maps, Flashcards & Quizzes," notebooklm-guide.com "Quiz & Flashcard Upgrade" April 2026.)*

**Grounding/hallucination:** NotebookLM uses RAG (retrieval-augmented generation) strictly over the sources you upload rather than a broad pretrained dataset, with every claim citation-backed and clickable back to the source sentence. One 2026 source cites a measured hallucination rate of **13% for NotebookLM vs 40% for both ChatGPT and Gemini** on document-based queries (ai-toolbox/emergentmind-style summary referencing "Not Wrong But Untrue" research context) — treat this specific 13%/40% figure as a single third-party claim, not an official Google benchmark; I could not find a first-party Google number confirming it, so flag it as directionally useful but not verified at the source.

**Source limits (as of Aug 10, 2026, per a limits-tracking site):**
- Sources per notebook: **50 (Standard/free) / 100 (Plus) / 300 (Pro) / 500 (Ultra 20TB) / 600 (Ultra 30TB)**.
- Per-source cap: **500,000 words or 200MB, no explicit page limit**, and this cap does *not* increase with a higher plan — only the *number* of sources per notebook increases.
- Copy-protected PDFs will not import on any tier; poorly-OCR'd/protected files can import incompletely even without a page limit.
*(Source: elephas.app, superlore.ai, notebooktools.com — all dated 2026, cross-consistent on the 500K-word/200MB per-source cap.)*

**Implication for this project:** a single teacher-provided PDF or PPTX for one region/topic will almost certainly be far under the 500K-word/200MB per-source cap, so NotebookLM should handle typical bagrut-prep source material comfortably. The 50-source free-tier notebook limit is generous for a single region's folder of materials but could matter if you dump an entire multi-region Drive folder into one notebook — better to keep one notebook per region/unit.

**What I could not verify:** I did not find a first-party Google page listing NotebookLM's *browser automation* or API access — it appears to be a web-UI-only product (no evidence found of a NotebookLM API for programmatic/headless use), which matters for the "can an agent drive it automatically" question in section 6 below. This should be treated as "not found" rather than "confirmed absent."

**Access/cost:** Free tier exists (50 sources/notebook per the numbers above); Google AI Pro/Ultra subscribers get higher notebook/source caps as part of the same Gemini subscription tiers listed in section 4.

---

## 6. Browser/tool-use autonomy (cross-cutting)

- **Claude (via Claude Code / the "B" session already in this project's workflow)** is the only one of these five with a documented, currently-in-use agentic browser/tool capability in this project specifically — it's already doing Apps Script deploys and live QA via real browser access.
- **Codex** has agent autonomy but it is *codebase/terminal* autonomy (clone repo, edit files, run tests, open PRs) — not general web-browser UI automation of third-party sites like NotebookLM. No evidence found of Codex driving arbitrary web UIs.
- **NotebookLM itself** — no evidence found of an API or of it being drivable by an external agent; it looks like a manual, human-operated web UI (upload sources, click Studio panel buttons). This means bringing NotebookLM into the pipeline currently implies a **manual step for נסים** (or whoever operates it) — upload PDFs, generate flashcards/mind maps/infographics by hand, then hand the *output* to Claude/Claude Code for site integration. It is not something Claude Code can currently drive end-to-end unattended.
- **Gemini app**: same story — a web/app chat UI; no evidence found in this research of a general browser-automation mode distinct from the Gemini API being called by an agent harness (which is a different thing — that's Claude Code or another agent calling the Gemini API, not "Gemini operating a browser").

---

## רעיונות לשיפור בזכות היכולות האלה

הרעיונות הבאים מבוססים אך ורק על יכולות שאותרו בפועל במחקר לעיל (לא מדובר ברשימת "בראיינסטורם" גנרית). לכל רעיון: היכולת הספציפית שמאפשרת אותו, הכלי, ורמת העבודה הידנית/ביקורת שנדרשת — בהתאם לכלל הקיים שכלים גנרטיביים (Codex וכו') לעולם לא מבצעים commit ישירות; קלוד הוא זה שמשלב ובודק.

### 1. פודקאסט/אודיו לימודי לכל יחידת אזור (Audio Overview) — הרעיון של המורה
כרגע אין באתר תוכן אודיו כלשהו. יכולת "Audio Overview" של NotebookLM (הפקת שיחה בסגנון פודקאסט מתוך המקורות שהועלו) מתאימה ישירות: אותם קבצי PDF/PPTX גולמיים שממילא מועלים ל-NotebookLM לצורך תמצות/פלאשקארדים (ראו סעיף 5) יכולים להפיק גם פרק "פודקאסט" קצר ליחידת אזור, כאמצעי חזרה נוסף (למשל להאזנה בדרך).
**כלי:** NotebookLM (Audio Overview).
**עבודה נדרשת:** בינונית — ההפקה עצמה חד-כפתורית וללא צורך בעריכת קוד, אבל יש להאזין ולוודא שהתוכן נאמן למקור לפני פרסום (ראו הסתייגות המחקר: אפילו כלים "מוארקים במקור" יכולים להוסיף ניסוחים/הסקות מעבר למקור בסיכום). קלוד לא יכול להפיק את קובץ האודיו בעצמו (אין לו כלי ייצור אודיו מתועד) — זה נשאר שלב ידני של המורה/מפעיל ה-NotebookLM, ולאחר מכן קובץ האודיו המוגמר מועבר לקלוד/קלוד-קוד רק לצורך שילוב טכני באתר (הוספת נגן, קישור, וכו').

### 2. תמונות דקורטיביות/אווירה, בנפרד מתמונות לימודיות — הרעיון השני של המורה
כיום תמונות באתר משמשות אך ורק למטרות לימודיות (זיהוי אתרים, תצלומים מאושרים ממקור jerusalem-tour). קיים כלל "לא מקורות תמונה חיצוניים ללא אישור מפורש" שחל על תמונות לימודיות-עובדתיות. יצירת תמונה (Nano Banana Pro, מבוסס Gemini 3 Pro) מתאימה בדיוק לפער השונה: תמונות דקורטיביות מוצהרות כמלאכותיות (רקעי עמוד, מפרידי סקשן, אקצנטים צבעוניים) — לא "תמונת אמת" שצריכה לעמוד בכלל האישור החמור, כי היא לא טוענת לייצג מקום/עובדה אמיתיים. יתרון קונקרטי שעלה במחקר: Nano Banana Pro מצטיין ברינדור טקסט מדויק וקריא בתוך תמונה, כולל בשפות שונות — כלומר אפשר לבקש דקורציה עם כיתוב עברי (למשל כותרת אזור בעיצוב גרפי) בלי שהטקסט יתפרק.
**כלי:** Gemini / Nano Banana Pro (חלופה: GPT Image 2, גם הוא מצוין לפוסטרים/דיאגרמות עם טקסט, לפי OpenAI עצמה).
**עבודה נדרשת:** נמוכה-בינונית — יצירת התמונה מהירה, אבל נדרשת בדיקת קלוד/מורה שהתמונה אכן מסומנת ומוצגת כדקורטיבית-מלאכותית ולא מתערבבת ויזואלית עם התמונות הלימודיות המאושרות (כדי לא לטשטש את ההבחנה "זו תמונת אמת מאושרת" מול "זו דקורציה גרפית").

### 3. מפת מושגים חזותית (Mind Map) לכל נושא/אזור
NotebookLM מפיק "Mind Maps" ישירות מתוך המקורות שהועלו (Studio panel, מאושר במחקר). זה שונה מפלאשקארדים — מפה חזותית של הקשרים בין מושגים ביחידה, יכולה לשמש כתרשים חזרה/אוריינטציה בתחילת יחידה, ומבוססת ישירות על החומר שהמורה סיפק (לא המצאה).
**כלי:** NotebookLM (Mind Map).
**עבודה נדרשת:** נמוכה — הפקה חד-כפתורית מאותם מקורות שכבר מועלים לצורך התמצות/פלאשקארדים ממילא, כך שאין עלות נוספת של איסוף חומר. נדרשת בדיקה שהמבנה ההיררכי שנוצר משקף נכון את התוכן, ולאחר מכן קלוד ממיר את זה ל-HTML/SVG סטטי באתר (הפלט של NotebookLM עצמו אינו קוד לאתר).

### 4. אינפוגרפיקת סיכום ליחידה (Infographic)
בנוסף למפת המושגים, ל-NotebookLM יש גם יכולת "Infographics" ייעודית (עודכנה פברואר 2026 יחד עם עריכת שקופית בודדת). זה יכול לשמש כפוסטר-סיכום חד-עמודי לכל אזור/נושא — משהו שהמורה יכול להדפיס או להציג כתקציר חזותי לפני מבחן, ישירות מהחומר הגולמי.
**כלי:** NotebookLM (Infographic).
**עבודה נדרשת:** בינונית — כמו סעיף 1, יש לבדוק נאמנות לתוכן המקור לפני שימוש, ולאחר מכן קלוד משלב את התוצר (כתמונה סטטית, לא כקוד חי) בעמוד היחידה הרלוונטית.

### 5. חילוץ פלאשקארדים/JSON למשחקי האתר עם מבנה נתונים קשיח
מעבר לפלאשקארדים הרגילים של NotebookLM (סעיף מס' 2 בטבלת ההאצלה), Gemini תומך ב-structured output מוגבל לפי JSON Schema (מאומת ב-2026 עבור סדרת Gemini 3). כלומר אפשר להזין ל-Gemini את אותו חומר גולמי ולבקש ישירות מבנה כמו `{"term": "...", "definition": "...", "region": "..."}` שמתאים כמעט 1:1 לפורמט שמשחקי ה-JS באתר צריכים, בלי שלב תיווך של המרה ידנית מטבלה חופשית ל-JSON.
**כלי:** Gemini (structured output / JSON Schema).
**עבודה נדרשת:** נמוכה מבחינת ניסוח, אך גבוהה יותר מבחינת בדיקת דיוק תוכני (חילוץ מונחים/הגדרות עלול "להשלים" הגדרה שלא מנוסחת במדויק במקור) — קלוד צריך לעבור על ה-JSON שנוצר מול המקור לפני שהוא נכנס לריפו כקובץ נתונים למשחק.

### 6. חילוץ הערות מתוך הרצאה מוקלטת (אודיו/וידאו) של המורה, אם קיימת
אם למורה יש הקלטת שיעור/הרצאה (אודיו או וידאו) ולא רק מצגות/PDF, ל-Gemini 3.1 Pro יש טווח קליטה מולטימודלי מתועד של עד 8.4 שעות אודיו רציף או עד שעה של וידאו בפרומפט בודד — זה מאפשר להזין הקלטה גולמית ולקבל ממנה תמליל/תמצית מובנית, בלי תמלול ידני מוקדם. שימו לב: זה שונה מסעיף 1 — שם NotebookLM *מייצר* אודיו מתוכן טקסטואלי; כאן Gemini *קולט* אודיו/וידאו קיים ומפיק ממנו טקסט מובנה.
**כלי:** Gemini 3.1 Pro (קליטה מולטימודלית).
**עבודה נדרשת:** גבוהה יחסית — פלט כזה מתוכן דובר, לא ממסמך כתוב, דורש בדיקת דיוק קפדנית יותר (עמידה בכלל "לחלץ ולא להמציא"), ולאחר מכן קלוד משלב את התמצית המאומתת כטקסט רגיל ביחידה.

### מה לא מספיק מבוסס כדי להמליץ עליו כרגע
לא אותרה יכולת API/אוטומציה ל-NotebookLM (ראו "מה לא הצלחתי לאמת" למעלה) — כלומר כל חמשת הרעיונות מעל שמבוססים על NotebookLM (סעיפים 1, 3, 4) יישארו שלב ידני-חד-פעמי-לכל-יחידה של המורה/המפעיל, ולא ניתן כרגע לשלב אותם כתהליך אוטומטי שקלוד-קוד מפעיל בעצמו מקצה לקצה.

---

## Practical delegation table

| Task | Best current option | Why | Runner-up |
|---|---|---|---|
| 1. Extract/summarize long PDF/PPTX/DOCX teacher material | **NotebookLM** (for grounded, low-hallucination extraction with citations back to source) or **Gemini 3.1 Pro** (if you need it folded into a chat/agent flow, thanks to 1M context) | NotebookLM is purpose-built for exactly this — RAG-grounded, citation-backed, and reportedly far lower hallucination than general chat (13% vs 40% in one 2026 comparison, though that specific figure is a single third-party claim). Per-source cap (500K words/200MB) comfortably covers a single region's materials. | Claude — rated best in a 2026 blind 220-page-PDF summarization test, but has no source-grounding/citation mechanism, so still needs spot-checking |
| 2. Structured flashcard/term-definition pairs → spreadsheet, or JSON game data | **NotebookLM's built-in Flashcards feature** (April 2026 upgrade) for a fast first pass, exported/copied into a sheet; **Gemini 3 API with JSON Schema constraints** if you need machine-clean JSON for the site's game data specifically | NotebookLM's flashcards are grounded in the actual source and now include topic summaries/regenerate. Gemini's schema-constrained structured output is the more reliable machine-readable path when precise JSON shape matters (front/back fields, no markdown wrapper). | Claude — can produce clean JSON too, but has no schema-enforcement feature as clearly documented as Gemini's |
| 3. Posters / flowcharts / diagrams / icons | **Gemini's Nano Banana Pro** image model | Explicitly marketed by Google for "infographics" and "turning notes into diagrams," with a specific strength in legible in-image text across languages — directly relevant for Hebrew-labeled posters/flowcharts. | ChatGPT/GPT Image 2 (Apr 2026) — also does posters/labeled diagrams/timelines per OpenAI's own examples. Claude cannot do this natively (no image model; would need an MCP image tool) |
| 4. CSS/visual design suggestions (not committing code) | **Claude**, with Codex as a secondary drafting source (matches current setup) | 2026 comparisons consistently rank Claude ahead on UI/CSS quality ("leads by a meaningful margin"); this matches the existing workflow's choice to route design/CSS-adjacent thinking toward Claude, with Codex generating drafts for review. | Gemini for responsive-design/Grid-Flexbox specific suggestions, per one 2026 comparison naming that as a Gemini strength |
| 5. Autonomous multi-file coding in this actual repo | **Not Codex directly (per current, defensible restriction) — Claude Code** | Aug 2026 comparison: Claude Code output rated cleaner by blind reviewers 67% vs Codex 25% on a comparable refactor task, despite Codex being ~10x cheaper and comparably capable on raw agentic benchmarks (Terminal-Bench). For a small, hand-maintained educational codebase where following existing conventions matters, Codex's current use as a draft-only, non-committing tool is well justified by this data, not just caution. | Codex remains useful as a fast/cheap "second opinion" or bulk draft generator, reviewed and applied by Claude Code — same shape as today's workflow |
| 6. Browser/tool-use autonomy (operate NotebookLM, click through UIs) | **Claude (Claude Code / the "B" session)** — already the only one in this project with real agentic browser access | No evidence found that NotebookLM or Gemini's consumer app have an API or are otherwise drivable by an agent; they appear to be manual web UIs. Bringing NotebookLM into the pipeline currently means a **human uploads to NotebookLM and hands off the output** — Claude Code cannot yet drive NotebookLM itself end-to-end based on available evidence. | None found — flag this as a real gap if full automation of the pre-processing step is a goal |
| 7. Raw context window (most material ingested in one go) | **Gemini 3.1 Pro** (1M tokens, plus up to 900 images/8.4 hrs audio/1 hr video per prompt) — tied with **Claude Sonnet 5 / Opus 5** (also 1M tokens as of mid-2026) | Both hit 1M tokens; Gemini's edge is native multimodal ingestion limits (images/audio/video) alongside text, useful if source material includes scanned slides, images, or recorded lectures. | GPT-5.5/5.6 — also recommended for large documents (e.g., "400-page case files") in a 2026 practical-use roundup, though I did not find as precise a token-limit figure as for Claude/Gemini |
| 8. Cost/access for a hobbyist teacher | **NotebookLM free tier + Gemini free tier** for pre-processing; **Claude free/Pro ($20/mo, $17/mo annual)** for the existing Claude Code workflow | NotebookLM's free 50-sources-per-notebook cap is generous for one region/unit at a time. Claude is the only one of the big three with a documented annual discount at the $20 tier. ChatGPT's free tier is comparatively the most restrictive ("10 GPT-5.5 messages every 5 hours" per a 2026 pricing roundup), making it the least attractive free option here. | All three chat products (Claude/GPT/Gemini) have usable free daily-capped tiers; Codex CLI requires an OPENAI_API_KEY (i.e., paid API usage, not just a ChatGPT subscription) if used outside the ChatGPT-embedded delegate mode |

---

## Recommended pipeline for this project, based on the above

1. **Raw PDF/PPTX/DOCX → structured outline + flashcards + a study mind-map:** upload to **NotebookLM** (one notebook per region/unit, staying comfortably under the 500K-word/200MB per-source cap and the 50-source free-tier notebook cap). Use its built-in Flashcards/Mind Map/Infographic Studio outputs as the first draft. This is currently a **manual step** — no evidence of NotebookLM being agent-drivable.
2. **Flashcard pairs → clean spreadsheet-ready or game-JSON data:** either export NotebookLM's flashcards directly, or re-run the term/definition extraction through **Gemini with a JSON Schema** for a machine-clean shape if the site's game format needs strict fields.
3. **Posters/flowcharts/diagrams with Hebrew labels:** **Gemini's Nano Banana Pro** image model, given its documented strength in accurate multi-language in-image text — worth a direct trial given it's specifically called out for infographics/diagrams-from-notes.
4. **CSS/design polish drafts:** keep routing to **Codex for drafts** as today, with **Claude** reviewing/refining given its measured edge on UI/CSS quality — no change recommended here, current setup matches what the 2026 comparisons support.
5. **Actual repo commits, Apps Script deploys, multi-file changes, live QA:** keep this on **Claude Code / the "B" session** — the cleanliness-vs-cost tradeoff data (67% vs 25% blind-preference for Claude Code's output over Codex's on a comparable task) directly supports keeping Codex out of direct repo writes for this project, consistent with the existing restriction.

---

## Notes on what I could NOT verify

- No first-party Google page was found confirming NotebookLM has an API for programmatic use, or that it can be driven by a browser-automation agent — treated as an open gap, not a confirmed absence.
- The "13% NotebookLM vs 40% ChatGPT/Gemini" hallucination figure comes from a single secondary source, not a Google-published benchmark I could locate directly — flagged as directional, not verified.
- I did not find a precise numeric context-window figure for GPT-5.5/5.6 in ChatGPT's consumer product (as opposed to the API) comparable to the Claude/Gemini 1M-token figures — sources recommend it for long documents but without a specific number I could confirm.
- Exact current (Aug 26 2026) NotebookLM and Gemini free-tier limits could shift again before you read this — these products changed pricing/limits multiple times within 2026 already (e.g., Google's June 2026 Gemini pricing restructure), so re-check before relying on exact numbers for a paid-tier decision.

---

### Sources (approximate dates as found)

- morphllm.com/claude-context-window (2026)
- secondtalent.com "Every Claude AI Model Compared & Explained" (Aug 2026)
- morphllm.com/comparisons/codex-vs-claude-code (Aug 2026)
- help.openai.com "Model Release Notes" (2026, GPT-5.1 deprecation ~Mar 11 2026)
- techcrunch.com "OpenAI releases GPT-5.5 Instant" (May 5, 2026)
- openai.com/index/gpt-5-6 (2026)
- bhavishyapandit9.substack.com "Everything About Codex 2026"
- contextstudios.ai "Codex App vs Codex CLI/IDE" (2026)
- deepstation.ai "What Is OpenAI Codex" (2026)
- deepmind.google/models/model-cards/gemini-3-1-pro (Feb 19, 2026 release)
- ai.google.dev/gemini-api/docs/gemini-3 and /structured-output
- blog.google "Nano Banana Pro" and deepmind.google/models/gemini-image/flash (2026)
- digitalocean.com "What Is NotebookLM? Features and How to Use It in 2026"
- geeky-gadgets.com "NotebookLM Mind Maps, Flashcards & Quizzes for Faster Studying" (2026)
- notebooklm-guide.com "NotebookLM Quiz & Flashcard Upgrade" (April 2026)
- elephas.app, superlore.ai, notebooktools.com — NotebookLM source-limit trackers (dated Aug 10, 2026 and 2026 generally)
- xda-developers.com "I made ChatGPT, Claude, and Gemini summarize the same 200+ page PDF" (2026)
- suprmind.ai "Latest AI Hallucination Rates & Benchmarks" (Aug 2026)
- appwrite.io "Claude vs GPT vs Gemini for developers" (2026)
- neelnetworks.com, mindstudio.ai "ChatGPT vs Claude vs Gemini" (2026) — CSS/web-design comparisons
- ai-toolbox.co "Hebrew and Arabic Broken in ChatGPT and Claude" and kolbo.ai "Best AI Tools with Hebrew Support" (2026)
- morphllm.com "ChatGPT vs Claude vs Gemini" (June 2026) — pricing
- godofprompt.ai, blog.stackademic.com — Claude image-generation absence (April 2026 reaffirmation)
- openai.com "The new ChatGPT Images is here"; Wikipedia "GPT Image" (2026, GPT Image 1.5 Dec 2025 / GPT Image 2 Apr 2026)
