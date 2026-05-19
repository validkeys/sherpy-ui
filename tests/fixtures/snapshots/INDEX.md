# Snapshot Index

**Purpose:** Documents all captured snapshots for regression testing  
**Last Updated:** 2026-05-14  
**Snapshot Version:** 1.0

## Overview

This directory contains XState machine snapshots captured from real workflow sessions. Each snapshot preserves the complete machine context at a specific step, enabling regression tests without requiring full workflow execution.

## Snapshot Naming Convention

```
step-{stepNumber}-{label}-{timestamp}.json
```

- **stepNumber:** 1-10 (workflow step)
- **label:** Descriptive kebab-case label (e.g., "standard", "incomplete-3q", "missing-critical")
- **timestamp:** Unix timestamp for uniqueness

## Automated Snapshots (Task 2.8a)

Generated via `npm run snapshots:generate` - standard happy-path progression.

### Step 1: Project Initialization
- `step-1-standard-*.json` (2 files)
- **Purpose:** Initial project setup with empty context
- **Tests:** Project creation, initial state
- **Created:** 2026-05-14 (automated)

### Step 2: Business Requirements Interview
- `step-2-standard-*.json` (2 files)
- **Purpose:** Business interview in progress
- **Tests:** Interview question flow, response capture
- **Created:** 2026-05-14 (automated)
- `step-2-test-with-spaces---special-----chars-*.json` (1 file)
- **Purpose:** Tests snapshot filename sanitization
- **Tests:** Label handling with special characters
- **Created:** 2026-05-14 (automated)

### Step 3: Technical Requirements Interview
- `step-3-standard-*.json` (2 files)
- **Purpose:** Technical interview started
- **Tests:** Technical question flow
- **Created:** 2026-05-14 (automated)

### Step 4: Requirements Review
- `step-4-standard-*.json` (2 files)
- **Purpose:** Review captured requirements
- **Tests:** Requirements display, validation
- **Created:** 2026-05-14 (automated)

### Step 5: Implementation Planning
- `step-5-standard-*.json` (2 files)
- **Purpose:** AI planning in progress
- **Tests:** Plan generation trigger
- **Created:** 2026-05-14 (automated)

### Step 6: Plan Review
- `step-6-standard-*.json` (2 files)
- **Purpose:** Generated plan ready for review
- **Tests:** Plan display, edit capabilities
- **Created:** 2026-05-14 (automated)

### Step 7: Plan Approval
- `step-7-standard-*.json` (2 files)
- **Purpose:** Plan approved by user
- **Tests:** Approval flow, state transition
- **Created:** 2026-05-14 (automated)

### Step 8: File Generation
- `step-8-standard-*.json` (2 files)
- **Purpose:** Files being generated
- **Tests:** File generation trigger
- **Created:** 2026-05-14 (automated)

### Step 9: Review & Commit
- `step-9-standard-*.json` (2 files)
- **Purpose:** Files ready for review
- **Tests:** File display, commit preparation
- **Created:** 2026-05-14 (automated)

### Step 10: Completion
- `step-10-standard-*.json` (2 files)
- **Purpose:** Workflow complete
- **Tests:** Final state, completion handling
- **Created:** 2026-05-14 (automated)

---

## Manual Edge Case Snapshots (Task 2.8b)

**Status:** 🚧 To be captured (see `.tmp-docs/manual-snapshot-capture-guide.md`)

### Planned Edge Cases

#### Step 2 Edge Cases
- [ ] `step-2-incomplete-3q-*.json` - Partial interview (3/10 questions)
- [ ] `step-2-complete-10q-*.json` - Full interview completion
- [ ] `step-2-validation-error-*.json` - Invalid response triggers error

#### Step 5 Edge Cases
- [ ] `step-5-minimal-responses-*.json` - Minimum viable data only
- [ ] `step-5-missing-critical-*.json` - Missing required fields

#### Step 7 Edge Cases
- [ ] `step-7-with-user-edits-*.json` - User edited generated plan

#### Error States
- [ ] `step-3-validation-error-*.json` - Validation error state
- [ ] `step-X-error-recovery-*.json` - Error recovery flow (if applicable)

---

## Usage in Tests

### Loading a Snapshot

```typescript
import { SnapshotCollector } from './SnapshotCollector';

const collector = new SnapshotCollector();

// Load context only
const context = await collector.loadSnapshot('step-5-standard-1778772912331.json');

// Load full snapshot with metadata
const snapshot = await collector.loadFullSnapshot('step-5-standard-1778772912331.json');
```

### Using in Tests

```typescript
describe('Snapshot regression tests', () => {
  it('loads standard step 5 state', async () => {
    const collector = new SnapshotCollector();
    const context = await collector.loadSnapshot('step-5-standard-1778772912331.json');
    
    expect(context.currentStepNumber).toBe(5);
    expect(context.projectId).toBeDefined();
  });
});
```

### Pattern Matching

```typescript
// Find latest snapshot for a label
const snapshots = await collector.listSnapshots();
const latestStandardStep5 = snapshots
  .filter(f => f.includes('step-5-standard'))
  .sort()
  .pop();
```

---

## Snapshot Maintenance

### When to Capture New Snapshots
- New edge cases discovered during testing
- Significant workflow changes requiring new baselines
- Regression issues that need test coverage

### When to Remove Snapshots
- Duplicate captures from same session (keep latest)
- Incompatible with current snapshot version
- Superseded by better examples

### Version Compatibility
- Current version: **1.0**
- Breaking changes require version bump and migration
- See `SnapshotCollector.ts:isCompatibleVersion()` for compatibility logic

---

## Statistics

- **Total Snapshots:** 21
- **Automated:** 21 (Task 2.8a)
- **Manual Edge Cases:** 0 (Task 2.8b pending)
- **Steps Covered:** 1-10 (standard path complete)
- **Edge Cases Covered:** 1 (special characters in label)

---

## Related Documentation

- **Capture Guide:** `.tmp-docs/manual-snapshot-capture-guide.md`
- **Implementation Plan:** `.tmp-docs/implementation-plan-testing-framework.md` (Task 2.8b: lines 1442-1491)
- **Snapshot Collector:** `tests/fixtures/snapshots/SnapshotCollector.ts`
- **Debug Panel:** `src/features/planning/components/DebugPanel.tsx`
