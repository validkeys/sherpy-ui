# .tmp-docs/ Migration Plan

**Created:** 2026-06-17  
**Status:** 📋 Planning  
**Current Size:** 52MB, 1,349 files, 20 directories  

---

## 🎯 Goal

Reduce `.tmp-docs/` clutter by migrating valuable content to permanent documentation and archiving/deleting ephemeral artifacts.

**Success Criteria:**
- All production-relevant knowledge moved to `docs/`
- Test artifacts consolidated or archived
- Directory size reduced by 70%+ (52MB → <15MB)
- Clear retention policy for future temp docs

---

## 📊 Current Inventory

| Directory | Files | Size | Category | Action |
|-----------|-------|------|----------|--------|
| `screenshots/` | 583 | 39M | Test artifacts | **DELETE** (ephemeral, regenerable) |
| `archive/` | 221 | 6.2M | Historical | **DELETE** (pre-POC code, obsolete) |
| `bug-reports/` | 172 | 2.4M | Investigation | **MIGRATE** → `docs/bugs/CHANGELOG.md` |
| `code-review-remediation/` | 99 | 1.6M | M0-M2 work | **ARCHIVE** (completed, reference) |
| `planning/` | 73 | 1.0M | Project planning | **KEEP** (active state refactor) |
| `summaries/` | 33 | 256K | Session notes | **DELETE** (superseded by docs) |
| `misc/` | 20 | 212K | Ad-hoc notes | **REVIEW** (case-by-case) |
| `.playwright-mcp/` | 42 | 496K | Test snapshots | **DELETE** (Playwright MCP cache) |
| `e2e-testing/` | 19 | 448K | Test analysis | **MIGRATE** → `docs/testing/` |
| `code-reviews/` | 19 | 228K | PR reviews | **DELETE** (GitHub has originals) |
| `scripts/` | 9 | 40K | Utilities | **DELETE** (superseded by scripts/) |
| `test-data/` | 8 | 32K | Seed data | **KEEP** (active E2E fixtures) |
| `regression-test/` | 7 | 120K | Test analysis | **DELETE** (tests now passing) |
| `qa-testing/` | 7 | 56K | Test plans | **DELETE** (superseded) |
| `bug-030/` | 6 | 96K | Investigation | **DELETE** (BUG-030 fixed) |
| `logs/` | 4 | 52K | Debug logs | **DELETE** (ephemeral) |
| `pr-reports/` | 3 | 24K | PR summaries | **DELETE** (GitHub has originals) |
| `test-runs/` | 2 | 12K | Test results | **DELETE** (ephemeral) |
| `state-refactor/` | 2 | 12K | Planning | **KEEP** (active work tracking) |

**Total:** 1,349 files, 52MB

---

## 🗂️ Migration Strategy

### Phase 1: Delete Ephemeral (Target: -42MB)

**Delete directories (no migration needed):**
```bash
# Regenerable test artifacts (39M)
rm -rf .tmp-docs/screenshots/

# Obsolete historical content (6.2M + 256K + 212K)
rm -rf .tmp-docs/archive/
rm -rf .tmp-docs/summaries/

# Playwright MCP cache (496K)
rm -rf .tmp-docs/.playwright-mcp/

# Completed work with no future value (228K + 120K + 56K + 52K + 24K + 12K)
rm -rf .tmp-docs/code-reviews/
rm -rf .tmp-docs/regression-test/
rm -rf .tmp-docs/qa-testing/
rm -rf .tmp-docs/logs/
rm -rf .tmp-docs/pr-reports/
rm -rf .tmp-docs/test-runs/

# Duplicate/obsolete utilities (40K)
rm -rf .tmp-docs/scripts/

# Fixed bugs with investigation docs (96K)
rm -rf .tmp-docs/bug-030/  # BUG-030 learnings already in ADR-003
```

**Result:** 52MB → 10MB (80% reduction)

---

### Phase 2: Migrate Valuable Content (Target: Consolidate to docs/)

#### 2.1 Bug Reports → docs/bugs/CHANGELOG.md

**Source:** `.tmp-docs/bug-reports/` (172 files, 2.4MB)

**Action:** Extract learnings into consolidated changelog
- Keep: FIXED-BUGS.md as-is (already comprehensive)
- Delete: Individual bug investigation folders (learnings extracted to ADRs)

**New Structure:**
```
docs/bugs/
├── CHANGELOG.md         # Chronological bug fix history (from FIXED-BUGS.md)
└── PATTERNS.md          # Common patterns/learnings (extracted from ADRs)
```

**Commands:**
```bash
mkdir -p docs/bugs/
mv .tmp-docs/bug-reports/FIXED-BUGS.md docs/bugs/CHANGELOG.md
# Manual: Extract patterns to PATTERNS.md from ADRs
rm -rf .tmp-docs/bug-reports/
```

**Estimated Effort:** 1 hour (review + extraction)

---

#### 2.2 Code Review Remediation → Archive

**Source:** `.tmp-docs/code-review-remediation/` (99 files, 1.6MB)

**Action:** Preserve as historical reference (completed work)
- PR 21 remediation series (M0-M2) is complete
- Valuable reference for future code reviews
- Move to permanent archive location

**New Location:**
```
docs/archive/2026-06-pr21-remediation/
├── REMEDIATION-COMPLETE.md
├── pr21-remediation/
│   ├── 2025-01-27-{1,2,3}-m{0,1,2}-review.yaml
│   ├── ACCESSIBILITY.md
│   └── tasks/
└── README.md  # Index explaining what's archived
```

**Commands:**
```bash
mkdir -p docs/archive/
mv .tmp-docs/code-review-remediation/ docs/archive/2026-06-pr21-remediation/
# Create docs/archive/README.md with index
```

**Estimated Effort:** 15 minutes

---

#### 2.3 E2E Testing → docs/testing/

**Source:** `.tmp-docs/e2e-testing/` (19 files, 448K)

**Action:** Consolidate into existing E2E-RUNBOOK.md or separate patterns doc
- Analysis of E2E failure patterns
- Debugging strategies
- Integration with Playwright MCP

**Review Files:**
```bash
find .tmp-docs/e2e-testing/ -type f -name "*.md" -o -name "*.yaml"
```

**Target:** Merge valuable patterns into `docs/testing/E2E-RUNBOOK.md` or create `docs/testing/e2e-patterns.md`

**Estimated Effort:** 30 minutes

---

#### 2.4 Misc → Review

**Source:** `.tmp-docs/misc/` (20 files, 212K)

**Action:** Case-by-case review
- Keep: Unique insights not documented elsewhere
- Delete: Duplicate/obsolete notes

**Commands:**
```bash
ls -lh .tmp-docs/misc/
# Manual review each file
```

**Estimated Effort:** 20 minutes

---

### Phase 3: Keep Active Work (No Action)

**Directories to preserve:**
- `.tmp-docs/planning/` (73 files, 1.0MB) - Active state refactor plans
- `.tmp-docs/test-data/` (8 files, 32K) - E2E test fixtures
- `.tmp-docs/state-refactor/` (2 files, 12K) - Active tracking
- `.tmp-docs/HANDOFF.md` - Current handoff tracking

**Total:** 85 files, 1.04MB (will remain in .tmp-docs/)

---

## 📋 Execution Checklist

### Immediate (Safe Deletes)
- [ ] Delete screenshots/ (39M, regenerable)
- [ ] Delete archive/ (6.2M, obsolete)
- [ ] Delete summaries/ (256K, superseded)
- [ ] Delete .playwright-mcp/ (496K, cache)
- [ ] Delete code-reviews/ (228K, GitHub originals)
- [ ] Delete regression-test/ (120K, tests passing)
- [ ] Delete qa-testing/ (56K, superseded)
- [ ] Delete logs/ (52K, ephemeral)
- [ ] Delete pr-reports/ (24K, GitHub originals)
- [ ] Delete test-runs/ (12K, ephemeral)
- [ ] Delete scripts/ (40K, superseded)
- [ ] Delete bug-030/ (96K, learnings in ADR-003)

**Result:** 52MB → 10MB

---

### Moderate Effort (Migrations)
- [ ] Migrate bug-reports/FIXED-BUGS.md → docs/bugs/CHANGELOG.md
- [ ] Extract bug patterns → docs/bugs/PATTERNS.md (from ADRs)
- [ ] Move code-review-remediation/ → docs/archive/2026-06-pr21-remediation/
- [ ] Create docs/archive/README.md (archive index)
- [ ] Review e2e-testing/ for valuable patterns
- [ ] Merge e2e-testing/ insights → docs/testing/E2E-RUNBOOK.md
- [ ] Review misc/ files case-by-case
- [ ] Delete bug-reports/ after migration

**Result:** 10MB → 2-3MB (permanent docs), 1MB (active work)

---

### Keep (No Action)
- [x] planning/ (state refactor)
- [x] test-data/ (E2E fixtures)
- [x] state-refactor/ (tracking)
- [x] HANDOFF.md (current work)

---

## 🔮 Future Retention Policy

### Automatically Delete (Ephemeral)
- Screenshots older than 7 days
- Test run logs after CI pass
- Playwright MCP cache
- Debug logs after issue resolution

### Migrate to docs/ (Permanent)
- Bug investigation learnings
- Architecture decisions
- Test strategies
- Performance analysis

### Keep in .tmp-docs/ (Active Work)
- Current planning artifacts
- Active test fixtures
- Work-in-progress tracking

### Archive (Historical Reference)
- Completed milestone deliverables
- Major refactor documentation
- Code review series (PR 21 remediation)

---

## 📏 Success Metrics

**Before:**
- Size: 52MB
- Files: 1,349
- Directories: 20

**After (Target):**
- Size: <4MB (92% reduction)
- Files: ~100
- Directories: 5

**Moved to docs/:**
- `docs/bugs/` (CHANGELOG + PATTERNS)
- `docs/archive/2026-06-pr21-remediation/`
- Enhanced `docs/testing/E2E-RUNBOOK.md`

---

## ⏱️ Estimated Effort

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1: Delete | 12 directories | 15 min |
| Phase 2: Migrate | 4 migrations | 2 hours |
| Phase 3: Keep | Review only | 10 min |
| **Total** | | **~2.5 hours** |

---

## 🚦 Execution Order

1. **Safe deletes first** (15 min) - No risk, immediate space savings
2. **Migrate bug learnings** (1 hour) - Preserve institutional knowledge
3. **Archive PR 21 remediation** (15 min) - Historical reference
4. **Review E2E patterns** (30 min) - Consolidate test docs
5. **Review misc/** (20 min) - Case-by-case cleanup
6. **Final cleanup** (10 min) - Delete migrated sources

---

## 🔗 Related Documentation

- **Current State:** `.tmp-docs/HANDOFF.md`
- **Bug History:** `.tmp-docs/bug-reports/FIXED-BUGS.md`
- **Code Review:** `.tmp-docs/code-review-remediation/REMEDIATION-COMPLETE.md`
- **Testing:** `docs/testing/E2E-RUNBOOK.md`
- **Architecture:** `docs/architecture/OVERVIEW.md`
