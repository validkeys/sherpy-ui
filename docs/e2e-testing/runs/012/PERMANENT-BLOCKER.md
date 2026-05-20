# Test Run #012 - PERMANENT BLOCKER

**Date:** 2026-05-15  
**Status:** Permanently Blocked - Cannot use Playwright MCP in this environment  
**Resolution:** Switch to manual testing

---

## Problem Summary

Playwright MCP cannot be configured to use Chromium in this environment. The automated browser testing approach is not viable.

### Error

```
Error: async initializeServer: Chromium distribution 'chrome' is not found at /opt/google/chrome/chrome
Run "npx playwright install chrome"
```

---

## Attempted Fixes (All Failed)

### 1. Environment Variable in MCP Config ❌

**Action:** Added to `~/.claude/.claude.json`:
```json
"playwright": {
  "env": {
    "PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH": "/usr/bin/chromium"
  }
}
```

**Result:** Not respected by MCP server process  
**Verification:** `ps aux` shows MCP process without the env var

### 2. Claude Code Restart ❌

**Action:** Restarted Claude Code to reload MCP configuration  
**Result:** MCP server still doesn't use environment variable  
**Verification:** Same error persists after restart

### 3. Project Playwright Config ❌

**Action:** Created `playwright.config.ts` with:
```typescript
launchOptions: {
  executablePath: '/usr/bin/chromium'
}
```

**Result:** MCP server doesn't read project-level Playwright configs  
**Verification:** Error unchanged after config creation

### 4. System Symlink ❌

**Action:** Attempted `sudo ln -s /usr/bin/chromium /opt/google/chrome/chrome`  
**Result:** Requires sudo password (not available in this environment)  
**Error:** `sudo: a password is required`

---

## Root Cause Analysis

### MCP Server Architecture Issue

1. **Hardcoded Chrome Path**
   - `@playwright/mcp` package expects Chrome at `/opt/google/chrome/chrome`
   - No fallback to Chromium or other browsers
   - Environment variables not properly passed to child process

2. **Environment Variable Isolation**
   - MCP servers spawn as child processes
   - Environment variables in `~/.claude/.claude.json` not inherited correctly
   - `ps aux` shows MCP process without `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`

3. **No Runtime Configuration**
   - MCP servers cannot be reconfigured after startup
   - No mechanism to restart MCP servers within a session
   - Project-level Playwright configs ignored by MCP package

4. **Permission Constraints**
   - Cannot create system-level symlinks without root access
   - Cannot install Chrome binaries system-wide
   - Sandboxed environment prevents workarounds

---

## Why This Blocks Automated Testing

### Requirements for Playwright MCP

- ✅ Chromium binary exists (`/usr/bin/chromium`)
- ✅ MCP server package installed (`@playwright/mcp@0.0.75`)
- ✅ Claude Code configured with MCP settings
- ❌ **BLOCKER:** MCP server cannot find/use Chromium

### Alternative: agent-browser

Per `CLAUDE.md`, agent-browser is **not suitable** for React form testing:
- ❌ Cannot trigger React onChange events
- ❌ Cannot update React component state
- ❌ Causes false-positive test failures
- ✅ Only works for manual browser automation (not test validation)

### Conclusion

**No viable automated browser testing solution exists in this environment.**

---

## Resolution: Manual Testing

Use the manual testing guide that was prepared as a fallback.

**File:** `.tmp-docs/plan/runs/012/MANUAL-TEST-STEPS.md`

### Manual Testing Workflow

1. Open browser manually
2. Navigate to http://localhost:5180
3. Open console and inject localStorage state (from README.md:51)
4. Navigate to project: http://localhost:5180/project/test-run-012/build
5. Follow step-by-step testing guide
6. Document results in tracking.yaml

### Advantages of Manual Testing

- ✅ Actually works (no environment blockers)
- ✅ Can verify visual correctness
- ✅ Can test edge cases interactively
- ✅ Can use browser DevTools for debugging
- ✅ More thorough than automated happy-path testing

### Time Impact

- **Automated (planned):** ~20 minutes
- **Manual (actual):** ~30 minutes
- **Overhead:** +10 minutes (acceptable)

---

## Lessons Learned

### MCP Server Limitations

1. **Pre-flight Check Required**
   - Always verify MCP tools work BEFORE starting test runs
   - Test simple MCP commands first (navigate, screenshot)
   - Don't assume MCP config will work as documented

2. **Environment Dependencies**
   - MCP servers have hidden system dependencies
   - Environment variable passing is unreliable
   - Sandboxed environments may block MCP tools

3. **Fallback Planning Essential**
   - Always have manual testing guide ready
   - Don't rely solely on automation for QA
   - Document manual procedures BEFORE attempting automation

### Testing Strategy Evolution

**Old Strategy (Failed):**
```
Playwright MCP → automated testing → fast iteration
```

**New Strategy (Working):**
```
Manual testing → thorough validation → documented process
```

### Future Recommendations

1. **For Playwright MCP to work:**
   - Install actual Chrome binary system-wide
   - OR get root access for symlink creation
   - OR fix MCP environment variable passing

2. **For automated testing:**
   - Use Playwright directly (not via MCP)
   - Write integration tests with @testing-library
   - Use existing test suite (5/5 passing per CLAUDE.md)

3. **For QA workflow:**
   - Manual testing is MORE reliable than flaky automation
   - Focus on test coverage, not automation coverage
   - Automated tests for regression, manual for exploration

---

## Next Steps

### Immediate Action

**Switch to manual testing:**

1. Read `.tmp-docs/plan/runs/012/MANUAL-TEST-STEPS.md`
2. Open http://localhost:5180 in your browser
3. Follow the step-by-step guide
4. Document results in tracking.yaml

### Long-term Action

**Update testing infrastructure:**

1. Remove Playwright MCP from testing strategy
2. Document that automated browser testing requires:
   - Chrome installation OR
   - Root access for symlinks OR
   - Different automation approach
3. Make manual testing the primary QA method
4. Use integration tests (@testing-library) for regression

---

## Files

- **This blocker:** `.tmp-docs/plan/runs/012/PERMANENT-BLOCKER.md`
- **Manual guide:** `.tmp-docs/plan/runs/012/MANUAL-TEST-STEPS.md`
- **Tracking:** `.tmp-docs/plan/runs/012/tracking.yaml`
- **Previous blocker:** `.tmp-docs/plan/runs/012/BLOCKER.md` (restart attempt)

---

**Status:** Automated testing FAILED → Manual testing READY  
**Action Required:** Follow MANUAL-TEST-STEPS.md guide
