# BUG-013 Test Verification Instructions

## Before Running Test
1. Ensure dev server is running: `npm run dev`
2. Clear any existing project localStorage: `localStorage.clear()`
3. Have the bug report ready for reference

## Test Case: Step 2 Business Requirements Interview

### Expected Behavior
After completing Step 1 (Gap Analysis):
1. Step 2 loads with first Business Requirements question (Q1)
2. User types/selects answer for Q1 and clicks "Submit Answer"
3. Q1 answer is saved to `step2Answers` array (length = 1)
4. Q2 loads automatically within 3-5 seconds
5. User types/selects answer for Q2 and clicks "Submit Answer"
6. Q2 answer is saved to `step2Answers` array (length = 2)
7. Q3 loads automatically
8. Process continues for Q3-Q10
9. After Q10, Step 2 generates artifact and auto-transitions to Step 3

### Test Steps (Manual Browser)
1. Navigate to: `http://localhost:5180`
2. Click "New Project"
3. Complete Step 1 form:
   - Project Description: "comprehensive healthcare patient portal"
   - Existing Requirements: "Yes - we have user stories"
   - (Fill other fields)
4. Submit Step 1 → wait for Step 2 to load
5. Answer Q1 → verify it saves
6. **CRITICAL TEST**: Answer Q2 → verify it saves (this was failing before fix)
7. Continue through Q3-Q10

### Test Steps (AI Browser Agent)
Run the existing test plan:
```
run the AI browser test
```

This will execute `.tmp-docs/plan/ai-browser-test.yaml` which covers the full flow.

### Verification Points
After each question submission, check browser console or localStorage:

```javascript
// In browser console:
const state = JSON.parse(localStorage.getItem('planning-machine-m73FolhS'));
console.log('step2Answers.length:', state.context.step2Answers.length);
console.log('Latest answer:', state.context.step2Answers[state.context.step2Answers.length - 1]);
```

Expected output after Q2 submission:
```
step2Answers.length: 2
Latest answer: { question: "...", value: "...", timestamp: "..." }
```

### What Was Broken (Before Fix)
- Q1 submission worked (length = 1)
- Q2 submission appeared to work in UI but:
  - `step2Answers.length` stayed at 1 (not 2)
  - Q2 answer was NOT added to array
  - Current question didn't change to Q3
  - Form remained stuck on Q2

### What Should Work (After Fix)
- Q1 submission works (length = 1)
- Q2 submission works (length = 2)
- Q3-Q10 submissions all work
- Auto-transition to Step 3 after Q10

## Debugging If Test Fails

### Check Actor Reference
```javascript
// In browser console:
window.__planningActor.getSnapshot().status  // Should be "active"
window.__planningActor.getSnapshot().context.step2Answers.length
```

### Check for Multiple Actors
```javascript
// In src/features/planning/machines/PlanningMachineContext.tsx useEffect
// Look for console logs showing multiple actors being created:
// Should see ONE "Starting actor" log, not TWO
```

### Check StrictMode
```javascript
// In main.tsx or app entry
// Ensure <React.StrictMode> is enabled (it should be in development)
```

## Success Criteria
✅ Q2 answer is saved to `step2Answers` array  
✅ Q3 loads automatically after Q2 submission  
✅ All 10 questions can be answered without getting stuck  
✅ Step 2 completes and transitions to Step 3  
✅ No "stale actor" errors in console  
✅ localStorage shows correct state after each submission  

## Related Files
- Fix: `src/features/planning/machines/PlanningMachineContext.tsx`
- Test plan: `.tmp-docs/plan/ai-browser-test.yaml`
- Bug report: `.tmp-docs/plan/bug-reports/013-step2-interview-submit-not-working.yaml`
