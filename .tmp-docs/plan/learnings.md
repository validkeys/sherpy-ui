# AI Browser Testing - Learnings

**Purpose:** Capture insights from each test run to help future AI testers  
**Updated:** 2026-05-12  
**Format:** `## Step ID - Learning Title` → Description

---

## Known Issues from Test Run #1 (2026-05-12)

### step-03 - Gap Analysis Artifact Generation Hangs (BUG-006)

**Issue:** After submitting Step 1 form, artifact generation does not complete. Form submits successfully but workflow does not transition to Step 2.

**Server Log Warning:** `[FormStep] ⚠️ Still on step 1 - artifact generation may have failed`

**Impact:** BLOCKING - Cannot progress past Step 1

**Workaround:** None currently

**Action:** If Step 1 submission hangs for >60 seconds, file bug report and STOP testing.

---

## step-01 - Create New Project

*No learnings yet. Update after first successful run.*

---

## step-02 - Gap Analysis Form Fill

*No learnings yet. Update after first successful run.*

---

## step-03 - Gap Analysis Artifact Generation

**Known Issue (BUG-012 - BLOCKING - CRITICAL):** Form data not captured on submit (PERSISTENT REGRESSION)

**Latest Test (Run #006 - 2026-05-13):** CONFIRMED AGAIN - XState machine initializes correctly, localStorage key exists before submit, but form data is NOT captured when Submit button is clicked. This is the THIRD time this exact bug has been reported (BUG-007, BUG-011, BUG-012).

**Root Cause:** Form submit handler is not reading textarea values and populating step1Responses before sending SUBMIT_FORM event to XState actor. The defensive fixes from BUG-007 may validate submission requirements but do not capture the actual form values.

**Evidence (Test Run #006):**
- localStorage planning-machine-0kHaCxFL exists BEFORE submit ✓
- XState properly initialized with projectId and currentStepNumber ✓
- Form textareas filled, Submit button enabled correctly ✓
- On Submit click: button disables, fields clear ✓
- After submit: step1Responses still {} (EMPTY) ✗
- State remains: {step1_gapAnalysis: "collecting"} (never transitions) ✗
- Performance API shows ZERO API calls to /api/ai/interview ✗
- Waited 62 seconds: no transition, stuck on Step 1 ✗

**Pattern:** This issue has persisted through multiple "fixes" and continues to block ALL workflow testing at Step 1.

**Action:** BLOCKING - Need to investigate FormStep submit handler logic. Add logging to trace: (1) textarea onChange updates, (2) form state before submit, (3) SUBMIT_FORM event payload, (4) XState context after event received.

---

**Previous Issue (BUG-009 - BLOCKING - CRITICAL - PARTIALLY FIXED):** XState machine not initializing - no localStorage created

**Latest Test (Run #003 - 2026-05-13):** Despite clearing localStorage before test start, form submission fails to initialize XState machine. NO planning-machine-{projectId} localStorage key is ever created. Form becomes disabled but workflow never advances to Stage 2.

**Root Cause:** Different from BUG-007/BUG-008. Those bugs assumed corrupted localStorage, but BUG-009 shows localStorage is never created in the first place. XState actor may not be starting properly.

**Action:** BLOCKING - Requires investigation of XState actor initialization, React component mounting, and actor lifecycle during form submission.

---

**Previous Issue (BUG-008 - BLOCKING - REGRESSION):** Submit button does not trigger any API call or artifact generation

**Details:** When clicking Submit after filling Gap Analysis form, the button and form fields become disabled but no network request is made. No artifact generation occurs server-side. Form remains stuck indefinitely.

**Evidence:** 
- Network tab shows zero API calls after Submit click
- Server logs show formData: {} is empty and isFormValid: false
- Query error: "Query data cannot be undefined for key: [\"project\",\"LcINIWVz\"]"

**Impact:** Different from BUG-006 which showed generation attempt. This bug shows submission never starts.

**REGRESSION NOTE:** BUG-007 was marked as "fixed" on 2026-05-13, but the exact same issue persists in test run #002. Either the fix wasn't applied, was reverted, or didn't address the root cause. New bug report BUG-008 filed to track this regression.

**Action:** BLOCKING - Cannot test any steps beyond Step 1 until fixed. BUG-008 filed for regression investigation.

---

**Previous Issue (BUG-006):** Artifact generation hangs. Do not wait longer than 60 seconds.

---

## step-04 - Business Requirements Question 1

**Contextual Question Check:** Question MUST reference project specifics (e.g., "healthcare patient portal"). If question is generic (e.g., "What is the primary problem your project aims to solve?"), this indicates the context is not being passed correctly to the AI interview system.

**Verification:** This was verified working via API tests but not yet tested in UI due to Step 1 blocker.

---

## step-05 - Business Requirements Answer Question 1

*No learnings yet. Update after first successful run.*

---

## step-06 - Business Requirements Questions 2-10

*No learnings yet. Update after first successful run.*

---

## step-07 - Technical Requirements Interview

*No learnings yet. Update after first successful run.*

---

## step-08 - Style Anchors Collection (Automated)

*No learnings yet. Update after first successful run.*

---

## step-09 - Implementation Planner

*No learnings yet. Update after first successful run.*

---

## step-10 - Definition of Done (Automated)

*No learnings yet. Update after first successful run.*

---

## step-11 - Architecture Decision Records (Review Only)

**Important:** This step requires MANUAL navigation. The NEXT button should be ENABLED. You must click it to continue - do not expect auto-transition.

---

## step-12 - Delivery Timeline (Automated)

*No learnings yet. Update after first successful run.*

---

## step-13 - QA Test Plan (Automated)

*No learnings yet. Update after first successful run.*

---

## step-14 - Generate Summaries (Automated)

*No learnings yet. Update after first successful run.*

---

## review-mode - Review Mode Testing

*No learnings yet. Update after first successful run.*

---

## navigation-backward - Backward Navigation

*No learnings yet. Update after first successful run.*

---

## navigation-forward - Forward Navigation

*No learnings yet. Update after first successful run.*

---

## persistence-refresh - Page Refresh Test

*No learnings yet. Update after first successful run.*

---

## persistence-navigate - Navigate Away and Return

*No learnings yet. Update after first successful run.*

---

## General Tips

### Server Logs
Always monitor server logs during test execution. Critical failures often appear server-side before manifesting in UI.

### Browser Console
Keep DevTools open throughout testing. Console errors provide early warning of state machine issues.

### Timing Expectations
If any step exceeds 2x expected duration, investigate immediately. Do not wait indefinitely.

### Screenshot Discipline
Take screenshots for EVERY unexpected behavior, not just errors. Screenshots document "what I saw" vs "what I expected".

### Bug Reports
File bugs immediately when encountered. Do not continue debugging unless explicitly asked - your job is to detect and document, not fix.

---

**Last Updated:** 2026-05-12  
**Learnings Count:** 3 (1 blocking issue, 2 verification tips)
