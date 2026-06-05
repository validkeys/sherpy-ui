# .tmp-docs - Temporary Documentation

This folder contains all temporary documentation generated during development. It is tracked in git to maintain project history and context.

## Structure

```
.tmp-docs/
├── bug-reports/{NNN}-{slug}/     # Bug reports, diagnosis, fixes
├── planning/{NNN}-{slug}/         # Implementation plans, roadmaps
├── code-reviews/{NNN}-{slug}/     # Code review documents
├── screenshots/                   # All screenshots
├── scripts/                       # Automation scripts
├── summaries/                     # Completion summaries, status docs
├── test-runs/                     # Test run results
├── test-data/                     # Test input/output data
├── logs/                          # Console logs, server logs
├── misc/                          # Miscellaneous documents
└── archive/                       # Historical documents
```

## Organization Guidelines

### Bug Reports (`bug-reports/{NNN}-{slug}/`)

Each bug gets its own numbered folder containing all related documentation:
- Initial diagnosis
- Root cause analysis
- Solution proposals
- Fix verification
- Test results

**Example:**
```
bug-reports/018-ssr-hydration/
├── bug-018-diagnosis.md
├── bug-018-implementation-summary.md
├── bug-018-verification-complete.md
└── bug-018-option1-prototype.tsx
```

### Planning Documents (`planning/{NNN}-{slug}/`)

Implementation plans, project roadmaps, and milestone tracking:
- Implementation plans
- Test plans
- Checklists
- Timeline documents

### Screenshots (`screenshots/`)

All screenshots with descriptive filenames.

**Naming Convention:** `{context}-{description}.png`

Examples:
- `bug-018-before-fix.png`
- `test-run-012-results.png`
- `manual-verification-success.png`

### Scripts (`scripts/`)

Automation and utility scripts:
- Test automation (`.sh`, `.js`, `.mjs`)
- Data migration
- Cleanup scripts
- Build tools

### Logs (`logs/`)

Console output, server logs, debug logs:
- `dev-server.log`
- `*-console-*.log`
- E2E test console output

### Test Data (`test-data/`)

Test input files, output snapshots, state dumps:
- Answer text files
- JSON state snapshots
- Test fixtures

### Code Reviews (`code-reviews/{NNN}-{slug}/`)

Code review documents and reports:
- Primary file: `review.yaml` or `review.md`
- Supporting documentation
- QA reports

### Summaries (`summaries/`)

Phase completion summaries, status documents, implementation summaries.

## Current Statistics

- Bug Reports: 43 folders
- Planning Docs: 6 folders
- Code Reviews: 15 folders
- Screenshots: 404 files
- Scripts: 6 files
- Logs: 4 files
- Test Data: 8 files
- Summaries: 26 files
- Misc: 20 files

## Finding the Next Number

### For Bug Reports:
```bash
ls -d .tmp-docs/bug-reports/* | tail -1
# Use the next number after the highest (currently 022)
```

### For Planning:
```bash
ls -d .tmp-docs/planning/* | tail -1
# Use the next number after the highest (currently 006)
```

### For Code Reviews:
```bash
ls -d .tmp-docs/code-reviews/* | tail -1
# Use the next number after the highest
```

## Best Practices

1. **One bug per folder** - Keep all bug-related docs together
2. **Descriptive slugs** - Use clear, searchable folder names
3. **Consistent numbering** - Use 3-digit numbers (001, 018, 023)
4. **Meaningful filenames** - Screenshots should be self-documenting
5. **Group related files** - Test data goes with the bug/test that uses it

## Maintenance Scripts

### Reorganize misplaced files:
```bash
.tmp-docs/scripts/reorganize.sh
```

This script will:
- Move bug reports to proper folders
- Organize planning documents
- Sort code reviews
- Clean up empty directories

---

Last updated: 2026-06-03
Total items: 532+ files organized
