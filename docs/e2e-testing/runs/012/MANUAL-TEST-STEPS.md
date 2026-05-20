# Test Run #012 - Manual Testing Steps

**Date:** 2026-05-15  
**Status:** Ready to Execute  
**Duration:** ~15-20 minutes

---

## 🚀 Step 1: Load Pre-Seeded State (1 min)

### Option A: Use the Loader File (Easiest)

1. Open `file:///workspace/.tmp-docs/plan/runs/012/loader.html` in your browser
2. Click "Load Test State & Navigate to Project"
3. You'll be auto-redirected to Step 3

### Option B: Manual LocalStorage Injection

1. Navigate to http://localhost:5180
2. Open browser console (F12)
3. Paste the localStorage command from README.md line 51
4. Navigate to http://localhost:5180/project/test-run-012/build

---

## ✅ Step 2: Verify Starting State (30 sec)

You should see:
- ✅ Step 1 (Gap Analysis) - Complete
- ✅ Step 2 (Business Requirements) - Complete
- 🔵 **Step 3 (Technical Requirements) - Current** ← YOU ARE HERE
- First technical requirements question visible

Take screenshot: `.tmp-docs/screenshots/test-run-012-01-step3-loaded.png`

---

## 📝 Step 3: Technical Requirements Interview (6-8 min)

**Goal:** Answer all 10 technical requirements questions

### For Each Question:

1. Read the question (should reference healthcare portal context)
2. Type a realistic answer (1-2 sentences)
3. Click "Submit Answer"
4. Wait for next question to load

### Sample Answers:

**Q1: "What are the primary technical constraints?"**
```
Must be HIPAA compliant with end-to-end encryption. Maximum page load time 2 seconds. Mobile-first responsive design required.
```

**Q2: "What is the expected scale/load?"**
```
Initial: 5,000 patients, 50 providers. Expected growth to 20,000 patients within 12 months. Peak concurrent users: 200.
```

**Q3: "What are the integration requirements?"**
```
Must integrate with existing Epic EHR system via HL7 FHIR API. SMS notifications via Twilio. Email via SendGrid.
```

**Q4-Q10:** Continue with realistic technical details

### Verification Checklist:

- [ ] Question 1 loads automatically
- [ ] Questions reference "healthcare", "patient", "portal", etc.
- [ ] Progress shows "Question N of 10"
- [ ] Each submit advances to next question
- [ ] After Q10, artifact generation starts automatically
- [ ] "Generating Technical Requirements..." message appears

**Screenshots:**
- After Q1: `test-run-012-02-step3-q1.png`
- After Q10: `test-run-012-03-step3-generating.png`

---

## ⏱️ Step 4: Style Anchors Collection (30 sec)

**Goal:** Watch automatic artifact generation

**Expected:**
- Auto-transitions from Step 3
- "Generating Style Anchors..." message
- Progress indicator/spinner
- Auto-transitions to Step 4 (Implementation Planner)

### Verification Checklist:

- [ ] No user input required
- [ ] Generation completes in ~25 seconds
- [ ] No console errors (check F12 console)
- [ ] Transitions to Step 5

**Screenshot:** `test-run-012-04-step4-complete.png`

---

## 📋 Step 5: Implementation Planner (3 min)

**Goal:** Fill out planning form and generate plan

### Form Fields to Fill:

1. **Project Scope:** "MVP for patient portal - appointment scheduling and secure messaging only"
2. **Technical Stack:** "React, TypeScript, Node.js, PostgreSQL, AWS"
3. **Team Size:** "3 developers, 1 designer, 1 QA"
4. **Timeline:** "12 weeks"
5. **Risk Factors:** "HIPAA compliance validation, Epic integration complexity"

### Actions:

1. Fill all required fields
2. Click "Generate Implementation Plan"
3. Wait for generation (~20s)
4. Verify auto-transition to Step 6

### Verification Checklist:

- [ ] Form loads with all fields visible
- [ ] Submit button enabled when valid
- [ ] Generation completes successfully
- [ ] Transitions to Step 6

**Screenshots:**
- Form filled: `test-run-012-05-step5-form.png`
- Generating: `test-run-012-06-step5-generating.png`

---

## ✅ Step 6: Definition of Done (30 sec)

**Goal:** Watch automatic generation

**Expected:**
- Auto-generation starts immediately
- "Generating Definition of Done..." message
- Completes in ~25 seconds
- Transitions to Step 7

### Verification Checklist:

- [ ] No user input
- [ ] Generation completes
- [ ] Transitions automatically

**Screenshot:** `test-run-012-07-step6-complete.png`

---

## 🏗️ Step 7: Architecture Decision Records (1 min)

**Goal:** Review content and manually advance

**Expected:**
- ADR content displays (review mode)
- "Next" or "Continue" button visible
- Manual advance required

### Actions:

1. Review displayed ADR content
2. Click "Next" to advance

### Verification Checklist:

- [ ] Content renders correctly
- [ ] Advance button visible
- [ ] Click advances to Step 8

**Screenshot:** `test-run-012-08-step7-adr.png`

---

## 📅 Step 8: Delivery Timeline (30 sec)

**Goal:** Watch automatic generation

**Expected:**
- Auto-generation
- Completes in ~25 seconds
- Transitions to Step 9

### Verification Checklist:

- [ ] Generation completes
- [ ] Transitions automatically

**Screenshot:** `test-run-012-09-step8-complete.png`

---

## 🧪 Step 9: QA Test Plan (30 sec)

**Goal:** Watch automatic generation

**Expected:**
- Auto-generation
- Completes in ~25 seconds
- Transitions to Step 10

### Verification Checklist:

- [ ] Generation completes
- [ ] Transitions automatically

**Screenshot:** `test-run-012-10-step9-complete.png`

---

## 📊 Step 10: Generate Summaries (30 sec)

**Goal:** Watch final generation

**Expected:**
- Final auto-generation
- Completion indicator appears
- Workflow complete

### Verification Checklist:

- [ ] Generation completes
- [ ] "Complete" or success message visible
- [ ] All steps show as complete in sidebar

**Screenshot:** `test-run-012-11-step10-complete.png`

---

## 🎯 Final Verification (2 min)

### Success Criteria:

- [ ] All steps 3-10 completed without errors
- [ ] 8 artifacts generated total (2 seeded + 6 new)
- [ ] No console errors in F12 DevTools
- [ ] No server errors in terminal
- [ ] Questions in Step 3 were contextual (referenced healthcare portal)
- [ ] Page refresh preserves state

### Check Browser Console (F12):

- Look for any red errors
- Document any warnings

### Check Terminal:

- Look for server errors
- Document any 500/400 responses

---

## 📝 After Testing Complete

### 1. Update tracking.yaml

For each step, update:
```yaml
- id: "step-07"
  status: "passed"  # or "failed" or "blocked"
  duration: "6m 30s"
  notes: "Questions were contextual, referenced healthcare portal"
  screenshot: "test-run-012-02-step3-q1.png"
  questions_completed: 10
```

### 2. Document Any Issues

If bugs found:
1. Create bug report: `.tmp-docs/plan/bug-reports/0XX-description.yaml`
2. Add to `bugs_filed` array in tracking.yaml
3. Update step with `blocking_bug: "bug-0XX"`

### 3. Update Test History

Add entry to `.tmp-docs/plan/guide.md` Test History section:

```markdown
### Test Run #012 (2026-05-15)
- **Scope:** Steps 3-10 (Technical Req → QA Test Plan)
- **Pre-seeded:** Steps 1-2 via PlanningStateBuilder
- **Result:** [PASS/FAIL]
- **Duration:** [XX minutes]
- **Issues:** [None / List bugs]
- **Notes:** Manual browser testing, Playwright MCP unavailable
```

---

## 🐛 If Something Goes Wrong

1. **Take screenshot immediately**
2. **Check console** (F12) for errors
3. **Check terminal** for server logs
4. **Document in tracking.yaml**
5. **Create bug report** if needed
6. **Continue testing** remaining steps (if not blocked)

---

## ✅ Ready?

1. Open loader.html
2. Click button to load state
3. Start testing at Step 3
4. Report back when complete!

**Estimated Time:** 15-20 minutes total
