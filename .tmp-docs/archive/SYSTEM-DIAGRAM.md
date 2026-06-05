# AI Browser Testing System Architecture

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI BROWSER TEST EXECUTION                     │
└─────────────────────────────────────────────────────────────────┘

1. INITIALIZE
   ┌──────────────────────────────────────────────────────────┐
   │ ai-browser-test.yaml (ENTRYPOINT)                        │
   │ ├─ Read execution instructions                           │
   │ ├─ Find next run number                                  │
   │ ├─ Create runs/00{n}/                                    │
   │ └─ Copy tracking-template.yaml → runs/00{n}/tracking.yaml│
   └──────────────────────────────────────────────────────────┘
                              ↓
2. BEFORE EACH STEP
   ┌──────────────────────────────────────────────────────────┐
   │ learnings.md                                             │
   │ └─ Check for tips on current step                       │
   └──────────────────────────────────────────────────────────┘
                              ↓
3. EXECUTE STEP
   ┌──────────────────────────────────────────────────────────┐
   │ guide.md                                                 │
   │ └─ Follow step instructions exactly                     │
   └──────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │ Step Success?   │
                    └─────────────────┘
                       ↙         ↘
                  YES              NO
                   ↓                ↓
4a. PASS PATH             4b. FAIL PATH
   ┌──────────────────────────────────────────────┐
   │ tracking.yaml                 │ tracking.yaml │
   │ └─ status: passed             │ └─ status: failed/blocked │
   └──────────────────────────────────────────────┘
        ↓                                 ↓
   Continue                      ┌──────────────────┐
                                 │ Take screenshot  │
                                 │ File bug report  │
                                 │ Add learning     │
                                 └──────────────────┘
                                          ↓
                                 ┌──────────────────┐
                                 │ Blocking?        │
                                 └──────────────────┘
                                    ↙         ↘
                               YES              NO
                                ↓                ↓
                           STOP TEST        Continue
                                             to next step

5. FINALIZE
   ┌──────────────────────────────────────────────────────────┐
   │ tracking.yaml                                            │
   │ ├─ Set final_status                                     │
   │ ├─ Set total_duration                                   │
   │ └─ Update success_criteria                              │
   ├───────────────────────────────────────────────────────────┤
   │ guide.md                                                 │
   │ └─ Update "Test History" section                        │
   └──────────────────────────────────────────────────────────┘
```

## File Relationships

```
.tmp-docs/plan/
│
├── ai-browser-test.yaml ──────────┐  (ENTRYPOINT - start here)
│                                   │
├── guide.md ──────────────────────┼─→ Source of truth for test steps
│                                   │
├── tracking-template.yaml ────────┼─→ Template copied to new runs
│                                   │
├── learnings.md ──────────────────┼─→ Read before each step
│                                   │   Write after noteworthy steps
│                                   │
├── bug-report-template.yaml ──────┼─→ Template for bug reports
│                                   │
├── runs/                           │
│   ├── 001/                        │
│   │   └── tracking.yaml ←─────────┼── Updated during test execution
│   ├── 002/                        │
│   │   └── tracking.yaml           │
│   └── README.md                   │
│                                   │
├── bug-reports/                    │
│   ├── 001-gap-analysis-hangs.yaml ←── Filed when bugs found
│   ├── 002-question-generic.yaml   │
│   └── README.md                   │
│                                   │
├── TESTING-SYSTEM.md ──────────────┼─→ System overview (this document)
├── QUICK-REFERENCE.md ─────────────┼─→ Quick lookup card
└── SYSTEM-DIAGRAM.md ──────────────┘   Visual flow (you are here)

../screenshots/ ────────────────────────→ Screenshots from test runs
```

## Data Flow

```
           ┌─────────────────┐
           │ Test Run Start  │
           └────────┬────────┘
                    │
                    ↓
     ┌──────────────────────────────┐
     │ Initialize tracking.yaml     │
     │ (from template)               │
     └──────────────┬───────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
          ↓                   ↓
   ┌─────────────┐     ┌──────────────┐
   │ Read Guide  │     │ Read Learning│
   │ (Step N)    │     │ (Step N tips)│
   └──────┬──────┘     └──────┬───────┘
          │                   │
          └─────────┬─────────┘
                    │
                    ↓
          ┌──────────────────┐
          │ Execute Step N   │
          └─────────┬────────┘
                    │
          ┌─────────┴──────────┐
          │                    │
     PASS │                    │ FAIL
          ↓                    ↓
   ┌─────────────┐      ┌──────────────────┐
   │ Update      │      │ Screenshot       │
   │ tracking    │      │ File bug report  │
   │ (passed)    │      │ Update tracking  │
   └──────┬──────┘      │ Write learning   │
          │             └────────┬─────────┘
          │                      │
          │              ┌───────┴────────┐
          │              │                │
          │         BLOCKING          NON-BLOCKING
          │              │                │
          │              ↓                ↓
          │         ┌─────────┐      Continue
          │         │  STOP   │          │
          │         │ TESTING │          │
          │         └─────────┘          │
          │                              │
          └──────────────┬───────────────┘
                         │
                    Next Step?
                         │
                ┌────────┴────────┐
                │                 │
               YES                NO
                │                 │
                ↓                 ↓
         (Loop back)      ┌───────────────┐
                          │ Finalize      │
                          │ - Set status  │
                          │ - Total time  │
                          │ - Summary     │
                          └───────────────┘
```

## Artifact Relationships

```
Test Run 001
├── Input Artifacts (read-only)
│   ├── guide.md ────────────────→ Step instructions
│   └── learnings.md ────────────→ Historical tips
│
├── Output Artifacts (written during test)
│   ├── runs/001/tracking.yaml ──→ Progress & results
│   ├── bug-reports/00{n}.yaml ──→ Issues found
│   ├── screenshots/*.png ────────→ Visual evidence
│   └── learnings.md (append) ────→ New insights
│
└── Final Deliverables
    ├── Updated tracking.yaml ────→ Complete test results
    ├── Updated learnings.md ─────→ Accumulated wisdom
    ├── Bug reports (0-N) ────────→ Issues to fix
    └── Updated guide.md ─────────→ Test history entry
```

## State Transitions

```
tracking.yaml steps[].status state machine:

  pending
     ↓
  in_progress
     ↓
  ┌──┴──┐
  ↓     ↓
passed  failed ──→ Is blocking? ──→ YES ──→ blocked → STOP
  ↓                      ↓
  ↓                     NO
  ↓                      ↓
  └──────────────────────┘
          ↓
    next step (pending)
```

## Decision Points

```
┌─────────────────────────────────────────────────────────┐
│ Key Decision: When to STOP vs CONTINUE?                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Bug Found                                              │
│     ↓                                                   │
│  Can workflow continue without this feature?           │
│     ├─ YES → Non-blocking → Continue (status: failed)  │
│     │                         + File bug               │
│     │                         + Add learning           │
│     │                         + Screenshot             │
│     │                                                   │
│     └─ NO → Blocking → STOP (status: blocked)          │
│                         + File bug (blocking: true)    │
│                         + Update tracking              │
│                         + Finalize results             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Feedback Loops

```
Test Run 001
     ↓
  Learnings discovered
     ↓
  Added to learnings.md
     ↓
Test Run 002
     ↓
  Reads learnings from 001
     ↓
  Avoids previous pitfalls
     ↓
  Discovers new learnings
     ↓
  Added to learnings.md
     ↓
Test Run 003
     ↓
  Benefits from 001 + 002 wisdom
     ↓
  ...continuous improvement...
```

---

**Diagram Version:** 1.0  
**Last Updated:** 2026-05-12
