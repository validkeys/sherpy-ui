# BUG-022: Before & After Diagram

## BEFORE (Bug) ❌

```
┌─────────────────────────────────────────────────────────────────┐
│ Page Refresh at Step 7                                          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Load Cached Snapshot (localStorage)                     │
│ ✅ cachedSnapshot = { currentStepNumber: 7, ... }               │
│ ✅ authoritativeSnapshot = cachedSnapshot (Step 7)              │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Create Actor from Cache                                 │
│ ✅ useMemo(() => createActor(Step 7 snapshot))                  │
│ ✅ Actor created at Step 7                                      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Database Query Completes                                │
│ ⚠️  dbSnapshot = { currentStepNumber: 1, ... } (stale!)         │
│ ⚠️  authoritativeSnapshot = dbSnapshot (Step 1) ← CHANGES!      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: useMemo Dependency Changed                              │
│ ❌ useMemo sees authoritativeSnapshot changed                   │
│ ❌ RECREATES ACTOR with Step 1 snapshot                         │
│ ❌ Discards Step 7 actor ← BUG!                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Result: State Reverted from Step 7 → Step 1 (45ms)              │
└─────────────────────────────────────────────────────────────────┘
```

**Problem Code:**
```typescript
const actor = React.useMemo(() => {
  if (authoritativeSnapshot) {
    return createActor(planningMachine, {
      input,                          // ⚠️  Not the main issue
      snapshot: authoritativeSnapshot // ⚠️  This changes when DB loads!
    });
  }
  return createActor(planningMachine, { input });
}, [authoritativeSnapshot, input]);   // ❌ Recreates on EVERY snapshot change!
```

---

## AFTER (Fixed) ✅

```
┌─────────────────────────────────────────────────────────────────┐
│ Page Refresh at Step 7                                          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Load Cached Snapshot (localStorage)                     │
│ ✅ cachedSnapshot = { currentStepNumber: 7, ... }               │
│ ✅ authoritativeSnapshot = cachedSnapshot (Step 7)              │
│ ✅ initialSnapshot = useRef(authoritativeSnapshot) ← CAPTURED!  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Create Actor from INITIAL Snapshot                      │
│ ✅ useMemo(() => createActor(initialSnapshot.current))          │
│ ✅ Actor created at Step 7                                      │
│ ✅ Dependencies: [input.projectId] only                         │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Database Query Completes                                │
│ ⚠️  dbSnapshot = { currentStepNumber: 1, ... } (stale!)         │
│ ⚠️  authoritativeSnapshot = dbSnapshot (Step 1) ← CHANGES       │
│ ✅ initialSnapshot.current = Step 7 ← UNCHANGED!                │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: useMemo Dependency Checked                              │
│ ✅ useMemo([input.projectId]) ← projectId unchanged             │
│ ✅ Actor NOT recreated                                          │
│ ✅ Step 7 actor preserved                                       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Hot-Reload useEffect Fires                              │
│ ✅ Detects dbSnapshot !== currentSnapshot                       │
│ ✅ Sends RESTORE_SNAPSHOT event to existing actor               │
│ ✅ Actor compares timestamps: localTime > dbTime                │
│ ✅ Keeps local state (Step 7) ← Timestamp protection!           │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Result: State PRESERVED at Step 7 ✅                            │
└─────────────────────────────────────────────────────────────────┘
```

**Fixed Code:**
```typescript
const initialSnapshot = React.useRef(authoritativeSnapshot); // ✅ Capture once

const actor = React.useMemo(() => {
  const snapshot = initialSnapshot.current; // ✅ Use INITIAL snapshot
  
  if (snapshot) {
    return createActor(planningMachine, {
      snapshot: snapshot as SnapshotType // ✅ No input needed
    });
  }
  return createActor(planningMachine, { input });
}, [input.projectId]); // ✅ Only recreate if projectId changes!
```

---

## Key Insights

### Before (Bug)
- Actor dependency: `[authoritativeSnapshot, input]`
- Actor recreated: When database snapshot arrives
- Result: Stale database overwrites correct cache

### After (Fixed)
- Actor dependency: `[input.projectId]`
- Actor recreated: Only when projectId changes
- Result: Actor preserved, hot-reload handles updates

### Protection Layers

1. **Initial Snapshot Capture:**
   - `useRef` captures first authoritative snapshot
   - Prevents actor recreation on subsequent snapshot changes

2. **Hot-Reload Event Pattern:**
   - `RESTORE_SNAPSHOT` event updates existing actor
   - No actor recreation needed

3. **Timestamp-Based Conflict Resolution:**
   - `RESTORE_SNAPSHOT` handler compares `updatedAt` timestamps
   - Keeps newer state (local cache > stale database)

---

## Timing Analysis

### Before (Bug)
```
T+0ms:    Page refresh
T+1ms:    Actor created from cache (Step 7) ✅
T+45ms:   Database loads, actor recreated (Step 1) ❌
T+46ms:   User sees reversion (Step 7 → Step 1) 😞
```

### After (Fixed)
```
T+0ms:    Page refresh
T+1ms:    Actor created from cache (Step 7) ✅
T+45ms:   Database loads, RESTORE_SNAPSHOT event sent
T+46ms:   Event handler checks timestamp, keeps Step 7 ✅
T+47ms:   User stays at Step 7 😊
```

---

## Test Coverage

| Scenario | Test | Status |
|----------|------|--------|
| Actor restoration from snapshot | `bug-022-snapshot-restoration.test.ts` | ✅ Pass |
| Actor with input + snapshot | `bug-022-snapshot-restoration.test.ts` | ✅ Pass |
| Context preservation | `bug-022-snapshot-restoration.test.ts` | ✅ Pass |
| Fresh actor without snapshot | `bug-022-snapshot-restoration.test.ts` | ✅ Pass |
| Planning machine behavior | `planningMachine.test.ts` (43 tests) | ✅ Pass |
| Persistence layer | `persistence.test.ts` (6 tests) | ✅ Pass |

**Total:** 53 passing tests

---

## Related Patterns

### ❌ Anti-Pattern: Reactive Actor Creation
```typescript
// Don't do this - actor recreated too often
const actor = useMemo(() => {
  return createActor(machine, { snapshot });
}, [snapshot]); // ❌ Recreates on every snapshot change
```

### ✅ Correct Pattern: Stable Actor with Event Updates
```typescript
// Do this - actor stable, updates via events
const initialSnapshot = useRef(snapshot);
const actor = useMemo(() => {
  return createActor(machine, { snapshot: initialSnapshot.current });
}, [projectId]); // ✅ Only recreates on project change

useEffect(() => {
  if (newSnapshot) {
    actor.send({ type: 'RESTORE_SNAPSHOT', snapshot: newSnapshot });
  }
}, [newSnapshot, actor]); // ✅ Update via events
```

---

## Rollback Strategy

If E2E test fails:
```bash
git revert HEAD~1  # Revert Phase 3 fix
```

Previous behavior restored:
- Phases 1 & 2 infrastructure changes preserved
- Bug still present (state reversion on page refresh)
- Can investigate alternative fixes
