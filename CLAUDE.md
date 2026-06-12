# CLAUDE.md

Reduce LLM coding mistakes.

**Tradeoff:** Bias toward caution over speed. Use judgment for trivial tasks.

---

## ✅ CODE REVIEW REMEDIATION: M9 Complete - Adapter Memoization (2026-06-12)

**Status**: ✅ M0-M9 COMPLETE (8/14 milestones, ~18.5 hours)

**M9 Achievement**: Type-enforced minimal context for adapters
- Created `MessageRelevantContext` (14 fields) and `ArtifactRelevantContext` (2 fields)
- Refactored 7 adapter files to use minimal types instead of full `PlanningContext`
- All 204 adapter + hook tests passing (zero regressions)
- **Key Finding**: M7-010 already achieved optimal field selection
- **M9 Benefit**: Type safety and structural quality (not runtime performance)

**Documentation**:
- `.tmp-docs/code-review-remediation/m9-completion.md` - Complete summary
- `.tmp-docs/code-review-remediation/m9/` - Audit and analysis docs

**Next**: M10 - Fix List Keys (2 hours)

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
