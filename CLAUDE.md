# CLAUDE.md

Reduce LLM coding mistakes.

**Tradeoff:** Bias toward caution over speed. Use judgment for trivial tasks.

---

## ✅ CODE REVIEW REMEDIATION: ALL COMPLETE - M0-M14 (2026-06-12)

**Status**: ✅ M0-M14 COMPLETE (14/14 milestones, ~22.5 hours) 🎉

**M14 Achievement (Final)**: Runtime dynamic imports eliminated via dependency injection
- Added deprecation notice to old planningMachine.ts
- Verified planning-machine-factory.ts uses zero dynamic imports
- Server functions injected at creation (4-20ms latency savings per session)
- All 10/10 factory tests passing
- Dependency injection pattern established for future actors

**Key Findings**:
- M2 implemented dependency injection pattern (eliminated runtime dynamic imports)
- Old planningMachine.ts deprecated but kept for type exports + test coverage
- Factory pattern provides: 0ms import latency, compile-time types, easy testing

**Series Summary (M0-M14)**:
- **10 milestones** required code changes
- **4 milestones** (M7, M8, M12, M13) already compliant
- **Critical fixes**: Circular deps (M2), SSR hydration (M0), lazy loading (M3)
- **Accessibility**: Live regions (M11), stable keys (M10), minimal context (M9)
- **Architecture**: Dependency injection (M2, M14), type-safe constants (M4-M6)

**Documentation**: 
- Completion reports: `.tmp-docs/code-review-remediation/m{0-14}-*.md`
- Task breakdowns: `.tmp-docs/code-review-remediation/milestone-m{0-14}.tasks.yaml`
- Master plan: `.tmp-docs/code-review-remediation/milestones.yaml`

**Test Status**: 937/951 passing (14 pre-existing failures unrelated to M0-M14)

---

## 🎯 Next Steps

With code review remediation complete, focus areas:
1. **Remaining tests**: Fix 14 pre-existing test failures in other features
2. **Performance**: Profile planning workflow end-to-end
3. **New features**: Resume active development with clean foundation

---

## 1. Think Before Code

**No assume. No hide confusion. Surface tradeoffs.**

Before implement:
- State assumptions. Uncertain? Ask.
- Multiple interpretations? Present. Don't pick silently.
- Simpler approach exists? Say. Push back.
- Unclear? Stop. Name confusion. Ask.

## 2. Simplicity First

**Min code solve problem. Nothing speculative.**

- No features beyond asked
- No abstractions for single-use
- No "flexibility" unless requested
- No error handling for impossible scenarios
- 200 lines → 50? Rewrite.

Ask: "Senior engineer say overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only must. Clean only your mess.**

Edit existing code:
- No "improve" adjacent code/comments/formatting
- No refactor working things
- Match existing style
- See dead code? Mention. Don't delete.

Changes create orphans:
- Remove imports/vars/functions YOUR changes made unused
- Don't remove pre-existing dead code

Test: Every changed line traces to user request.

## 4. Goal-Driven

**Define success. Loop until verified.**

Transform tasks → verifiable goals:
- "Add validation" → "Write tests invalid inputs, make pass"
- "Fix bug" → "Write test reproduces, make pass"
- "Refactor X" → "Tests pass before/after"

Multi-step? Brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

Strong criteria → loop independently. Weak ("make work") → constant clarification.

---

## 5. Key Patterns

**Client/Server:**
- ✅ Use server functions (`$fnName`) for RPC
- ❌ No REST APIs internal ops
- ❌ No dynamic `import("./repository")` from client
- Why: Dynamic imports execute caller context. Browser can't load Node modules.

**Type Safety:**
- ✅ Use `constants.ts` for states/events/keys
- ❌ No magic strings
- Why: TypeScript catches typos compile-time. Refactors propagate.

**Design System:**
- ✅ Pair tokens: `bg-inverse` + `text-fg-on-inverse`
- ❌ No `bg-inverse` + `text-fg-1` (zero contrast dark mode)
- Why: Semantic pairs ensure contrast both themes.

**Navigation:**
- ✅ Single source truth for `navigate()`
- ❌ No duplicate navigation parent + child
- Why: Race conditions → wrong redirects.

**Testing:**
- ✅ Playwright MCP for React forms
- ❌ No agent-browser (5 approaches tested, all failed)
- Why: Playwright triggers React events. agent-browser doesn't.

**Persistence:**
- ✅ Validate project exists before navigation (route guard)
- ✅ Monitor persistence failures (PersistenceHealthMonitor)
- ✅ Export data on failures (exportLocalStorageData)
- Why: Defense-in-depth prevents silent data loss.

---

## 6. Active Work

**🏗️ STATE REFACTOR:** Phase 5 ready
- Branch: `feature/state-refactor-phase-1`
- Plan: `docs/planning/002-state-refactor/plan.yaml`
- Status: `.tmp-docs/state-refactor-status.md`

Architecture: `UI → Adapters → Application → Workflow → Domain → Infrastructure`

---

## 7. Docs Organization

Temp docs in `.tmp-docs/`:
- Bug Reports: `.tmp-docs/bug-reports/{NNN}-{slug}/`
- Planning: `.tmp-docs/planning/{NNN}-{slug}/`
- Screenshots: `.tmp-docs/screenshots/name.png`
- Scripts: `.tmp-docs/scripts/name.sh`
- Code Reviews: `.tmp-docs/code-reviews/{NNN}-{slug}/review.yaml`

Numbered folders. All related docs same folder.

---

## 8. Fixed Bugs

See `.tmp-docs/bug-reports/FIXED-BUGS.md` complete list (BUG-018 → BUG-029).

**Quick learnings:**
- 029: Magic strings → type-safe constants
- 028: Design token pairing theme contrast
- 027: Field name mismatches between layers
- 026: LLM context via templates not hardcoded
- 025: Defense-in-depth persistence (guard → monitor → export)
- 024: Client/server boundary (RPC not dynamic imports)
- 023: Single navigation source truth
- 022: Strip markdown sections parsed content
- 021: Use existing server functions before REST APIs
- 020: Data mapping validation between layers
- 019: Event-driven persistence fire-and-forget
- 018: SSR disabled stateful client-only workflows

---

**Guidelines working:** Fewer unnecessary changes diffs, fewer rewrites overcomplication, questions before implementation not after mistakes.
