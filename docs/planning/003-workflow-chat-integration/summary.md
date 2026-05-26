# WorkflowChat Integration - Executive Summary

**Date:** 2026-05-26  
**Status:** Plan hardened for AI execution, awaiting go-ahead
**Plan Document:** `docs/planning/003-workflow-chat-integration/plan.md`

---

## What We're Doing

Replacing the existing planning workflow UI with a new chat-based interface (`WorkflowChat`), while keeping all existing functionality, state management, and app layout intact.

### What Changes
- **Content body only:** StepContainer → WorkflowChat
- **UI pattern:** Form/interview steps → Chat messages with composer

### What Stays
- App layout (header, LeftRail, footer)
- XState machine and all business logic
- Database persistence (projects, artifacts, interview answers)
- Navigation and routing
- All existing tests (will be updated incrementally)

---

## Strategy: Incremental Integration

### Core Principle
**One piece at a time, manual test, user sign-off before next phase.**

### AI Execution Rules

- Read current code before editing; do not trust stale plan assumptions.
- Add or update focused tests before behavior changes.
- Use Playwright MCP for React form/browser validation.
- Never seed workflow state with partial localStorage context.
- Do not delete files/folders or run destructive rollback commands without express permission.
- Each phase ends with evidence: tests, screenshots where applicable, and unresolved risks.

### 11 Phases

0. **Component Contract Hardening** - Make WorkflowChat safe to integrate
1. **Data Layer (Adapters)** - Transform XState context → WorkflowChat props
2. **Hook Layer (XState selectors)** - React hook that wraps adapters
3. **Flagged Rendering** - Render old or new UI via hardcoded flag
4. **Step 2 Wiring** - Wire ChatComposer to machine (Business Requirements)
5. **Step 3 Wiring** - Wire ChatComposer to machine (Technical Requirements)
6. **Form Wiring (Steps 1 & 5)** - Multi-field forms via AnswerCard
7. **Automated Steps (4,6,8,9,10)** - Loading + artifact generation
8. **Artifact-Only (Step 7)** - Review artifact, no questions
9. **Full Workflow Test** - End-to-end validation (all 10 steps)
10. **Cleanup & Cutover** - Make WorkflowChat default, delete only with approval

---

## Testing Approach

### Manual Testing with Playwright MCP
Each phase uses Playwright MCP tools to:
- Navigate to workflow page
- Fill forms/composer
- Click buttons
- Take screenshots
- Verify state changes

**Example:**
```typescript
// Seed Step 2 first:
// pnpm seed:step2
// Then run the printed complete localStorage command.

// Navigate
mcp__playwright__browser_navigate({
  url: "http://localhost:5180/project/<project-id>/build"
});

// Answer question
mcp__playwright__browser_fill_form({
  fields: [{
    target: "#chat-composer-input",
    value: "My answer here"
  }]
});

// Screenshot
mcp__playwright__browser_take_screenshot({
  filename: ".tmp-docs/screenshots/step-2-answer.png"
});
```

### Seed Helpers
Use the existing seed CLI/API and complete XState snapshots:

```bash
pnpm seed:step2
```

The script prints the project URL and complete `localStorage.setItem(...)` command. Do not create browser-side helpers that import database-backed project store code, and do not write partial context objects to localStorage. If the script prints `npm run dev`, treat that as stale output and use `pnpm dev`.

---

## Feature Flag (Simple)

Hardcoded boolean in route file:

```typescript
// app/routes/project/$projectId.build.tsx
const USE_NEW_UI = false; // Set to true to test WorkflowChat

return (
  <PlanningMachineProvider>
    {USE_NEW_UI ? (
      <WorkflowChat messages={messages} artifacts={artifacts} />
    ) : (
      <>
        <Navigation />
        <StepContainer />
      </>
    )}
    <DebugPanel />
  </PlanningMachineProvider>
);
```

**Phase 3-9:** Toggle flag, reload, test old/new against the same seeded state
**Phase 10:** Set default to new UI, request approval for any file/folder deletion, then remove flag

---

## Architecture

### Data Flow
```
XState Context
    ↓
Adapters (machine-to-messages, machine-to-artifacts)
    ↓
Hook (useWorkflowChatData using XState selectors)
    ↓
WorkflowChat Component
    ↓
User Interaction (ChatComposer)
    ↓
Machine Events (SUBMIT_ANSWER, etc.)
    ↓
XState Context (updates)
```

### Key Files

**New (to create):**
- `src/features/planning/adapters/machine-to-messages.adapter.ts`
- `src/features/planning/adapters/machine-to-artifacts.adapter.ts`
- `src/features/planning/hooks/useWorkflowChatData.ts`

**Modified:**
- `app/routes/project/$projectId.build.tsx` (add flag + WorkflowChat)
- `src/components/workflow-chat/WorkflowChat.tsx` (add onSubmit handler)
- `src/components/workflow-chat/ChatComposer.tsx` (wire to machine)

**Deletion candidates (Phase 10, only after express permission):**
- `src/features/planning/components/StepContainer.tsx`
- `src/features/planning/components/InterviewStep.tsx`
- `src/features/planning/components/FormStep.tsx`
- `src/features/planning/components/AutomatedStep.tsx`
- `src/features/planning/components/ArtifactOnlyStep.tsx`

---

## Success Criteria

### Per-Phase
- ✅ All automated tests pass
- ✅ TypeScript compiles without errors
- ✅ Manual Playwright testing completes
- ✅ Screenshots captured for comparison
- ✅ **User explicitly signs off before next phase**

### Overall
- ✅ Feature parity with old UI
- ✅ No regressions (all 31+ tests pass)
- ✅ Better UX (cleaner, more modern interface)
- ✅ Cleaner code (fewer components, better separation)
- ✅ Full E2E workflow completes (Steps 1-10)

---

## Timeline

| Phase | Effort | Type |
|-------|--------|------|
| 0. Contract Hardening | 2-3h | Code + Tests |
| 1. Data Layer | 2-3h | Code + Tests |
| 2. Hook Layer | 1h | Code + Tests |
| 3. Flagged Render | 1h | Code + Manual Test |
| 4. Step 2 Wiring | 2-3h | Code + Manual Test |
| 5. Step 3 Wiring | 1h | Code + Manual Test |
| 6. Form Wiring | 3-4h | Code + Manual Test |
| 7. Automated Steps | 2-3h | Code + Manual Test |
| 8. Artifact Step | 30m | Code + Manual Test |
| 9. Full Workflow | 1-2h | Manual Test Only |
| 10. Cleanup | 1-2h | Cleanup + Tests |

**Total:** ~19-27 hours (includes testing time)

---

## Rollback Strategy

Each phase tagged: `v2.1.0-phase1`, `v2.1.0-phase2`, etc.

If issues arise:
```bash
git revert <commit-sha>
```

Do not use `git reset --hard`. Do not delete files or folders during rollback without express permission.

---

## Key Design Decisions

1. **Adapters over inline transformations** - Testable, reusable, clear separation
2. **Component contracts first** - Prevent adapter work from relying on prototype-only APIs
3. **Interview steps first (2 & 3)** - Simplest pattern, builds confidence
4. **Forms later (Steps 1 & 5)** - More complex, benefit from learnings
5. **Hardcoded flag over env var** - Simpler, easier to toggle during dev
6. **Keep DebugPanel during integration** - Essential for validation
7. **Playwright MCP over agent-browser** - Proven to work with React forms
8. **Seed with complete snapshots only** - Avoid invalid XState restoration

---

## What's Next

1. ✅ Plan finalized
2. ⏳ **Awaiting user go-ahead to start Phase 0**
3. ⏳ Create branch `feature/workflow-chat-integration`
4. ⏳ Begin Phase 0: Component Contract Hardening

---

## Questions Resolved

✅ Seed helpers - Use existing `pnpm seed:stepN` / `/api/dev/seed` with complete snapshots
✅ Feature flag - Hardcoded `const USE_NEW_UI = false;`  
✅ Dev server - Already on `:5180`  
✅ Artifact modal - Use WorkflowChat's `ArtifactDialog`  
✅ Layout scope - Keep app layout, only replace content body  
✅ Navigation - Keep existing during integration, evaluate in Phase 10  
✅ Cleanup - Deletion requires express permission

---

## Contact Points

- **Plan Document:** `docs/planning/003-workflow-chat-integration/plan.md` (detailed breakdown)
- **Current Branch:** `feature/design-consistency`
- **New Branch:** `feature/workflow-chat-integration` (to be created)
- **WorkflowChat Location:** `src/components/workflow-chat/`

Ready to proceed when you give the go-ahead.
