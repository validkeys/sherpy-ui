# BUG-013 React Best Practices Review

## React Doctor Score: 91/100 ✅

Ran `react-doctor` on the codebase after BUG-013 fix. Overall score: **91/100 Great**

## Issues Found in Fixed File

### ⚠️ Warning: `useContext` is deprecated in React 19+

**File**: `src/features/planning/machines/PlanningMachineContext.tsx:182`

**Current Code**:
```typescript
export function usePlanningMachine() {
  const context = useContext(PlanningMachineContext);
  if (!context) {
    throw new Error('usePlanningMachine must be used within PlanningMachineProvider');
  }
  return context.actor;
}
```

**React Doctor Recommendation**: 
Use `use()` instead of `useContext()` in React 19+

**Analysis**: 
- This is a **minor improvement** suggestion for React 19+ compatibility
- Not related to BUG-013 fix
- Current code works correctly
- Can be addressed in a future refactor

**Recommended Fix** (future):
```typescript
import { use } from 'react';

export function usePlanningMachine() {
  const context = use(PlanningMachineContext);
  if (!context) {
    throw new Error('usePlanningMachine must be used within PlanningMachineProvider');
  }
  return context.actor;
}
```

## Core Fix Review: `useState` → `useMemo`

### ✅ Fix is Correct

**Changed Code**:
```typescript
// Before (BUG-013):
const [actor] = React.useState(() => createActor(planningMachine, { input }));

// After (Fixed):
const actor = React.useMemo(() => {
  const persistedState = loadState(storageKey);
  if (persistedState && persistedState.context.projectId === input.projectId) {
    return createActor(planningMachine, { input, snapshot: persistedState });
  }
  return createActor(planningMachine, { input });
}, []); // Empty deps: only create once per component lifetime
```

### React Best Practices Analysis

#### ✅ Correct Use of `useMemo` for Expensive Computation
- Creating an XState actor is an expensive operation
- `useMemo` prevents recreating the actor on every render
- Empty deps `[]` ensures single instance per component lifetime

#### ⚠️ Dependency Array Concern

**Observation**: `useMemo` uses `storageKey` and `input` but doesn't include them in deps

**Why This Is OK**:
1. **`storageKey`**: Derived from `projectId` in parent component (`storageKey={planning-machine-${projectId}}`). Since the provider is keyed by `projectId`, changing `storageKey` means a different component instance entirely.

2. **`input`**: Contains `projectId` and `entryPath`. Same reasoning as above - if `input.projectId` changes, the parent remounts with a new provider instance.

3. **Intentional Design**: We explicitly want to ignore prop changes to prevent recreating the actor. The actor lifecycle should span the entire provider lifecycle, not re-initialize on prop updates.

**ESLint Exhaustive Deps**: Would warn about this, but it's a valid exception. We could add:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Empty deps intentional: actor should persist across prop changes
```

#### ✅ StrictMode Compatibility
- `useMemo` with empty deps is **safe** for StrictMode
- React may call the memoized function multiple times during initial mount (in dev mode)
- XState's `createActor` is **idempotent** for the same snapshot
- The returned value is memoized, so even if called twice, the same actor is reused

#### ⚠️ Alternative Consideration: `useRef` + Lazy Initialization

Some React experts prefer `useRef` for "create once" patterns:

```typescript
const actorRef = React.useRef<ActorType | null>(null);

if (actorRef.current === null) {
  const persistedState = loadState(storageKey);
  if (persistedState && persistedState.context.projectId === input.projectId) {
    actorRef.current = createActor(planningMachine, { input, snapshot: persistedState });
  } else {
    actorRef.current = createActor(planningMachine, { input });
  }
}

const actor = actorRef.current;
```

**Pros**:
- No ESLint warnings about deps
- Explicit "create once" pattern
- Guaranteed single execution (even in StrictMode)

**Cons**:
- More verbose
- Conditional logic in render (not a big deal)
- Less "React-idiomatic" than `useMemo`

**Verdict**: Both patterns work. `useMemo` with empty deps is acceptable for this use case.

## Other React Issues in Planning Feature

### ⚠️ Conditional Hook Calls in AutomatedStep.tsx
**Files**: `src/features/planning/components/AutomatedStep.tsx:31-32`

**Issue**: 
```typescript
// WRONG: Conditional hook calls
if (someCondition) {
  const value1 = useSelector(selector1);
  const value2 = useSelector(selector2);
}
```

**Fix**: Move hooks before conditional, or call unconditionally:
```typescript
const value1 = useSelector(selector1);
const value2 = useSelector(selector2);

if (someCondition) {
  // Use values here
}
```

**Priority**: HIGH - This violates React Rules of Hooks

### ⚠️ Array Index as Key
**Files**: `InterviewStep.tsx:105`, `InterviewStep.tsx:126`, `InterviewThread.tsx:209`, `InterviewThread.tsx:235`

**Issue**:
```typescript
answers.map((answer, idx) => (
  <div key={idx}>...</div>
))
```

**Fix**: Use stable unique identifier:
```typescript
answers.map((answer) => (
  <div key={answer.timestamp || answer.question}>...</div>
))
```

**Priority**: MEDIUM - Can cause bugs when list is reordered

### ⚠️ Hydration Mismatch with `new Date()`
**Files**: `AutomatedStep.tsx:52`, `ArtifactOnlyStep.tsx:85`

**Issue**: Server-side rendered date differs from client-side
**Fix**: Use `useEffect` + `useState` for client-only timestamps, or add `suppressHydrationWarning`

**Priority**: MEDIUM - Only relevant for SSR

## Summary

### BUG-013 Fix: ✅ APPROVED
- The `useState` → `useMemo` change is **correct** and follows React best practices
- Properly addresses StrictMode remount issue
- No critical React violations introduced

### Recommendations for Follow-up
1. **HIGH**: Fix conditional hook calls in `AutomatedStep.tsx` (blocks React Rules)
2. **MEDIUM**: Replace array index keys with stable identifiers
3. **LOW**: Upgrade `useContext` to `use()` for React 19+ compatibility
4. **LOW**: Consider `useRef` alternative if ESLint exhaustive-deps warnings are problematic

### Final Verdict
**The BUG-013 fix is production-ready and React-compliant.** ✅

Minor improvements can be made (like adding ESLint disable comment), but the core fix is solid.
