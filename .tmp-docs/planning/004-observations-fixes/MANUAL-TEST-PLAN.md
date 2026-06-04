# Manual Test Plan: Observation #4 Context Propagation Fix

**Date**: 2026-06-04  
**Commit**: 3f9addb  
**Task**: M1-t01 - Fix `$generateQuestion` context propagation  
**Duration**: ~10 minutes

---

## Prerequisites

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Open browser**: http://localhost:5173

---

## Test Case 1: Context Flows to Step 2 (Primary)

### Steps

1. **Create New Project**
   - Click "New Project" or navigate to dashboard
   - Enter project name: "recipe-social-network-test"

2. **Complete Step 1**
   - Choose: "I'm starting from scratch"
   - Enter project description:
     ```
     A recipe sharing social network where users can post recipes, 
     follow other cooks, and build their personal cookbook. 
     Think Instagram meets AllRecipes.
     ```
   - Submit form

3. **Observe Step 2 Question**
   - **PASS**: Question mentions "recipe" OR "social network" OR "cookbook" OR "cooking"
   - **PASS**: Question is contextual (e.g., "For your recipe sharing platform, what is the primary problem...")
   - **FAIL**: Question asks "Could you please provide an overview of your software project?"

### Expected Behavior

**✅ PASS Example**:
> "For your recipe sharing social network, what is the primary problem you're solving for users? Consider aspects like recipe discovery, social engagement, or personal organization..."

**❌ FAIL Example** (OLD BEHAVIOR):
> "I'd be happy to help you gather comprehensive business requirements! However, I need the project context first. Could you please provide an overview of your software project?"

---

## Test Case 2: Context Accumulates Across Questions

### Steps

1. **Answer First Question**
   - Provide detailed answer
   - Submit

2. **Observe Second Question**
   - **PASS**: Question references your first answer
   - **PASS**: Question builds on established context
   - **FAIL**: Question seems unrelated or generic

### Expected Behavior

Questions should demonstrate cumulative understanding of:
- Initial project description from Step 1
- All previous answers in Step 2

---

## Test Case 3: Different Project Types

### Repeat with Different Context

**Test Project 2: Technical Tool**
```
A command-line tool for managing Kubernetes configurations 
across multiple clusters and environments.
```

**Expected Step 2**: Should mention "Kubernetes" or "CLI" or "DevOps"

**Test Project 3: E-commerce**
```
An online marketplace for handmade crafts with built-in 
payment processing and seller analytics.
```

**Expected Step 2**: Should mention "marketplace" or "e-commerce" or "sellers"

---

## Verification Checklist

- [ ] Step 2 question mentions project specifics from Step 1
- [ ] No generic "tell me about your project" questions
- [ ] Context persists across multiple Q&A in Step 2
- [ ] Works for different project types (social, technical, business)
- [ ] No console errors in browser DevTools
- [ ] No server errors in terminal

---

## Screenshot Locations

Save screenshots to `.tmp-docs/screenshots/`:

1. `obs4-step1-filled.png` - Step 1 form with project description
2. `obs4-step2-question.png` - Step 2 question showing context
3. `obs4-step2-followup.png` - Second question building on context

---

## If Test Fails

### Debug Steps

1. **Check browser console** for errors:
   - Press F12 → Console tab
   - Look for errors related to `generateQuestion` or `fetchQuestion`

2. **Check server logs** for context:
   ```bash
   # In terminal running dev server
   # Look for:
   [fetchQuestion] Calling $generateQuestion...
   [server] projectOverview: <should show your Step 1 description>
   ```

3. **Check XState context**:
   - Open React DevTools
   - Find `PlanningMachineContext`
   - Check `step1Responses.projectDescription` has your text

4. **Report issue**:
   - Copy console logs
   - Copy server logs
   - Note which test case failed
   - Create incident report in `.tmp-docs/incidents/`

---

## Success Criteria

**✅ Test PASSES if:**
- All 3 test cases show contextualized questions
- No generic "tell me about your project" prompts
- Questions build on accumulated context
- No errors in console or server logs

**❌ Test FAILS if:**
- Any question asks for project overview again
- Questions seem generic/unrelated to project
- Console shows errors related to context
- Server logs show missing `projectContext`

---

## Rollback Plan

**If test fails:**

```bash
# Revert the fix commit
git revert 3f9addb

# Verify tests still pass
npm test -- src/features/planning/machines/planningMachine.test.ts src/features/ai --run

# Create incident report
touch .tmp-docs/incidents/obs4-fix-failed-$(date +%Y%m%d).md
```

---

## Next Steps After Verification

**If PASS:**
- ✅ Mark observation #4 as verified in OBSERVATIONS-CHECKLIST.md
- ✅ Move to M2-t01: Implement gap analysis intelligence
- ✅ Update SUMMARY.md with verification results

**If FAIL:**
- ❌ Create incident report
- ❌ Analyze root cause (different from diagnosis?)
- ❌ Plan alternative fix approach
- ❌ Re-run diagnostic tests

---

**Manual Testing Required**: This is a UX test that requires human observation of LLM behavior and context awareness.

**Estimated Time**: 10 minutes per test case (30 min total)

**Priority**: P0 - Critical fix verification before moving to next milestone
