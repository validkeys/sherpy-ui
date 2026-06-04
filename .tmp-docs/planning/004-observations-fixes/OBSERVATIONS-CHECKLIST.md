# Observations Implementation Checklist

**Source:** `/workspace/observations.md`  
**Plan:** `.tmp-docs/planning/004-observations-fixes/FINAL-REVISED-PLAN.md`  
**Status:** All observations have implementation tasks

---

## Observation #1: Unstyled Navigation

### **Original Observation:**
> "The 'Step X of X' and 'Back / Next' are unstyled at the top of the artifacts column"

### **Status:** ✅ CONFIRMED via Playwright MCP testing

### **Evidence:**
- Screenshot: `.tmp-docs/screenshots/diagnostic-step1-initial.png`
- Accessibility tree shows: `button "Back" [disabled]` and `button "Next" [disabled]` with no styling

### **Implementation Plan:** ✅ READY

**Task:** M3-t01 - Style Navigation component  
**File:** `src/features/planning/components/Navigation.tsx`  
**Effort:** 45 minutes  
**Priority:** P2 (Polish)

**Solution:**
```tsx
// Apply Spectrum design system tokens
<div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200">
  <button
    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Back
  </button>
  
  <span className="text-sm text-gray-600">
    Step {currentStep} of {totalSteps}
  </span>
  
  <button
    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Next
  </button>
</div>
```

**Validation:**
- Manual browser test
- Verify Spectrum design system compliance
- Check hover states, focus states, disabled states

---

## Observation #2: Z-Index Overlap

### **Original Observation:**
> "The section dividers in the main chat window area overlap the textarea (z-index issue)"

### **Status:** ⚠️ DEFERRED - Cannot verify at Step 1

### **Reason:**
Section dividers only appear when there are multiple chat messages. At Step 1 (form collection), there's only one message from Sherpy, so no dividers are visible yet.

### **Implementation Plan:** ⏸️ DEFERRED TO PHASE 2

**When to test:**
- After fixing observation #4 (context propagation)
- Progress to Step 2 with multiple Q&A exchanges
- Observe if dividers overlap the textarea

**If confirmed:**

**Task:** TBD - Fix z-index overlap  
**File:** `src/components/workflow-chat/WorkflowChat.tsx`  
**Effort:** ~30 minutes  
**Priority:** P1 (UX issue)

**Solution:**
```tsx
// Dividers
<div className="z-0 border-b border-gray-200" />

// Textarea container
<div className="z-20 sticky bottom-0">
  <textarea className="..." />
</div>
```

**Action Required:** Re-test after Step 2 progress, then add to plan if confirmed

---

## Observation #3: Gap Analysis Running Unnecessarily

### **Original Observation:**
> "When I didn't have existing requirements and just added what I was building, it still did a gap analysis. We should only do gap analysis when I have existing business requirements."

### **Status:** ✅ CONFIRMED via diagnostic testing

### **Evidence:**
- Created project: "diagnostic-test-todo-app"
- Input: "A simple todo list application" (clearly greenfield)
- Result: Gap analysis ran and generated artifact
- Expected: Should skip directly to Step 2

### **Revised Approach (per your feedback):**
> "For item 3, the backend should ask the LLM if a gap analysis is useful or not."

### **Implementation Plan:** ✅ READY

**Task M2-t01:** Add `$assessGapAnalysisNeed` server function  
**File:** `src/features/ai/server.ts`  
**Effort:** 90 minutes  
**Priority:** P1 (Efficiency)

**Solution:**
```typescript
export const $assessGapAnalysisNeed = createServerFn({ method: 'POST' })
  .validator((data: { userInput: string }) => data)
  .handler(async ({ data }) => {
    const prompt = `Analyze if GAP ANALYSIS is needed:
    "${data.userInput}"
    
    Gap analysis useful when:
    - Existing requirements/docs mentioned
    - References prior work, PRDs, specs
    
    Gap analysis NOT useful when:
    - Starting from scratch
    - Greenfield project
    - Just an idea
    
    Respond JSON: { needsGapAnalysis: boolean, reasoning: string, confidence: 'high'|'medium'|'low' }`;
    
    const response = await generateText([{role: 'user', content: prompt}], 1);
    return JSON.parse(response);
  });
```

**Task M2-t02:** Add assessment state after Step 1 form  
**Files:** `src/features/planning/machines/planningMachine.ts`, `types.ts`  
**Effort:** 75 minutes  
**Priority:** P1

**Architecture:**
```
Step 1 Form Submit
  ↓
assessingNeed (invoke LLM assessment)
  ↓
Decision:
  - If needsGapAnalysis: false → Skip to Step 2
  - If needsGapAnalysis: true → Generate gap analysis artifact → Step 2
```

**Validation:**
- Test greenfield project: "Build a todo app from scratch" → Should skip
- Test existing requirements: "I have PRD docs for migration" → Should run
- Test ambiguous: "Update auth system" → Should assess with reasoning

---

## Observation #4: Context Not Propagating to Business Requirements

### **Original Observation:**
> "After the gap analysis was done, it immediately went to the business requirements interview but it appears that the context of what I was building wasn't sent to the LLM as the prompt shows:
> 
> 'I'd be happy to help you gather comprehensive business requirements! However, I need the project context first. **Could you please provide an overview of your software project?**'"

### **Status:** ✅ FIXED AND VERIFIED (2026-06-04)

### **Evidence:**
- Manual test completed: `.tmp-docs/planning/004-observations-fixes/MANUAL-TEST-RESULTS.md`
- Screenshot: `.tmp-docs/screenshots/diagnostic-step2-no-context.png`
- Step 1 responses in context: `{ projectDescription: "Test project description" }`
- Step 2 LLM response: Asks for project overview again

### **Root Cause:**
`$generateQuestion` in `src/features/ai/server.ts` receives `projectContext` parameter but **IGNORES IT** and tries to fetch from database instead, which fails.

### **Implementation Plan:** ✅ READY (CRITICAL FIX)

**Task M1-t01:** Fix `$generateQuestion` to use projectContext parameter  
**File:** `src/features/ai/server.ts`  
**Effort:** 30 minutes  
**Priority:** P0 (CRITICAL - Blocking user workflow)

**Solution:**
```typescript
// BEFORE (BROKEN):
export const $generateQuestion = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    return {
      projectId: input.projectId,
      stepNumber: input.stepNumber,
      previousAnswers: input.previousAnswers,
      // ❌ Missing: projectContext
    };
  })
  .handler(async ({ data }) => {
    // ❌ Ignores projectContext, tries database lookup
    let projectOverview: string | undefined;
    if (data.stepNumber > 1) {
      const stepState = await $getStepState(...);  // Fails
    }
  });

// AFTER (FIXED):
export const $generateQuestion = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    return {
      projectId: input.projectId,
      stepNumber: input.stepNumber,
      previousAnswers: input.previousAnswers,
      projectContext: input.projectContext,  // ✅ ADD
    };
  })
  .handler(async ({ data }) => {
    // ✅ Use projectContext first
    let projectOverview = data.projectContext;
    
    // Fallback to database only if not provided
    if (!projectOverview && data.stepNumber > 1) {
      const stepState = await $getStepState(...);
    }
  });
```

**Lines Changed:** ~10  
**Complexity:** Low (simple parameter usage)  
**Risk:** Very low (fixes existing broken behavior)

**Validation:**
```bash
# 1. Unit tests
npm test src/features/ai/server.test.ts

# 2. Manual test
# - Create new project
# - Fill Step 1: "A mobile fitness tracker app"
# - Submit
# - Verify Step 2 question mentions "fitness tracker"
```

**Expected Result:**
Step 2 question should be contextualized like:
> "For your mobile fitness tracker app, what is the primary problem you're solving for users? Consider aspects like workout tracking, goal setting, or community features..."

---

## Summary: All Observations Covered

| Observation | Status | Priority | Effort | Milestone |
|-------------|--------|----------|--------|-----------|
| **#1** Navigation Unstyled | ✅ CONFIRMED | P2 | 45 min | M3-t01 |
| **#2** Z-Index Overlap | ⚠️ DEFERRED | P1 | 30 min | TBD (after Step 2 test) |
| **#3** Gap Analysis Always Runs | ✅ CONFIRMED | P1 | 165 min | M2-t01 + M2-t02 |
| **#4** Context Not Propagating | ✅ ROOT CAUSE FOUND | P0 | 30 min | M1-t01 |
| **Total** | 3 confirmed, 1 deferred | - | **4 hours** | - |

### **Implementation Order:**

**Phase 1: Critical Fix** (30 min)
1. ✅ M1-t01: Fix `$generateQuestion` (Observation #4) - **COMPLETE** (commit 3f9addb)

**Phase 2: Intelligence** (165 min)
2. ✅ M2-t01: Add gap analysis assessment server function (Observation #3) - **COMPLETE** (2026-06-04)
3. ✅ M2-t02: Add assessment state to machine (Observation #3) - **COMPLETE** (2026-06-04)

**Phase 3: Polish** (75 min)
4. ✅ M3-t01: Style navigation (Observation #1) - **COMPLETE** (commit 8234289)
5. ✅ M3-t02: Connect loading indicator to machine state - **COMPLETE** (2026-06-04)

**Phase 4: Validation** (60 min)
6. ✅ M4-t01: E2E manual validation - **COMPLETE** (2026-06-04)
7. ⏸️ Re-test Observation #2 at Step 2+ - Deferred

**Total:** 5 hours (300 minutes)

**Status:** ✅ **PHASES 1-4 COMPLETE** (Observation #4 fully implemented and validated)

---

## Missing from Plan

### **Observation #2: Z-Index Overlap**

**Status:** Cannot verify until we progress to Step 2 with multiple messages

**Action Required:**
1. After fixing observation #4 (context propagation)
2. Progress through Step 2 with multiple Q&A exchanges
3. Observe if section dividers overlap textarea
4. If confirmed:
   - Add task to implementation plan
   - Estimate: ~30 minutes
   - Priority: P1 (UX issue)
   - Solution: Apply proper z-index scale

**Why Deferred:**
- Step 1 only has one message (Sherpy's form prompt)
- No section dividers visible yet
- Need real chat history to see dividers

---

## Verification Plan

### **For Each Observation:**

**#1 - Navigation Styling:**
- [ ] Open WorkflowChat in browser
- [ ] Verify Back/Next buttons have Spectrum styling
- [ ] Test hover states (background changes)
- [ ] Test focus states (ring appears)
- [ ] Test disabled states (opacity reduced)
- [ ] Screenshot before/after

**#2 - Z-Index Overlap:**
- [ ] Progress to Step 2
- [ ] Answer 3-4 questions to create message history
- [ ] Observe if dividers overlap textarea
- [ ] If yes: Apply z-index fix
- [ ] Screenshot issue + fix

**#3 - Gap Analysis Intelligence:**
- [ ] Test greenfield: "Build X from scratch" → Should skip to Step 2
- [ ] Test existing: "I have PRDs for X" → Should run gap analysis
- [ ] Test ambiguous: "Update X system" → Should show reasoning
- [ ] Verify assessment logging
- [ ] Screenshot each scenario

**#4 - Context Propagation:**
- [x] ~~Create project: "A recipe sharing social network"~~
- [x] ~~Fill Step 1 form with description~~
- [x] ~~Submit~~
- [x] ✅ Check Step 2 question mentions "recipe" or "social network" - **VERIFIED 2026-06-04**
- [x] ✅ Answer one question - **VERIFIED 2026-06-04**
- [x] ✅ Verify next question builds on context - **VERIFIED 2026-06-04**
- [x] ✅ Screenshot contextualized questions - `.tmp-docs/screenshots/obs4-*.png`
- [x] ✅ **Phase 3:** Loading indicator implementation - **COMPLETE 2026-06-04** (commit abd42ea)
- [x] ✅ **Phase 4:** E2E manual validation - **COMPLETE 2026-06-04** (see M4-VERIFICATION-RESULTS.md)

---

## Edge Cases

### **Observation #3: Gap Analysis Assessment**

**Edge Case 1:** User provides very short input
- Input: "App"
- Expected: Low confidence, ask for clarification

**Edge Case 2:** User mentions both existing and new work
- Input: "I have docs for payment system, want to add mobile support"
- Expected: Run gap analysis (existing docs present)

**Edge Case 3:** Assessment service fails
- Expected: Default to safe behavior (run gap analysis)
- Log error for debugging

### **Observation #4: Context Propagation**

**Edge Case 1:** Step 1 skipped (direct to Step 2)
- Expected: Fallback to database lookup
- Gracefully handle missing context

**Edge Case 2:** Context is very long (>10,000 chars)
- Expected: Truncate or summarize
- Don't exceed LLM token limits

**Edge Case 3:** Context contains special characters
- Expected: Proper escaping in prompts
- No injection vulnerabilities

---

## Success Criteria

### **Observation #1:**
- ✅ Navigation buttons use Spectrum design tokens
- ✅ Hover/focus/disabled states work correctly
- ✅ Visual consistency with rest of UI

### **Observation #2:**
- ✅ Section dividers do not overlap textarea
- ✅ Proper z-index stacking order
- ✅ All interactive elements accessible

### **Observation #3:**
- ✅ Greenfield projects skip gap analysis
- ✅ Projects with existing docs run gap analysis
- ✅ Assessment provides reasoning for decision
- ✅ User workflow is faster for simple projects

### **Observation #4:**
- ✅ Step 2 questions mention project from Step 1
- ✅ Questions are customized to project type
- ✅ No repetition of information
- ✅ Smooth workflow from Step 1 → Step 2

---

## Rollback Plan

**If any fix causes issues:**

1. **Check which commit:**
   ```bash
   git log --oneline -5
   ```

2. **Revert specific commit:**
   ```bash
   git revert <commit-hash>
   ```

3. **Verify tests still pass:**
   ```bash
   npm test
   npm run typecheck
   ```

4. **Document issue:**
   - Create incident report in `.tmp-docs/incidents/`
   - Note what broke and why
   - Plan alternative approach

---

## Status

**Overall:** ✅ **ALL OBSERVATIONS HAVE IMPLEMENTATION PLANS**

**Ready to Implement:**
- ✅ Observation #1 (Navigation) - M3-t01
- ⏸️ Observation #2 (Z-Index) - Deferred, needs Step 2 testing
- ✅ Observation #3 (Gap Analysis) - M2-t01 + M2-t02
- ✅ Observation #4 (Context) - M1-t01 (CRITICAL)

**Confidence:** High (95%)  
**Total Effort:** 4-5 hours  
**Next Action:** Implement M1-t01 (30 minutes)

---

**Last Updated:** 2026-06-04  
**Plan Document:** `.tmp-docs/planning/004-observations-fixes/FINAL-REVISED-PLAN.md`  
**Test Results:** `.tmp-docs/planning/004-observations-fixes/MANUAL-TEST-RESULTS.md`
