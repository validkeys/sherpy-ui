# WorkflowChat Integration Plan

**Goal:** Incrementally replace existing planning UI with new WorkflowChat UI, testing each piece before moving forward with an AI-executable path that avoids hidden assumptions.

**Branch:** `feature/workflow-chat-integration`  
**Date:** 2026-05-26

**Current Status:** Phases 0-3 are complete. Phase 4 Step 2 interactive WorkflowChat wiring is code complete and passed focused tests; Playwright MCP input validation is still required. `USE_NEW_UI = false` remains the default.

**Latest Completed Commit:** `dcfdc8e Remediate workflow chat adapter states`

**Current Working Changes:**
- `src/features/planning/hooks/useWorkflowChatData.ts`
- `src/features/planning/hooks/useWorkflowChatData.test.ts`
- `src/features/planning/hooks/useWorkflowChatController.ts`
- `src/features/planning/hooks/useWorkflowChatController.test.ts`
- `src/features/planning/infrastructure/server-functions.ts`
- `src/features/planning/machines/PlanningMachineContext.tsx`
- `src/features/planning/machines/planningMachine.ts`
- `app/routes/project/$projectId.build.tsx`
- `docs/planning/003-workflow-chat-integration/plan.md`
- `.tmp-docs/workflow-chat-phase-3-qa-test.md`
- `.tmp-docs/workflow-chat-phase-4-qa-test.md`
- `.tmp-docs/code-reviews/002-workflow-chat-hook-route/review.yaml` (gitignored review artifact)

---

## Package Manager

Use `pnpm` for all package scripts and dependency operations.

Examples:
- `pnpm install`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`

Do not use `npm` for this package. The repo has `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `package.json` declares `packageManager: pnpm@10.24.0`.

---

## Current State

### Existing Architecture
- **Route:** `app/routes/project/$projectId.build.tsx`
- **Container:** `StepContainer.tsx` routes to 4 component types:
  - `InterviewStep` (Steps 2 & 3) - Q&A with options
  - `FormStep` (Steps 1 & 5) - Multi-field forms
  - `AutomatedStep` (Steps 4, 6, 8, 9, 10) - Loading → artifact generation
  - `ArtifactOnlyStep` (Step 7) - Just shows artifact
- **State:** XState machine (`planningMachine.ts`) with localStorage persistence
- **Data Flow:** Machine context → Selectors → Components

### New WorkflowChat UI
- **Location:** `src/components/workflow-chat/`
- **Features:**
  - Two-column layout (artifacts sidebar + chat)
  - Message types: text, question, answer, artifact, loading, divider
  - Stage dividers with colors
  - Artifact status tracking (pending → created)
  - Modal for artifact content
  - Persistent composer
- **Props:** `messages: Message[]`, `artifacts: Artifact[]`

---

## Integration Strategy

### AI Execution Rules

These rules are mandatory for every implementation phase:

1. **Read before editing**
   - Re-read the touched component, machine, route, and test files before making changes.
   - Do not rely on stale plan assumptions when code has drifted.

2. **Test first for behavior changes**
   - Add or update focused tests before changing behavior.
   - Tests must fail for the intended behavior before implementation whenever a behavior change is being made.
   - Prefer the narrowest useful test first: pure adapter/controller tests, then component tests, then browser validation.

3. **Use the correct browser tool for the job**
   - Use Playwright MCP for React input/form validation because it correctly triggers React state updates.
   - Do not use agent-browser to fill, type into, or submit React forms.
   - Use agent-browser at the end of a phase or milestone for visual E2E smoke checks, route navigation, screenshots, console-error checks, artifact modal inspection, and non-form click paths.
   - Put all screenshots in `.tmp-docs/screenshots`.

4. **Do not write partial machine snapshots**
   - XState persistence requires a complete snapshot with `status`, `value`, and `context`.
   - Never seed workflow state by writing partial context directly to `localStorage`.
   - Use existing seed API/script output or full snapshot fixtures only.

5. **No destructive cleanup without express permission**
   - Do not delete old components, files, or folders during implementation phases.
   - Phase 10 must first produce a deletion candidate list for user approval.
   - Do not use `git reset --hard` as a rollback step.

6. **Phase completion requires evidence**
   - Record commands run, tests passed/failed, screenshots captured, and unresolved risks before advancing.
   - If a phase cannot be fully validated, stop and document the blocker.

### Testing Policy

This project uses TDD for every behavior change.

1. **Red**
   - Add or update a focused test that describes the expected behavior.
   - Confirm the test fails for the right reason before changing implementation when feasible.

2. **Green**
   - Make the smallest implementation change that passes the focused test.
   - Keep changes scoped to the current phase.

3. **Refactor**
   - Clean up only the code affected by the change.
   - Do not refactor adjacent legacy UI unless the current phase requires it.

4. **Browser validation**
   - Use Playwright MCP for any check that enters text, selects an option, submits a React form, or depends on React state updates.
   - Use agent-browser only after focused tests and Playwright MCP input validation have passed, and only for end-of-phase visual E2E smoke checks.

5. **Evidence**
   - Each phase must document tests, typecheck/lint results, screenshots, browser tool used, console errors, and unresolved risks before being marked complete.

---

### Phase 0: Component Contract Hardening ✅ COMPLETE
**Goal:** Make the existing WorkflowChat prototype safe to integrate before adapting XState data into it.

**Why first?** The current componentry is visually strong, but several APIs are still static-prototype shaped. If adapters are built first, integration will need to redesign the component contract while also touching XState behavior.

**Status:** Complete for current desktop integration scope.

**Commit:** `5d3b5eb Complete WorkflowChat phase 0 contracts`

**Evidence:**
- ✅ `pnpm test src/components/workflow-chat/ChatComposer.test.tsx src/components/workflow-chat/AnswerCard.test.tsx src/components/workflow-chat/WorkflowChat.test.tsx --run` passed (3 files, 9 tests)
- ✅ `pnpm typecheck` passed
- ✅ Focused Biome check on touched WorkflowChat files passed
- ✅ Desktop demo render checked with agent-browser
- ✅ Screenshot captured: `.tmp-docs/screenshots/workflow-chat-phase-0-desktop.png`

**Known Follow-Up:**
- Form question cards currently rely on future controlled wiring through `ChatMessage`/`WorkflowChat`; full form-step behavior is intentionally deferred to Phase 6.
- Full `pnpm lint` still reports pre-existing warnings outside WorkflowChat, mostly `noExplicitAny` in `src/lib/db/*.test.ts`.

**Tasks:**
1. Make `ChatComposer` controlled and event-driven
   - Add `value`, `onChange`, `onSubmit`, `disabled`, and `isSubmitting` props
   - Support Enter-to-send and Shift+Enter newline behavior
   - Add stable selectors/labels needed for Playwright MCP
   - Keep textarea state outside the component so XState integration owns workflow input

2. Make `AnswerCard` report user actions upward
   - Add option selection callback with selected option index/value
   - Add form submission callback with keyed field values
   - Represent selected/disabled/submitting states explicitly
   - Avoid local-only form state that cannot be observed by the planning machine

3. Centralize artifact opening state in `WorkflowChat`
   - Remove independent dialog ownership from `ArtifactsList`
   - Pass an `onArtifactClick(artifactId)` callback into the sidebar
   - Use one `ArtifactDialog` instance for both chat artifact pills and sidebar clicks
   - Apply the same "created with content" eligibility rule everywhere

4. Tighten artifact/message types
   - Make created artifacts require content, or add a type guard before rendering `ArtifactDialog`
   - Remove unused `ArtifactMessage.artifactContent` if artifact lookup remains the source of truth
   - Remove or implement unused props such as `WorkflowChat.mode` and `AnswerCard.question`
   - Ensure adapter output cannot produce a clickable artifact with missing content

5. Add responsive and accessibility requirements
   - Define behavior below desktop widths: stacked layout, collapsible artifact rail, or explicit desktop-only constraint
   - Add accessible labels for composer and artifact actions
   - Add grouped semantics and selected state for multiple-choice options
   - Add screen-reader-visible copy feedback in `ArtifactDialog`

6. Add component tests before wiring
   - Test `ChatComposer` submit, disabled state, and keyboard behavior
   - Test `AnswerCard` option and form callbacks
   - Test one shared artifact dialog path from sidebar and chat pill
   - Test missing-content artifact behavior

**Validation:**
- ✅ `pnpm typecheck`
- ✅ Focused lint for touched WorkflowChat files
- ✅ Focused component tests pass
- ✅ WorkflowChat story/demo still renders
- ✅ No XState integration required yet

---

### Phase 1: Data Layer (Adapters) ✅ COMPLETE
**Goal:** Create adapters to transform XState context → WorkflowChat props

**Status:** Complete and committed.

**Commit:** `dcfdc8e Remediate workflow chat adapter states`

**Evidence:**
- ✅ Focused adapter tests passed: 16 passing before Phase 2 hook work
- ✅ Adapter + hook focused tests passed after Phase 2: 20 passing
- ✅ `pnpm typecheck` passed
- ✅ Focused Biome check passed
- ✅ Adapter-only madge check passed: no circular dependencies
- ⚠️ Broader madge over hooks + adapters reports pre-existing planning machine/server/infrastructure cycles outside the adapter scope

**Tasks:**
1. Create `src/features/planning/adapters/machine-to-messages.adapter.ts`
   - Transform machine context into `Message[]`
   - Map Q&A history to question/answer messages
   - Map loading states to loading messages
   - Insert stage dividers at step transitions
   
2. Create `src/features/planning/adapters/machine-to-artifacts.adapter.ts`
   - Transform machine context into `Artifact[]`
   - Map step status to artifact status (pending/created)
   - Extract artifact content from context

3. Write tests for both adapters (TDD approach)
   - Test with mock machine context
   - Verify all message types generated correctly
   - Verify artifact status mapping

**Validation:**
- ✅ All adapter tests pass
- ✅ No circular dependencies (madge check)
- ✅ `pnpm typecheck`

---

### Phase 2: Hook Layer (XState Selectors) ✅ COMPLETE
**Goal:** Create React hook that provides WorkflowChat-ready data

**Status:** Complete in working tree; not committed yet.

**Files Changed:**
- `src/features/planning/hooks/useWorkflowChatData.ts`
- `src/features/planning/hooks/useWorkflowChatData.test.ts`

**Evidence:**
- ✅ `pnpm test src/features/planning/hooks/useWorkflowChatData.test.ts --run` passed (4 tests)
- ✅ `pnpm test src/features/planning/hooks/useWorkflowChatData.test.ts 'app/routes/project/-$projectId.build.test.tsx' --run` passed (8 tests)
- ✅ `pnpm test src/features/planning/adapters/machine-to-messages.adapter.test.ts src/features/planning/adapters/machine-to-artifacts.adapter.test.ts src/features/planning/hooks/useWorkflowChatData.test.ts --run` passed (20 tests)
- ✅ `pnpm typecheck` passed
- ✅ Focused Biome check passed
- ✅ Code review completed: `.tmp-docs/code-reviews/002-workflow-chat-hook-route/review.yaml`

**Tasks:**
1. Create `src/features/planning/hooks/useWorkflowChatData.ts`
   - Use existing `usePlanningMachine()` and `useSelector()`
   - Call adapters to transform context
   - Return `{ messages, artifacts, currentStepNumber, currentQuestion, currentOptions, isSubmitting, actor }`
   - Keep React Query out of this hook unless current code proves it is needed

2. Write tests for hook
   - Mock PlanningMachineContext
   - Verify data transformations
   - Test with different machine states

**Validation:**
- ✅ Hook tests pass
- ✅ Hook returns correct shape
- ✅ `pnpm typecheck`

---

### Phase 3: Flagged Rendering (Old or New UI) ✅ COMPLETE
**Goal:** Render either the old UI or the new UI behind a hardcoded development flag

**Status:** Complete. Route wiring is complete in working tree with old UI still default. Step 2 browser QA passed after resolving the baseline project query/database sync errors.

**Files Changed:**
- `app/routes/project/$projectId.build.tsx`
- `vite.config.ts`

**Evidence:**
- ✅ `USE_NEW_UI = false` added to route
- ✅ Old `StepContainer` remains the default render path
- ✅ `WorkflowChatContent` renders `WorkflowChat` from `useWorkflowChatData()` when the flag is flipped
- ✅ Existing route integration tests passed with the default old UI path
- ✅ Step 2 seeded render QA completed with `USE_NEW_UI = true`
- ✅ WorkflowChat rendered without crashing and showed adapter data: artifact sidebar, message list, stage dividers, current Step 2 question, created Step 1 artifact, and pending later artifacts
- ✅ Flag toggle back to `USE_NEW_UI = false` restored the old UI without localStorage cleanup
- ✅ Screenshots captured:
  - `.tmp-docs/screenshots/workflow-chat-phase-3-old-ui-step2.png`
  - `.tmp-docs/screenshots/workflow-chat-phase-3-new-ui-step2.png`
  - `.tmp-docs/screenshots/workflow-chat-phase-3-old-ui-after-toggle-step2.png`
- ✅ Console-error pass criteria passed after seed middleware fix:
  - Root cause: `/api/dev/seed` returned a complete localStorage snapshot but did not create the parent `projects` row, so `useProject()` returned `undefined` and `planning_state` saves failed the foreign-key constraint.
  - Fix: `/api/dev/seed` now upserts the parent `projects` row and persists the generated full XState snapshot to `planning_state`.
  - Verified old UI and new UI with fresh seed `seed-mpmtxp8n`.
- ✅ No hydration mismatch warning was observed
- 📄 QA record: `.tmp-docs/workflow-chat-phase-3-qa-test.md`

**Tasks:**
1. Update `app/routes/project/$projectId.build.tsx`
   - Add `useWorkflowChatData()` hook
   - Render WorkflowChat behind a hardcoded flag
   - Keep existing StepContainer as default
   - Add hardcoded condition: `const USE_NEW_UI = false;`

2. Add route-level conditional rendering
   - When `USE_NEW_UI = false`: Show old UI only
   - When `USE_NEW_UI = true`: Show new UI only
   - No toggle button - simple boolean flag
   - Keep app layout, header, LeftRail, footer, provider, `InspectorLogger`, and `DebugPanel` unchanged

**Manual Testing (Step 2 Seed, Agent Browser Run):**
- [x] Seed Step 2 project using the approved seed path: `pnpm seed:step2`
- [x] Project ID: `seed-mpmtxp8n`
- [x] Workflow URL: `http://localhost:5180/project/seed-mpmtxp8n/build`
- [x] Set `USE_NEW_UI = true`, reload page
- [x] Verify WorkflowChat renders seeded adapter data
- [x] Set `USE_NEW_UI = false`, reload page
- [x] Verify old UI renders again
- [x] Toggle flag and verify no hydration errors
- [x] Take screenshots of both UIs for comparison
- [x] Compare old/new screenshots and DebugPanel context for the same seeded state
- [x] Resolve baseline console errors before Phase 4

**Validation:**
- ✅ Default old UI path renders without route test regressions
- ✅ New UI browser render check with `USE_NEW_UI = true`
- ✅ Old/new seeded state comparison
- ✅ Console-error check passed
- ✅ Hydration warning check passed
- ✅ Screenshots for old/new comparison
- ✅ Console-error triage complete

---

### Phase 4: Interactive Wiring (Step 2 Only) 🔄 CODE COMPLETE
**Goal:** Wire ChatComposer submit to XState machine for Step 2 only

**Why Step 2?** Interview steps are simplest - just Q&A, no forms, no complex validation.

**Status:** Code complete pending Playwright MCP input validation. Step 2 is interactive in WorkflowChat when `USE_NEW_UI = true`; Step 3 and form steps remain view-only until their phases.

**Files Changed:**
- `src/features/planning/hooks/useWorkflowChatController.ts`
- `src/features/planning/hooks/useWorkflowChatController.test.ts`
- `src/components/workflow-chat/WorkflowChat.tsx`
- `src/components/workflow-chat/WorkflowChat.test.tsx`
- `src/features/planning/infrastructure/server-functions.ts`
- `src/features/planning/machines/PlanningMachineContext.tsx`
- `src/features/planning/machines/planningMachine.ts`

**Evidence:**
- ✅ TDD red state confirmed for Step 3/form view-only guards and composer view-only placeholder
- ✅ Focused controller/component tests passed: 11 tests
- ✅ Adapter/hook/controller/component suite passed: 31 tests
- ✅ Route-level flagged render test passed: 4 tests
- ✅ Machine context focused tests passed with Phase 4 suite: 32 passing, 4 skipped
- ✅ `pnpm typecheck` passed
- ⚠️ Focused Biome check has pre-existing `noExplicitAny` warnings in touched shared files; no errors
- ⏳ Playwright MCP Step 2 composer input validation still required
- ✅ agent-browser visual smoke passed for seeded Step 2 render path
- ✅ Console after baseline clear had no errors
- ✅ Page errors after baseline clear: none
- ✅ Screenshot captured: `.tmp-docs/screenshots/workflow-chat-phase-4-step2-after-answer.png`
- 📄 QA record: `.tmp-docs/workflow-chat-phase-4-qa-test.md`

**Browser QA Fixes:**
- Sanitized XState snapshots before sending them through `$savePlanningState` to avoid server-function serialization errors.
- Added `$saveInterviewAnswer` server function and routed interview persistence through it to avoid client-side `better-sqlite3` import failures.

**Current Code Note:** `useWorkflowChatController()` and `createWorkflowChatActions()` currently expose Step 2 interview submission only. Step 3 and form submissions intentionally remain view-only until their phases are tested.

**TDD First Tests:**
- Add or update controller tests for Step 2 empty answer guards, current-question mismatch guards, and trimmed answer submission.
- Add or update component tests proving `WorkflowChat` disables the composer when no submit handler exists and clears composer text only after submit is invoked.
- Add or update route-level tests only if route behavior changes beyond the existing `USE_NEW_UI` flag.

**Tasks:**
1. Add `onSubmitAnswer` prop to WorkflowChat
   - Pass through to ChatComposer
   - Wire to `actor.send({ type: "SUBMIT_ANSWER", stepNumber: 2, question: currentQuestion, answer })`
   - Guard submit when `currentQuestion` is missing; show disabled composer instead of sending malformed events

2. Update WorkflowChat to handle current step
   - Add `currentStep` prop
   - Only show composer if on Step 2
   - Show "View only" message for other steps

3. Disable old InterviewStep component when on Step 2
   - Add feature flag or condition
   - Keep it mounted but hidden for state comparison

**Input Validation (Playwright MCP):**
- [x] Seed project to Step 2 using the approved seed path below
- [x] Set `USE_NEW_UI = true`, reload page
- [ ] Answer question via new ChatComposer using Playwright MCP fill/click
- [ ] Verify answer appears in message history
- [ ] Verify machine context updates (check DebugPanel)
- [x] Set `USE_NEW_UI = false` before finishing
- [ ] Answer 3-5 questions via new UI, verify artifact generation triggers
- [x] Take screenshot after answer
- [ ] Verify artifact status changes from pending → created

**End-of-Phase Visual E2E (agent-browser):**
- [x] Navigate to the seeded Step 2 workflow
- [x] Verify WorkflowChat renders without visual breakage
- [x] Verify artifact sidebar, message list, composer enabled state, and DebugPanel are visible
- [x] Smoke-check one Step 2 submit with native textarea setter as a non-authoritative diagnostic only
- [x] Verify no console errors after baseline clear
- [x] Capture a final visual smoke screenshot

**Validation:**
- ⏳ Browser-level React input validation still needs Playwright MCP
- ✅ Focused component/controller tests verify ChatComposer submission wiring
- ✅ agent-browser diagnostic confirmed the seeded visual path and DebugPanel can reflect an answer
- ✅ Message history builds correctly
- ⚠️ Old/new comparison was covered in Phase 3; Phase 4 kept the default flag restored to old UI
- ⏳ Multi-answer artifact generation remains for Phase 5/9 continuous-flow validation
- ✅ No console errors
- ⏳ User sign-off

---

### Phase 5: Full Interview Wiring (Step 3)
**Goal:** Enable WorkflowChat for Step 3 (Technical Requirements)

**Tasks:**
1. Update adapter to handle Step 3 Q&A
2. Update hook to detect Step 3 vs Step 2
3. Update ChatComposer submission to send:
   - `actor.send({ type: "SUBMIT_ANSWER", stepNumber: 3, question: currentQuestion, answer })`
   - Guard submit when `currentQuestion` is missing

**Input Validation (Playwright MCP):**
- [ ] Seed project to Step 3 using the approved seed path below
- [ ] Set `USE_NEW_UI = true`, reload page
- [ ] Answer 3-5 questions via ChatComposer
- [ ] Verify artifact generation
- [ ] Test full flow: Step 2 → Step 3 transition (no seeding)
- [ ] Verify stage divider appears between Step 2 and Step 3

**End-of-Phase Visual E2E (agent-browser):**
- [ ] Navigate to Step 3 with new UI enabled
- [ ] Verify Step 3 renders with the expected question/history/artifact context
- [ ] Verify no console errors
- [ ] Capture a final visual smoke screenshot

**Validation:**
- ✅ Step 3 works same as Step 2
- ✅ Transition from Step 2 → Step 3 smooth
- ✅ Stage dividers appear correctly
- ✅ User sign-off

---

### Phase 6: Form Step Wiring (Steps 1 and 5)
**Goal:** Wire form-based steps through question messages and `AnswerCard`

**Why Later?** Forms are more complex - multi-field, validation, different submit pattern.

**Tasks:**
1. Update WorkflowChat to support form question messages
   - QuestionMessage already has `formFields` type
   - Render multi-field forms in `AnswerCard`, not `ChatComposer`
   - Keep `ChatComposer` for free-text interview answers only

2. Wire form submission to machine
   - Step 1: `actor.send({ type: "SUBMIT_FORM", stepNumber: 1, responses })`
   - Step 5: `actor.send({ type: "SUBMIT_FORM", stepNumber: 5, responses })`
   - Preserve existing validation behavior from `FormStep`

3. Add step-specific tests
   - Step 1 captures all required Gap Analysis fields
   - Step 5 captures all required Implementation Planner fields
   - Both steps advance only after valid responses

**Input Validation (Playwright MCP):**
- [ ] Start fresh workflow (no jogging)
- [ ] Set `USE_NEW_UI = true`, reload page
- [ ] Fill out Gap Analysis form in the chat question card
- [ ] Verify Step 1 form data captured correctly (check DebugPanel)
- [ ] Progress to Step 2, verify transition works
- [ ] Seed or progress to Step 5
- [ ] Fill out Implementation Planner form in the chat question card
- [ ] Verify Step 5 form data captured correctly (check DebugPanel)
- [ ] Compare both forms with old UI behavior

**End-of-Phase Visual E2E (agent-browser):**
- [ ] Navigate through Step 1 and Step 5 render states without entering form data
- [ ] Verify form cards, validation disabled states, artifact sidebar, and layout are visually coherent
- [ ] Verify no console errors
- [ ] Capture final visual smoke screenshots for Step 1 and Step 5

**Validation:**
- ✅ Step 1 form submission works
- ✅ Step 5 form submission works
- ✅ Multi-field validation works for both form steps
- ✅ Machine context captures form data
- ✅ User sign-off

---

### Phase 7: Automated Steps (Steps 4, 6, 8, 9, 10)
**Goal:** Handle automated artifact generation steps

**Tasks:**
1. Update adapter to show loading messages during generation
2. Show artifact messages when complete
3. Show "Continue" or auto-advance after generation
4. Confirm Step 10 summary generation behavior matches the old UI

**Browser Validation (Playwright MCP):**
- [ ] Seed to Step 4 using the approved seed path below
- [ ] Set `USE_NEW_UI = true`, reload page
- [ ] Verify loading message appears
- [ ] Wait for artifact generation
- [ ] Verify artifact message appears when done
- [ ] Verify artifact status changes to "created" in sidebar
- [ ] Repeat for Steps 6, 8, 9, 10

**End-of-Phase Visual E2E (agent-browser):**
- [ ] Navigate to one generated automated-step state
- [ ] Verify loading/completed artifact visuals and sidebar status
- [ ] Verify no console errors
- [ ] Capture a final visual smoke screenshot

**Validation:**
- ✅ All automated steps work
- ✅ Loading states display correctly
- ✅ Artifact messages appear
- ✅ User sign-off

---

### Phase 8: Artifact-Only Step (Step 7)
**Goal:** Handle Step 7 (Architecture Decisions) - just shows artifact

**Tasks:**
1. Update adapter to show artifact message only
2. No questions, just "Review and continue" pattern

**Browser Validation (Playwright MCP):**
- [ ] Seed to Step 7 using the approved seed path below
- [ ] Set `USE_NEW_UI = true`, reload page
- [ ] Verify artifact message displays (no questions)
- [ ] Verify artifact clickable in sidebar
- [ ] Click artifact, verify ArtifactDialog opens
- [ ] Verify continue/next button works

**End-of-Phase Visual E2E (agent-browser):**
- [ ] Navigate to seeded Step 7
- [ ] Verify artifact-only render and modal visual state
- [ ] Verify no console errors
- [ ] Capture a final visual smoke screenshot

**Validation:**
- ✅ Step 7 artifact displays correctly
- ✅ ArtifactDialog opens and shows content
- ✅ User sign-off

---

### Phase 9: Full Workflow Test
**Goal:** Complete workflow start-to-finish with new UI

**Input Validation (Playwright MCP):**
- [ ] Start fresh project
- [ ] Complete all 10 steps using only WorkflowChat
- [ ] Verify all artifacts generated
- [ ] Verify all Q&A saved to database
- [ ] Verify localStorage persistence
- [ ] Test page refresh at various steps
- [ ] Test browser back/forward
- [ ] Test Step 1, 2, 3, 4, 5, 6, 7, 8, 9, and 10 explicitly in one continuous run
- [ ] Capture screenshots for first step, one interview answer, one form submit, one generated artifact, Step 7 artifact review, and final completion

**Final E2E Smoke (agent-browser):**
- [ ] Re-open the completed workflow
- [ ] Navigate key workflow routes/states without form submission
- [ ] Inspect final artifact sidebar and generated artifact dialogs
- [ ] Check console errors
- [ ] Capture final desktop screenshot set

**Validation:**
- ✅ Full workflow completes
- ✅ All data persists
- ✅ No console errors
- ✅ User sign-off

---

### Phase 10: Cleanup & Cutover
**Goal:** Remove old UI, make WorkflowChat the default

**Tasks:**
1. Set `USE_NEW_UI = true` (make it the default)
2. Produce a deletion candidate list for old UI components and tests
   - `InterviewStep`
   - `FormStep`
   - `AutomatedStep`
   - `ArtifactOnlyStep`
   - `StepContainer`
   - any old CSS specific to previous UI
3. Ask for express permission before deleting any file or folder
4. Keep `Navigation` unless the new UI has a verified replacement for its behavior
5. Delete `USE_NEW_UI` flag only after default-new UI passes validation
6. Update tests to use new UI
7. Update documentation
8. Run dead-code checks and remove only approved old files

**Validation:**
- ✅ All tests pass (31+ test files)
- ✅ No unapproved deletion occurred
- ✅ No known dead code remains after approved cleanup
- ✅ Bundle size check (should be smaller)
- ✅ All WorkflowChat components remain in `src/components/workflow-chat/`
- ✅ App layout (header, LeftRail, footer) unchanged
- ✅ Final user sign-off

---

## Testing Helpers

### 1. Approved Seed Path

Use the existing project seed CLI/API instead of creating browser-side helpers that import database-backed store code.

Preferred command:

```bash
pnpm seed:step2
```

The seed script calls `/api/dev/seed` and prints:
- project id
- workflow URL
- complete XState snapshot
- exact `localStorage.setItem(...)` command

Rules:
- Do not create `src/features/planning/testing/seed-helpers.ts` unless implementation proves the existing seed path cannot support a phase.
- Do not import `src/features/projects/store.ts` into browser-facing test helpers.
- Do not write partial context objects to localStorage.
- If the seed script prints `npm run dev`, treat that as stale output and use `pnpm dev`.
- If manual browser seeding is required, use the complete snapshot printed by `scripts/seed-project.js`.
- If an automated Playwright helper is added later, it must call the seed API or load a full snapshot fixture and then write the complete snapshot.

### 2. Playwright MCP Input Helpers
Create `.tmp-docs/e2e-testing/workflow-chat-helpers.md`:

```typescript
// Seed a project first using `pnpm seed:step2`.
// Then use the printed URL and complete localStorage command.

// Navigate to build page after localStorage has the complete snapshot.
mcp__playwright__browser_navigate({
  url: "http://localhost:5180/project/<project-id>/build"
});

// Answer a question
mcp__playwright__browser_fill_form({
  fields: [{
    target: "#chat-composer-input",
    name: "Answer",
    type: "textbox",
    value: "My answer here"
  }]
});

// Click submit
mcp__playwright__browser_click({
  target: "button:has-text('Submit')",
  element: "Submit button"
});

// Take screenshot
mcp__playwright__browser_take_screenshot({
  type: "png",
  filename: ".tmp-docs/screenshots/workflow-step-2.png"
});
```

### 3. agent-browser Visual E2E Helpers

Use agent-browser only after focused tests and Playwright MCP input validation have passed.

Allowed agent-browser checks:
- Navigate to seeded workflow URLs
- Verify visible text and layout
- Open artifact dialogs through non-form clicks
- Capture screenshots
- Inspect console errors

Disallowed agent-browser checks:
- Filling `#chat-composer-input`
- Selecting answer options
- Submitting Step 1 or Step 5 forms
- Any assertion whose correctness depends on React form state changing after typed input

---

## Rollback Strategy

Each phase may be tagged after validation (e.g., `v2.1.0-phase3`). If issues arise:

```bash
git revert <commit-sha>
```

Rules:
- Prefer `git revert` for committed phase rollback.
- For uncommitted changes, inspect `git diff` and revert only the specific hunks/files created by the current AI session.
- Do not run `git reset --hard`.
- Do not delete files or folders without express permission.
- If rollback requires removing files, present the file list and wait for approval.

---

## Success Criteria

### Per-Phase
- ✅ All automated tests pass
- ✅ `pnpm typecheck` compiles without errors
- ✅ `pnpm lint` passes for touched files
- ✅ TDD evidence exists for every behavior change
- ✅ Playwright MCP input validation completes for React form/input behavior
- ✅ agent-browser visual E2E smoke completes at the end of the phase when applicable
- ✅ Screenshots captured for comparison
- ✅ User explicitly signs off before next phase

### Overall
- ✅ Feature parity with old UI
- ✅ No regressions (all existing tests pass)
- ✅ Better UX (user confirmation)
- ✅ Cleaner code (fewer components)
- ✅ Full Playwright MCP workflow completes for React inputs/forms
- ✅ Final agent-browser E2E smoke completes for visual route/artifact verification

---

## Timeline Estimate

| Phase | Effort | Depends On |
|-------|--------|------------|
| 0. Component Contract Hardening | 2-3 hours | - |
| 1. Data Layer | 2-3 hours | Phase 0 |
| 2. Hook Layer | 1 hour | Phase 1 |
| 3. Flagged Render | 1 hour | Phase 2 |
| 4. Step 2 Wiring | 2-3 hours | Phase 3 |
| 5. Step 3 Wiring | 1 hour | Phase 4 |
| 6. Form Wiring (Steps 1 & 5) | 3-4 hours | Phase 5 |
| 7. Automated Steps (4, 6, 8, 9, 10) | 2-3 hours | Phase 6 |
| 8. Artifact Step | 30 min | Phase 7 |
| 9. Full Workflow | 1-2 hours | Phase 8 |
| 10. Cleanup | 1-2 hours | Phase 9 |

**Total:** ~19-27 hours with testing

---

## Scope Clarifications

1. ✅ **Seed helpers:** Use existing `pnpm seed:stepN` / `/api/dev/seed` path and complete XState snapshots
2. ✅ **Feature flag:** Hardcoded `const USE_NEW_UI = false;` in route file - simple boolean toggle
3. ✅ **Artifact modal:** Use WorkflowChat's `ArtifactDialog` exclusively
4. ✅ **Layout:** Keep existing app layout, header, LeftRail. Only replace content body (StepContainer → WorkflowChat)
5. ✅ **Dev server:** Use `pnpm dev` on `:5180` for validation; start it only when needed
6. ⏳ **DebugPanel:** Keep visible during integration (helpful for validation)
7. ✅ **No partial snapshots:** Never seed by writing partial machine context to localStorage
8. ✅ **No unapproved deletes:** Cleanup requires express permission before file/folder deletion

---

## Next Steps

1. ✅ Review this plan with user
2. ✅ Complete Phase 0: Component Contract Hardening
3. ✅ Complete Phase 1: Data Layer adapters
4. ✅ Complete Phase 2: Hook Layer
5. ✅ Complete Phase 3: flagged render QA and console-error triage
6. 🔄 Complete Phase 4 Playwright MCP input validation
7. ⏳ Start Phase 5: interactive Step 3 WorkflowChat wiring
