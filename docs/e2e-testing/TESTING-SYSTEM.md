# AI Browser Testing System

Automated manual QA testing system for the Sherpy 10-step planning workflow.

## Quick Start

**AI:** Read and execute `/workspace/.tmp-docs/plan/ai-browser-test.yaml`

## System Overview

```
ai-browser-test.yaml          # Entrypoint - execution instructions
├── guide.md                  # Detailed test steps (source of truth)
├── tracking-template.yaml    # Template for run tracking
├── learnings.md             # Accumulated wisdom from all runs
├── runs/
│   └── 00{n}/tracking.yaml  # Per-run test results
└── bug-reports/
    └── 00{n}-slug.yaml      # Bug reports filed during testing
```

## Execution Flow

1. **Initialize:** Read `ai-browser-test.yaml` → Create run tracking
2. **Execute:** Follow `guide.md` step-by-step
3. **Learn:** Check `learnings.md` before each step
4. **Track:** Update `tracking.yaml` after each step
5. **Document:** File bugs, capture learnings, take screenshots
6. **Stop:** If blocked, cease immediately

## Key Principles

### Check Learnings First
Before starting ANY step, read `learnings.md` for that step ID. Previous runs may have discovered critical tips.

### Update Tracking Always
After EVERY step (pass/fail/blocked), update `tracking.yaml`. This creates real-time progress snapshot.

### File Bugs Immediately
Don't debug. Don't investigate. Detect, document, move on (or stop if blocked).

### Stop on Blocker
If bug prevents workflow continuation, set `blocking: true`, update tracking to "blocked", and cease execution. Do not attempt workarounds.

### Capture Learnings
If a step reveals something noteworthy (timing issue, UX quirk, validation detail), append to `learnings.md` with step reference.

## File Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `ai-browser-test.yaml` | Entrypoint | Start here |
| `guide.md` | Test steps | Follow exactly |
| `tracking-template.yaml` | Run template | Copy to new run |
| `tracking.yaml` | Run results | Update after each step |
| `learnings.md` | Accumulated tips | Read before each step, append insights |
| `bug-report-template.yaml` | Bug template | Copy when filing bug |
| `{00n}-slug.yaml` | Bug report | File for any issue |

## Success Criteria

A complete test run should have:
- ✅ All steps in `tracking.yaml` marked (passed/failed/blocked)
- ✅ Screenshots for all failures
- ✅ Bug reports for all issues
- ✅ New learnings appended to `learnings.md`
- ✅ Final status and duration recorded
- ✅ Guide's "Test History" section updated

## Known Blockers

### BUG-006: Gap Analysis Artifact Generation Hangs
**Step:** step-03  
**Impact:** Cannot progress past Step 1  
**Action:** File bug, stop testing immediately

Check `learnings.md` for current list of known issues before starting.

## Testing Philosophy

This is **detective work**, not debugging:
1. Execute step as documented
2. Observe what happens
3. Compare to expected result
4. Document deviation (if any)
5. Move to next step (or stop if blocked)

Do not attempt to fix issues. Your job is to surface them systematically.

---

**System Version:** 1.0  
**Last Updated:** 2026-05-12  
**Maintainer:** Update learnings after each run
