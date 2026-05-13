# Continue: Bug #002 State Sync - Task t-004

**Location:** Worktree `/workspace/.claude/worktrees/fix-bug-002-state-sync` (branch: `worktree-fix-bug-002-state-sync`)

**Progress (Tasks t-001 ✅, t-002 ✅, t-003 ✅):**
- Implemented `updateCurrentStep` store function with validation
- Created PUT `/api/projects/[id]` endpoint following vinxi/http pattern
- All 146 tests passing, zero type errors
- Commits:
  - `feat(t-002): implement updateCurrentStep with validation`
  - `feat(t-003): create PUT endpoint for updateCurrentStep`

**Next (Task t-004):**
Integrate backend sync into planning machine at `src/features/planning/machines/planningMachine.ts`:
- Add `syncStepToBackend` action after every step transition
- Call PUT `/api/projects/[id]` with `{ currentStep: context.currentStep }`
- Handle errors gracefully (log, don't block navigation)
- Follow XState action pattern from lines 237-242

**Style Anchor:** `src/features/planning/machines/planningMachine.ts:237-242`

**Validation:**
```bash
npm test src/features/planning/machines/planningMachine.test.ts
npm run typecheck
```

**Critical Constraints:**
- TDD: Write tests first
- Error handling must not block step navigation
- No new dependencies allowed
- Only touch files specified in task

**Plan Reference:** `.tmp-docs/plans/fix-project-state-sync.yaml`

**After t-004:** Task t-005 will update build page to initialize from backend state.
