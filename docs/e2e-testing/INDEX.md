# AI Browser Testing System - Index

**Quick Start:** Read `ai-browser-test.yaml` and execute.

## Core Documents (Read These)

### 1. For Execution
- **[ai-browser-test.yaml](./ai-browser-test.yaml)** - START HERE - Entrypoint with execution flow
- **[guide.md](./guide.md)** - Complete step-by-step test instructions (source of truth)
- **[learnings.md](./learnings.md)** - Read BEFORE each step for historical tips

### 2. For Reference
- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - One-page lookup card
- **[TESTING-SYSTEM.md](./TESTING-SYSTEM.md)** - System overview and philosophy
- **[SYSTEM-DIAGRAM.md](./SYSTEM-DIAGRAM.md)** - Visual architecture and data flow

## Templates (Copy These)

- **[tracking-template.yaml](./tracking-template.yaml)** - Copy to `runs/00{n}/tracking.yaml`
- **[bug-report-template.yaml](./bug-report-template.yaml)** - Copy to `bug-reports/00{n}-slug.yaml`

## Output Directories

- **[runs/](./runs/)** - Test run tracking files (one per run)
- **[bug-reports/](./bug-reports/)** - Bug reports filed during testing
- **[../screenshots/](../screenshots/)** - Screenshots captured during tests

## Document Purpose Matrix

| Document | When to Read | When to Write | Purpose |
|----------|--------------|---------------|---------|
| `ai-browser-test.yaml` | Test start | Never | Execution instructions |
| `guide.md` | Every step | After run (History) | Step-by-step procedures |
| `learnings.md` | Before each step | After noteworthy steps | Accumulated wisdom |
| `tracking-template.yaml` | New run setup | Never | Template for tracking |
| `tracking.yaml` | Never | After each step | Real-time progress |
| `bug-report-template.yaml` | Filing bug | Never | Template for bugs |
| `{00n}-slug.yaml` | Never | When bug found | Bug documentation |
| `QUICK-REFERENCE.md` | When stuck | Never | Quick lookup |
| `TESTING-SYSTEM.md` | Initial setup | Never | System understanding |
| `SYSTEM-DIAGRAM.md` | Initial setup | Never | Visual understanding |

## Execution Checklist

Before starting a test run, ensure you have:

- [ ] Read `ai-browser-test.yaml` (entrypoint)
- [ ] Reviewed `learnings.md` (known issues)
- [ ] Dev server running at http://localhost:5180
- [ ] Browser ready (incognito mode recommended)
- [ ] Terminal visible for server logs
- [ ] Determined next run number (check `runs/` directory)

## File Naming Conventions

### Test Runs
- **Directory:** `runs/001/`, `runs/002/`, etc.
- **File:** Always `tracking.yaml`
- **Numbering:** Zero-padded 3 digits

### Bug Reports
- **Format:** `bug-reports/001-gap-analysis-hangs.yaml`
- **Pattern:** `{00n}-{kebab-case-description}.yaml`
- **Numbering:** Sequential across all bugs

### Screenshots
- **Format:** `screenshots/test-run-2-05-step2-question1.png`
- **Pattern:** `test-run-{run}-{seq}-{description}.png`
- **Location:** `../screenshots/` (parent directory)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-12 | Initial system creation |

## Known Issues

See `learnings.md` for current list. As of 2026-05-12:
- **BUG-006:** Gap Analysis artifact generation hangs (BLOCKING)

## System Status

**Status:** Active  
**Last Test Run:** #1 (2026-05-12) - BLOCKED at Step 1  
**Blocker:** BUG-006 (Gap Analysis artifact generation)  
**Next Action:** Fix BUG-006, then execute Test Run #2

---

**Index Version:** 1.0  
**Last Updated:** 2026-05-12
