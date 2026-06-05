# WorkflowChat Integration - Executive Summary

**Date:** 2026-05-26  
**Status:** Plan finalized, awaiting go-ahead  
**Plan Document:** `.tmp-docs/plans/workflow-chat-integration-plan.md`

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

### 10 Phases

1. **Data Layer (Adapters)** - Transform XState context → WorkflowChat props
2. **Hook Layer** - React hook that wraps adapters
3. **Parallel Rendering** - Show both UIs side-by-side (hardcoded flag)
4. **Step 2 Wiring** - Wire ChatComposer to machine (interview Q&A)
5. **Step 3 Wiring** - Same as Step 2 for Tech Requirements
6. **Form Wiring (Step 1)** - Multi-field forms via ChatComposer
7. **Automated Steps (4,6,8,9)** - Loading + artifact generation
8. **Artifact-Only (Step 7)** - Just show artifact, no questions
9. **Full Workflow Test** - End-to-end validation (all 10 steps)
10. **Cleanup & Cutover** - Remove old UI, make WorkflowChat default

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
// Jog to Step 2
const project = jogProjectToStep(2);

// Navigate
mcp__playwright__browser_navigate({ 
  url: `http://localhost:5180/project/${project.id}/build` 
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
Use existing `createProject()` and `updateCurrentStep()` from project store:

```typescript
import { createProject, updateCurrentStep } from "@/features/projects/store";

function jogProjectToStep(stepNumber: number) {
  const project = createProject({
    name: `Test - Step ${stepNumber}`,
    entryPath: "scratch"
  });
  
  if (stepNumber > 1) {
    updateCurrentStep(project.id, stepNumber);
  }
  
  return project;
}
```

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

**Phase 3-9:** Toggle flag, reload, test, compare  
**Phase 10:** Set to `true`, delete old components, remove flag

---

## Architecture

### Data Flow
```
XState Context
    ↓
Adapters (machine-to-messages, machine-to-artifacts)
    ↓
Hook (useWorkflowChatData)
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
- `src/features/planning/testing/seed-helpers.ts`

**Modified:**
- `app/routes/project/$projectId.build.tsx` (add flag + WorkflowChat)
- `src/components/workflow-chat/WorkflowChat.tsx` (add onSubmit handler)
- `src/components/workflow-chat/ChatComposer.tsx` (wire to machine)

**Removed (Phase 10):**
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
| 1. Data Layer | 2-3h | Code + Tests |
| 2. Hook Layer | 1h | Code + Tests |
| 3. Parallel Render | 1h | Code + Manual Test |
| 4. Step 2 Wiring | 2-3h | Code + Manual Test |
| 5. Step 3 Wiring | 1h | Code + Manual Test |
| 6. Form Wiring | 2-3h | Code + Manual Test |
| 7. Automated Steps | 2h | Code + Manual Test |
| 8. Artifact Step | 30m | Code + Manual Test |
| 9. Full Workflow | 1-2h | Manual Test Only |
| 10. Cleanup | 1-2h | Cleanup + Tests |

**Total:** ~15-20 hours (includes testing time)

---

## Rollback Strategy

Each phase tagged: `v2.1.0-phase1`, `v2.1.0-phase2`, etc.

If issues arise:
```bash
# Revert last commit
git revert HEAD~1

# Or reset to previous phase
git reset --hard v2.1.0-phase2
```

---

## Key Design Decisions

1. **Adapters over inline transformations** - Testable, reusable, clear separation
2. **Interview steps first (2 & 3)** - Simplest pattern, builds confidence
3. **Forms later (Step 1)** - More complex, benefit from learnings
4. **Hardcoded flag over env var** - Simpler, easier to toggle during dev
5. **Keep DebugPanel during integration** - Essential for validation
6. **Playwright MCP over agent-browser** - Proven to work with React forms (per CLAUDE.md)
7. **Side-by-side comparison** - Visual validation, catch adapter bugs early

---

## What's Next

1. ✅ Plan finalized
2. ⏳ **Awaiting user go-ahead to start Phase 1**
3. ⏳ Create branch `feature/workflow-chat-integration`
4. ⏳ Begin Phase 1: Adapter implementation + tests

---

## Questions Resolved

✅ Seed helpers - Use existing `createProject()` and `updateCurrentStep()`  
✅ Feature flag - Hardcoded `const USE_NEW_UI = false;`  
✅ Dev server - Already on `:5180`  
✅ Artifact modal - Use WorkflowChat's `ArtifactDialog`  
✅ Layout scope - Keep app layout, only replace content body  
✅ Navigation - Keep existing during integration, evaluate in Phase 10  

---

## Contact Points

- **Plan Document:** `.tmp-docs/plans/workflow-chat-integration-plan.md` (detailed breakdown)
- **Current Branch:** `feature/design-consistency` (clean state)
- **New Branch:** `feature/workflow-chat-integration` (to be created)
- **WorkflowChat Location:** `src/components/workflow-chat/`

Ready to proceed when you give the go-ahead.
