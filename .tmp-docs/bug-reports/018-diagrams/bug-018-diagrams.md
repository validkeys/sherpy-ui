# BUG-018: Visual Diagrams

## Diagram 1: Current State (BROKEN)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User completes Step 1, Step 2...                                  │
│  Currently at Step 3, answering questions...                       │
│                                                                     │
│  👤 User: [Presses F5 to refresh]                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

           ↓

┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER-SIDE RENDER (SSR)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PlanningMachineProvider mounts                                    │
│    ├─ useMemo creates actor                                        │
│    ├─ loadStateSync(storageKey)                                    │
│    │    └─ localStorage.getItem()                                  │
│    │         └─ ❌ Returns null (window undefined in SSR)          │
│    └─ createActor with DEFAULT input                               │
│         └─ Initial state: Step 1                                   │
│                                                                     │
│  StepContainer renders                                             │
│    └─ Shows: "Step 1 of 10"                                        │
│                                                                     │
│  Navigation renders                                                │
│    └─ Shows: "Step 1 of 10"                                        │
│                                                                     │
│  HTML sent to browser:                                             │
│    <div class="progress-indicator">Step 1 of 10</div>             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

           ↓

┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE HYDRATION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Browser receives HTML: "Step 1 of 10"                             │
│                                                                     │
│  React begins hydration...                                         │
│                                                                     │
│  PlanningMachineProvider mounts (client-side)                      │
│    ├─ useMemo creates actor                                        │
│    ├─ loadStateSync(storageKey)                                    │
│    │    └─ localStorage.getItem()                                  │
│    │         └─ ✅ Returns cached state (window exists!)           │
│    │              {currentStepNumber: 3, ...}                      │
│    └─ createActor with RESTORED snapshot                           │
│         └─ Restored state: Step 3                                  │
│                                                                     │
│  StepContainer renders                                             │
│    └─ Shows: "Step 3 of 10"                                        │
│                                                                     │
│  Navigation renders                                                │
│    └─ Shows: "Step 3 of 10"                                        │
│                                                                     │
│  ❌ REACT DETECTS MISMATCH!                                        │
│     Server HTML: "Step 1 of 10"                                    │
│     Client render: "Step 3 of 10"                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

           ↓

┌─────────────────────────────────────────────────────────────────────┐
│                     HYDRATION ERROR                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ❌ Error: Hydration failed because the server rendered HTML       │
│            didn't match the client.                                │
│                                                                     │
│  Console:                                                          │
│    Server: "1"                                                     │
│    Client: "3"                                                     │
│                                                                     │
│  React response:                                                   │
│    └─ Discard client state                                         │
│    └─ Revert to server HTML                                        │
│    └─ Create new Actor instance (x:2 → x:4)                        │
│    └─ Re-render with Step 1                                        │
│                                                                     │
│  Result:                                                           │
│    👤 User sees: "Step 1 of 10" ❌                                 │
│    💾 Database has: Step 3 data ✅                                 │
│    🤔 State mismatch = BROKEN UX                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 2: Option 1 Solution (FIXED)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User completes Step 1, Step 2...                                  │
│  Currently at Step 3, answering questions...                       │
│                                                                     │
│  👤 User: [Presses F5 to refresh]                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

           ↓

┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER-SIDE RENDER (SSR)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PlanningMachineProvider mounts                                    │
│    ├─ ✨ NEW: useState(() => typeof window !== 'undefined')       │
│    │         isHydrating = false (window undefined in SSR)         │
│    │                                                                │
│    ├─ useMemo creates actor (same as before)                       │
│    │                                                                │
│    └─ ✨ NEW: Conditional render                                   │
│         if (isHydrating) return <LoadingPlaceholder />             │
│         // isHydrating = false on server                           │
│         // So render LoadingPlaceholder                            │
│                                                                     │
│  LoadingPlaceholder renders                                        │
│    └─ Shows: <Spinner /> + "Restoring project state..."           │
│                                                                     │
│  HTML sent to browser:                                             │
│    <div class="planning-hydration-loading">                        │
│      <div class="spinner"></div>                                   │
│      <p>Restoring project state...</p>                             │
│    </div>                                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

           ↓

┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE HYDRATION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Browser receives HTML: "Restoring project state..."               │
│                                                                     │
│  React begins hydration...                                         │
│                                                                     │
│  PlanningMachineProvider mounts (client-side)                      │
│    ├─ ✨ NEW: useState(() => typeof window !== 'undefined')       │
│    │         isHydrating = true (window exists in browser!)        │
│    │                                                                │
│    ├─ useMemo creates actor                                        │
│    │    └─ loadStateSync() ✅ returns Step 3 state                │
│    │    └─ createActor with restored snapshot                      │
│    │                                                                │
│    └─ ✨ NEW: Conditional render                                   │
│         if (isHydrating) return <LoadingPlaceholder />             │
│         // isHydrating = true during first render                  │
│         // So render LoadingPlaceholder                            │
│                                                                     │
│  LoadingPlaceholder renders                                        │
│    └─ Shows: <Spinner /> + "Restoring project state..."           │
│                                                                     │
│  ✅ REACT COMPARES:                                                │
│     Server HTML: "Restoring project state..."                      │
│     Client render: "Restoring project state..."                    │
│     ✅ PERFECT MATCH! No hydration error!                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

           ↓ (useEffect runs after hydration)

┌─────────────────────────────────────────────────────────────────────┐
│                    POST-HYDRATION RENDER                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  useEffect runs:                                                   │
│    ├─ actor.start()                                                │
│    ├─ syncFromDatabase() (background)                              │
│    └─ ✨ NEW: setIsHydrating(false)                                │
│                                                                     │
│  Re-render triggered...                                            │
│                                                                     │
│  PlanningMachineProvider renders                                   │
│    └─ ✨ NEW: Conditional render                                   │
│         if (isHydrating) return <LoadingPlaceholder />             │
│         // isHydrating = false now                                 │
│         // So render children                                      │
│                                                                     │
│  StepContainer renders                                             │
│    └─ Shows: "Step 3 of 10" ✅                                     │
│                                                                     │
│  Navigation renders                                                │
│    └─ Shows: "Step 3 of 10" ✅                                     │
│                                                                     │
│  Result:                                                           │
│    👤 User sees: "Step 3 of 10" ✅                                 │
│    💾 Database has: Step 3 data ✅                                 │
│    ✅ Everything matches = WORKING UX                              │
│                                                                     │
│  Timing: ~100-200ms from refresh to content display                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 3: State Flow Comparison

### Before (BROKEN)

```
┌─────────┐     ┌──────────┐     ┌─────────┐
│ Server  │────▶│  Client  │────▶│ Result  │
│ Render  │     │ Hydrate  │     │         │
└─────────┘     └──────────┘     └─────────┘
     │               │                 │
     │               │                 │
   Step 1          Step 3         ❌ ERROR
  (default)      (restored)     (mismatch)
     │               │                 │
     ↓               ↓                 ↓
  "1 of 10"      "3 of 10"       Reverts to
   in HTML       in state          Step 1
```

### After Option 1 (FIXED)

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌─────────┐
│ Server  │────▶│  Client  │────▶│  After  │────▶│ Result  │
│ Render  │     │ Hydrate  │     │useEffect│     │         │
└─────────┘     └──────────┘     └─────────┘     └─────────┘
     │               │                 │               │
     │               │                 │               │
 "Loading"       "Loading"         Step 3          Step 3
(no state)      (no state)      (restored)      (displayed)
     │               │                 │               │
     ↓               ↓                 ↓               ↓
  Both show     ✅ MATCH!         Set flag         Show real
   spinner      No error!        isHydrating      content
                                   = false
```

---

## Diagram 4: Component Tree Changes

### Before (No Changes)

```
<PlanningMachineProvider>
  │
  ├─ Create actor with loadStateSync()
  │  └─ Returns null in SSR ❌
  │  └─ Returns Step 3 in browser ✅
  │
  └─ Render children immediately
      ├─ <Navigation />     → Shows step number
      └─ <StepContainer />  → Shows form
```

### After (Option 1)

```
<PlanningMachineProvider>
  │
  ├─ ✨ useState: isHydrating
  │    └─ false in SSR (window undefined)
  │    └─ true in browser (window exists)
  │
  ├─ Create actor with loadStateSync()
  │  └─ Returns null in SSR
  │  └─ Returns Step 3 in browser
  │
  ├─ useEffect: setIsHydrating(false)
  │    └─ Runs after hydration complete
  │
  └─ ✨ Conditional render
      │
      ├─ if (isHydrating)
      │    └─ <LoadingPlaceholder />  ← Prevents mismatch
      │
      └─ else
           ├─ <Navigation />     → Shows step number
           └─ <StepContainer />  → Shows form
```

---

## Diagram 5: User Experience Timeline

### Current Experience (BROKEN)

```
Time: 0ms          50ms         100ms        200ms
      │            │            │            │
      ▼            ▼            ▼            ▼
   ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
   │ F5   │───▶│Step 1│───▶│Error │───▶│Stuck │
   │Press │    │Shows │    │Shown │    │ at 1 │
   └──────┘    └──────┘    └──────┘    └──────┘
                  ❌          ❌          ❌
```

### Option 1 Experience (FIXED)

```
Time: 0ms          50ms         150ms        200ms
      │            │            │            │
      ▼            ▼            ▼            ▼
   ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
   │ F5   │───▶│Load  │───▶│Step 3│───▶│Ready │
   │Press │    │Icon  │    │Shows │    │ Work │
   └──────┘    └──────┘    └──────┘    └──────┘
                  ✅          ✅          ✅
```

### Option 4 Experience (Client-Only)

```
Time: 0ms          200ms        400ms        600ms
      │            │            │            │
      ▼            ▼            ▼            ▼
   ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
   │ F5   │───▶│Blank │───▶│Step 3│───▶│Ready │
   │Press │    │Page  │    │Shows │    │ Work │
   └──────┘    └──────┘    └──────┘    └──────┘
                  ⚠️          ✅          ✅
```

---

## Diagram 6: Code Complexity Comparison

### Option 1: Deferred Hydration

```
Complexity Score: ⭐⭐ (2/5)

┌─────────────────────────────────────┐
│ NEW FILES: 1                        │
│ LoadingPlaceholder.tsx (50 lines)  │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ MODIFIED FILES: 1                   │
│ PlanningMachineContext.tsx          │
│   + 1 import                        │
│   + 3 lines (useState)              │
│   + 1 line (setIsHydrating)         │
│   + 7 lines (conditional render)    │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ TOTAL: ~60 lines                    │
│ Simple logic, easy to understand    │
└─────────────────────────────────────┘
```

### Option 2: SSR State Restoration

```
Complexity Score: ⭐⭐⭐⭐ (4/5)

┌─────────────────────────────────────┐
│ MODIFIED FILES: 3                   │
│ 1. Route loader (20 lines)          │
│ 2. PlanningMachineContext (30 lines)│
│ 3. Server functions (10 lines)      │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ CONCERNS:                           │
│ • DB query on every request         │
│ • Cache coherence (localStorage/DB) │
│ • SSR edge cases                    │
│ • Connection pooling                │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ TOTAL: ~100 lines + complexity      │
│ Multi-layer changes, harder debug   │
└─────────────────────────────────────┘
```

### Option 4: Client-Only

```
Complexity Score: ⭐ (1/5)

┌─────────────────────────────────────┐
│ MODIFIED FILES: 1                   │
│ $projectId.build.tsx                │
│   + ssr: false (1 line)             │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ TRADEOFF:                           │
│ • No SSR benefits                   │
│ • Blank page during JS load         │
│ • Acceptable for auth workflow      │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ TOTAL: 1 line                       │
│ Simplest possible fix               │
└─────────────────────────────────────┘
```

---

## Diagram 7: Decision Tree

```
                    ┌─────────────────┐
                    │  Need SEO for   │
                    │ planning flow?  │
                    └────────┬────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
              YES│                       │NO
                 │                       │
                 ▼                       ▼
        ┌─────────────────┐    ┌─────────────────┐
        │   Option 2:     │    │ Accept 150ms    │
        │ SSR Restoration │    │ loading flash?  │
        │  (1-2 days)     │    └────────┬────────┘
        └─────────────────┘             │
                                ┌───────┴───────┐
                                │               │
                             YES│               │NO
                                │               │
                                ▼               ▼
                       ┌─────────────────┐ ┌─────────────────┐
                       │   Option 1: ⭐  │ │   Option 4:     │
                       │    Deferred     │ │  Client-Only    │
                       │   (3.5 hours)   │ │   (5 minutes)   │
                       └─────────────────┘ └─────────────────┘
                       
                       RECOMMENDED PATH
```

---

## Diagram 8: Risk vs Reward Matrix

```
                        HIGH REWARD
                             ▲
                             │
                             │
          Option 2 (SSR)     │     
                ⭐⭐⭐        │     
            ┌──────────┐    │    
            │ Perfect  │    │    
            │   UX     │    │    
            └──────────┘    │    
         HIGH RISK          │         LOW RISK
    ◄───────────────────────┼───────────────────────►
                             │    
                             │    ┌──────────┐
                             │    │ Option 1 │ ⭐⭐⭐⭐⭐
                             │    │  BEST!   │
                             │    └──────────┘
           ┌──────────┐      │
           │ Option 3 │      │    ┌──────────┐
           │ NEVER!   │ ❌   │    │ Option 4 │
           └──────────┘      │    │  Backup  │ ⭐⭐⭐
                             │    └──────────┘
                             ▼
                        LOW REWARD
                        
                        
Legend:
• Option 1: Low risk, high reward → RECOMMENDED
• Option 2: High risk, high reward → If SEO needed
• Option 3: Low risk, LOW reward → Never use
• Option 4: Low risk, medium reward → Quick fallback
```

---

**These diagrams visually explain the bug, solution, and decision rationale.**
