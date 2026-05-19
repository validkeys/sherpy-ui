# Agent-Browser Form Filling Guide - React Controlled Inputs

**Date:** 2026-05-15  
**Test Run:** #011  
**Status:** ⚠️ PARTIALLY WORKING - Visual fill succeeds, React state update fails

---

## Problem Statement

When testing React forms with controlled inputs using `agent-browser`, standard fill commands and even the React Fiber workaround do NOT reliably update React component state or XState context.

**Symptoms:**
- ✅ Form fields visually show filled text
- ✅ DOM `input.value` and `textarea.value` properties are set
- ❌ React component state remains empty
- ❌ XState context `step1Responses` stays `{}`
- ❌ Form submission fails with no data captured

---

## Documented Approaches Tested

### Approach 1: Standard agent-browser Commands ❌ FAILS
```bash
agent-browser fill '#existingRequirements' 'No, starting from scratch'
agent-browser fill '#projectDescription' 'Healthcare portal description'
```

**Result:** Fields appear empty, no visual or state update.

---

### Approach 2: React Fiber Workaround (from learnings.md) ❌ FAILS FOR STATE

```bash
agent-browser eval --stdin <<'EOF'
const input = document.getElementById('existingRequirements');
const textarea = document.getElementById('projectDescription');

// Set values
input.value = 'No, starting from scratch';
textarea.value = 'Healthcare portal for patient records';

// Find React Fiber node and trigger onChange
const inputKey = Object.keys(input).find(k => k.startsWith('__react'));
const textareaKey = Object.keys(textarea).find(k => k.startsWith('__react'));

// Trigger React onChange events via Fiber
const inputEvent = { target: input, currentTarget: input };
const textareaEvent = { target: textarea, currentTarget: textarea };

input[inputKey].memoizedProps.onChange(inputEvent);
textarea[textareaKey].memoizedProps.onChange(textareaEvent);
EOF
```

**Result:**
- ✅ Visual fill succeeds (text appears in fields)
- ❌ React state NOT updated (XState context remains `{}`)
- ❌ Debug panel shows warning: "⚠ EMPTY! This is the bug - form data not captured"

---

### Approach 3: IIFE Wrapper (avoids variable conflicts) ✅ VISUAL ONLY

```bash
agent-browser eval "(function() {
  const field1 = document.getElementById('existingRequirements');
  const field2 = document.getElementById('projectDescription');
  
  if (!field1 || !field2) {
    return {error: 'Fields not found'};
  }
  
  // Set values
  field1.value = 'No, starting from scratch';
  field2.value = 'A HIPAA-compliant patient portal for healthcare providers...';
  
  // Find React fiber keys
  const key1 = Object.keys(field1).find(k => k.startsWith('__react'));
  const key2 = Object.keys(field2).find(k => k.startsWith('__react'));
  
  if (!key1 || !key2) {
    return {error: 'React keys not found'};
  }
  
  // Trigger onChange events
  field1[key1].memoizedProps.onChange({ target: field1, currentTarget: field1 });
  field2[key2].memoizedProps.onChange({ target: field2, currentTarget: field2 });
  
  return {success: true, field1Value: field1.value, field2Value: field2.value};
})()"
```

**Result:**
- ✅ No JavaScript variable conflicts
- ✅ Visual fill succeeds
- ✅ Returns success confirmation with values
- ❌ React state still NOT updated

---

### Approach 4: Enhanced Event Objects ❌ FAILS FOR STATE

```bash
agent-browser eval "(function() {
  const field1 = document.getElementById('existingRequirements');
  const field2 = document.getElementById('projectDescription');
  
  const key1 = Object.keys(field1).find(k => k.startsWith('__react'));
  const key2 = Object.keys(field2).find(k => k.startsWith('__react'));
  
  const val1 = 'No, starting from scratch';
  const val2 = 'A HIPAA-compliant patient portal...';
  
  field1.value = val1;
  field2.value = val2;
  
  // Create synthetic events with value in target
  const event1 = {
    target: { ...field1, value: val1, id: field1.id },
    currentTarget: { ...field1, value: val1, id: field1.id }
  };
  
  const event2 = {
    target: { ...field2, value: val2, id: field2.id },
    currentTarget: { ...field2, value: val2, id: field2.id }
  };
  
  field1[key1].memoizedProps.onChange(event1);
  field2[key2].memoizedProps.onChange(event2);
  
  return 'triggered';
})()"
```

**Result:** Same as Approach 3 - visual fill only, no state update.

---

## Root Cause Analysis

Based on testing in Run #011:

1. **React Fiber onChange handlers ARE being called** - no errors thrown
2. **DOM values ARE being set** - `field.value` contains correct text
3. **Visual rendering works** - text appears in textareas
4. **BUT: XState context is NOT updated** - `step1Responses` remains `{}`

**Hypothesis:** The issue may be:
- The onChange handler expects a native browser event, not a synthetic one
- There's additional event handling (e.g., `onInput`, `onBlur`) required
- The form uses controlled inputs with useState/useReducer that's not being triggered
- XState integration expects specific event properties we're not providing

---

## Verification Methods

### Check if Form Fields Filled Visually:
```bash
agent-browser screenshot
# Look at the textareas in the screenshot
```

### Check if React State Updated:
```bash
agent-browser eval "(function() {
  const projectId = window.location.pathname.split('/')[2];
  const stored = localStorage.getItem('planning-machine-' + projectId);
  const state = JSON.parse(stored);
  return state.context.step1Responses;
})()"
```

**Expected if working:** `{existingRequirements: "No...", projectDescription: "A HIPAA..."}`  
**Actual result:** `{}`

---

## Recommended Next Steps

1. **Read the FormStep component source code** to understand the exact onChange implementation
2. **Check if form uses additional event handlers** (onInput, onBlur, onFocus)
3. **Test with native browser events** using `dispatchEvent(new Event('input', {bubbles: true}))`
4. **Consider using Playwright E2E tests** instead of agent-browser (as recommended in Phase 2 docs)

---

## Alternative: Manual Testing

Until a reliable agent-browser approach is found, manual browser testing is confirmed to work:

1. Open http://localhost:5180 in a real browser
2. Click "New project" → "Start from scratch"
3. Enter project name
4. Fill Gap Analysis form by typing
5. Click Submit

**Status:** ✅ WORKS PERFECTLY with manual typing

---

## Status Summary

- **agent-browser visual form fill:** ✅ Working
- **agent-browser React state update:** ❌ Not working
- **Manual browser testing:** ✅ Working
- **Integration tests (@testing-library/user-event):** ✅ All passing (5/5)
- **Playwright E2E:** Recommended alternative (see Phase 2 docs)

---

**Conclusion:** agent-browser cannot reliably test React forms with controlled inputs due to inability to properly trigger React's synthetic event system. Use Playwright for automated E2E testing or manual testing for verification.
