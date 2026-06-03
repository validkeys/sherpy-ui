# E2E Testing Guides - Quick Reference

**Updated:** 2026-06-02

---

## 📚 Available Testing Guides

### 1. Legacy UI Testing Guide
**File:** [`guide.md`](./guide.md)  
**UI:** StepContainer (form-based, step-by-step navigation)  
**Status:** ✅ Active - Default UI (as of 2026-06-02)  
**Last Test Run:** #016 (2026-05-20)

**Use this guide when:**
- Testing the **default UI** (current production)
- `USE_NEW_UI = false` in route
- URL does NOT have `?workflowChat=1`
- Testing with BACK/NEXT navigation buttons
- Testing SpectrumStepper progress bar

**Key Features:**
- Single-column layout
- Step-by-step navigation (BACK/NEXT buttons)
- Separate "Previous Answers" section
- SpectrumStepper progress bar at top
- Review mode as separate tab

---

### 2. WorkflowChat UI Testing Guide
**File:** [`guide-workflow-chat.md`](./guide-workflow-chat.md)  
**UI:** WorkflowChat (chat-based, two-column layout)  
**Status:** ⚠️ Beta - Not default (requires activation)  
**Last Test Run:** None yet (guide created 2026-06-02)

**Use this guide when:**
- Testing the **new chat-based UI** (beta)
- `USE_NEW_UI = true` in route OR
- URL has `?workflowChat=1` query parameter
- Testing continuous chat conversation
- Testing artifacts sidebar

**Key Features:**
- Two-column layout (artifacts + chat)
- Continuous chat conversation (no page transitions)
- All Q&A inline in chat history
- Artifacts sidebar with status indicators
- Stage dividers with colors
- No BACK/NEXT buttons (scroll-based navigation)

---

## 🔀 How to Enable WorkflowChat UI

### Option A: Query Parameter (Temporary)
```
http://localhost:5181/project/{projectId}/build?workflowChat=1
```
**Use when:** Testing once without code changes

### Option B: Route Flag (Permanent)
**File:** `app/routes/project/$projectId.build.tsx`  
**Change:**
```typescript
// Before
const USE_NEW_UI = false;

// After
const USE_NEW_UI = true;
```
**Use when:** Testing extensively or making it default

---

## 🎯 Which Guide Should I Use?

### Scenario 1: Regular E2E Testing (Production)
**Use:** `guide.md` (Legacy UI)  
**Why:** This is the current default UI users see

### Scenario 2: Testing WorkflowChat Features
**Use:** `guide-workflow-chat.md` (WorkflowChat UI)  
**Why:** New UI requires specific testing approach

### Scenario 3: Pre-Release Testing (Before Making WorkflowChat Default)
**Use:** BOTH guides  
**Why:** Ensure both UIs work before switching default

### Scenario 4: Regression Testing After Refactor
**Use:** `guide.md` first, then `guide-workflow-chat.md`  
**Why:** Verify no regressions in current UI, then test new UI

### Scenario 5: BUG-018 (State Persistence) Testing
**Use:** Either guide (both test page refresh)  
**Why:** State persistence is critical for both UIs

---

## 📊 Test Coverage Matrix

| Feature | Legacy UI Guide | WorkflowChat UI Guide |
|---------|----------------|----------------------|
| Project Creation | ✅ Step 1 | ✅ Step 1 |
| Stage 1 (Gap Analysis) | ✅ Steps 2-3 | ✅ Step 2 |
| Stage 2 (Business Req) | ✅ Steps 4-6 | ✅ Steps 3-4 |
| Stage 3 (Technical Req) | ✅ Step 7 | ✅ Step 5 |
| Stages 4-10 (Automated) | ✅ Steps 8-14 | ✅ Steps 6-12 |
| Artifact Viewing | ✅ Review Mode | ✅ Step 12 (Dialog) |
| Navigation (BACK/NEXT) | ✅ Step 15-16 | ❌ N/A (scroll-based) |
| Chat Scroll Navigation | ❌ N/A | ✅ Step 13 |
| State Persistence | ✅ Step 17 | ✅ Step 14 |
| Artifacts Sidebar | ❌ N/A | ✅ Throughout |
| SpectrumStepper | ✅ Throughout | ❌ N/A |

---

## 🐛 Bug Testing Reference

### BUG-018 (Page Refresh State Loss)
**Affects:** Both UIs  
**Test With:** Either guide, Step 17 (Legacy) or Step 14 (WorkflowChat)  
**Fixed:** 2026-05-30 (SSR disabled for build route)  
**Verification:** Page refresh maintains current step/stage and all state

### BUG-021 (Step 2 Questions Not Rendering)
**Affects:** WorkflowChat UI  
**Test With:** `guide-workflow-chat.md`, Steps 3-4  
**Fixed:** 2026-05-30 (use $generateQuestion server function)  
**Verification:** Questions appear in chat after Stage 2 divider

### BUG-022 (XState Snapshot Serialization)
**Affects:** Both UIs  
**Test With:** Either guide, state persistence sections  
**Fixed:** 2026-06-02 (Seroval serialization for XState snapshots)  
**Verification:** State persists correctly across refreshes

---

## 📝 Test History Location

### Legacy UI Test History
**Location:** [`guide.md`](./guide.md) → "Test History" section (top)  
**Last Run:** #016 (2026-05-20)  
**Total Runs:** 16

### WorkflowChat UI Test History
**Location:** [`guide-workflow-chat.md`](./guide-workflow-chat.md) → "Test History" section (top)  
**Last Run:** None yet  
**Total Runs:** 0

---

## 🔄 When to Update These Guides

### Update Legacy UI Guide (`guide.md`) when:
- Fixing bugs in StepContainer components
- Adding features to legacy form-based workflow
- Changing step-by-step navigation behavior
- Modifying SpectrumStepper
- Updating review mode

### Update WorkflowChat UI Guide (`guide-workflow-chat.md`) when:
- Fixing bugs in WorkflowChat components
- Adding chat message types
- Changing artifacts sidebar behavior
- Modifying stage dividers
- Updating artifact dialog

### Update BOTH guides when:
- Changing XState machine logic (affects both)
- Modifying API endpoints (affects both)
- Changing artifact generation (affects both)
- Updating state persistence (affects both)
- Modifying Step 1-10 business logic (affects both)

---

## 🚀 Future: Making WorkflowChat Default

**When WorkflowChat becomes default:**
1. Update `USE_NEW_UI = true` in route
2. Make `guide-workflow-chat.md` the primary guide
3. Archive or mark `guide.md` as "Legacy UI (Deprecated)"
4. Update this README to reflect new status
5. Run full regression test with WorkflowChat guide

**Decision Criteria:**
- ✅ WorkflowChat guide fully tested (at least 3 successful runs)
- ✅ No critical bugs in WorkflowChat UI
- ✅ Feature parity with Legacy UI
- ✅ Performance acceptable
- ✅ UX validated by users/stakeholders

---

## 📞 Quick Help

**Q: Which guide do I use for manual testing today?**  
**A:** `guide.md` (Legacy UI) - it's the current default

**Q: How do I know which UI is loaded?**  
**A:** 
- Legacy UI: Single column, BACK/NEXT buttons, SpectrumStepper at top
- WorkflowChat UI: Two columns (sidebar + chat), no BACK/NEXT buttons

**Q: I see the chat UI, which guide do I use?**  
**A:** `guide-workflow-chat.md` (WorkflowChat UI)

**Q: Can I test both UIs in one session?**  
**A:** Yes! Test Legacy first, then append `?workflowChat=1` to URL for WorkflowChat

**Q: Where do I report bugs?**  
**A:** File bug in appropriate guide's "Test History" section, then create bug report in `bug-reports/` directory

---

**Maintainer:** Update this README after each guide update or UI status change  
**Related:** 
- [Legacy UI Guide](./guide.md)
- [WorkflowChat UI Guide](./guide-workflow-chat.md)
- [WorkflowChat Validation](./workflow-chat-validation.md)
- [Bug Reports Directory](./bug-reports/)
