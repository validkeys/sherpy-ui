# BUG-024: Auxiliary Persistence Client-Side Execution

**Date:** 2026-06-08  
**Status:** 🔴 Root cause identified, ready to implement fix  
**Severity:** Medium (silent failure, analytics affected)

## Quick Links

- **[Executive Summary](./SUMMARY.md)** - 1-minute overview for decision-makers
- **[Bug Report](./bug-report.md)** - Complete technical analysis
- **[Implementation Plan](./implementation-plan.md)** - Step-by-step fix guide
- **[Architecture Comparison](./architecture-comparison.md)** - Visual diagrams (before/after)
- **[Execution Trace](./execution-trace.md)** - Runtime behavior analysis

## The Problem (TL;DR)

Client-side code tries to import Node.js database modules, causing browser error:
```
SyntaxError: The requested module 'better-sqlite3' does not provide an export named 'default'
```

**Impact:**
- Interview answers: NOT saved to database ❌
- Form responses: NOT saved to database ❌
- Analytics/reporting: Incomplete data ❌
- User experience: Unaffected (error caught, workflow continues) ✅

## The Fix (TL;DR)

Replace direct repository imports with server function calls:

**Before:**
```typescript
const { saveInterviewAnswer } = await import("./repository"); // ❌ Node.js code
await saveInterviewAnswer(projectId, 2, question, answer);
```

**After:**
```typescript
const { $saveInterviewAnswer } = await import("./server-functions"); // ✅ RPC stub
await $saveInterviewAnswer({ data: { projectId, stepNumber: 2, question, answer } });
```

**Estimated time:** 30-45 minutes

## Root Cause

```
Browser (client-side):
  StatePersistence.persistAuxiliaryTables()
    ↓ import("./repository")  ← Dynamic import runs in browser!
  repository.ts → server.db.ts → lib/db/* → better-sqlite3 ← Node.js native module
    ↓
  💥 SyntaxError: Cannot load Node.js module in browser
```

**Key Learning:** Dynamic imports execute in caller's context. Client code must use server functions (RPC pattern), not direct imports.

## File Structure

```
024-auxiliary-persistence-client-side/
├── README.md                    # This file - navigation hub
├── SUMMARY.md                   # Executive summary (non-technical)
├── bug-report.md                # Complete technical analysis
├── implementation-plan.md       # Step-by-step fix guide
├── architecture-comparison.md   # Visual diagrams (before/after)
└── execution-trace.md          # Runtime behavior analysis
```

## Key Insights

### ❌ Common Misconception

> "Dynamic imports prevent bundling, so they're safe to use from client code"

**FALSE:** Dynamic imports only **defer loading**, they don't change **execution context**.

```typescript
// In browser code:
const { dbFunction } = await import("./db-module");
// ↑ This STILL tries to load Node.js code in the browser!
```

### ✅ Correct Pattern

> "Server functions use RPC pattern - safe to call from client"

**TRUE:** Server functions are stubs client-side, execute server-side.

```typescript
// In browser code:
const { $serverFunction } = await import("./server-functions");
// ↑ Imports RPC stub (browser-safe)

await $serverFunction({ data: {...} });
// ↑ Makes HTTP call, executes on server where DB access is available
```

## Comparison

| Aspect | Current (Broken) | Fixed |
|--------|------------------|-------|
| **Import** | `./repository` (Node.js code) | `./server-functions` (RPC stubs) |
| **Execution** | Browser (impossible) | Server (correct) |
| **Result** | SyntaxError | Success |
| **Data loss** | Yes (auxiliary tables) | No (complete persistence) |
| **Pattern** | Direct access | RPC pattern |

## Impact Analysis

### What Works Now

- ✅ Main workflow state → localStorage
- ✅ Main workflow state → database (via `$savePlanningState` server function)
- ✅ User experience (error caught, doesn't block workflow)

### What's Broken Now

- ❌ Interview answers → database (fails with SyntaxError)
- ❌ Form responses → database (fails with SyntaxError)
- ❌ Analytics/reporting (incomplete data)

### What Will Work After Fix

- ✅ Everything above (all data persists correctly)
- ✅ Complete analytics/reporting data
- ✅ No console errors

## Related History

This is the **third attempt** to solve auxiliary persistence:

1. **BUG-017:** Used `.db.ts` extension to prevent bundling
   - **Result:** Failed (only affects static imports)
   - **Learning:** File extension doesn't prevent runtime imports

2. **BUG-019:** Added fire-and-forget persistence
   - **Result:** Failed (ran client-side)
   - **Learning:** Need server execution context

3. **BUG-024:** Use server functions (RPC pattern)
   - **Status:** Ready to implement
   - **Confidence:** High (pattern already proven for main state)

## Files Affected

**To Modify:**
- `src/features/planning/infrastructure/persistence.ts` (~40 lines)
- `src/features/planning/infrastructure/__tests__/persistence.test.ts` (~10 lines)

**Already Correct:**
- `src/features/planning/infrastructure/server-functions.ts` (server functions exist)
- All other files (only persistence layer affected)

## Verification

**Automated:**
```bash
npm test persistence.test.ts
```

**Manual:**
```sql
-- After creating test project and answering questions:
SELECT * FROM interview_answers WHERE project_id = '<test-id>';
SELECT * FROM form_responses WHERE project_id = '<test-id>';
```

**Expected:** All data present in database tables.

## Decision

**Recommendation:** ✅ PROCEED WITH FIX

**Rationale:**
- Low risk (error already caught, workflow unaffected)
- High confidence (pattern already proven)
- Quick implementation (<1 hour)
- Fixes silent data loss
- Improves reporting accuracy

**Priority:** Medium
- Not user-blocking (workflow continues)
- Affects analytics/reporting quality
- Clean architecture improvement

## Next Steps

1. Review [implementation plan](./implementation-plan.md)
2. Update `persistence.ts` code
3. Update test mocks
4. Run automated tests
5. Manual E2E verification
6. Update CLAUDE.md with fix summary

---

**Questions?** See individual documents for detailed analysis:
- Non-technical overview → [SUMMARY.md](./SUMMARY.md)
- Technical details → [bug-report.md](./bug-report.md)
- How to fix → [implementation-plan.md](./implementation-plan.md)
- Visual diagrams → [architecture-comparison.md](./architecture-comparison.md)
- Runtime behavior → [execution-trace.md](./execution-trace.md)
