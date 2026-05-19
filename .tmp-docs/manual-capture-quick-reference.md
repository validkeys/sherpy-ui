# Manual Snapshot Capture - Quick Reference

**Quick reference for capturing edge case snapshots during manual testing session**

---

## Prerequisites Checklist

- [ ] Dev server running: `npm run dev`
- [ ] Browser open to app URL
- [ ] DebugPanel visible (bottom-right corner)
- [ ] This checklist open for tracking

---

## Edge Cases to Capture

### Priority 1 - Core Edge Cases (Required)

#### 1. Step 2 - Incomplete Interview (3 questions)
- [ ] **Captured**
- **Label:** `step-2-incomplete-3q`
- **Setup:** Answer only first 3 questions, then stop
- **Verify:** DebugPanel shows step 2, 3 responses in context

#### 2. Step 2 - Complete Interview (10 questions)
- [ ] **Captured**
- **Label:** `step-2-complete-10q`
- **Setup:** Answer all 10 questions fully
- **Verify:** DebugPanel shows step 2, 10 responses complete

#### 3. Step 5 - Minimal Responses
- [ ] **Captured**
- **Label:** `step-5-minimal-responses`
- **Setup:** Complete workflow with minimum required data only
- **Verify:** DebugPanel shows step 5, minimal context data

#### 4. Step 5 - Missing Critical Data
- [ ] **Captured**
- **Label:** `step-5-missing-critical`
- **Setup:** Try to reach step 5 with incomplete requirements
- **Verify:** DebugPanel shows step 5, missing fields in context

#### 5. Step 7 - User Edits Applied
- [ ] **Captured**
- **Label:** `step-7-with-user-edits`
- **Setup:** Edit generated plan before approval
- **Verify:** DebugPanel shows step 7, edits reflected in context

### Priority 2 - Error States (Optional)

#### 6. Step 2 - Validation Error
- [ ] **Captured** (if possible)
- **Label:** `step-2-validation-error`
- **Setup:** Submit invalid data to trigger error
- **Note:** May be difficult to capture if app prevents invalid states

#### 7. Step 3 - Validation Error
- [ ] **Captured** (if possible)
- **Label:** `step-3-validation-error`
- **Setup:** Trigger validation error at technical requirements
- **Note:** Optional - depends on error handling implementation

---

## Capture Workflow (For Each Edge Case)

### 1. Prepare
```bash
# In browser console (if needed):
localStorage.clear();
# Then refresh page
```

### 2. Setup Edge Case
- Follow normal workflow to target step
- Create the edge case condition deliberately
- Do NOT proceed past the target step

### 3. Verify State
- Open DebugPanel (should be visible bottom-right)
- Check "Current State" matches expected step
- Review "Context Data" confirms edge case

### 4. Capture
- Click "📸 Capture Snapshot" button
- Enter label exactly as shown above
- Wait for: "✅ Saved: step-X-label-timestamp.json"

### 5. Validate
```bash
# Check file exists
ls tests/fixtures/snapshots/step-X-label-*.json

# Validate integrity
npm run snapshots:validate

# View in list
npm run snapshots:list | grep label
```

### 6. Document
- Update CAPTURE-LOG.md with entry
- Note any unusual findings or issues
- Mark checkbox in this document

---

## Quick Commands

```bash
# Validate captured snapshots
npm run snapshots:validate

# List all snapshots
npm run snapshots:list

# Show statistics
npm run snapshots:stats

# Test edge cases (after removing .skip)
npm test snapshot-edge-cases
```

---

## Troubleshooting

### DebugPanel Not Visible
```javascript
// In browser console:
console.log('NODE_ENV:', process.env.NODE_ENV);  // Should be 'development'
```

### Capture Button Not Working
- Check browser console for errors
- Verify `/api/dev/snapshot/capture` endpoint exists
- Check file permissions on `tests/fixtures/snapshots/`

### Wrong State in DebugPanel
- Refresh page and start over
- Check localStorage: `localStorage.getItem('planning-machine-*')`
- Review event history in DebugPanel

---

## After Capture Session

### 1. Validate All
```bash
npm run snapshots:validate
```

### 2. Update Tests
Remove `.skip` from captured scenarios in `snapshot-edge-cases.test.ts`

### 3. Run Tests
```bash
npm test snapshot-edge-cases
```

### 4. Update Documentation
- [ ] Fill in CAPTURE-LOG.md with session details
- [ ] Mark captured snapshots in INDEX.md
- [ ] Note any findings in completion summary

### 5. Verify Statistics
```bash
npm run snapshots:stats
# Expected: 5-10 edge case snapshots added
```

---

## Notes & Observations

(Use this space during capture session to note anything unexpected)

```
Edge Case 1 (step-2-incomplete-3q):
- 

Edge Case 2 (step-2-complete-10q):
- 

Edge Case 3 (step-5-minimal-responses):
- 

Edge Case 4 (step-5-missing-critical):
- 

Edge Case 5 (step-7-with-user-edits):
- 

Error States (if attempted):
- 
```

---

## Session Complete Checklist

- [ ] All Priority 1 edge cases captured (5 scenarios)
- [ ] Optional Priority 2 edge cases attempted
- [ ] All snapshots validated: `npm run snapshots:validate`
- [ ] CAPTURE-LOG.md updated with session details
- [ ] Tests updated (removed `.skip` for captured scenarios)
- [ ] All tests passing: `npm test snapshot-edge-cases`
- [ ] Statistics verified: `npm run snapshots:stats`
- [ ] Any issues or findings documented

---

**Ready to begin? Start dev server and work through Priority 1 checklist!**

```bash
npm run dev
# Then open browser and follow workflow above
```
