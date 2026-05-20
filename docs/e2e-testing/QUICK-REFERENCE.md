# AI Browser Test - Quick Reference Card

## One-Command Start
```
Read: /workspace/.tmp-docs/plan/ai-browser-test.yaml
```

## Before Every Step
```
1. Check learnings.md for current step tips
2. Read guide.md for step details
3. Execute step
4. Update tracking.yaml
5. Append learning (if any)
```

## Decision Tree

```
Step completes as expected?
├─ YES → Update tracking (status: passed)
│        └─ Continue to next step
│
└─ NO → Take screenshot
        ├─ File bug report
        │
        ├─ Is bug BLOCKING?
        │  ├─ YES → Update tracking (status: blocked)
        │  │        └─ STOP TESTING
        │  │
        │  └─ NO → Update tracking (status: failed, note in observations)
        │           └─ Continue to next step
        │
        └─ Add learning to learnings.md
```

## Critical Rules
1. **STOP if blocked** - No workarounds, no debugging
2. **Update tracking after EVERY step** - Pass/fail/blocked
3. **Check learnings BEFORE each step** - Don't repeat mistakes
4. **File bugs for ALL issues** - Blocking or not
5. **Screenshot unexpected behavior** - Evidence is critical

## File Paths (Quick Copy)
- Entrypoint: `.tmp-docs/plan/ai-browser-test.yaml`
- Guide: `.tmp-docs/plan/guide.md`
- Learnings: `.tmp-docs/plan/learnings.md`
- Tracking template: `.tmp-docs/plan/tracking-template.yaml`
- New run: `.tmp-docs/plan/runs/00{n}/tracking.yaml`
- New bug: `.tmp-docs/plan/bug-reports/00{n}-slug.yaml`
- Screenshot dir: `.tmp-docs/screenshots/`

## Status Values
### tracking.yaml steps
- `pending` - Not started
- `in_progress` - Currently executing
- `passed` - Success
- `failed` - Failed but not blocking
- `blocked` - Failed and blocking progress
- `skipped` - Intentionally skipped

### Bug report severity
- `critical` - Complete failure, data loss
- `high` - Major feature broken, blocks workflow
- `moderate` - Partial failure, workaround exists
- `low` - Cosmetic, minor UX issue

## Expected Timing
- Project creation: 2 min
- Form fills: 2 min each
- Artifact generation: 15-30 sec
- Interview questions: 5-7 min (10 questions)
- Automated steps: 20-30 sec
- Review mode: 5 min
- Navigation tests: 3 min
- Persistence tests: 2 min
- **Total:** 25-35 min

## Known Blockers (Check learnings.md for current list)
- **BUG-006:** Step 1 artifact generation hangs (BLOCKING)

## Screenshot Naming
Format: `test-run-{N}-{step}-{description}.png`
Example: `test-run-2-05-step2-question1.png`

## When in Doubt
1. Check learnings.md
2. Follow guide.md exactly
3. Document what you see
4. Ask before assuming
