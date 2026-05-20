# Bug Reports Directory

AI-filed bugs discovered during manual testing.

## Naming Convention

Format: `{00n}-{slug}.yaml`

Examples:
- `001-gap-analysis-hangs.yaml`
- `002-question-not-contextual.yaml`
- `003-navigation-back-disabled.yaml`

## Filing Process

1. Copy `bug-report-template.yaml`
2. Name file with next number + descriptive slug
3. Fill all required fields
4. Reference in tracking.yaml if blocking
5. Update learnings.md if recurring pattern

## Severity Levels

- **critical:** Complete workflow failure, data loss
- **high:** Major feature broken, blocking progress
- **moderate:** Feature partially broken, workaround exists
- **low:** Cosmetic issue, minor UX problem

## Blocking vs Non-Blocking

**Blocking:** Must be fixed before workflow can complete
- AI MUST stop testing immediately
- Update tracking.yaml status to "blocked"
- Set `blocking: true` in bug report

**Non-Blocking:** Workflow can continue despite bug
- Note in tracking.yaml observations
- Continue testing
- Set `blocking: false` in bug report

## Status Tracking

- **open:** Newly filed, not yet investigated
- **investigating:** Under active investigation
- **fixed:** Fix committed, awaiting verification
- **wontfix:** Not planned to fix
- **duplicate:** Duplicate of existing bug (reference in `related_bugs`)

## Current Bugs

| ID | Slug | Severity | Status | Blocking | Notes |
|----|------|----------|--------|----------|-------|
| 001 | dashboard-navigation-broken | high | fixed | Yes | Fixed: Navigation context passed to sidebar |
| 002 | (placeholder) | - | - | - | Not filed yet |
| 003 | stage-sidebar-status-not-updating | moderate | open | No | Sidebar doesn't show completed state |
| 007 | gap-analysis-submit-no-api-call | critical | fixed | Yes | Fixed: Defensive programming added |

## Fixed Bugs

### BUG-001: Dashboard Navigation Broken ✅
- **Fixed:** 2026-05-13
- **Solution:** Pass project context to sidebar navigation
- **Details:** `001-SOLUTION-SUMMARY.md`

### BUG-007: Gap Analysis Submit No API Call ✅
- **Fixed:** 2026-05-13
- **Solution:** Defensive programming (cannot reproduce, added safeguards)
- **Details:** `007-RESOLUTION-SUMMARY.md`
- **Test Coverage:** 22/22 tests pass (100%)
- **Code Quality:** 97%
