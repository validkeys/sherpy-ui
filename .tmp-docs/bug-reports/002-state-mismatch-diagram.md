# Bug #002: State Mismatch Diagram

## Data Flow: Two Sources of Truth

```
┌─────────────────────────────────────────────────────────────────┐
│                     PROJECT CREATION                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   createProject()     │
                    │   or seedStore()      │
                    └───────────┬───────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
    ┌─────────────────────┐       ┌─────────────────────────┐
    │  Projects Store     │       │  Planning Machine       │
    │  (in-memory Map)    │       │  (localStorage)         │
    ├─────────────────────┤       ├─────────────────────────┤
    │ Project {           │       │ {                       │
    │   id: "seed-0002"   │       │   value: "step1...."    │
    │   currentStep: 2 ←──┼──✗    │   context: {            │
    │   ...               │  NO   │     currentStepNumber: 1│
    │ }                   │  SYNC │     ...                 │
    │                     │       │   }                     │
    └──────────┬──────────┘       └────────┬────────────────┘
               │                           │
               │                           │
    ┌──────────┼───────────────────────────┼─────────────────┐
    │          │       USER JOURNEY        │                 │
    └──────────┼───────────────────────────┼─────────────────┘
               │                           │
               ▼                           │
    ┌────────────────────┐                │
    │   /dashboard       │                │
    │                    │                │
    │  ProjectList       │                │
    │    ↓               │                │
    │  ProjectCard       │                │
    │    ↓               │                │
    │  Shows:            │                │
    │  "Step 2 ·         │                │
    │   Business Goals"  │                │
    │                    │                │
    │  [User clicks]     │                │
    └──────────┬─────────┘                │
               │                           │
               ▼                           │
    ┌────────────────────┐                │
    │  /project/         │                │
    │   seed-0002/build  │                │
    │                    │                │
    │  PlanningMachine   │◄───────────────┘
    │  Provider          │
    │    ↓               │
    │  Loads from        │
    │  localStorage      │
    │    ↓               │
    │  Shows:            │
    │  "Gap Analysis"    │
    │  (Step 1)          │
    │                    │
    │  Empty form! 🤔    │
    └────────────────────┘

         USER CONFUSION:
         "Dashboard said Step 2,
          why am I seeing Step 1?"
```

## State Lifecycle

### Initial State (Seed Data)

```
Projects Store          Planning Machine State
─────────────          ────────────────────────
currentStep: 2         (not initialized yet)
```

### First Visit to /dashboard

```
Dashboard reads Projects Store
↓
Shows "Step 2 · Business Goals"
```

### User Clicks Project Card

```
Navigate to /project/seed-0002/build
↓
PlanningMachineProvider mounts
↓
Checks localStorage for 'planning-machine-seed-0002'
↓
Not found (first time)
↓
Creates new machine with input: { projectId, entryPath }
↓
Machine initializes: currentStepNumber = 1, value = 'step1...'
↓
Saves to localStorage
↓
Renders Step 1 UI
```

### The Mismatch

```
Dashboard Display          Build Page Reality
─────────────────          ───────────────────
Project.currentStep: 2     machine.context.currentStepNumber: 1
"Step 2 · Business Goals"  "Gap Analysis" (Step 1)
```

## Why Synchronization Doesn't Exist

### Projects Store Updates

```typescript
// src/features/projects/store.ts

export function createProject(input): Project {
  // ...
  currentStep: 1,  // ← Set once at creation
  // ...
}

export function updateProjectStatus(id, status): Project {
  // ...
  status,  // ← Only updates status
  // ...
  // NO UPDATE TO currentStep
}

// NO FUNCTION EXISTS TO UPDATE currentStep
```

### Planning Machine Updates

```typescript
// src/features/planning/machines/planningMachine.ts

// Step completion updates currentStepNumber:
actions: assign({ 
  currentStepNumber: 2,  // ← Updates machine context
  // ...
})

// But doesn't call any project store update function
```

## Data Sources by Component

```
┌──────────────────────┬────────────────────────┬─────────────────┐
│ Component            │ Reads From             │ Shows           │
├──────────────────────┼────────────────────────┼─────────────────┤
│ Dashboard            │ Projects Store         │ Step 2          │
│ → ProjectList        │ Project.currentStep    │                 │
│   → ProjectCard      │                        │                 │
├──────────────────────┼────────────────────────┼─────────────────┤
│ Build Page           │ Planning Machine       │ Step 1          │
│ → Navigation         │ (localStorage)         │                 │
│ → StepContainer      │ context.currentStep    │                 │
│                      │ Number                 │                 │
└──────────────────────┴────────────────────────┴─────────────────┘
```

## Solution: Single Source of Truth

```
┌─────────────────────────────────────────────────────────────────┐
│                     PROPOSED FIX                                 │
└─────────────────────────────────────────────────────────────────┘

    Dashboard reads Planning Machine state directly
              (instead of Project.currentStep)

    ┌────────────────────┐
    │   /dashboard       │
    │                    │
    │  ProjectCard       │
    │    ↓               │
    │  loadPlanningState │
    │  (localStorage)    │
    │    ↓               │
    │  Shows:            │
    │  "Step 1 ·         │ ← Now accurate!
    │   Gap Analysis"    │
    └────────────────────┘
                │
                ▼
    ┌────────────────────┐
    │  /project/         │
    │   seed-0002/build  │
    │                    │
    │  Shows:            │
    │  "Gap Analysis"    │ ← Matches!
    │  (Step 1)          │
    └────────────────────┘

         ✅ NO CONFUSION
```
