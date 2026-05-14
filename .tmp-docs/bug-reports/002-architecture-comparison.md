# Architecture Comparison: Current vs. Enterprise

## High-Level Comparison

| Aspect | Current Architecture | Enterprise Solution |
|--------|---------------------|---------------------|
| **State Storage** | In-memory Map + localStorage | PostgreSQL + Redis cache |
| **Durability** | Lost on server restart | Persisted to disk |
| **Consistency** | Two unsynced sources of truth | Single source of truth |
| **Scalability** | Process-local, doesn't scale | Distributed, serverless-ready |
| **Audit Trail** | None | Full event log |
| **Recovery** | Impossible | Point-in-time recovery |
| **Multi-device** | localStorage per device | Synced across all devices |
| **Testing** | Complex mocks required | Easy to test |
| **Observability** | Console logs only | Metrics, traces, alerts |
| **Security** | None | Row-level security, auth |

## Data Flow Comparison

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                               │
│              "Submit answer on Step 1"                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────┐
         │   XState Machine          │
         │   (client-side)           │
         │                           │
         │   Updates context         │
         │   Stores in localStorage  │
         └───────────────────────────┘
                         │
                         │  NO SYNC
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────┐           ┌─────────────────┐
│  localStorage   │           │  In-memory Map  │
│  (client only)  │           │  (server only)  │
├─────────────────┤           ├─────────────────┤
│ Planning state  │    ✗      │ Project state   │
│ currentStep: 1  │   NO SYNC │ currentStep: 2  │
│                 │           │                 │
│ Lost on device  │           │ Lost on restart │
│ switch          │           │                 │
└─────────────────┘           └─────────────────┘
         │                               │
         │                               │
    READ BY:                        READ BY:
         │                               │
         ▼                               ▼
┌─────────────────┐           ┌─────────────────┐
│  Build Page     │           │  Dashboard      │
│  Shows: Step 1  │           │  Shows: Step 2  │
└─────────────────┘           └─────────────────┘

RESULT: User sees conflicting information
```

### Enterprise Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                               │
│              "Submit answer on Step 1"                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────┐
         │   XState Machine          │
         │   (client-side)           │
         │                           │
         │   Optimistic update       │
         │   Send command to server  │
         └───────────┬───────────────┘
                     │
                     │ HTTP POST
                     │ /api/projects/:id/answer
                     │
                     ▼
         ┌───────────────────────────┐
         │   ProjectService          │
         │   (server-side)           │
         │                           │
         │   1. Validate             │
         │   2. Apply transition     │
         │   3. Record event         │
         └───────────┬───────────────┘
                     │
                     │ TRANSACTION
                     ▼
         ┌───────────────────────────┐
         │      PostgreSQL           │
         │   ┌─────────────────┐     │
         │   │  projects       │     │
         │   │  currentStep: 1 │←──┐ │
         │   └─────────────────┘   │ │
         │                         │ │
         │   ┌─────────────────┐   │ │
         │   │  snapshots      │   │ │
         │   │  currentStep: 1 │───┘ │  DB TRIGGER
         │   └─────────────────┘     │  KEEPS IN SYNC
         │                           │
         │   ┌─────────────────┐     │
         │   │  events         │     │
         │   │  ANSWER_SUBMITTED     │
         │   └─────────────────┐     │
         └───────────────────────────┘
                     │
                     │ CACHE UPDATE
                     ▼
         ┌───────────────────────────┐
         │   Redis Cache             │
         │   (5 min TTL)             │
         └───────────┬───────────────┘
                     │
         ┌───────────┴───────────────┐
         │                           │
    READ BY:                    READ BY:
         │                           │
         ▼                           ▼
┌─────────────────┐       ┌─────────────────┐
│  Build Page     │       │  Dashboard      │
│  Shows: Step 1  │       │  Shows: Step 1  │
└─────────────────┘       └─────────────────┘

RESULT: Consistent information everywhere
```

## Code Comparison

### Creating a Project

#### Current (In-Memory)

```typescript
// src/features/projects/store.ts
export function createProject(input: CreateProjectInput): Project {
  const project: Project = {
    id: nanoid(8),
    code: nextCode(),
    name: input.name,
    status: "active",
    entryPath: input.entryPath,
    currentStep: 1,  // ← Set here, never updated
    lastTouchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  
  // Store in process-local Map (lost on restart)
  store.set(project.id, project);
  
  return project;
}

// Planning machine state stored separately in localStorage
// No connection between the two
```

**Problems:**
- Data lost on restart
- No audit trail
- Can't query across projects
- No validation
- No error handling

#### Enterprise (Database)

```typescript
// services/project-service.ts
export class ProjectService {
  async createProject(command: CreateProjectCommand): Promise<ProjectWithState> {
    return this.db.transaction(async (tx) => {
      // 1. Create project
      const project = await tx.projects.insert({
        id: nanoid(),
        code: await this.generateCode(),
        name: command.name,
        status: 'active',
        entryPath: command.entryPath,
        currentStepNumber: 1,
        createdBy: command.userId,
        version: 1,
      });

      // 2. Initialize step data
      for (let step = 1; step <= 10; step++) {
        await tx.stepData.insert({
          projectId: project.id,
          stepNumber: step,
          status: step === 1 ? 'now' : 'pending',
          answers: [],
        });
      }

      // 3. Create initial machine snapshot
      const initialSnapshot = this.createInitialSnapshot(project);
      await tx.snapshots.insert({
        projectId: project.id,
        stateValue: initialSnapshot.stateValue,
        context: initialSnapshot.context,
        currentStepNumber: 1,
        checksum: this.computeChecksum(initialSnapshot),
      });

      // 4. Record creation event
      await this.eventService.record({
        projectId: project.id,
        eventType: 'PROJECT_CREATED',
        fromStep: null,
        toStep: 1,
        payload: { name: command.name, entryPath: command.entryPath },
        userId: command.userId,
        correlationId: command.correlationId,
      });

      return this.getProjectWithState(project.id);
    });
  }
}
```

**Benefits:**
- Atomic operation
- Full audit trail
- Queryable data
- Validation built-in
- Error handling via transactions

### Submitting an Answer

#### Current (Unsynced)

```typescript
// src/features/planning/store.ts
export function submitAnswer(
  projectId: string,
  stepNumber: number,
  question: string,
  answer: string,
): ProjectStepState {
  const state = getStepState(projectId);
  
  // No validation that stepNumber matches currentStep
  
  const stepAnswer: StepAnswer = {
    question,
    value: answer,
    submittedAt: new Date().toISOString(),
  };

  const updatedSteps = state.steps.map((s, i) => {
    if (s.stepNumber === stepNumber) {
      return {
        ...s,
        answers: [...(s.answers ?? []), stepAnswer],
      };
    }
    return s;
  });

  const updated = { ...state, steps: updatedSteps };
  store.set(projectId, updated);  // ← Only updates planning store
  
  // Project.currentStep in projects store is NEVER updated
  
  return updated;
}
```

**Problems:**
- No validation
- No atomicity
- State divergence
- Lost on restart
- No event log

#### Enterprise (Validated Transactions)

```typescript
// services/project-service.ts
async submitAnswer(command: SubmitAnswerCommand): Promise<ProjectWithState> {
  return this.db.transaction(async (tx) => {
    // 1. Lock rows for update (prevents race conditions)
    const project = await tx.projects.findByIdForUpdate(command.projectId);
    const snapshot = await tx.snapshots.findByProjectIdForUpdate(command.projectId);

    // 2. Validate transition is allowed
    if (snapshot.currentStepNumber !== command.stepNumber) {
      throw new InvalidTransitionError(
        `Cannot submit answer for step ${command.stepNumber}, currently on step ${snapshot.currentStepNumber}`
      );
    }

    // 3. Validate answer
    await this.validateAnswer(command);

    // 4. Apply state change
    const newContext = this.applyAnswer(snapshot.context, command);
    const newSnapshot = {
      ...snapshot,
      context: newContext,
      updatedAt: new Date(),
      checksum: this.computeChecksum(newContext),
    };

    // 5. Persist all changes atomically
    await tx.stepData.addAnswer(command.projectId, command.stepNumber, {
      question: command.question,
      value: command.answer,
      submittedAt: new Date(),
    });

    await tx.snapshots.update(command.projectId, newSnapshot);

    // Note: project.currentStepNumber updated automatically via DB trigger

    // 6. Record event for audit trail
    await this.eventService.record({
      projectId: command.projectId,
      eventType: 'ANSWER_SUBMITTED',
      fromStep: command.stepNumber,
      toStep: command.stepNumber,
      payload: { question: command.question, answer: command.answer },
      userId: command.userId,
      correlationId: command.correlationId,
    });

    // 7. Invalidate cache
    await this.cache.delete(`project:${command.projectId}`);

    // 8. Return updated state
    return this.getProjectWithState(command.projectId);
  });
}
```

**Benefits:**
- Full validation
- Atomic transaction
- Consistent state
- Event audit trail
- Race condition protection
- Cache invalidation
- Error rollback

### Reading Project State

#### Current (Two Different Paths)

```typescript
// Dashboard reads from projects store
const { data: projects } = useProjects();
// projects[0].currentStep = 2 (from seed data)

// Build page reads from localStorage
const [actor] = useState(() => {
  const persistedState = loadState(storageKey);
  return createActor(planningMachine, { snapshot: persistedState });
});
// actor.context.currentStepNumber = 1 (from machine state)

// Result: Mismatch!
```

#### Enterprise (Single Path)

```typescript
// Both dashboard and build page read from same source
const { data: projectState } = useProjectState(projectId);

// Dashboard
<span>Step {projectState.currentStepNumber}</span>

// Build page
const [actor] = useState(() => {
  return createActor(planningMachine, {
    snapshot: projectState.machineSnapshot,
  });
});

// Result: Always consistent!
```

## Failure Scenario Comparison

### Scenario: Server Restarts

#### Current Architecture

```
1. User submits answer on Step 1
2. State stored in in-memory Map
3. Server restarts (deploy, crash, etc.)
4. In-memory Map is empty
5. User returns to dashboard
6. Error: "Project not found"
7. Data lost permanently ❌
```

#### Enterprise Architecture

```
1. User submits answer on Step 1
2. Transaction commits to PostgreSQL
3. Server restarts (deploy, crash, etc.)
4. New server instance starts
5. User returns to dashboard
6. Data loaded from database
7. User continues working ✅
```

### Scenario: User Switches Devices

#### Current Architecture

```
1. User works on laptop, submits answers
2. State stored in laptop's localStorage
3. User opens project on phone
4. Phone has different localStorage
5. Planning machine initializes fresh at Step 1
6. User confused: "I was on Step 3!" ❌
```

#### Enterprise Architecture

```
1. User works on laptop, submits answers
2. State synced to database
3. User opens project on phone
4. Phone loads state from database
5. Planning machine resumes at Step 3
6. Seamless cross-device experience ✅
```

### Scenario: Concurrent Updates

#### Current Architecture

```
1. User A loads project (currentStep: 1)
2. User B loads same project (currentStep: 1)
3. User A completes Step 1 → localStorage says Step 2
4. User B completes Step 1 → localStorage says Step 2
5. Both think they completed Step 1
6. But step data may be corrupted
7. No conflict detection ❌
```

#### Enterprise Architecture

```
1. User A loads project (currentStep: 1, version: 1)
2. User B loads same project (currentStep: 1, version: 1)
3. User A completes Step 1
   → Transaction updates: currentStep = 2, version = 2
   → Success ✅
4. User B tries to complete Step 1
   → Transaction checks version
   → Version mismatch (expected 1, got 2)
   → Optimistic lock failure
   → User B gets error: "Project was updated, please refresh"
   → User B refreshes, sees Step 2
   → Conflict prevented ✅
```

## Performance Comparison

### Read Performance

#### Current Architecture

```
Dashboard read:
  - Access in-memory Map: ~0.01ms
  - Total: ~0.01ms ✅ (very fast)

Build page read:
  - Access localStorage: ~1ms
  - Parse JSON: ~0.5ms
  - Total: ~1.5ms ✅ (very fast)
```

#### Enterprise Architecture

```
Cold read (cache miss):
  - Query PostgreSQL: ~10-50ms
  - Parse response: ~1ms
  - Total: ~11-51ms ⚠️ (slower)

Warm read (cache hit - 90%+ of requests):
  - Check L1 cache (in-memory): ~0.01ms
  - Total: ~0.01ms ✅ (same as current)

Hot path optimization:
  - Use Redis cache: ~1-2ms
  - Refresh async in background
  - User sees cached data immediately
  - Total perceived: ~0.01ms ✅
```

### Write Performance

#### Current Architecture

```
Submit answer:
  - Update in-memory Map: ~0.01ms
  - Update localStorage: ~2ms
  - Total: ~2ms ✅ (very fast)

But:
  - Lost on restart ❌
  - No consistency ❌
  - No audit trail ❌
```

#### Enterprise Architecture

```
Submit answer (pessimistic):
  - Validate input: ~1ms
  - Database transaction:
    - SELECT FOR UPDATE: ~5ms
    - UPDATE snapshots: ~5ms
    - INSERT event: ~5ms
    - COMMIT: ~5ms
  - Cache invalidation: ~1ms
  - Total: ~22ms ⚠️ (slower)

But:
  - Durable ✅
  - Consistent ✅
  - Auditable ✅

Submit answer (optimistic):
  - Update React Query cache: ~0.01ms (instant UI)
  - Background: POST to server
  - Server responds: ~22ms
  - On error: rollback cache
  - Total perceived: ~0.01ms ✅ (feels instant)
```

## Cost Comparison

### Current Architecture

```
Infrastructure:
  - Vercel serverless: $20/month
  - No database needed: $0
  - No cache needed: $0
  - Total: $20/month

Operational:
  - No monitoring: $0
  - No backup: $0
  - No recovery: $0 (because impossible)
  - Total: $20/month
```

### Enterprise Architecture

```
Infrastructure (10K users):
  - Vercel serverless: $20/month
  - RDS PostgreSQL: $100/month
  - ElastiCache Redis: $15/month
  - Total: $135/month

Operational:
  - Monitoring (Datadog): $50/month
  - Backup (AWS): $10/month
  - Total: $195/month

Cost increase: $175/month
Cost per user: $0.0175/month
```

**ROI Analysis:**
- Prevents data loss incidents: Priceless
- Enables multi-device: Better UX
- Enables audit compliance: Required for enterprise
- Enables horizontal scaling: Required for growth

## Migration Complexity

### Current Architecture → Quick Fix

```
Effort: 1 week
Risk: Low

Changes:
1. Add utility to read from localStorage in ProjectCard
2. Fallback to Project.currentStep if not found
3. Test edge cases
4. Deploy

Pros:
- Minimal changes
- Low risk

Cons:
- Still using localStorage (client-only)
- Still can lose data
- Still not enterprise-grade
```

### Current Architecture → Enterprise Solution

```
Effort: 5 weeks
Risk: Medium

Week 1: Infrastructure
  - Set up PostgreSQL
  - Create schema
  - Add repositories

Week 2: Dual write
  - Write to both systems
  - Compare results
  - Fix discrepancies

Week 3: Migration
  - Migrate existing data
  - Backfill events
  - Verify integrity

Week 4: Cutover
  - Switch to database-first
  - Monitor performance
  - Fix issues

Week 5: Cleanup
  - Remove old code
  - Update tests
  - Documentation

Pros:
- Production-ready architecture
- Solves all problems
- Scales indefinitely

Cons:
- Higher initial cost
- More complex
- Longer timeline
```

## Recommendation

### For MVP / Proof of Concept
→ **Quick fix** (localStorage in ProjectCard)

### For Production / Enterprise
→ **Enterprise solution** (database-backed state)

### Decision Factors

| Factor | Quick Fix | Enterprise |
|--------|-----------|-----------|
| Time to market | ✅ 1 week | ⚠️ 5 weeks |
| Cost | ✅ $20/mo | ⚠️ $195/mo |
| Durability | ❌ Lost on restart | ✅ Persisted |
| Multi-device | ❌ No | ✅ Yes |
| Audit trail | ❌ No | ✅ Yes |
| Scalability | ❌ Process-local | ✅ Distributed |
| Enterprise-ready | ❌ No | ✅ Yes |
| Technical debt | ❌ High | ✅ None |

**If you're building a demo:** Quick fix  
**If you're building a product:** Enterprise solution
