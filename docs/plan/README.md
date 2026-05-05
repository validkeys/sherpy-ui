# Sherpy onboarding — wireframe handoff

This is the working set for the Sherpy onboarding flow. The artifact is a single
HTML wireframe document that walks the full happy-path with one branch (skip-to-interview).
Frames render in a hand-drawn sketch style intentionally: this is **wireframe-fidelity**.
Decisions about layout, sequencing, and interaction patterns are committed; pixel-level
visuals are deliberately not.

---

## What's in here

```
docs/plan/
├── README.md                            ← you are here
├── frames/                              ← per-frame PNGs (980×600 inner, ~960px wide outer)
│   ├── 01-A-blank-thread.png
│   ├── 02-B-intake-prompt.png
│   ├── 03-C-gaps-generated.png
│   ├── 04-D-awaiting-fill.png
│   ├── 05-E-merging.png
│   ├── 06-F-resolved.png
│   ├── 07-G-business-interview.png
│   ├── 08-H-ask-back.png
│   ├── 09-I1-first-question.png
│   ├── 10-I2-mid-interview.png
│   ├── 11-I3-mid-chat.png
│   ├── 12-I4-after-chat.png
│   └── 13-I5-complete.png
└── source/                              ← live, openable wireframe
    ├── Sherpy Onboarding Wireframes.html  ← open this in a browser
    ├── colors_and_type.css
    ├── design-canvas.jsx
    ├── interview-flow.jsx
    ├── tweaks-panel.jsx
    └── wireframes.jsx
```

To open the live version: open `source/Sherpy Onboarding Wireframes.html` in any modern
browser. No build step. The file uses `<script type="text/babel">` so JSX compiles
in-browser via the pinned Babel runtime.

---

## The flow at a glance

The onboarding is one timeline with two starting points and a mid-flow escape hatch.

```
                                         ┌── "I have a doc"  (most common)
   A · Blank thread  ──── starts ────────┤
   (pick your start)                     └── "I have an idea" (fast path → skip to G)

   B · Intake captured                    Sherpy has the source material;
                                          web-app shell takes over.

   ── Gap analysis cycle ──────────────────────────────────────────────
   C · Gaps generated                     9 gaps detected. Worksheet ready
                                          to download. "Skip to interview" available.

   D · Awaiting filled worksheet          Run paused. Drop-zone for filled doc.
                                          "Skip to interview" still available.

   E · Merging answers                    AI reads the doc row-by-row;
                                          rows flagged filled / review / pending.

   F · Worksheet resolved                 One row flagged for review; rest accepted.
                                          Primary CTA flips to "Begin interview →".

   ── Business interview ──────────────────────────────────────────────
   G · Q&A thread                         Sherpy asks; user answers via stacked
                                          option cards or free text.

   H · Ask-back inline                    User taps "? Ask" — current Q paused,
                                          aside opens above composer, × resumes.

   I1–I5 · Interview detail               Same surface as G/H, captured at five
                                          different moments to show transitions.

   ── Complete ────────────────────────────────────────────────────────
   I5 · Document generating               Closing success divider; centered done state.
```

---

## Frame-by-frame notes

### A · Blank thread — pick your starting point  (`01-A-blank-thread.png`)

Pre-flight. Outside the run. The user sees only the prompt **"What are you bringing in?"**
and two cards: *I have a doc* (most common, ~5 min) and *I have an idea* (fast path).
The full app shell (left rail with workspaces and recent runs) is visible, but the
phase rail across the top is greyed — the run has not started.

**Why two entry points:** new users without a written brief should not be forced
through gap analysis on an empty document. They go straight to G.

### B · Intake captured  (`02-B-intake-prompt.png`)

Source material has been pasted/uploaded. Phase 01 ("Gap analysis") is now active
in the rail. Sherpy confirms what it parsed and offers to start. This is the last
moment before generation begins.

### Gap analysis cycle (C → D → E → F)

The gap analysis is **a loop, not a single step**. Sherpy generates the gap list,
hands it to a human to fill (offline), reads the filled doc back, and flags which
rows are good / need review / still missing. The user can leave the loop at any
point via "Skip — start business interview →" in the chrome header.

#### C · Gaps generated  (`03-C-gaps-generated.png`)

Sherpy returns a worksheet of 9 detected gaps: numbered rows, category column,
the question itself, and a **why-it-matters** reasoning line (`↳ Doc states 'measure
outcomes' but no metric defined.`). The primary CTA is **"Build worksheet"** which
downloads a `.docx`. The skip-to-interview escape sits in the top-right.

The worksheet is the hand-off artifact: it's what the user takes to a stakeholder
meeting or shares in Slack. It exists outside Sherpy on purpose.

#### D · Awaiting filled worksheet  (`04-D-awaiting-fill.png`)

Run is paused. The center is a **large dashed drop-zone**: "Drop the filled
worksheet here". Sidebar shows `0 of 9 filled` and the timestamp of the last
download. The skip-to-interview affordance is doubled up — once in the chrome
header (consistent with C/E) and once inline below the drop-zone, since the user
might decide to skip after looking at the empty worksheet.

#### E · Merging answers  (`05-E-merging.png`)

The user has uploaded the filled doc. Sherpy reads it row-by-row, animating
through each gap. Each row shows a status pill: `✓ filled`, `⚠ needs review`,
`◐ merging`, or pending (no pill). A progress bar runs along the worksheet
header. The "Begin interview" CTA is **disabled** until merge completes.

#### F · Worksheet resolved  (`06-F-resolved.png`)

All rows merged. Most are `✓ filled`; one row (the constraint about the launch
date) is `⚠ needs review` — Sherpy detected ambiguity in the answer and wants
the user to confirm during the interview. The CTA flips green: **"Begin
business interview →"**.

### Business interview (G, H)

The business interview is a structured Q&A thread. Sherpy asks one question at
a time, with a small `?` Ask affordance the user can use to query Sherpy without
losing the question's place in the thread.

#### G · Mid-interview Q&A thread  (`07-G-business-interview.png`)

The active question is at the top of the conversation area, with stacked option
cards below. The first option carries a `recommended` badge. Below the cards
is a free-text composer with smart suggestion chips above it. The phase rail
shows phase 02 ("Business interview") active.

#### H · Ask-back inline  (`08-H-ask-back.png`)

User has tapped `? Ask`. The current question dims slightly; an aside panel
opens **inline above the composer**, preserving thread context. A close × in
the aside header resumes the question. This is the same surface as G — no
modal, no route change.

### Interview detail (I1–I5)

Same surface as G/H captured at five different moments. These are the frames
to use when walking through interview-specific behavior.

| Frame | Moment | What's happening |
|---|---|---|
| I1 | First question | Success divider closes the gap loop; question 01 of N appears. The denominator is intentionally absent — it surfaces only on completion. |
| I2 | Mid-interview | A typical question with stacked option cards. First option badged "recommended". |
| I3 | Mid-chat | Aside is open above the question; question is dimmed; Sherpy is mid-response. |
| I4 | After chat | Aside collapses to a small `chatted · 4 msgs` pill above the question. The recommended option is selected and Send is live. |
| I5 | Complete | Closing success divider; centered done state with sweep progress + checklist. Document is generating. |

---

## Key interaction decisions

These are the decisions the design is committing to. Pixel-level visuals are not.

1. **One surface, one timeline.** Gap analysis and the business interview live in
   the same web-app shell with the same conversation thread. There is no modal,
   no separate route, no "wizard mode."

2. **Skip-to-interview is always available during gap analysis.** It's in the
   chrome header for C/D/E. The user can bail out at any point and answer the
   open gaps verbally during the interview instead. F is the natural exit so
   it doesn't show the skip affordance.

3. **The worksheet is a real artifact.** It's a `.docx` the user downloads, fills
   offline (potentially with multiple stakeholders), and uploads back. The
   product respects that this work happens outside the app.

4. **Status pills, not progress percentages, during merge.** Per-row status
   (`✓ filled` / `⚠ needs review` / `◐ merging` / pending) is more useful than a
   single percentage because the user is going to act on the flagged rows
   individually in the next phase.

5. **Ask-back is inline, not modal.** Tapping `?` opens an aside above the
   composer that preserves the question's position in the thread. After the
   aside collapses, a `chatted · N msgs` pill remains as a breadcrumb that
   the conversation happened (frame I4).

6. **No question denominator until the end.** Questions count up (`question 01`,
   `question 02`...) but Sherpy doesn't commit to a total because it adapts
   based on answers. The denominator appears only on completion (frame I5).

7. **"Recommended" is editorial, not statistical.** When Sherpy flags an option
   as recommended, it's because of context-specific reasoning, not a confidence
   score. The label is a single word; the reasoning lives in the option card body.

---

## Open questions for next round

- **Frame F → G transition.** F has a `⚠ needs review` row. Does the interview
  open with that flagged question, or is it queued mid-interview when its
  topic comes up naturally? Current assumption: queued naturally.
- **Multiple worksheet uploads.** What if the user uploads a partially-filled
  worksheet, then uploads a more-complete one later? E currently assumes a
  single upload event. The "v2" naming in F implies versioning is in the
  model — the UI doesn't surface it yet.
- **Phase rail labels.** The rail shows ~9 phases. The first two (Gap analysis,
  Business interview) are designed; the rest are placeholders. They need
  product input before the next iteration.
- **Mobile.** This handoff is desktop-only. Whether the gap-analysis cycle is
  even possible on mobile (the worksheet doc round-trip) is a strategic question.

---

## How to extend the wireframe

The HTML file is structured so each frame is its own React component. To add
or modify a frame:

1. Open `source/wireframes.jsx`. Each frame component is named `D2_*` (Direction 02
   = Thread, the only direction in this handoff) or `I_*` (interview details).
2. The components use a shared `<PhaseRail>`, `<Sidebar>`, and `<ChromeHeader>`
   so layout stays consistent across frames.
3. Pencil/sketch styling comes from the `<PencilDefs>` SVG filter component
   (`url(#pencil-soft)`). Don't remove the filter wrapper — it's what makes
   the frames read as wireframes rather than mocks.
4. To add a new frame to the storyboard: add the component, then drop a
   `<DCArtboard>` referencing it inside the relevant `<DCSection>` in the
   bottom of `wireframes.jsx`.

---

*Generated as part of the Sherpy onboarding wireframe handoff.*
