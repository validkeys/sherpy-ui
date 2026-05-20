# Manual Full Workflow Testing Guide - Iterative QA

**Version:** 2.0 (Updated 2026-05-12)  
**Purpose:** Iterative QA testing guide for the complete 10-step Sherpy planning workflow  
**Duration:** 20-30 minutes per full test run  
**Test Strategy:** Run this guide repeatedly, updating the "Test History" section after each run

---

## 📋 Test History

### Test Run #015 - 2026-05-20 (SQLite Integration Test - NEW BLOCKER)
**Tester:** Claude AI Browser Agent  
**Status:** ⛔ BLOCKED at Step 1 Artifact Generation  
**Result:** BUG-017 filed - better-sqlite3 being bundled for browser execution  
**Steps Completed:** Step 1 form submission, but artifact generation failed  
**Duration:** ~5 minutes  
**Issues Found:**
- **BUG-017 (BLOCKING - CRITICAL):** better-sqlite3 (Node.js native module) being loaded in browser context despite using TanStack Start server functions
- Artifact generation fails with two sequential errors: 1) "promisify is not a function" 2) "export named 'default' not found"
- Vite configuration fix partially worked but did not resolve underlying architecture issue
- TanStack Start server/client code boundary not working as expected

**What Worked:**
- ✅ BUG-016 fix verified - __dirname polyfill working correctly
- ✅ Server starts without errors
- ✅ Database file created (132K at ~/.local/share/sherpy/sherpy.db)
- ✅ Project creation works
- ✅ Form data capture works (Playwright MCP fills form correctly)
- ✅ React state management works

**Root Cause:**
- Client-side XState machine dynamically imports server functions
- Vite bundler resolves all imports including database code
- better-sqlite3 ends up in client bundle despite being Node.js-only
- This is an architecture issue with TanStack Start server function isolation

**Next Steps:**
- Investigate TanStack Start documentation for server-only code patterns
- Consider .server.ts file extension pattern
- May need to move to explicit API routes instead of server functions
- **DO NOT MERGE PR #12 until BUG-017 is resolved**

**Documentation:**
- Full test report: `docs/e2e-testing/runs/015/summary.md`
- Bug report: `docs/e2e-testing/bug-reports/017-better-sqlite3-bundled-in-client.yaml`
- BUG-016 resolution: `docs/e2e-testing/bug-reports/BUG-016-RESOLUTION.md`

---

### Test Run #014 - 2026-05-20 (SQLite Integration Test - CRITICAL BLOCKER) ✅ RESOLVED
**Tester:** Claude AI Browser Agent  
**Status:** ⛔ BLOCKED at Dashboard Load (before Step 1)  
**Result:** BUG-016 filed - SQLite database migration fails: `__dirname` not defined in ES module  
**Resolution:** ✅ FIXED - Added ES module __dirname polyfill, verified working in Test Run #015  
**Steps Completed:** 0/18  
**Duration:** ~2 minutes  
**Issues Found:**
- **BUG-016 (RESOLVED):** SQLite integration from PR #12 uses `__dirname` in migrate.ts which is not available in ES modules, causing ReferenceError on server startup
- Server endpoint returns 500 Internal Server Error for all database operations
- Dashboard shows "Failed to load projects" - complete application failure
- Cannot create projects, cannot load projects, cannot test any functionality

**Key Observations:**
- Application uses ES modules but migration code uses CommonJS `__dirname` variable
- Error occurs at runMigrations (/workspace/src/lib/db/migrate.ts:6:27)
- Server crash cascades to React hook errors in client
- This is a fundamental ES module compatibility issue

**Root Cause:**
```typescript
// migrate.ts line 6
const migrationsDir = path.join(__dirname, 'migrations'); // ❌ __dirname undefined in ES modules
```

**Solution Required:**
- Replace `__dirname` with ES module compatible approach (import.meta.url or Vite glob imports)
- Verify all file path resolutions use ES module APIs
- Add linting rules to prevent CommonJS usage in ES module context

**Action Items:**
- [x] BUG-016 filed with detailed reproduction and solution
- [ ] Fix __dirname usage in migrate.ts
- [ ] Verify ES module compatibility across all database code
- [ ] Add tests for database initialization
- [ ] Re-run full workflow test after fix
- [ ] **DO NOT MERGE PR #12 until BUG-016 is resolved**

---

### Test Run #6 - 2026-05-13 (AI Browser Test - REGRESSION CONFIRMED)
**Tester:** Claude AI Browser Agent  
**Status:** ⚠️ BLOCKED at Step 1 (Step 3: Submit Form)  
**Result:** BUG-012 filed - THIRD occurrence of form data not captured on submit  
**Steps Completed:** 2/18 (Step 1: Create Project ✅, Step 2: Fill Form ✅, Step 3: Submit BLOCKED)  
**Duration:** ~5 minutes  
**Issues Found:**
- **BUG-012 (BLOCKING - CRITICAL REGRESSION):** Form data NOT captured in step1Responses despite textareas being filled
- Submit click disables form but step1Responses remains {} empty
- State stuck in 'step1_gapAnalysis: collecting' (never transitions to 'generating')
- Zero API calls made (verified via performance.getEntriesByType('resource'))
- localStorage key exists with proper XState initialization
- Waited 62 seconds post-submit - no transition, completely stuck

**Key Observations:**
- XState machine initialization working correctly (localStorage key created before submit)
- Project creation works perfectly (project ID: 0kHaCxFL)
- Form validation works (Submit button enables when both fields filled)
- Submit click behavior appears normal (disables button, clears fields)
- BUT: form values never make it into XState context
- This is identical to BUG-007 (run #001, #002) and BUG-011 (run #005)

**Root Cause Evidence:**
- localStorage before submit shows: `step1Responses: {}`
- localStorage after submit shows: `step1Responses: {}` (unchanged!)
- Form submit handler appears to not be reading textarea values
- SUBMIT_FORM event may be sent with empty payload
- Defensive fixes from BUG-007 do not address the core data capture issue

**Action Items:**
- [x] BUG-012 filed with detailed localStorage evidence
- [ ] Investigate FormStep.tsx submit handler - add logging to trace value capture
- [ ] Check textarea onChange handlers are updating React state
- [ ] Verify SUBMIT_FORM event payload contains form data
- [ ] This is blocking ALL workflow testing - requires immediate fix

---

### Test Run #3 - 2026-05-13 (AI Browser Test - REGRESSION)
**Tester:** Claude AI Browser Agent  
**Status:** ⚠️ BLOCKED at Step 1 (Step 3 in test sequence)  
**Result:** REGRESSION - BUG-007 returned despite being marked as fixed  
**Steps Completed:** 2/18 (Step 1: Create Project ✅, Step 2: Fill Form ✅, Step 3: Submit BLOCKED)  
**Duration:** ~5 minutes  
**Issues Found:**
- **BUG-008 (BLOCKING - REGRESSION):** BUG-007 has regressed. Submit button click does not trigger any API call to artifact generation endpoint
- Form becomes disabled but no network requests occur
- Server logs show formData: {} empty, isFormValid: false
- Query error: "Query data cannot be undefined for key: [\"project\",\"GVAZ_INm\"]"
- Identical symptoms to BUG-007 which was supposedly fixed earlier today

**Key Observations:**
- Dashboard loads correctly on port 5182 (auto-selected after 5180/5181 in use)
- Project creation works perfectly (project ID: GVAZ_INm)
- Form fields accept input and enable Submit button correctly
- Submit click disables form but fails silently - no API activity
- Waited 61 seconds post-submit - no transition, no API calls
- All 10 stages visible in sidebar with Stage 1 marked "now"

**Action Items:**
- [ ] Investigate why BUG-007 fix didn't prevent this regression
- [ ] Verify BUG-007 fix was actually committed and not reverted
- [ ] Determine if this is truly same bug or different trigger with same symptoms
- [ ] Re-test defensive validation and localStorage recovery code
- [ ] Re-run test after regression fix

---

### Test Run #2 - 2026-05-13 (AI Browser Test)
**Tester:** Claude AI Browser Agent  
**Status:** ⚠️ BLOCKED at Step 1 (Step 3 in test sequence)  
**Result:** Submit button does not trigger API call or artifact generation  
**Steps Completed:** 2/18 (Step 1: Create Project ✅, Step 2: Fill Form ✅, Step 3: Submit BLOCKED)  
**Duration:** ~5 minutes  
**Issues Found:**
- **BUG-007 (BLOCKING):** Submit button click does not trigger any API call to artifact generation endpoint
- Form becomes disabled but no network requests occur
- Server logs show formData: {} empty, isFormValid: false
- Query error: "Query data cannot be undefined for key: [\"project\",\"LcINIWVz\"]"
- Different from BUG-006 - this shows no submission attempt at all

**Key Observations:**
- Dashboard loads correctly on port 5181 (not 5180)
- Project creation works perfectly
- Form fields accept input and enable Submit button correctly
- Submit click disables form but fails silently - no API activity

**Action Items:**
- [ ] Investigate why Submit button click doesn't trigger form submission handler
- [ ] Check if formData state is being captured before submission
- [ ] Debug query error for project data
- [ ] Re-run test after fix

---

### Test Run #1 - 2026-05-12 (Baseline)
**Tester:** Claude Code  
**Status:** ⚠️ BLOCKED at Step 1  
**Result:** Gap Analysis artifact generation failing - form submits but doesn't advance  
**Issues Found:**
- BUG-006: Step 1 artifact generation hangs (server logs: "Still on step 1 - artifact generation may have failed")
- Cannot progress past Step 1 to test remaining workflow
- Contextual interview questions verified working via API tests (not testable in UI due to blocker)

**Action Items:**
- [ ] Investigate Gap Analysis artifact generation failure
- [ ] Fix Step 1 blocker to enable full workflow testing
- [ ] Re-run full workflow test after fix

---

## 🎯 Current Status (Last Updated: 2026-05-12)

### ✅ Verified Working
- Dashboard loads correctly
- Project creation modal flow
- Step 1 form accepts input and validates
- Step 2 contextual questions (verified via API, not UI)
- Navigation button states (BACK disabled at Step 1)

### ⚠️ Known Issues
- **BUG-006:** Gap Analysis artifact generation fails, blocking Step 1 → Step 2 transition
- Server warning: `[FormStep] ⚠️ Still on step 1 - artifact generation may have failed`

### ❓ Untested (Blocked by BUG-006)
- Steps 2-10 (cannot reach due to Step 1 blocker)
- Full workflow completion
- Artifact generation for Steps 2-10
- State persistence across all steps
- Review mode with all artifacts

---

## 🔧 Prerequisites

1. **Dev server running:** `pnpm dev` → http://localhost:5180
2. **Browser:** Chrome/Firefox with DevTools open
3. **Time:** 20-30 minutes uninterrupted
4. **Clean state:** Clear localStorage or use incognito mode for fresh test
5. **Server logs:** Terminal visible to monitor server-side logs

### Pre-Test Checklist
- [ ] Server running without errors
- [ ] Browser console clear (F12)
- [ ] Network tab ready (to monitor API calls)
- [ ] Terminal visible for server logs
- [ ] Timer ready to track generation times

---

## 📝 Test Protocol

**For each test run:**
1. Start with fresh browser session (incognito recommended)
2. Follow each step exactly as written
3. Check all verification checkboxes
4. Note actual timings vs expected
5. Screenshot any errors or unexpected behavior
6. Record all findings in "Test History" section
7. Update "Current Status" section with latest reality

---

## 🧪 Step-by-Step Workflow

### Step 1: Create New Project (Expected: 2 minutes)

**Actions:**
1. Navigate to http://localhost:5180
2. Click **"New project"** button
3. Select **"Start from scratch"** (recommended option)
4. Enter project name: `Healthcare Portal - Test [DATE]`
   - Example: `Healthcare Portal - Test 2026-05-12`
5. Click **"Create project"**

**Expected Result:**
- Navigate to `/project/{projectId}/build`
- URL contains generated project ID (e.g., `E9BpLR4s`)
- Step 1 form loads immediately
- Navigation sidebar shows all 10 stages
- Stage 1 marked as "now", others as "pending"

**Verification:**
- [ ] Project created successfully
- [ ] URL shows `/project/{projectId}/build`
- [ ] Step 1 form visible (not blank screen)
- [ ] Navigation buttons visible (BACK disabled, NEXT disabled)
- [ ] Sidebar shows all 10 stages

**Screenshots:**
- `test-run-[N]-01-new-project.png`

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

### Step 2: Gap Analysis - Form Fill (Expected: 2 minutes)

**Form Fields:**

1. **"Do you have existing requirements?"** (textarea)  
   Answer: `No, starting from scratch`

2. **"What are you building?"** (textarea)  
   Answer:
   ```
   A comprehensive healthcare patient portal with the following features:
   - Online appointment scheduling with calendar integration
   - Secure access to medical records and test results  
   - Direct messaging with healthcare providers
   - Prescription refill requests and medication tracking
   - Billing and insurance information management
   ```

**Expected Result:**
- Both textareas accept input
- Character count updates (if present)
- Submit button enables after both fields filled

**Verification:**
- [ ] First textarea accepts input
- [ ] Second textarea accepts input and expands for multi-line
- [ ] Submit button enabled when both fields have content
- [ ] Submit button disabled when fields empty

**Screenshots:**
- `test-run-[N]-02-gap-analysis-filled.png`

**Actual Result:**

**Issues Found:**

---

### Step 3: Gap Analysis - Artifact Generation (Expected: 15-25 seconds)

**Actions:**
1. Click **"Submit"** button
2. Monitor button state (should show "Submitting..." or loading indicator)
3. Watch server logs for artifact generation
4. Wait up to 60 seconds

**Expected Result:**
- Button shows loading state ("Submitting..." or spinner)
- Form fields disabled during generation
- Server logs show artifact generation API call
- After 15-25 seconds: artifact generated
- **Automatic transition to Step 2: "Business Requirements Interview"**
- URL updates to reflect Step 2
- Stage 2 marked as "now" in sidebar
- BACK button now enabled

**Verification:**
- [ ] Submit button shows loading state
- [ ] Form fields disabled during submission
- [ ] Server logs show generation started
- [ ] Artifact generation completes within 60 seconds
- [ ] Automatic transition to Step 2 (heading changes)
- [ ] URL updates (may show step number or different route)
- [ ] Sidebar Stage 2 marked as "now"
- [ ] BACK button enabled, NEXT disabled

**Screenshots:**
- `test-run-[N]-03-after-submit.png` (immediately after clicking Submit)
- `test-run-[N]-04-step2-loaded.png` (after transition)

**Server Logs to Check:**
```
Look for:
- [interview] Received body: ...
- [vite middleware] Received request: ...
- [buildInterviewPrompt] Called with: ...
- Artifact generation logs
```

**⚠️ Known Issue (BUG-006):**
If form submits but doesn't transition after 60 seconds, check server logs for:
- `[FormStep] ⚠️ Still on step 1 - artifact generation may have failed`

**Actual Result:**

**Time Taken:**

**Issues Found:**

**If Blocked:** Stop here and document in Test History. Skip to "Troubleshooting" section.

---

### Step 4: Business Requirements Interview - Question 1 (Expected: 5 seconds)

**Expected Result:**
- Heading: "Business Requirements Interview" or similar
- AI-generated question loads within 5 seconds
- **Question is contextual** - references your project (e.g., "healthcare patient portal")
- 3-4 multiple-choice options provided
- Textbox for custom answer
- "Submit Answer" button disabled initially
- No "Previous Answers" section yet (first question)

**Contextual Question Check:**
The question should reference specifics from your "What are you building?" answer:
- ✅ GOOD: "What is the primary problem your healthcare patient portal aims to solve?"
- ❌ BAD: "What is the primary problem your project aims to solve?" (generic)

**Verification:**
- [ ] Question loaded within 5 seconds
- [ ] Question is contextual (mentions healthcare/portal/appointments/etc.)
- [ ] 3-4 multiple-choice options visible
- [ ] Options are relevant to healthcare domain
- [ ] Textbox present for custom answer
- [ ] Submit Answer button disabled (no selection yet)
- [ ] No console errors

**Screenshots:**
- `test-run-[N]-05-step2-question1.png`

**Actual Question Text:**

**Is Question Contextual?** [ ] Yes [ ] No

**Issues Found:**

---

### Step 5: Business Requirements Interview - Answer Question 1 (Expected: 5 seconds)

**Actions:**
1. Click the first multiple-choice option
2. Verify textbox fills with selected option text
3. Verify Submit Answer button enables
4. Click **"Submit Answer"**
5. Wait for next question (3-5 seconds)

**Expected Result:**
- Clicking option fills textbox immediately
- Submit Answer button enables
- After submit: new question loads within 5 seconds
- "Previous Answers" section appears showing Q1 & A1
- Progress indicator updates (e.g., "Question 2 of 10")

**Verification:**
- [ ] Clicking option fills textbox
- [ ] Submit Answer button enables
- [ ] Submit triggers successfully (no errors)
- [ ] Next question loads within 10 seconds
- [ ] Previous Answers section appears
- [ ] Q1 & A1 displayed in history
- [ ] Progress indicator shows question 2

**Screenshots:**
- `test-run-[N]-06-step2-question2.png`

**Actual Result:**

**Time Between Questions:**

**Issues Found:**

---

### Step 6: Business Requirements Interview - Questions 2-10 (Expected: 5-7 minutes)

**Instructions:**
Repeat the following for questions 2 through 10:

**For Each Question:**
1. Read the AI-generated question
2. Click a multiple-choice option OR type custom answer
3. Click **"Submit Answer"**
4. Wait 3-5 seconds for next question
5. Verify Previous Answers section grows

**Tips:**
- Click first option if unsure (all options are valid)
- Mix clicking options and typing to test both paths
- Questions should build on previous answers
- Each question should still be contextual to healthcare portal

**Verification Checklist (check after every 3-4 questions):**
- [ ] Questions 2-4: All loaded successfully
- [ ] Questions 5-7: All loaded successfully  
- [ ] Questions 8-10: All loaded successfully
- [ ] Previous Answers section shows all submitted Q&A pairs
- [ ] No duplicate questions
- [ ] No console errors
- [ ] Server logs show successful API calls

**Question 10 Special:**
After submitting the 10th answer, wait 20-30 seconds for:
- Artifact generation to complete
- **Automatic transition to Step 3: "Technical Requirements Interview"**

**Expected After Question 10:**
- Button shows loading state
- Wait 15-30 seconds
- **Artifact 2 generated:** `business-requirements.yaml`
- Auto-transition to Step 3
- Sidebar Stage 3 marked as "now"
- BACK button enabled, NEXT disabled

**Verification After Question 10:**
- [ ] Artifact generation triggered (loading state visible)
- [ ] Generation completed within 60 seconds
- [ ] Transitioned to Step 3 (heading: "Technical Requirements Interview")
- [ ] Previous Answers cleared (new step, fresh interview)
- [ ] Sidebar shows Stage 3 as "now"

**Screenshots:**
- `test-run-[N]-07-step2-question10.png` (before submitting last answer)
- `test-run-[N]-08-step3-loaded.png` (after transition)

**Actual Result:**

**Total Time for Step 2:**

**Issues Found:**

---

### Step 7: Technical Requirements Interview (Expected: 5-7 minutes + 25s generation)

**Instructions:** Identical to Step 2, but questions focus on technical aspects

**Expected Question Topics:**
- Architecture and design patterns
- Technology stack and frameworks
- Database and storage solutions
- Security and authentication
- Deployment and infrastructure
- Performance and scalability
- API design and integrations
- Testing strategy
- DevOps and CI/CD
- Monitoring and observability

**Process:**
1. Answer 10 technical questions (same format as Step 2)
2. Verify questions are contextual to healthcare portal
3. After Question 10, wait for artifact generation
4. Expect auto-transition to Step 4

**Verification:**
- [ ] 10 technical questions completed
- [ ] Questions relevant to healthcare technical requirements
- [ ] Questions are contextual (not generic)
- [ ] Artifact generated: `technical-requirements.yaml`
- [ ] Transitioned to Step 4: "Style Anchors Collection"
- [ ] Sidebar Stage 4 marked as "now"

**Screenshots:**
- `test-run-[N]-09-step3-question1.png`
- `test-run-[N]-10-step4-loaded.png`

**Actual Result:**

**Total Time for Step 3:**

**Issues Found:**

---

### Step 8: Style Anchors Collection (Expected: 20-30 seconds, automated)

**Expected Result:**
- **No user input required** - this is an automated step
- Shows loading indicator or "Generating Style Anchors..." message
- Artifact generation starts automatically on entry
- After 20-30 seconds: auto-transition to Step 5

**Verification:**
- [ ] Step loaded automatically (no form visible)
- [ ] Loading indicator or generation message displayed
- [ ] Artifact generated within 60 seconds
- [ ] Transitioned to Step 5: "Implementation Planner"
- [ ] No user interaction required

**Screenshots:**
- `test-run-[N]-11-step4-generating.png`
- `test-run-[N]-12-step5-loaded.png`

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

### Step 9: Implementation Planner (Expected: 2 minutes + 20s generation)

**⚠️ Note:** Form fields are subject to change. Document actual fields encountered.

**Expected Form Fields:**
1. **Deployment strategy** (dropdown or text)
2. **Technology stack** (text)
3. Additional fields may be present

**Actions:**
1. Fill all form fields
2. Click **"Submit"**
3. Wait for artifact generation
4. Expect auto-transition to Step 6

**Verification:**
- [ ] Form fields visible and accepting input
- [ ] Submit button enables when form complete
- [ ] Artifact generation triggered
- [ ] Artifact generated within 60 seconds
- [ ] Transitioned to Step 6: "Definition of Done"

**Screenshots:**
- `test-run-[N]-13-step5-form.png`
- `test-run-[N]-14-step6-loaded.png`

**Actual Form Fields Encountered:**

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

### Step 10: Definition of Done (Expected: 20-30 seconds, automated)

**Expected Result:**
- **No user input required** - automated step
- Artifact generation starts automatically
- After 20-30 seconds: auto-transition to Step 7

**Verification:**
- [ ] Automated generation completed
- [ ] Transitioned to Step 7: "Architecture Decision Records"

**Screenshots:**
- `test-run-[N]-15-step7-loaded.png`

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

### Step 11: Architecture Decision Records (Expected: Manual navigation)

**Expected Result:**
- **Artifact-only step** - no generation, review existing decisions
- Shows Review mode or artifact viewer
- Displays architecture decisions extracted from previous artifacts
- **NEXT button is ENABLED** (manual advance required)
- User must click NEXT to continue

**Actions:**
1. Review displayed architecture decisions
2. Click **"Next"** button to continue to Step 8

**Verification:**
- [ ] Step 7 displays content (not generating)
- [ ] Architecture decisions or review content visible
- [ ] NEXT button enabled (not disabled)
- [ ] Clicking NEXT transitions to Step 8
- [ ] No artifact generation triggered (review-only step)

**Screenshots:**
- `test-run-[N]-16-step7-review.png`

**Actual Result:**

**Issues Found:**

---

### Step 12: Delivery Timeline (Expected: 20-30 seconds, automated)

**Expected Result:**
- **No user input required** - automated step
- Artifact generation starts automatically
- After 20-30 seconds: auto-transition to Step 9

**Verification:**
- [ ] Automated generation completed
- [ ] Transitioned to Step 9: "QA Test Plan"

**Screenshots:**
- `test-run-[N]-17-step9-loaded.png`

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

### Step 13: QA Test Plan (Expected: 20-30 seconds, automated)

**Expected Result:**
- **No user input required** - automated step
- Artifact generation starts automatically
- After 20-30 seconds: auto-transition to Step 10

**Verification:**
- [ ] Automated generation completed
- [ ] Transitioned to Step 10: "Generate Summaries"

**Screenshots:**
- `test-run-[N]-18-step10-loaded.png`

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

### Step 14: Generate Summaries (Expected: 20-30 seconds, automated)

**Expected Result:**
- **No user input required** - final automated step
- Generates executive summary, developer summary, etc.
- After completion: **Workflow COMPLETE**
- All 10 stages marked as complete in sidebar
- NEXT button disabled (no Step 11)
- Success message or completion indicator

**Verification:**
- [ ] Automated generation completed
- [ ] All 10 stages marked "complete" in sidebar
- [ ] NEXT button disabled (end of workflow)
- [ ] Completion message displayed
- [ ] No errors in console

**Screenshots:**
- `test-run-[N]-19-complete.png`

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

## 🔍 Review Mode Testing (Expected: 5 minutes)

### Switch to Review Mode

**Actions:**
1. Click **"Review"** tab at top navigation
2. View DocBrowser with all artifacts listed

**Expected Result:**
- Review tab switches to artifact browser
- All 10 artifacts listed:
  1. Gap Analysis Worksheet
  2. Business Requirements Interview
  3. Technical Requirements Interview
  4. Style Anchors Collection
  5. Implementation Plan
  6. Definition of Done
  7. Architecture Decision Records
  8. Delivery Timeline
  9. QA Test Plan
  10. Executive & Developer Summaries

**Verification:**
- [ ] Review mode loads successfully
- [ ] All 10 artifacts listed
- [ ] No duplicate artifacts
- [ ] No missing artifacts

**Screenshots:**
- `test-run-[N]-20-review-mode.png`

---

### Verify Each Artifact

**For Each Artifact (1-10):**
1. Click artifact name in list
2. Verify content displays in viewer
3. Check file size (should be >500 bytes)
4. Verify format (YAML or Markdown)
5. Scan content for relevance to project

**Verification Checklist:**
- [ ] Artifact 1: Gap Analysis - non-empty, relevant content
- [ ] Artifact 2: Business Requirements - contains 10 Q&A pairs
- [ ] Artifact 3: Technical Requirements - contains 10 Q&A pairs
- [ ] Artifact 4: Style Anchors - non-empty, relevant content
- [ ] Artifact 5: Implementation Plan - non-empty, relevant content
- [ ] Artifact 6: Definition of Done - non-empty, relevant content
- [ ] Artifact 7: Architecture Decisions - non-empty, relevant content
- [ ] Artifact 8: Delivery Timeline - non-empty, relevant content
- [ ] Artifact 9: QA Test Plan - non-empty, relevant content
- [ ] Artifact 10: Summaries - non-empty, relevant content

**Screenshots:**
- `test-run-[N]-21-artifact-[N]-sample.png` (2-3 samples)

**Issues Found:**

---

### Test Artifact Actions

**Actions:**
1. Select any artifact
2. Click "Download" button (if present)
3. Verify file downloads
4. Click "Copy to clipboard" button (if present)
5. Verify content copied (paste into text editor)

**Verification:**
- [ ] Download button works (file saved to Downloads)
- [ ] Downloaded file is valid (opens in text editor)
- [ ] Copy to clipboard works
- [ ] Syntax highlighting applied to YAML (if present)
- [ ] Can switch back to Build mode

**Issues Found:**

---

## 🧭 Navigation Testing (Expected: 3 minutes)

### Backward Navigation

**Actions:**
1. Return to Build mode
2. Should be on Step 10 (final step)
3. Click **"Back"** button repeatedly
4. Navigate through: Step 10 → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1

**For Each Step Backward:**
- Verify step loads instantly (no re-generation)
- Check form data preserved (Steps 1, 5)
- Check interview answers preserved (Steps 2, 3)

**Verification:**
- [ ] Can navigate backward through all 10 steps
- [ ] Step 1 form data preserved (both textarea values visible)
- [ ] Step 2 Previous Answers preserved (10 Q&A pairs visible)
- [ ] Step 3 Previous Answers preserved (10 Q&A pairs visible)
- [ ] Step 5 form data preserved (if form fields present)
- [ ] Navigation is instant (<1 second per step)
- [ ] BACK button disabled at Step 1

**Issues Found:**

---

### Forward Navigation

**Actions:**
1. From Step 1, click **"Next"** button repeatedly
2. Navigate through: Step 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

**Verification:**
- [ ] Can navigate forward through all 10 steps
- [ ] Navigation is instant (<1 second per step)
- [ ] All step content preserved (no re-generation)
- [ ] NEXT button disabled at Step 10 (no Step 11)

**Issues Found:**

---

## 💾 State Persistence Testing (Expected: 2 minutes)

### Page Refresh Test

**Actions:**
1. Navigate to any middle step (e.g., Step 5)
2. Press **F5** to refresh page
3. Wait for page to reload

**Expected Result:**
- Page returns to same step (Step 5)
- All completed steps remain completed
- Form data still present (if on form step)
- Artifacts still accessible in Review mode
- No errors in console

**Verification:**
- [ ] Page reloads successfully
- [ ] Returns to same step (Step 5)
- [ ] Sidebar shows correct progress (Steps 1-5 complete)
- [ ] No console errors
- [ ] Can still navigate BACK/NEXT

**Issues Found:**

---

### Navigate Away and Return Test

**Actions:**
1. From Step 5, click project name or breadcrumb to return to dashboard
2. Verify project card shows correct progress
3. Click project card to reopen project

**Expected Result:**
- Dashboard shows project with "Step 5" or "Stage 5" indicator
- Reopening project returns to Step 5 (last viewed step)
- All data and artifacts preserved
- Can continue from where left off

**Verification:**
- [ ] Dashboard shows correct progress indicator
- [ ] Reopening project returns to Step 5
- [ ] All previous steps still complete
- [ ] All form data preserved
- [ ] All artifacts accessible

**Issues Found:**

---

## 📊 Test Summary Template

**After completing test run, fill this out:**

```markdown
## Test Run #[N] - [DATE]

**Tester:** [Your Name]  
**Duration:** [Actual time taken]  
**Project ID:** [Generated ID]  
**Status:** [ ] PASSED [ ] FAILED [ ] BLOCKED

### Step Results
- Step 1: [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Step 2: [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Step 3: [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Step 4: [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Step 5: [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Step 6: [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Step 7: [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Step 8: [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Step 9: [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Step 10: [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]

### Artifacts Generated
- [ ] Gap Analysis (Step 1)
- [ ] Business Requirements (Step 2)
- [ ] Technical Requirements (Step 3)
- [ ] Style Anchors (Step 4)
- [ ] Implementation Plan (Step 5)
- [ ] Definition of Done (Step 6)
- [ ] Architecture Decisions (Step 7)
- [ ] Delivery Timeline (Step 8)
- [ ] QA Test Plan (Step 9)
- [ ] Summaries (Step 10)

### Issues Found
1. [BUG-XXX] [Description]
2. [BUG-XXX] [Description]

### Observations
- [Any UX issues, timing issues, or improvements]

### Overall Result
[ ] COMPLETE - All steps passed
[ ] PARTIAL - Completed through Step [N]
[ ] BLOCKED - Cannot proceed past Step [N]

### Action Items
- [ ] File bug for [issue]
- [ ] Update guide with [finding]
- [ ] Re-test after [fix]
```

**Then add this summary to the "Test History" section at the top of this document.**

---

## 🐛 Known Issues Reference

### BUG-006: Gap Analysis Artifact Generation Fails (BLOCKING)
**Status:** OPEN  
**Severity:** CRITICAL  
**Impact:** Cannot progress past Step 1  
**First Seen:** 2026-05-12  
**Server Error:** `[FormStep] ⚠️ Still on step 1 - artifact generation may have failed`

**Workaround:** None  
**Action:** Investigation required

---

### BUG-004: Backend API Doesn't Enforce 10-Question Limit
**Status:** OPEN (Backend)  
**Severity:** LOW  
**Impact:** Non-blocking - frontend enforces limit  
**Mitigation:** Frontend state machine prevents >10 answers

---

## 🔧 Troubleshooting

### If Step 1 Artifact Generation Hangs (>60 seconds)
1. Check server logs for errors
2. Check browser console for API errors
3. Check Network tab for failed requests
4. Verify AWS Bedrock credentials configured
5. Check if backend service is running
6. Try refreshing and re-submitting

**Debugging Commands:**
```bash
# Check server logs
tail -f .tmp-docs/server.log

# Check for artifact generation errors
grep -i "error\|fail" .tmp-docs/server.log

# Restart server
pkill -9 node
pnpm dev
```

---

### If Questions Don't Advance (Steps 2-3)
1. Wait 10 seconds (API may be slow)
2. Check browser console for errors
3. Check Network tab for API call status
4. Verify textbox has content before submitting
5. Ensure Submit Answer button is enabled
6. Check server logs for interview API errors

---

### If State Doesn't Persist After Refresh
1. Verify localStorage enabled in browser
2. Check browser console for SSR errors
3. Ensure project ID in URL matches project
4. Try incognito mode (rule out extension issues)
5. Check localStorage in DevTools → Application tab
   - Look for key: `planning-machine-{projectId}`

---

### If Transitions Don't Happen (Auto-advance fails)
1. Wait 60 seconds (artifact generation may be slow)
2. Check server logs for generation errors
3. Check browser console for state machine errors
4. Look for error messages in UI
5. Verify state in React DevTools (if installed)

---

## ⏱️ Expected Timing Reference

| Step | Type | User Time | Generation Time | Total |
|------|------|-----------|-----------------|-------|
| Step 1 | Form | 2 min | 15-25s | ~2.5 min |
| Step 2 | Interview | 5-7 min | 20-30s | ~7 min |
| Step 3 | Interview | 5-7 min | 20-30s | ~7 min |
| Step 4 | Automated | 0 min | 20-30s | ~0.5 min |
| Step 5 | Form | 2 min | 15-25s | ~2.5 min |
| Step 6 | Automated | 0 min | 20-30s | ~0.5 min |
| Step 7 | Review | 30s | 0s | ~0.5 min |
| Step 8 | Automated | 0 min | 20-30s | ~0.5 min |
| Step 9 | Automated | 0 min | 20-30s | ~0.5 min |
| Step 10 | Automated | 0 min | 20-30s | ~0.5 min |
| Review | Manual | 5 min | 0s | 5 min |
| Navigation | Manual | 3 min | 0s | 3 min |
| Persistence | Manual | 2 min | 0s | 2 min |
| **TOTAL** | | **~25-30 min** | **~3-4 min** | **~29-34 min** |

**Note:** Times are estimates. Actual times may vary based on:
- AI response speed (AWS Bedrock latency)
- User reading/typing speed
- Network conditions
- Server performance

---

## 📁 Screenshot Organization

**Naming Convention:**
- `test-run-[N]-[step]-[description].png`
- Example: `test-run-2-05-step2-question1.png`

**Recommended Screenshots (minimum):**
1. New project modal
2. Step 1 form filled
3. Step 2 loaded (first question)
4. Step 2 question 10
5. Step 3 loaded
6. Step 10 complete
7. Review mode with all artifacts
8. Any errors or unexpected behavior

**Storage Location:** `.tmp-docs/screenshots/`

---

## 🎯 Success Criteria

A complete, successful test run should have:

- ✅ All 10 steps completed without errors
- ✅ 10 artifacts generated (one per step)
- ✅ All artifacts contain relevant, non-empty content
- ✅ Backward/forward navigation works for all steps
- ✅ State persists after page refresh
- ✅ State persists after navigating away and returning
- ✅ No console errors
- ✅ No server errors
- ✅ Total time within 25-35 minute range
- ✅ Contextual questions reference project specifics (Steps 2-3)

---

## 📝 Post-Test Actions

After completing each test run:

1. **Fill out Test Summary Template** (above)
2. **Add summary to Test History** (top of document)
3. **Update Current Status section** with latest reality
4. **File bugs** for any new issues found
5. **Update Known Issues** section if issues resolved
6. **Save all screenshots** to `.tmp-docs/screenshots/`
7. **Share findings** with team
8. **Plan next test run** based on findings

---

## 🔄 Iteration Guidelines

**When to run a new test:**
- After fixing a blocking bug (e.g., BUG-006)
- After adding a new feature
- After refactoring critical code
- Before major releases
- Weekly during active development

**How to update this guide:**
- Add new test run to Test History
- Update Current Status with latest reality
- Update Known Issues (add new, mark resolved)
- Update Expected Results if behavior changes
- Add new Troubleshooting sections as needed
- Update timing estimates based on actual runs

**What to track over time:**
- Bug trends (new vs resolved)
- Performance trends (generation times)
- UX issues identified
- Test run success rate
- Average completion time

---

**Guide Version:** 2.0  
**Last Updated:** 2026-05-12  
**Next Review:** After BUG-006 resolution  
**Maintainer:** Update after each test run
