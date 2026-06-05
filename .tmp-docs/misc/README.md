# .tmp-docs - Temporary Documentation

This folder contains all temporary documentation generated during development. It is tracked in git to maintain project history and context.

## Structure

```
.tmp-docs/
├── bug-reports/{NNN}-{slug}/     # Bug reports, diagnosis, fixes
├── planning/{NNN}-{slug}/         # Implementation plans, roadmaps
├── screenshots/                   # All screenshots
├── scripts/                       # Automation scripts
├── code-reviews/{NNN}-{slug}/     # Code review documents
└── archive/                       # Historical documents
```

## Organization Guidelines

### Bug Reports (`bug-reports/{NNN}-{slug}/`)

Each bug gets its own numbered folder containing all related documentation.

**Example:**
```
bug-reports/018-ssr-hydration/
├── bug-018-diagnosis.md
├── bug-018-implementation-summary.md
└── bug-018-verification-complete.md
```

### Planning Documents (`planning/{NNN}-{slug}/`)

Implementation plans, project roadmaps, and milestone tracking.

### Screenshots (`screenshots/`)

All screenshots with descriptive filenames: `{context}-{description}.png`

### Scripts (`scripts/`)

Automation and utility scripts (mark executable with `chmod +x`).

### Code Reviews (`code-reviews/{NNN}-{slug}/`)

Code review documents with primary file `review.yaml` or `review.md`.

## Current Statistics

- Bug Reports: 42 folders
- Planning Docs: 4 folders  
- Code Reviews: 15 folders
- Screenshots: 404 files
- Scripts: 2 files

## Best Practices

1. **One bug per folder** - Keep all bug-related docs together
2. **Descriptive slugs** - Use clear, searchable folder names
3. **Consistent numbering** - Use 3-digit numbers (001, 018, 023)
4. **Meaningful filenames** - Screenshots should be self-documenting

---

Last updated: 2026-06-03
