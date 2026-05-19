# Resume Test Run #012 After Claude Code Restart

**Date:** 2026-05-15  
**Status:** Ready to resume after restart

---

## Quick Resume Command

Copy and paste this command after restarting Claude Code:

```
Continue Test Run #012 - Automated workflow testing with Playwright MCP

Context:
- Test project "test-run-012" is ready with Steps 1-2 pre-seeded
- Dev server should be running on http://localhost:5180
- Playwright MCP is now configured with PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
- Ready to test Steps 3-10 (Technical Requirements → QA Test Plan)

Files:
- Tracking: .tmp-docs/plan/runs/012/tracking.yaml
- Test protocol: .tmp-docs/plan/ai-browser-test.yaml
- README: .tmp-docs/plan/runs/012/README.md
- State loader: .tmp-docs/plan/runs/012/loader.html

Start by:
1. Loading Playwright MCP tools
2. Navigating to http://localhost:5180
3. Injecting localStorage state from .tmp-docs/plan/runs/012/README.md:51
4. Navigating to /project/test-run-012/build
5. Following test protocol in .tmp-docs/plan/ai-browser-test.yaml
```

---

## Pre-Restart Checklist

Before restarting Claude Code, verify:

- [ ] **Dev server running?** Check http://localhost:5180 loads
- [ ] **MCP config saved?** Check `~/.claude/.claude.json` has Playwright config:
  ```json
  "playwright": {
    "type": "stdio",
    "command": "npx",
    "args": ["@playwright/mcp@latest"],
    "env": {
      "PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH": "/usr/bin/chromium"
    }
  }
  ```

---

## Post-Restart Verification

After restarting Claude Code:

1. **Verify Playwright MCP loads:**
   ```
   Use ToolSearch to load: mcp__playwright__browser_navigate
   ```

2. **Test navigation:**
   ```
   Navigate to http://localhost:5180 - should not error
   ```

3. **If still errors:**
   - Check MCP server logs in Claude Code
   - Verify `/usr/bin/chromium` exists: `which chromium`
   - Verify MCP config syntax is correct

---

## localStorage State to Inject

**Key:** `planning-machine-test-run-012`

**Value:** See `.tmp-docs/plan/runs/012/README.md:51` for full JSON

The state includes:
- Project ID: `test-run-012`
- Current step: `step3` (Technical Requirements Interview)
- Steps 1-2: Complete (Gap Analysis + Business Requirements)
- 3 business requirement questions already answered

---

## Test Protocol

Follow `.tmp-docs/plan/ai-browser-test.yaml` for:
- Screenshot naming conventions
- Step verification procedures
- Tracking.yaml update requirements
- Bug filing procedures

---

## Expected Duration

- **Steps 3-10:** ~15-20 minutes
- **Step 3 (Technical Requirements):** 5-7 minutes + 25s generation
- **Step 4 (Style Anchors):** 3-5 minutes + 18s generation
- **Steps 5-10:** ~2-3 minutes each

---

## Success Criteria

- ✅ All Steps 3-10 complete without blocking bugs
- ✅ All artifacts generated and verified
- ✅ Screenshots captured at key moments
- ✅ Tracking.yaml updated with results
- ✅ Guide.md Test History entry updated

---

## If Dev Server Not Running

Restart it:

```bash
pnpm dev
```

Wait for "Local: http://localhost:5180" message.

---

## Files Reference

- **Tracking:** `.tmp-docs/plan/runs/012/tracking.yaml`
- **README:** `.tmp-docs/plan/runs/012/README.md`
- **Protocol:** `.tmp-docs/plan/ai-browser-test.yaml`
- **Blocker docs:** `.tmp-docs/plan/runs/012/BLOCKER.md`
- **Manual fallback:** `.tmp-docs/plan/runs/012/MANUAL-TEST-STEPS.md`
- **This file:** `.tmp-docs/plan/runs/012/RESUME-AFTER-RESTART.md`
