# Agent-Browser Quick Reference - React Forms

**Status:** ⚠️ Limited - Visual fill only, state update unreliable  
**Last Updated:** 2026-05-15 (Test Run #011)

---

## ✅ What Works

### Navigation & Clicks
```bash
# Using IIFE to avoid variable conflicts
agent-browser eval "(function() { 
  const btn = Array.from(document.querySelectorAll('*'))
    .find(el => el.textContent.trim() === 'Button Text');
  if (btn) {
    btn.click();
    return 'clicked';
  }
  return 'not found';
})()"
```

### Visual Form Fill (Display Only)
```bash
# Fill form fields - text will APPEAR but state may NOT update
agent-browser eval "(function() {
  const field1 = document.getElementById('existingRequirements');
  const field2 = document.getElementById('projectDescription');
  
  if (!field1 || !field2) return {error: 'Fields not found'};
  
  // Set values
  field1.value = 'Your text here';
  field2.value = 'More text here';
  
  // Find React fiber keys
  const key1 = Object.keys(field1).find(k => k.startsWith('__react'));
  const key2 = Object.keys(field2).find(k => k.startsWith('__react'));
  
  if (!key1 || !key2) return {error: 'React keys not found'};
  
  // Trigger onChange (may not update state!)
  field1[key1].memoizedProps.onChange({target: field1, currentTarget: field1});
  field2[key2].memoizedProps.onChange({target: field2, currentTarget: field2});
  
  return {success: true};
})()"
```

### Take Screenshots
```bash
agent-browser screenshot
# Saved to: /home/node/.agent-browser/tmp/screenshots/screenshot-*.png

# Copy to project docs
cp /home/node/.agent-browser/tmp/screenshots/screenshot-*.png .tmp-docs/screenshots/
```

### Check State (Verification)
```bash
# Check if React state actually updated (usually returns {} empty)
agent-browser eval "(function() {
  const projectId = window.location.pathname.split('/')[2];
  const stored = localStorage.getItem('planning-machine-' + projectId);
  if (!stored) return {error: 'No localStorage'};
  const state = JSON.parse(stored);
  return {
    step1Responses: state.context?.step1Responses || {},
    currentState: state.value
  };
})()"
```

---

## ❌ What Doesn't Work

### Form State Updates
- React component state (useState/useReducer) not updated
- XState context remains empty
- Form submissions fail with no data

**Why:** agent-browser cannot trigger React's synthetic event system properly.

### Standard Fill Commands
```bash
# ❌ These DO NOT work for React forms
agent-browser fill '#fieldId' 'text'
agent-browser keyboard type 'text'
agent-browser keyboard inserttext 'text'
```

---

## 🔧 Troubleshooting

### Issue: "Identifier 'X' has already been declared"
**Cause:** agent-browser maintains persistent JavaScript context  
**Solution:** Wrap all code in IIFE: `(function() { ... })()`

### Issue: Form looks filled but submission fails
**Cause:** Visual fill succeeded but React state not updated  
**Verification:**
```bash
# Check localStorage - if step1Responses is {}, state didn't update
agent-browser eval "(function() { 
  const key = 'planning-machine-' + window.location.pathname.split('/')[2];
  const state = JSON.parse(localStorage.getItem(key));
  return state.context.step1Responses;
})()"
```
**Solution:** Use Playwright or manual testing instead

### Issue: Can't find element
**Solution:** Use flexible selector with IIFE:
```bash
agent-browser eval "(function() {
  const elements = Array.from(document.querySelectorAll('*'));
  const target = elements.find(el => 
    el.textContent.includes('Search Text') && 
    el.offsetParent !== null
  );
  if (target) {
    target.click();
    return 'found and clicked';
  }
  return 'not found';
})()"
```

---

## 🎯 Best Practices

### 1. Always Use IIFE
```javascript
// ✅ Good - isolated scope
agent-browser eval "(function() { const x = 1; return x; })()"

// ❌ Bad - pollutes global scope
agent-browser eval "const x = 1; x"
```

### 2. Return Useful Debugging Info
```javascript
// ✅ Good - returns status
return {success: true, value: field.value}

// ❌ Bad - silent success
return 'done'
```

### 3. Take Screenshots Liberally
```bash
# Before action
agent-browser screenshot

# Do something
agent-browser eval "..."

# After action
agent-browser screenshot
```

### 4. Verify State Changes
```bash
# Don't assume form fill worked - verify!
agent-browser eval "(function() { 
  const key = 'planning-machine-' + window.location.pathname.split('/')[2];
  return JSON.parse(localStorage.getItem(key)).context.step1Responses;
})()"
```

---

## 🚀 Alternatives (Recommended)

### For Form Testing:
**Use Playwright** - properly simulates user interactions
```bash
# See: tests/e2e/planning-workflow-builder.spec.ts
pnpm playwright test
```

### For Component Testing:
**Use @testing-library/user-event** - works with React synthetic events
```bash
# See: src/features/planning/__tests__/bug-014-form-data-capture.test.tsx
pnpm test
```

### For Manual Testing:
**Use real browser** - most reliable
1. Open http://localhost:5180
2. Use Debug Panel to monitor state in real-time
3. Test actual user workflows

---

## 📚 See Also

- **Full Guide:** `.tmp-docs/plan/agent-browser-form-filling-guide.md`
- **Test Run Details:** `.tmp-docs/plan/runs/011/summary.md`
- **Bug Reports:** BUG-012, BUG-014 in bug-reports/
- **Learnings:** `.tmp-docs/plan/learnings.md`

---

**TL;DR:** Use agent-browser for navigation and screenshots. Use Playwright or manual testing for forms.
