# Manual Edge Case Snapshot Capture Guide

**Task:** 2.8b - Manual Edge Case Snapshots  
**Date:** 2026-05-14  
**Branch:** `fix/bug-012-strictmode-actor-reference`

## Overview

This guide walks through capturing edge case snapshots via manual testing using the DebugPanel component. These snapshots will be used for regression tests to ensure the workflow handles incomplete and error states correctly.

## Prerequisites

1. Development server running: `npm run dev`
2. Browser open to http://localhost:5173 (or your dev URL)
3. DebugPanel visible in bottom-right corner (dev mode only)

## Target Edge Cases

We need to capture the following scenarios:

### 1. **Step 2 - Incomplete Interview (3 questions)**
   - **Label:** `step-2-incomplete-3q`
   - **Setup:** Answer only the first 3 questions in business requirements interview
   - **Purpose:** Test handling of partial interview data

### 2. **Step 2 - Complete Interview (10 questions)**
   - **Label:** `step-2-complete-10q`
   - **Setup:** Answer all 10 questions in business requirements interview
   - **Purpose:** Establish baseline for full interview completion

### 3. **Step 5 - Minimal Responses**
   - **Label:** `step-5-minimal-responses`
   - **Setup:** Provide only required fields, skip optional responses
   - **Purpose:** Test minimum viable data requirements

### 4. **Step 5 - Missing Critical Data**
   - **Label:** `step-5-missing-critical`
   - **Setup:** Leave critical fields empty (e.g., project name, core requirements)
   - **Purpose:** Test validation and error handling

### 5. **Step 7 - User Edits Applied**
   - **Label:** `step-7-with-user-edits`
   - **Setup:** Make manual edits to generated plan before approval
   - **Purpose:** Test edit workflow and state preservation

### 6. **Step 3 - Validation Error State**
   - **Label:** `step-3-validation-error`
   - **Setup:** Submit invalid data to trigger validation errors
   - **Purpose:** Test error state handling and recovery

## Capture Workflow

### Step-by-Step Process

1. **Start Fresh Session**
   ```bash
   # Clear localStorage to start clean
   # In browser console:
   localStorage.clear();
   # Refresh page
   ```

2. **Navigate to Target Step**
   - Follow the normal workflow to reach the desired step
   - For edge cases, deliberately create the target condition

3. **Verify State in DebugPanel**
   - Expand DebugPanel (bottom-right corner)
   - Check "Current State" shows expected step
   - Review "Context Data" to confirm edge case setup

4. **Capture Snapshot**
   - Click "📸 Capture Snapshot" button in DebugPanel
   - Enter the label when prompted (use labels from Target Edge Cases above)
   - Wait for confirmation: "✅ Saved: step-X-label-timestamp.json"

5. **Verify Snapshot File**
   ```bash
   # Check snapshot was created
   ls -lh tests/fixtures/snapshots/step-*-label-*.json
   ```

6. **Document in Capture Log**
   - Add entry to `tests/fixtures/snapshots/CAPTURE-LOG.md`
   - Include: timestamp, label, description, any special notes

## Example: Capturing "Step 2 - Incomplete Interview"

```markdown
### Example Session

1. Start dev server: `npm run dev`
2. Open browser to http://localhost:5173
3. Start new planning workflow
4. Reach Step 2 (Business Requirements Interview)
5. Answer ONLY these 3 questions:
   - Question 1: Project purpose
   - Question 2: Target users
   - Question 3: Key features
6. Stop (don't answer remaining 7 questions)
7. Open DebugPanel (should be visible bottom-right)
8. Verify state shows:
   - Current State: "step2" or similar
   - Context Data: interviewResponses array has 3 items
9. Click "📸 Capture Snapshot"
10. Enter label: "step-2-incomplete-3q"
11. Confirm success message
12. Verify file created: `tests/fixtures/snapshots/step-2-incomplete-3q-*.json`
```

## Troubleshooting

### DebugPanel Not Visible
- Ensure `NODE_ENV=development` (check with `console.log(process.env.NODE_ENV)`)
- Check browser console for errors
- Verify DebugPanel.tsx is imported in workflow component

### Snapshot Capture Fails
- Check network tab for API errors
- Verify `/api/dev/snapshot/capture` endpoint exists
- Check file permissions on `tests/fixtures/snapshots/` directory

### State Not As Expected
- Use browser DevTools to inspect React components
- Check localStorage for persisted state: `localStorage.getItem('planning-machine-*')`
- Review event history in DebugPanel

## Post-Capture Tasks

After capturing all snapshots:

1. **Create INDEX.md**
   - Document each snapshot with description and purpose
   - Include capture date and context

2. **Write Regression Tests**
   - Create test suite that loads each snapshot
   - Verify expected behavior for each edge case

3. **Clean Up Old Snapshots**
   - Remove duplicate or unnecessary snapshots
   - Keep 1-2 examples per scenario

4. **Update Documentation**
   - Add notes about any unexpected findings
   - Document workarounds or special handling needed

## Next Steps

Once all edge case snapshots are captured:
- Proceed to Task 2.9: Update existing tests to use snapshots
- Validate all tests pass with new snapshot data
- Document any new edge cases discovered during testing
