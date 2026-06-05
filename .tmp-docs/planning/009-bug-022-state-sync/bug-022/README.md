# BUG-022 Implementation Plan

**Generated:** 2026-06-01  
**Status:** Ready for implementation  
**Strategy:** Multi-PR / Trunk-Based (gradual rollout)

---

## Overview

Complete implementation plan for BUG-022 (State Loss During Step 7 Review).

**Root Cause:** Dual persistence pattern with inconsistent coverage  
**Solution:** Single persistence layer (`StatePersistence` class)  
**Outcome:** Zero data loss, -158 lines, 67% fewer DB writes

---

## Files

### Planning Documents
- **`milestones.yaml`** - 3 phases with dependencies, success criteria, acceptance criteria
- **`tasks/milestone-m0.tasks.yaml`** - Phase 1: Add Unified Persistence Layer (7 tasks, 2 days)
- **`tasks/milestone-m1.tasks.yaml`** - Phase 2: Remove Redundant Persistence (10 tasks, 1 day)
- **`tasks/milestone-m2.tasks.yaml`** - Phase 3: Production Rollout & Monitoring (9 tasks, 3 days)

### Supporting Documents
- **`.tmp-docs/bug-022-state-loss-on-step7.md`** - Complete bug report with solution architecture
- **`.tmp-docs/bug-022-root-cause-analysis.md`** - Deep dive analysis
- **`.tmp-docs/bug-022-enterprise-solution-revised.md`** - Detailed architecture
- **`.tmp-docs/bug-022-solution-comparison.md`** - Why single layer is better
- **`.tmp-docs/bug-022-architecture-diagram.md`** - Visual diagrams
- **`.tmp-docs/bug-022-summary.md`** - Executive summary

### Test
- **`src/features/planning/__tests__/bug-022-state-loss-on-step7.test.ts`** - Root cause test (✅ PASSING)

---

## Milestones

### Phase 1: Add Unified Persistence Layer (2 days)
**Goal:** Create StatePersistence class, wire into Context Provider, keep redundant server function persistence for validation.

**Tasks:**
1. Create StatePersistence class (120 min)
2. Write unit tests (90 min)
3. Integrate into PlanningMachineContext (60 min)
4. Integration test - full persistence flow (90 min)
5. E2E test - page refresh at Step 7 (120 min)
6. Verify no regressions (30 min)
7. Code review (60 min)

**Success Criteria:**
- StatePersistence handles 100% of state transitions
- Database writes from BOTH paths (old + new) for validation
- All tests pass (existing + new)
- E2E test with page refresh passes

**Deliverables:**
- `src/features/planning/infrastructure/persistence.ts` (180 lines)
- `src/features/planning/infrastructure/persistence.test.ts` (120 lines)
- Modified `PlanningMachineContext.tsx` (-50 lines)
- Integration tests (3 files)
- Code review document

---

### Phase 2: Remove Redundant Persistence (1 day)
**Goal:** Remove database persistence from server functions, make them pure domain logic.

**Tasks:**
1. Refactor $submitAnswer (45 min)
2. Refactor $submitAnswerAndComplete (45 min)
3. Refactor $completeStep (30 min)
4. Refactor $updateStepOptions (30 min)
5. Refactor $skipStep & $setStepArtifact (45 min)
6. Remove persistence helpers from planningMachine (30 min)
7. Update test mocks (60 min)
8. Verify single persistence path (45 min)
9. Run full test suite (30 min)
10. Code review (60 min)

**Success Criteria:**
- Server functions are pure domain transformations
- Zero persistence calls outside StatePersistence
- All tests pass with updated mocks
- Net code reduction of ~155 lines

**Deliverables:**
- Modified `server-functions.ts` (-155 lines)
- Modified `planningMachine.ts` (-53 lines)
- Updated test mocks
- Single persistence path verification test
- Code review document

---

### Phase 3: Production Rollout & Monitoring (3 days)
**Goal:** Gradual production rollout (10% → 50% → 100%) with comprehensive monitoring.

**Tasks:**
1. Deploy to staging (60 min)
2. Monitor staging 24 hours (1440 min)
3. Production rollout - 10% (90 min)
4. Production rollout - 50% (270 min)
5. Production rollout - 100% (1440 min)
6. Create monitoring dashboard (120 min)
7. Document rollback procedures (60 min)
8. Post-mortem and lessons learned (90 min)
9. Final code review (60 min)

**Success Criteria:**
- Zero data loss incidents (7 days)
- Error rate < 0.1%
- Database write volume reduced 60-70%
- All deployments successful
- Comprehensive monitoring in place

**Deliverables:**
- Deployment logs (5 documents)
- Monitoring dashboard
- Rollback runbook
- Post-mortem document
- Final code review

---

## Timeline

```
Day 1-2: Phase 1 (Add Unified Persistence Layer)
  ├─ m0-001: Create StatePersistence class
  ├─ m0-002: Unit tests
  ├─ m0-003: Integrate into Context Provider
  ├─ m0-004: Integration tests
  ├─ m0-005: E2E test (page refresh)
  ├─ m0-006: Verify no regressions
  └─ m0-007: Code review

Day 3: Phase 2 (Remove Redundant Persistence)
  ├─ m1-001 to m1-006: Refactor server functions & machine
  ├─ m1-007: Update test mocks
  ├─ m1-008: Verify single persistence path
  ├─ m1-009: Run full test suite
  └─ m1-010: Code review

Day 4-6: Phase 3 (Production Rollout)
  ├─ m2-001: Deploy to staging
  ├─ m2-002: Monitor staging 24h
  ├─ m2-003: Production 10% (1 hour)
  ├─ m2-004: Production 50% (4 hours)
  ├─ m2-005: Production 100% (24 hours)
  ├─ m2-006: Monitoring dashboard
  ├─ m2-007: Rollback procedures
  ├─ m2-008: Post-mortem
  └─ m2-009: Final code review
```

**Total Duration:** 6 days  
**Total Effort:** 30-40 hours  
**Total Tasks:** 26 tasks

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Data loss incidents | 0 | Production monitoring (7 days) |
| Error rate | < 0.1% | Error tracking |
| DB write reduction | 60-70% | Database metrics |
| Code complexity | -158 lines | Git diff |
| Test coverage | Maintain/improve | Coverage reports |

---

## Risk Mitigation

### Phase 1 Risks
- **Risk:** StatePersistence has bugs
- **Mitigation:** Keep dual persistence for validation
- **Rollback:** Feature flag to 0%, revert code

### Phase 2 Risks
- **Risk:** Server function regressions
- **Mitigation:** Comprehensive test updates
- **Rollback:** Revert to Phase 1 (dual persistence)

### Phase 3 Risks
- **Risk:** Production issues at scale
- **Mitigation:** Gradual rollout 10% → 50% → 100%
- **Rollback:** Feature flag to 0%, < 1 minute

---

## Rollback Strategy

### Quick Rollback (< 1 minute)
```bash
# Disable feature flag
feature-flag set bug-022-state-persistence --percentage 0
```

### Full Rollback (< 5 minutes)
```bash
# Revert commits
git revert <commit-hash>
npm run build
npm run deploy:production
```

**Recovery Time Objective (RTO):** < 5 minutes  
**Recovery Point Objective (RPO):** 0 (no data loss)

---

## Code Changes Summary

### Files Created (4)
- `src/features/planning/infrastructure/persistence.ts` (180 lines)
- `src/features/planning/infrastructure/persistence.test.ts` (120 lines)
- `src/features/planning/infrastructure/persistence-metrics.ts` (50 lines)
- Multiple test files (integration + E2E)

### Files Modified (3)
- `src/features/planning/machines/PlanningMachineContext.tsx` (-50 lines)
- `src/features/planning/infrastructure/server-functions.ts` (-155 lines)
- `src/features/planning/machines/planningMachine.ts` (-53 lines)

### Net Result
- **Total:** +300 lines (new infrastructure), -258 lines (duplication removed)
- **Net:** +42 lines total, but -158 lines of duplicated persistence logic eliminated
- **Complexity:** 22% reduction in persistence logic

---

## Testing Strategy

### Unit Tests (m0-002)
- StatePersistence class (debouncing, error handling, localStorage, database)
- 6 test cases covering all functionality

### Integration Tests (m0-004)
- Full persistence flow (actor → localStorage → database)
- Internal transitions persist to DB
- Rapid transitions debounce correctly
- Phase 1 validation (both paths persist)

### E2E Tests (m0-005)
- Page refresh at Step 7 (bug reproduction)
- Progress through Steps 1-7
- Refresh page
- Verify state preserved (not lost)

### Regression Tests (m0-006, m1-009)
- Run all existing tests
- Ensure no regressions
- Update mocks as needed

---

## Quality Gates

### Pre-Commit
- `npm run lint` (must pass)
- `npm run typecheck` (must pass)
- `npm test` (must pass)

### CI Pipeline
- Lint, typecheck, test
- Integration tests
- Coverage threshold: 80%

### Pre-Production
- Staging validation: 24 hours
- Zero data loss incidents
- Error rate < 0.1%
- Manual QA complete

### Production Gates
- 10%: 1 hour validation, zero issues
- 50%: 4 hours validation, stable metrics
- 100%: 24 hours validation, all success criteria met

---

## How to Use This Plan

### For Developers
1. Start with Phase 1, Task 1 (m0-001)
2. Follow task instructions exactly
3. Run validation commands after each task
4. Complete code review before next phase
5. Do NOT skip to Phase 2 until Phase 1 complete

### For Project Managers
1. Track progress via milestone completion
2. Monitor for blocking issues
3. Verify success criteria met before next phase
4. Approve production rollout only after staging validation

### For QA
1. Run manual QA after each phase in staging
2. Verify page refresh scenario (BUG-022 reproduction)
3. Monitor production during rollout
4. Document any issues found

---

## Next Steps

1. **Review plan** with team (get approval)
2. **Start Phase 1** (create StatePersistence class)
3. **Deploy to staging** after Phase 1 + Phase 2 complete
4. **Monitor staging** for 24 hours
5. **Production rollout** (gradual: 10% → 50% → 100%)
6. **Close BUG-022** after 7 days zero incidents

---

## Questions?

Refer to:
- **Bug report:** `.tmp-docs/bug-022-state-loss-on-step7.md` (complete solution architecture)
- **Architecture:** `.tmp-docs/bug-022-architecture-diagram.md` (visual diagrams)
- **Comparison:** `.tmp-docs/bug-022-solution-comparison.md` (why single layer)
- **Summary:** `.tmp-docs/bug-022-summary.md` (executive summary)

---

**Status:** ✅ Implementation plan ready  
**Estimated Completion:** 6 days from start  
**Risk Level:** Low (gradual rollout, comprehensive testing, quick rollback)
