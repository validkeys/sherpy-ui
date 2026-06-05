# BUG-018: Quick Reference Card

## At a Glance

| Item | Value |
|------|-------|
| **Issue** | #13 - SSR Hydration mismatch |
| **Severity** | Medium |
| **Branch** | `fix/bug-018-ssr-hydration-mismatch` |
| **Root Cause** | Server renders Step 1, client hydrates Step 3 → mismatch |
| **Recommended Fix** | Option 1: Deferred Hydration |
| **Implementation Time** | 3.5 hours |
| **Risk Level** | LOW |
| **Status** | 🟡 Awaiting approval |

---

## The Bug (Before)

```
User at Step 3 → Press F5 → Page shows Step 1 → Hydration error → Broken
```

**Console Error**:
```
Error: Hydration failed because the server rendered text didn't match the client.
Server: "1" (Step 1)
Client: "3" (Step 3)
```

---

## The Fix (After - Option 1)

```
User at Step 3 → Press F5 → Loading indicator (150ms) → Step 3 → ✅ Works
```

**No console errors, correct state maintained**

---

## All Solution Options

| Option | Time | Risk | UX | Complexity |
|--------|------|------|----|-----------| 
| **1. Deferred Hydration** ⭐ | 3.5h | LOW | Loading flash 150ms | Simple |
| **2. SSR State Restoration** | 1-2d | MED | Perfect | Complex |
| **3. Suppress Warnings** ❌ | 5m | HIGH | Buggy | Minimal |
| **4. Client-Only** | 5m | LOW | Blank page 400ms | Minimal |

---

## Decision Tree

```
Need SEO? ───YES──→ Option 2 (SSR Restoration)
    │
    NO
    │
    ↓
Accept 150ms loading? ───YES──→ Option 1 (Deferred) ⭐
    │
    NO
    │
    ↓
Accept 400ms blank? ───YES──→ Option 4 (Client-Only)
    │
    NO
    │
    ↓
Choose between: 150ms loading OR 400ms blank
(Both better than current broken state)
```

---

## Implementation Checklist (Option 1)

### Code Changes
- [ ] Add `isHydrating` state to `PlanningMachineContext.tsx`
- [ ] Create `LoadingPlaceholder.tsx` component
- [ ] Render loading state during `isHydrating === true`
- [ ] Set `isHydrating = false` after mount

### Testing
- [ ] Seed project to Step 3
- [ ] Refresh page, verify Step 3 displays
- [ ] Check no hydration errors in console
- [ ] Test browser back/forward buttons
- [ ] Run integration test suite
- [ ] Resume E2E Test Run #017

### Documentation
- [ ] Update `CLAUDE.md` with fix
- [ ] Update `docs/e2e-testing/learnings.md`
- [ ] Close GitHub issue #13
- [ ] Add comment to issue with resolution

---

## Key Code Changes (Option 1)

**PlanningMachineContext.tsx**:
```typescript
const [isHydrating, setIsHydrating] = useState(() => 
  typeof window !== 'undefined'
);

useEffect(() => {
  // ... existing actor start logic ...
  setIsHydrating(false);
}, []);

if (isHydrating) {
  return (
    <PlanningMachineContext.Provider value={{ actor }}>
      <LoadingPlaceholder />
    </PlanningMachineContext.Provider>
  );
}
```

**LoadingPlaceholder.tsx** (new):
```typescript
export function LoadingPlaceholder() {
  return (
    <div className="planning-loading">
      <Spinner />
      <p>Restoring project state...</p>
    </div>
  );
}
```

---

## Testing Commands

```bash
# Start dev server
pnpm dev

# Seed to Step 3
curl -X POST http://localhost:5180/api/dev/seed \
  -H "Content-Type: application/json" \
  -d '{"step": 3, "projectName": "test-refresh"}'

# Navigate to project (manual browser test)
# → http://localhost:5180/project/{projectId}/build
# → Press F5 to refresh
# → Should see loading indicator briefly
# → Then Step 3 content

# Run integration tests
pnpm test src/features/planning/__integration.test.tsx

# Run e2e tests
pnpm test:e2e
```

---

## Success Criteria

### Must Have
- ✅ Page refresh displays correct step (not Step 1)
- ✅ No hydration errors in console
- ✅ Loading indicator visible during restore

### Should Have
- ✅ Loading indicator < 200ms
- ✅ Browser back/forward works
- ✅ All existing tests pass

### Nice to Have
- ✅ Smooth transition from loading → content
- ✅ Accessible loading message
- ✅ Skeleton UI instead of spinner (future enhancement)

---

## Rollback Plan

1. Revert the PR (single commit)
2. Deploy previous version
3. Document why rollback was needed
4. Re-evaluate solution approach

**Rollback triggers**:
- Loading indicator > 500ms (performance issue)
- New hydration errors introduced
- Breaking existing functionality
- User feedback strongly negative

---

## Related Issues

- **BUG-017**: better-sqlite3 bundling (RESOLVED)
- **BUG-013**: StrictMode actor duplication (RESOLVED)
- **BUG-011**: Snapshot restoration (RESOLVED)
- **Test Run #017**: Paused at Step 3 due to this bug

---

## FAQ

**Q: Why not just disable SSR?**  
A: Option 4 does this. It's a valid fallback if Option 1 testing shows issues. But Option 1 maintains SSR benefits (faster first paint, SEO-ready if needed later).

**Q: Why can't we fix the server to render the right step?**  
A: That's Option 2. It requires loading state from DB on every request, adding complexity and server load. Option 1 is simpler for same user benefit.

**Q: Will users see the loading indicator every time?**  
A: Only on full page refresh (F5). Normal navigation (clicking buttons, browser back/forward) uses client-side routing and won't show loading.

**Q: What if the loading indicator takes too long?**  
A: Current state restoration is synchronous from localStorage (~10ms). The 150ms estimate includes React render time. If it's slower, we can add performance monitoring and optimize.

**Q: Can we make the loading indicator prettier?**  
A: Yes! Future enhancement: skeleton UI matching the step layout. Initial implementation will use simple spinner + text.

---

## Documentation

📄 **Full Analysis**: `.tmp-docs/bug-018-diagnosis.md` (30 pages)  
📊 **Solution Comparison**: `.tmp-docs/bug-018-solution-comparison.md` (15 pages)  
📋 **Executive Summary**: `.tmp-docs/bug-018-executive-summary.md` (5 pages)  
🎯 **This Quick Ref**: `.tmp-docs/bug-018-quick-reference.md` (you are here)

🐛 **GitHub Issue**: #13  
🧪 **Test Data**: `docs/e2e-testing/runs/017/`

---

## Contact

**For questions about**:
- Technical implementation → Engineering team
- User experience concerns → Product team  
- Testing approach → QA team
- Approval decision → Engineering manager

---

## Status Updates

| Date | Status | Notes |
|------|--------|-------|
| 2026-05-20 | 🟡 Diagnosed | Analysis complete, awaiting approval |
| _TBD_ | 🟢 Approved | Ready to implement |
| _TBD_ | 🔵 In Progress | Implementation started |
| _TBD_ | 🟣 Testing | Manual + integration + e2e tests |
| _TBD_ | ✅ Complete | PR merged, issue closed |

---

**Last Updated**: 2026-05-20  
**Next Action**: Approval decision from team  
**Owner**: Engineering team  
