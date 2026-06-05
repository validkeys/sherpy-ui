# docs/ Folder Reorganization Proposal

**Date:** 2026-05-19  
**Issue:** Temporary files mixed with permanent documentation

---

## Current State

### docs/ structure (permanent + temporary mixed):
```
docs/
├── TRACKER.md                          # ✅ Permanent - project milestone tracker
├── database-schema.md                  # ✅ Permanent - technical reference
├── structured-output-rollout.md        # ❓ Temporary - implementation notes
├── STREAMING-STATUS.md                 # ❓ Temporary - status document
├── M4-E2E-WALKTHROUGH.md              # ✅ Permanent - user guide
├── API-ROUTE-ISSUE.md                 # ❓ Temporary - known issue doc
├── screenshots/                        # ✅ Permanent - milestone screenshots
│   └── m3-review-mode/                # (13 screenshots)
├── prs/                               # ❌ TEMPORARY - PR descriptions
│   ├── PR-M3-DESCRIPTION.md
│   ├── PR-M4-DESCRIPTION.md
│   └── QA-TEST-RESULTS-M4.md
├── design_brief/                      # ✅ Permanent - design system reference
│   ├── README.md
│   ├── CLAUDE.md
│   ├── reference/                     # (8 HTML files)
│   └── screenshots/                   # (8 screenshots)
├── archive/                           # ✅ Permanent - archived plans
│   └── plan/
└── planning/                          # ❓ Mixed - test artifacts
    └── mini-app/
```

### .tmp-docs/ structure (already temporary):
```
.tmp-docs/
├── archive/                           # ✅ Many temporary summaries
├── code-reviews/                      # ❓ Could move to docs/
├── docs/e2e-testing/                  # ❌ SHOULD BE IN docs/
├── screenshots/                       # ✅ Test screenshots
└── scripts/                           # ✅ Test scripts
```

---

## Issues

1. **PR descriptions in docs/prs/** - Should be in .tmp-docs/ (created for specific PRs)
2. **E2E testing docs in .tmp-docs/docs/** - Should be in docs/ (permanent testing system)
3. **Temporary status docs in docs/** - Should move to .tmp-docs/
4. **.tmp-docs/ not in .gitignore** - Already added (line 34), needs verification

---

## Proposed Organization

### Permanent docs/ (committed to git):
```
docs/
├── TRACKER.md                         # Project milestone tracker
├── database-schema.md                 # Technical schema reference
├── M4-E2E-WALKTHROUGH.md             # User walkthrough guide
├── design_brief/                      # Design system reference
│   ├── README.md
│   ├── CLAUDE.md
│   └── reference/                     # HTML reference files only
├── archive/                           # Archived implementation plans
│   └── plan/
│       └── source/                    # Code examples only
└── e2e-testing/                       # ⬅️ MOVE FROM .tmp-docs/
    ├── README.md                      # Testing system overview
    ├── TESTING-SYSTEM.md             # Architecture
    ├── INDEX.md                       # Navigation
    ├── QUICK-REFERENCE.md            # Quick reference
    ├── learnings.md                   # Lessons learned
    ├── migration-to-playwright-mcp.md # Migration guide
    ├── agent-browser-form-filling-guide.md
    ├── agent-browser-quick-reference.md
    ├── guide.md
    ├── tracking-template.yaml
    ├── bug-report-template.yaml
    ├── ai-browser-test.yaml
    ├── bug-014-root-cause-analysis.md # Important findings
    ├── bug-014-test-validation-summary.md
    ├── bug-reports/                   # Bug documentation
    │   └── [21 files - important findings]
    └── runs/                          # Test run archives
        ├── README.md
        └── [001-012 directories]
```

### Temporary .tmp-docs/ (in .gitignore):
```
.tmp-docs/
├── archive/                           # Old completion summaries
├── code-reviews/                      # PR code reviews
├── screenshots/                       # ALL screenshots (37 files, 1.8MB)
│   ├── m3-review-mode/               # ⬅️ MOVE FROM docs/screenshots/
│   ├── design-brief/                 # ⬅️ MOVE FROM docs/design_brief/screenshots/
│   ├── archive-plan-frames/          # ⬅️ MOVE FROM docs/archive/plan/frames/
│   ├── planning-mini-app/            # ⬅️ MOVE FROM docs/planning/mini-app/implementation/
│   └── [test run screenshots - already here]
├── scripts/                           # Test scripts
├── prs/                               # ⬅️ MOVE FROM docs/
│   ├── PR-M3-DESCRIPTION.md
│   ├── PR-M4-DESCRIPTION.md
│   └── QA-TEST-RESULTS-M4.md
├── status/                            # ⬅️ NEW - temporary status docs
│   ├── API-ROUTE-ISSUE.md            # Known issues
│   ├── STREAMING-STATUS.md           # Implementation status
│   └── structured-output-rollout.md  # Rollout notes
└── planning/                          # Test artifacts
    └── mini-app/
```

---

## Migration Plan

### Phase 1: Move E2E Testing Docs (High Priority)
```bash
# Move e2e-testing from .tmp-docs/ to docs/
mv .tmp-docs/docs/e2e-testing docs/

# Remove empty .tmp-docs/docs/ directory
rmdir .tmp-docs/docs/
```

**Rationale:** E2E testing system is permanent infrastructure, not temporary

### Phase 2: Move PR Descriptions (Medium Priority)
```bash
# Create prs directory in .tmp-docs/
mkdir -p .tmp-docs/prs

# Move PR descriptions
mv docs/prs/* .tmp-docs/prs/

# Remove empty docs/prs/
rmdir docs/prs/
```

**Rationale:** PR descriptions are created for specific PRs, not permanent docs

### Phase 3: Move Temporary Status Docs (Low Priority)
```bash
# Create status directory in .tmp-docs/
mkdir -p .tmp-docs/status

# Move temporary status documents
mv docs/API-ROUTE-ISSUE.md .tmp-docs/status/
mv docs/STREAMING-STATUS.md .tmp-docs/status/
mv docs/structured-output-rollout.md .tmp-docs/status/
```

**Rationale:** These are temporary implementation notes, not permanent reference

### Phase 4: Clean up planning/ (Optional)
```bash
# Review contents and move test artifacts to .tmp-docs/
# Keep only if truly permanent
```

---

## Verification

### Check .gitignore
```bash
grep -n "\.tmp-docs" .gitignore
# Shows: 34:.tmp-docs/
```

✅ Present on line 34

### Verify no committed .tmp-docs/
```bash
git ls-files .tmp-docs/ | wc -l
# Shows: 116 files tracked
```

⚠️ **ISSUE FOUND:** .tmp-docs/ is in .gitignore BUT 116 files are already tracked in git

**Root Cause:** Files were added to git before .gitignore rule was created. .gitignore only prevents NEW files from being tracked.

**Solution Required:** Untrack these files from git while keeping them locally

---

## Decision Rules

### Keep in docs/ if:
- ✅ Permanent technical reference (schema, architecture)
- ✅ User-facing guides (walkthroughs, tutorials)
- ✅ Design system reference materials (HTML, CSS - not screenshots)
- ✅ Testing system documentation
- ✅ Important bug findings and lessons learned
- ✅ Code examples and reference files

### Move to .tmp-docs/ if:
- ❌ Created for a specific PR or branch
- ❌ Status updates or progress tracking
- ❌ Implementation notes and summaries
- ❌ **ALL screenshots** (binary files, bloat git history)
- ❌ Temporary scripts and debugging tools
- ❌ "Completion summary" or "final report" documents

---

## Impact Assessment

### Files to Move

**To .tmp-docs/ (remove from git):**
- **Screenshots**: 37 files (1.8MB total) → .tmp-docs/screenshots/
  - docs/screenshots/m3-review-mode/ (13 files)
  - docs/design_brief/screenshots/ (8 files)
  - docs/archive/plan/frames/ (13 files)
  - docs/planning/mini-app/implementation/ (3 .png files)
- **docs/prs/**: 3 files → .tmp-docs/prs/
- **docs/ status**: 3 files → .tmp-docs/status/

**To docs/ (add to git):**
- **.tmp-docs/docs/e2e-testing/**: 40+ files → docs/e2e-testing/

### Files to Keep in docs/: ~8 core files
- docs/TRACKER.md
- docs/database-schema.md
- docs/M4-E2E-WALKTHROUGH.md
- docs/design_brief/*.md (2 files)
- docs/design_brief/reference/*.html (8 files)
- docs/archive/plan/*.md (4 files)
- docs/archive/plan/source/*.{jsx,css} (4 files)

### Git Impact
- **Reduces git repo size** by 1.8MB (screenshots removed)
- **No history loss** - moving within same repo
- **Broken links** - will need to update any markdown files referencing screenshots
- **.tmp-docs/ already in .gitignore** - no accidental commits after untracking

---

## Recommended Actions

### Phase 0: Fix .gitignore Issue (REQUIRED FIRST)
```bash
# Untrack all .tmp-docs/ files from git (keep files locally)
git rm -r --cached .tmp-docs/

# Commit the untracking
git commit -m "chore: untrack .tmp-docs/ directory (already in .gitignore)"

# Verify .tmp-docs/ is now ignored
git status .tmp-docs/
# Should show: "nothing to commit"
```

**Why:** .gitignore rule exists but 116 files are already tracked. Must untrack them first.

### Phase 1: Move All Screenshots (High Priority - Reduces Git Bloat)
```bash
# Create organized screenshot directories
mkdir -p .tmp-docs/screenshots/{m3-review-mode,design-brief,archive-plan-frames,planning-mini-app}

# Move milestone screenshots
mv docs/screenshots/m3-review-mode/* .tmp-docs/screenshots/m3-review-mode/
git rm docs/screenshots/m3-review-mode/*
rmdir docs/screenshots/m3-review-mode docs/screenshots

# Move design brief screenshots
mv docs/design_brief/screenshots/* .tmp-docs/screenshots/design-brief/
git rm docs/design_brief/screenshots/*
rmdir docs/design_brief/screenshots

# Move archive plan frames
mv docs/archive/plan/frames/* .tmp-docs/screenshots/archive-plan-frames/
git rm docs/archive/plan/frames/*
rmdir docs/archive/plan/frames

# Move planning mini-app screenshots
mv docs/planning/mini-app/implementation/*.png .tmp-docs/screenshots/planning-mini-app/
git rm docs/planning/mini-app/implementation/*.png

git commit -m "chore: move all screenshots to .tmp-docs/ (37 files, 1.8MB)"
```

**Rationale:** Screenshots bloat git history. They're valuable for debugging but don't need version control.

### Phase 2: Move E2E Testing Docs (High Priority)
```bash
# Move e2e-testing from .tmp-docs/ to docs/
git mv .tmp-docs/docs/e2e-testing docs/

# Remove empty .tmp-docs/docs/ directory
rmdir .tmp-docs/docs/

git commit -m "docs: move e2e-testing to permanent docs/"
```

### Phase 3: Move PR Descriptions (Medium Priority)
```bash
# Create prs directory in .tmp-docs/
mkdir -p .tmp-docs/prs

# Move PR descriptions (locally only, not tracked)
mv docs/prs/* .tmp-docs/prs/

# Remove from git
git rm docs/prs/*
rmdir docs/prs/

git commit -m "chore: move PR descriptions to .tmp-docs/"
```

### Phase 4: Move Temporary Status Docs (Low Priority)
```bash
# Create status directory in .tmp-docs/
mkdir -p .tmp-docs/status

# Move temporary status documents
mv docs/API-ROUTE-ISSUE.md .tmp-docs/status/
mv docs/STREAMING-STATUS.md .tmp-docs/status/
mv docs/structured-output-rollout.md .tmp-docs/status/

# Remove from git
git rm docs/API-ROUTE-ISSUE.md docs/STREAMING-STATUS.md docs/structured-output-rollout.md

git commit -m "chore: move temporary status docs to .tmp-docs/"
```

### Phase 5: Update Screenshot References (Required)

The following files reference screenshots and need path updates:

```bash
# Files with screenshot references:
# - docs/prs/QA-TEST-RESULTS-M4.md (moving to .tmp-docs anyway)
# - docs/prs/PR-M3-DESCRIPTION.md (moving to .tmp-docs anyway)
# - docs/design_brief/README.md
# - docs/design_brief/CLAUDE.md
# - docs/archive/plan/implementation.md
# - docs/archive/plan/README.md
```

**Action:** Update image paths in design_brief and archive/plan markdown files:
- Old: `screenshots/` or `frames/`
- New: `../../.tmp-docs/screenshots/design-brief/` or `../../.tmp-docs/screenshots/archive-plan-frames/`

**Note:** PR description files are moving to .tmp-docs/ too, so their screenshot paths can be updated there.

### Optional: Review & Clean
6. **Review docs/planning/** - decide if test artifacts or permanent
7. **Update CLAUDE.md** - fix any references to moved paths

---

## Questions for Review

1. **docs/planning/mini-app/**: Keep in docs/ or move to .tmp-docs/?
   - Contains: acceptance-testing.yaml, artifacts/, implementation/, planning/
   - Decision: ?

2. **docs/archive/plan/**: Already archived, keep as-is?
   - Contains: old implementation plans
   - Decision: Keep (historical reference)

3. **E2E test runs (001-012)**: Archive or keep accessible?
   - Contains: detailed test run logs, tracking.yaml, summaries
   - Decision: Keep in docs/e2e-testing/runs/ (valuable debugging history)

---

## Summary

**Goal:** Clear separation between permanent documentation (docs/) and temporary work products (.tmp-docs/)

**Key Moves:**
- ❌ **ALL screenshots** (37 files, 1.8MB) → .tmp-docs/screenshots/ (reduces git bloat)
- ✅ **E2E testing system** → docs/ (permanent infrastructure)
- ❌ **PR descriptions** → .tmp-docs/ (temporary, PR-specific)
- ❌ **Status documents** → .tmp-docs/ (temporary notes)

**Critical First Step:**
- ⚠️ **Untrack 116 .tmp-docs/ files** already in git (despite .gitignore rule)

**Result:** 
- docs/ = text-only permanent reference (no binary files)
- .tmp-docs/ = screenshots, work-in-progress, summaries, PR artifacts
- Smaller git repo size (1.8MB+ removed)
- No accidental commits of temporary files

**Files needing path updates:** 6 markdown files reference screenshots (detailed in Phase 5)
