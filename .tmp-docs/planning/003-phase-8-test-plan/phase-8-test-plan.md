# Phase 8 Test Plan: Artifact-Only Step (Step 7)

**Date:** 2026-05-30  
**Phase:** 8 of 11  
**Goal:** Verify Step 7 (Architecture Decisions) works correctly in WorkflowChat UI

---

## Overview

**Step 7 Details:**
- **Name:** Architecture Decision Records
- **Type:** Automated (no questions)
- **Artifact Key:** `architecture-decisions`
- **Behavior:** Generate artifact automatically, no user interaction required

**What Makes This Different:**
Unlike other automated steps (4,6,8,9,10), Step 7 is purely artifact generation with no follow-up questions. This is the "artifact-only" pattern.

---

## Test Approach

### Setup Method
Use seed script to create a project at Step 7:
```bash
# Option 1: Seed directly to Step 7 (if seed script exists)
pnpm seed:step7

# Option 2: Seed to Step 6 and complete it (advance to Step 7)
pnpm seed:step6
# Then visit UI and click "Complete"
```

### Test Environment
- **URL:** `http://localhost:5180/project/<project-id>/build?workflowChat=1`
- **Dev Server:** Running on port 5180
- **UI Mode:** WorkflowChat (new UI)
- **Browser:** Playwright MCP automated testing

---

## Test Scenarios

### Scenario 1: Fresh Step 7 (Artifact Generation)

**Setup:**
- Seed project to Step 7 start state
- Step 7 should be in `generating` or `answering` state
- No artifact generated yet

**Expected Behavior:**
1. WorkflowChat displays Stage 7 divider
2. Loading indicator appears
3. Artifact generates automatically (no questions)
4. Artifact appears in sidebar as "Architecture Decisions"
5. Artifact content is valid YAML/Markdown
6. ChatComposer is disabled (no questions to answer)
7. Navigation shows "Complete" button (or auto-advances)

**Verification:**
- [ ] Stage divider shows "Stage 7: Architecture Decision Records"
- [ ] Loading indicator during generation
- [ ] Artifact appears in sidebar
- [ ] Artifact content is non-empty and valid
- [ ] No question composer (or composer disabled)
- [ ] Can view artifact in modal
- [ ] Step marked as complete

### Scenario 2: Completed Step 7 (Artifact Already Generated)

**Setup:**
- Seed project with Step 7 already complete
- Artifact already exists
- At Step 8 or later

**Expected Behavior:**
1. WorkflowChat displays Stage 7 in completed state
2. Artifact visible in sidebar
3. Can click artifact to view in modal
4. No loading indicator
5. Step marked complete in progress bar

**Verification:**
- [ ] Stage 7 shows as complete
- [ ] Artifact clickable in sidebar
- [ ] Modal opens with artifact content
- [ ] No "generating" state
- [ ] Progress bar shows Step 7 complete

### Scenario 3: Page Refresh During Generation

**Setup:**
- Start Step 7 generation
- Refresh page mid-generation

**Expected Behavior:**
1. State restored from database
2. Generation continues (or restarts)
3. No state loss
4. Artifact eventually appears

**Verification:**
- [ ] Page refresh doesn't lose progress
- [ ] Generation completes after refresh
- [ ] Artifact persists

---

## Success Criteria

### Functional Requirements
- ✅ Step 7 generates artifact automatically (no questions)
- ✅ Artifact appears in sidebar
- ✅ Artifact content is valid
- ✅ Can view artifact in modal
- ✅ ChatComposer correctly disabled (or hidden)
- ✅ Step marked complete after generation
- ✅ Page refresh preserves state

### UI Requirements
- ✅ Stage divider displays correctly
- ✅ Loading indicator during generation
- ✅ Artifact pill shows correct status
- ✅ No composer input for artifact-only step
- ✅ Navigation buttons work correctly

### Data Integrity
- ✅ Artifact persisted to database
- ✅ Step completion recorded
- ✅ XState machine transitions correctly
- ✅ localStorage and DB in sync

---

## Testing Tools

### Playwright MCP Commands

**Navigate to project:**
```typescript
mcp__playwright__browser_navigate({
  url: "http://localhost:5180/project/<project-id>/build?workflowChat=1"
});
```

**Take screenshot:**
```typescript
mcp__playwright__browser_take_screenshot({
  type: "png",
  filename: ".tmp-docs/screenshots/phase8-step7-<description>.png"
});
```

**Click artifact:**
```typescript
mcp__playwright__browser_click({
  target: "button:has-text('Architecture Decisions')",
  element: "Architecture Decisions artifact"
});
```

**Check for loading indicator:**
```typescript
mcp__playwright__browser_snapshot({
  full_page: false
});
// Look for "TypingIndicator" or loading text in output
```

---

## Edge Cases

### Case 1: Bedrock Error During Generation
**Scenario:** Bedrock API fails  
**Expected:** Error message displayed, option to retry  
**Verify:** Error doesn't crash UI, can recover

### Case 2: Empty Artifact Response
**Scenario:** LLM returns empty content  
**Expected:** Validation error or default placeholder  
**Verify:** No blank artifacts in UI

### Case 3: Very Long Artifact
**Scenario:** ADR artifact >50KB  
**Expected:** Modal scrolls correctly  
**Verify:** Performance acceptable

---

## Rollback Plan

If Step 7 doesn't work in WorkflowChat:
1. Document specific failure
2. Check if old UI works for comparison
3. Create bug report with:
   - Screenshots
   - Console logs
   - XState snapshot
   - Expected vs actual behavior

Do NOT proceed to Phase 9 if Step 7 fails.

---

## Documentation Artifacts

### Files to Create:
- `.tmp-docs/phase-8-test-results.md` - Test execution results
- `.tmp-docs/screenshots/phase8-step7-*.png` - Screenshots
- `.tmp-docs/phase-8-bugs-found.md` - Any issues discovered

### Files to Update:
- `docs/planning/003-workflow-chat-integration/plan.md` - Mark Phase 8 complete
- `docs/planning/003-workflow-chat-integration/summary.md` - Update status

---

## Estimated Time

- **Setup:** 5 minutes (seed + navigate)
- **Scenario 1:** 10 minutes (fresh generation)
- **Scenario 2:** 5 minutes (completed state)
- **Scenario 3:** 5 minutes (page refresh)
- **Edge cases:** 5 minutes (error scenarios)
- **Documentation:** 10 minutes (results + screenshots)

**Total:** ~40 minutes

---

## Next Steps After Phase 8

If Phase 8 passes:
- ✅ Proceed to Phase 9 (Full Workflow Test)

If Phase 8 fails:
- ❌ Document bugs
- ❌ Fix issues
- ❌ Re-test Phase 8

---

**Ready to execute:** Awaiting user go-ahead to start testing
