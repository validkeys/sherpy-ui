# WorkflowChat Integration Plan

**Goal:** Incrementally replace existing planning UI with new WorkflowChat UI, testing each piece before moving forward with an AI-executable path that avoids hidden assumptions.

**Branch:** `feature/workflow-chat-integration`  
**Date:** 2026-05-26

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
   - For UI interaction, prefer component tests for contracts and Playwright MCP for browser validation.

3. **Use Playwright MCP for React form/browser validation**
   - Do not use agent-browser for React forms.
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

---

### Phase 0: Component Contract Hardening
**Goal:** Make the existing WorkflowChat prototype safe to integrate before adapting XState data into it.

**Why first?** The current componentry is visually strong, but several APIs are still static-prototype shaped. If adapters are built first, integration will need to redesign the component contract while also touching XState behavior.

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
- ✅ `pnpm lint`
- ✅ Focused component tests pass
- ✅ WorkflowChat story/demo still renders
- ✅ No XState integration required yet

---

### Phase 1: Data Layer (Adapters)
**Goal:** Create adapters to transform XState context → WorkflowChat props

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

### Phase 2: Hook Layer (XState Selectors)
**Goal:** Create React hook that provides WorkflowChat-ready data

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

### Phase 3: Flagged Rendering (Old or New UI)
**Goal:** Render either the old UI or the new UI behind a hardcoded development flag

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

**Manual Testing (Playwright MCP):**
- [ ] Seed or create a Step 1 project using the approved seed path below
- [ ] Set `USE_NEW_UI = true`, reload page
- [ ] Verify WorkflowChat renders without errors
- [ ] Set `USE_NEW_UI = false`, reload page
- [ ] Verify old UI renders (baseline comparison)
- [ ] Toggle flag multiple times, verify no hydration errors
- [ ] Take screenshots of both UIs for comparison
- [ ] Compare old/new screenshots and DebugPanel context for the same seeded state

**Validation:**
- ✅ Both UIs render without errors
- ✅ Both UIs show equivalent data when tested against the same seeded state
- ✅ No hydration warnings
- ✅ No console errors
- ✅ User sign-off on visual comparison

---

### Phase 4: Interactive Wiring (Step 2 Only)
**Goal:** Wire ChatComposer submit to XState machine for Step 2 only

**Why Step 2?** Interview steps are simplest - just Q&A, no forms, no complex validation.

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

**Manual Testing (Playwright MCP):**
- [ ] Seed project to Step 2 using the approved seed path below
- [ ] Set `USE_NEW_UI = true`, reload page
- [ ] Answer question via new ChatComposer (Playwright fill + click)
- [ ] Verify answer appears in message history
- [ ] Verify machine context updates (check DebugPanel)
- [ ] Set `USE_NEW_UI = false`, verify old UI matches
- [ ] Answer 3-5 questions via new UI, verify artifact generation triggers
- [ ] Take screenshots at key moments (before/after each answer)
- [ ] Verify artifact status changes from pending → created

**Validation:**
- ✅ Answers submit correctly via ChatComposer
- ✅ Machine state updates (verify with DebugPanel)
- ✅ Message history builds correctly
- ✅ Old and new UI show same data
- ✅ Artifact generation works
- ✅ No console errors
- ✅ User sign-off

---

### Phase 5: Full Interview Wiring (Step 3)
**Goal:** Enable WorkflowChat for Step 3 (Technical Requirements)

**Tasks:**
1. Update adapter to handle Step 3 Q&A
2. Update hook to detect Step 3 vs Step 2
3. Update ChatComposer submission to send:
   - `actor.send({ type: "SUBMIT_ANSWER", stepNumber: 3, question: currentQuestion, answer })`
   - Guard submit when `currentQuestion` is missing

**Manual Testing (Playwright MCP):**
- [ ] Seed project to Step 3 using the approved seed path below
- [ ] Set `USE_NEW_UI = true`, reload page
- [ ] Answer 3-5 questions via ChatComposer
- [ ] Verify artifact generation
- [ ] Test full flow: Step 2 → Step 3 transition (no seeding)
- [ ] Verify stage divider appears between Step 2 and Step 3

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

**Manual Testing (Playwright MCP):**
- [ ] Start fresh workflow (no jogging)
- [ ] Set `USE_NEW_UI = true`, reload page
- [ ] Fill out Gap Analysis form in the chat question card
- [ ] Verify Step 1 form data captured correctly (check DebugPanel)
- [ ] Progress to Step 2, verify transition works
- [ ] Seed or progress to Step 5
- [ ] Fill out Implementation Planner form in the chat question card
- [ ] Verify Step 5 form data captured correctly (check DebugPanel)
- [ ] Compare both forms with old UI behavior

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

**Manual Testing (Playwright MCP):**
- [ ] Seed to Step 4 using the approved seed path below
- [ ] Set `USE_NEW_UI = true`, reload page
- [ ] Verify loading message appears
- [ ] Wait for artifact generation
- [ ] Verify artifact message appears when done
- [ ] Verify artifact status changes to "created" in sidebar
- [ ] Repeat for Steps 6, 8, 9, 10

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

**Manual Testing (Playwright MCP):**
- [ ] Seed to Step 7 using the approved seed path below
- [ ] Set `USE_NEW_UI = true`, reload page
- [ ] Verify artifact message displays (no questions)
- [ ] Verify artifact clickable in sidebar
- [ ] Click artifact, verify ArtifactDialog opens
- [ ] Verify continue/next button works

**Validation:**
- ✅ Step 7 artifact displays correctly
- ✅ ArtifactDialog opens and shows content
- ✅ User sign-off

---

### Phase 9: Full Workflow Test
**Goal:** Complete workflow start-to-finish with new UI

**Manual Testing:**
- [ ] Start fresh project
- [ ] Complete all 10 steps using only WorkflowChat
- [ ] Verify all artifacts generated
- [ ] Verify all Q&A saved to database
- [ ] Verify localStorage persistence
- [ ] Test page refresh at various steps
- [ ] Test browser back/forward
- [ ] Test Step 1, 2, 3, 4, 5, 6, 7, 8, 9, and 10 explicitly in one continuous run
- [ ] Capture screenshots for first step, one interview answer, one form submit, one generated artifact, Step 7 artifact review, and final completion

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

### 2. Playwright Test Helpers
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
- ✅ Manual Playwright testing completes
- ✅ Screenshots captured for comparison
- ✅ User explicitly signs off before next phase

### Overall
- ✅ Feature parity with old UI
- ✅ No regressions (all existing tests pass)
- ✅ Better UX (user confirmation)
- ✅ Cleaner code (fewer components)
- ✅ Full E2E workflow completes

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
5. ✅ **Dev server:** Already running on `:5180`
6. ⏳ **DebugPanel:** Keep visible during integration (helpful for validation)
7. ✅ **No partial snapshots:** Never seed by writing partial machine context to localStorage
8. ✅ **No unapproved deletes:** Cleanup requires express permission before file/folder deletion

---

## Next Steps

1. ✅ Review this plan with user
2. ⏳ Confirm `pnpm` is available locally and run `pnpm install` if needed
3. ⏳ Create branch `feature/workflow-chat-integration`
4. ⏳ Start Phase 0: Component Contract Hardening
