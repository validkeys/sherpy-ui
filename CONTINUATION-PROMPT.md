# Continue: Bug #002 State Sync Implementation

**Location:** Worktree `/workspace/.claude/worktrees/fix-bug-002-state-sync` (branch: `worktree-fix-bug-002-state-sync`)

## Context
Implementing fix for Bug #002: Dashboard and build page show different step numbers due to unsynchronized state between backend and localStorage.

**Solution:** Make backend Project.currentStep the single source of truth. Planning machine syncs via PUT /api/projects on every step transition.

## Implementation Plan
- **Plan:** `.tmp-docs/plans/fix-project-state-sync.yaml`
- **Review:** `.tmp-docs/implementation-plan-review.yaml` (10/10 score)
- **Bug Report:** `.tmp-docs/plan/bug-reports/002-project-state-display-mismatch.yaml`
- **Status:** Ready for development (98% success probability)

## Plan Structure
- 4 milestones, 10 tasks, ~8 hours
- M1: Backend API (updateCurrentStep + PUT endpoint)
- M2: Planning machine syncs to backend
- M3: Build page initializes from backend
- M4: E2E verification + close bug

## Next: Start M1 - Backend API

**Task t-001:** Write failing tests for updateCurrentStep
- Create `src/features/projects/store.test.ts`
- Tests must FAIL (function doesn't exist yet)
- Cover: valid update, invalid projectId, invalid stepNumber, timestamp
- Validation: `npm test src/features/projects/store.test.ts` → expects FAIL

**Task t-002:** Implement updateCurrentStep to pass tests
- Modify `src/features/projects/store.ts`
- Follow pattern from `updateProjectStatus` (lines 33-46)
- Minimal code to pass tests
- Validation: all tests passing, zero type errors

## Critical Constraints
- **TDD:** RED → GREEN → Validate → Commit (do NOT modify tests when they fail)
- **File Scope:** ONLY modify specified files per task
- **Dependencies:** No new dependencies allowed
- **Drift Policy:** Stop immediately if >5 files touched or unexpected dependencies

## Commands
```bash
# Run tests
npm test <file-path>

# Type check
npm run typecheck

# Commit after each task
git add . && git commit -m "feat(t-XXX): <description>"
```

## Style Anchors
- API: `app/api/ai/interview.ts:1-50` (vinxi/http pattern)
- Store: `src/features/projects/store.ts:33-46` (update functions)
- XState: `src/features/planning/machines/planningMachine.ts:237-242` (assign actions)

**Begin with task t-001.**
