# Bug #002: Enterprise-Grade Solution

**Date:** 2026-05-12  
**Author:** System Architect  
**Status:** Proposed

## Executive Summary

The current architecture has **two unsynced sources of truth** for project state, causing display inconsistencies. An enterprise-grade solution requires:

1. **Single source of truth** - Server-side persistent storage
2. **Durable state** - Database-backed, survives restarts
3. **Consistency guarantees** - ACID transactions
4. **Audit trail** - Track all state changes
5. **Scalability** - Works in distributed/serverless environments
6. **Type safety** - End-to-end TypeScript types

## Current Architecture Problems

### Critical Issues

```
❌ In-memory Map loses data on restart
❌ localStorage is client-side only (not shared across devices)
❌ No synchronization between Project.currentStep and machine state
❌ Seed data can create invalid states
❌ No audit trail of state changes
❌ No way to recover from corrupted state
❌ Testing requires complex mocking
```

### Non-Enterprise Characteristics

| Requirement | Current State | Issue |
|------------|---------------|-------|
| **Durability** | In-memory Map | Lost on restart |
| **Consistency** | Two sources of truth | Data conflicts |
| **Availability** | Client localStorage | Lost on device switch |
| **Scalability** | Process-local | Doesn't work in serverless |
| **Auditability** | None | No change history |
| **Recoverability** | None | Corrupted state unrecoverable |

## Proposed Enterprise Architecture

### Architecture Principles

1. **Server is the source of truth**
2. **Client is a view layer with optimistic updates**
3. **State changes are commands, not direct mutations**
4. **All transitions are audited**
5. **State is eventually consistent with rollback**

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐            ┌──────────────────┐            │
│  │   Dashboard     │            │   Build Page     │            │
│  │                 │            │                  │            │
│  │  Displays:      │            │  XState Machine  │            │
│  │  - currentStep  │            │  (client-side)   │            │
│  │  - step label   │            │                  │            │
│  └────────┬────────┘            └─────────┬────────┘            │
│           │                               │                     │
│           └───────────┬───────────────────┘                     │
│                       │                                         │
│                       ▼                                         │
│           ┌─────────────────────┐                               │
│           │  React Query Cache  │                               │
│           │  (Tanstack Query)   │                               │
│           └──────────┬──────────┘                               │
│                      │                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │ HTTP/WebSocket
                       │
┌──────────────────────┼──────────────────────────────────────────┐
│                      ▼           SERVER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API Layer (tRPC/REST)                  │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  GET  /api/projects/:id          → getProject()          │   │
│  │  GET  /api/projects/:id/state    → getProjectState()     │   │
│  │  POST /api/projects/:id/answer   → submitAnswer()        │   │
│  │  POST /api/projects/:id/complete → completeStep()        │   │
│  │  PUT  /api/projects/:id/state    → syncMachineState()    │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────┴─────────────────────────────────┐   │
│  │              Application Services Layer                   │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  • ProjectService                                         │   │
│  │    - createProject()                                      │   │
│  │    - getProjectWithState()                                │   │
│  │    - transitionToStep()                                   │   │
│  │                                                           │   │
│  │  • StateMachineService                                    │   │
│  │    - validateTransition()                                 │   │
│  │    - applyTransition()                                    │   │
│  │    - getAvailableTransitions()                            │   │
│  │                                                           │   │
│  │  • EventService                                           │   │
│  │    - recordEvent()                                        │   │
│  │    - getEventHistory()                                    │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────┴─────────────────────────────────┐   │
│  │                 Domain Layer                              │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  ProjectAggregate (Encapsulates all business logic)      │   │
│  │    - State validation                                     │   │
│  │    - Transition rules                                     │   │
│  │    - Invariants enforcement                               │   │
│  │    - Domain events emission                               │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────┴─────────────────────────────────┐   │
│  │              Persistence Layer                            │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │   │
│  │  │  PostgreSQL  │    │  Redis Cache │    │  S3/Blob  │  │   │
│  │  │              │    │              │    │  Storage  │  │   │
│  │  │  - projects  │    │  - hot state │    │  - docs   │  │   │
│  │  │  - snapshots │    │  - sessions  │    │  - files  │  │   │
│  │  │  - events    │    │              │    │           │  │   │
│  │  └──────────────┘    └──────────────┘    └───────────┘  │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

```sql
-- ═══════════════════════════════════════════════════════════════
-- TABLE: projects
-- Purpose: Core project metadata and current state
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE projects (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('active', 'archived', 'complete')),
  entry_path            TEXT NOT NULL CHECK (entry_path IN ('scratch', 'doc-first')),
  
  -- Single source of truth for current step
  current_step_number   INTEGER NOT NULL CHECK (current_step_number BETWEEN 1 AND 10),
  
  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            TEXT,
  
  -- Optimistic locking
  version               INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_projects_status ON projects(status, updated_at DESC);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: project_machine_snapshots
-- Purpose: Full XState machine state for resumption
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE project_machine_snapshots (
  project_id            TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  
  -- XState snapshot (full serialized state)
  state_value           JSONB NOT NULL,
  context               JSONB NOT NULL,
  
  -- Derived fields for querying (denormalized from context)
  current_step_number   INTEGER NOT NULL,
  step_statuses         JSONB NOT NULL, -- Map of step numbers to status
  
  -- Metadata
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Checksum for integrity verification
  checksum              TEXT NOT NULL
);

CREATE INDEX idx_snapshots_updated ON project_machine_snapshots(updated_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: project_state_events
-- Purpose: Audit log of all state transitions
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE project_state_events (
  id                    BIGSERIAL PRIMARY KEY,
  project_id            TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Event metadata
  event_type            TEXT NOT NULL, -- 'STEP_STARTED', 'ANSWER_SUBMITTED', 'STEP_COMPLETED', etc.
  event_version         TEXT NOT NULL DEFAULT '1.0',
  
  -- State transition
  from_step             INTEGER,
  to_step               INTEGER,
  
  -- Event payload (answers, artifacts, etc.)
  payload               JSONB NOT NULL,
  
  -- Audit fields
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id               TEXT,
  session_id            TEXT,
  
  -- Causality tracking
  correlation_id        TEXT,
  causation_id          TEXT
);

CREATE INDEX idx_events_project ON project_state_events(project_id, created_at DESC);
CREATE INDEX idx_events_type ON project_state_events(event_type, created_at DESC);
CREATE INDEX idx_events_correlation ON project_state_events(correlation_id);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: project_step_data
-- Purpose: Step-specific data (answers, artifacts)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE project_step_data (
  project_id            TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_number           INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 10),
  
  -- Step data
  answers               JSONB NOT NULL DEFAULT '[]',
  artifact              TEXT,
  artifact_type         TEXT CHECK (artifact_type IN ('markdown', 'yaml', 'json')),
  
  -- Status tracking
  status                TEXT NOT NULL CHECK (status IN ('pending', 'now', 'complete')),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  
  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (project_id, step_number)
);

CREATE INDEX idx_step_data_status ON project_step_data(project_id, status);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Update projects.updated_at on any change
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_step_data_updated_at
  BEFORE UPDATE ON project_step_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Ensure current_step_number consistency
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION sync_current_step_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Update projects table when snapshot changes
  UPDATE projects
  SET current_step_number = NEW.current_step_number,
      version = version + 1
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_project_current_step
  AFTER INSERT OR UPDATE ON project_machine_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION sync_current_step_number();
```

## TypeScript Domain Model

```typescript
// ═══════════════════════════════════════════════════════════════
// domain/project.ts - Core domain types
// ═══════════════════════════════════════════════════════════════

export type ProjectStatus = 'active' | 'archived' | 'complete';
export type EntryPath = 'scratch' | 'doc-first';
export type StepStatus = 'pending' | 'now' | 'complete';

export interface Project {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  entryPath: EntryPath;
  currentStepNumber: number; // 1-10
  createdAt: Date;
  updatedAt: Date;
  version: number; // For optimistic locking
}

export interface ProjectWithState extends Project {
  machineSnapshot: MachineSnapshot;
  stepData: StepData[];
  recentEvents: ProjectStateEvent[];
}

export interface MachineSnapshot {
  projectId: string;
  stateValue: string | Record<string, any>;
  context: PlanningContext;
  currentStepNumber: number;
  stepStatuses: Record<number, StepStatus>;
  updatedAt: Date;
  checksum: string;
}

export interface StepData {
  projectId: string;
  stepNumber: number;
  answers: Answer[];
  artifact: string | null;
  artifactType: 'markdown' | 'yaml' | 'json' | null;
  status: StepStatus;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface ProjectStateEvent {
  id: string;
  projectId: string;
  eventType: EventType;
  fromStep: number | null;
  toStep: number | null;
  payload: Record<string, unknown>;
  createdAt: Date;
  userId: string | null;
  correlationId: string;
}

export type EventType =
  | 'PROJECT_CREATED'
  | 'STEP_STARTED'
  | 'ANSWER_SUBMITTED'
  | 'STEP_COMPLETED'
  | 'ARTIFACT_GENERATED'
  | 'STATE_SYNCED';

// ═══════════════════════════════════════════════════════════════
// domain/commands.ts - Command pattern for state changes
// ═══════════════════════════════════════════════════════════════

export interface Command {
  type: string;
  projectId: string;
  correlationId: string;
  timestamp: Date;
}

export interface CreateProjectCommand extends Command {
  type: 'CREATE_PROJECT';
  name: string;
  entryPath: EntryPath;
}

export interface SubmitAnswerCommand extends Command {
  type: 'SUBMIT_ANSWER';
  stepNumber: number;
  question: string;
  answer: string;
}

export interface CompleteStepCommand extends Command {
  type: 'COMPLETE_STEP';
  stepNumber: number;
}

export interface SyncMachineStateCommand extends Command {
  type: 'SYNC_MACHINE_STATE';
  snapshot: MachineSnapshot;
}

// ═══════════════════════════════════════════════════════════════
// services/project-service.ts - Application service
// ═══════════════════════════════════════════════════════════════

export class ProjectService {
  constructor(
    private db: Database,
    private eventService: EventService,
    private cache: CacheService
  ) {}

  /**
   * Get project with full state (cached)
   */
  async getProjectWithState(projectId: string): Promise<ProjectWithState> {
    // Try cache first
    const cached = await this.cache.get(`project:${projectId}`);
    if (cached) return cached;

    // Load from database
    const project = await this.db.projects.findById(projectId);
    const snapshot = await this.db.snapshots.findByProjectId(projectId);
    const stepData = await this.db.stepData.findByProjectId(projectId);
    const events = await this.db.events.findRecent(projectId, 10);

    const result: ProjectWithState = {
      ...project,
      machineSnapshot: snapshot,
      stepData,
      recentEvents: events,
    };

    // Cache for 5 minutes
    await this.cache.set(`project:${projectId}`, result, 300);

    return result;
  }

  /**
   * Submit answer and update state
   */
  async submitAnswer(command: SubmitAnswerCommand): Promise<ProjectWithState> {
    return this.db.transaction(async (tx) => {
      // 1. Load current state with row lock
      const project = await tx.projects.findByIdForUpdate(command.projectId);
      const snapshot = await tx.snapshots.findByProjectIdForUpdate(command.projectId);

      // 2. Validate transition
      if (snapshot.currentStepNumber !== command.stepNumber) {
        throw new InvalidTransitionError(
          `Cannot submit answer for step ${command.stepNumber}, currently on step ${snapshot.currentStepNumber}`
        );
      }

      // 3. Apply state change
      const newSnapshot = this.applyAnswer(snapshot, command);

      // 4. Persist changes
      await tx.stepData.addAnswer(command.projectId, command.stepNumber, {
        question: command.question,
        value: command.answer,
        submittedAt: new Date(),
      });

      await tx.snapshots.update(command.projectId, newSnapshot);

      // 5. Record event
      await this.eventService.record({
        projectId: command.projectId,
        eventType: 'ANSWER_SUBMITTED',
        fromStep: command.stepNumber,
        toStep: command.stepNumber,
        payload: {
          question: command.question,
          answer: command.answer,
        },
        correlationId: command.correlationId,
      });

      // 6. Invalidate cache
      await this.cache.delete(`project:${command.projectId}`);

      // 7. Return updated state
      return this.getProjectWithState(command.projectId);
    });
  }

  /**
   * Complete step and transition to next
   */
  async completeStep(command: CompleteStepCommand): Promise<ProjectWithState> {
    return this.db.transaction(async (tx) => {
      const snapshot = await tx.snapshots.findByProjectIdForUpdate(command.projectId);

      // Validate can complete
      if (snapshot.currentStepNumber !== command.stepNumber) {
        throw new InvalidTransitionError(
          `Cannot complete step ${command.stepNumber}, currently on step ${snapshot.currentStepNumber}`
        );
      }

      // Apply transition
      const newSnapshot = this.completeStepTransition(snapshot, command.stepNumber);

      // Update database
      await tx.stepData.markComplete(command.projectId, command.stepNumber);
      if (command.stepNumber < 10) {
        await tx.stepData.markAsNow(command.projectId, command.stepNumber + 1);
      }
      await tx.snapshots.update(command.projectId, newSnapshot);

      // Record event
      await this.eventService.record({
        projectId: command.projectId,
        eventType: 'STEP_COMPLETED',
        fromStep: command.stepNumber,
        toStep: command.stepNumber + 1,
        payload: { completedAt: new Date() },
        correlationId: command.correlationId,
      });

      await this.cache.delete(`project:${command.projectId}`);

      return this.getProjectWithState(command.projectId);
    });
  }

  /**
   * Sync client machine state to server (periodic sync)
   */
  async syncMachineState(command: SyncMachineStateCommand): Promise<void> {
    const { projectId, snapshot } = command;

    // Verify checksum
    const computedChecksum = this.computeChecksum(snapshot);
    if (computedChecksum !== snapshot.checksum) {
      throw new InvalidChecksumError('Snapshot checksum mismatch');
    }

    await this.db.snapshots.upsert(projectId, snapshot);

    await this.eventService.record({
      projectId,
      eventType: 'STATE_SYNCED',
      fromStep: null,
      toStep: snapshot.currentStepNumber,
      payload: { syncedAt: new Date() },
      correlationId: command.correlationId,
    });

    await this.cache.delete(`project:${projectId}`);
  }

  private computeChecksum(snapshot: MachineSnapshot): string {
    // SHA-256 of canonical JSON
    const canonical = JSON.stringify(
      { stateValue: snapshot.stateValue, context: snapshot.context },
      Object.keys({ stateValue: null, context: null }).sort()
    );
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }
}
```

## Client-Side Integration

```typescript
// ═══════════════════════════════════════════════════════════════
// hooks/useProjectState.ts - React Query integration
// ═══════════════════════════════════════════════════════════════

export function useProjectState(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'state'],
    queryFn: () => apiClient.projects.getWithState(projectId),
    staleTime: 30_000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cmd: SubmitAnswerCommand) => 
      apiClient.projects.submitAnswer(cmd),
    
    onMutate: async (cmd) => {
      // Optimistic update
      await queryClient.cancelQueries(['project', cmd.projectId, 'state']);
      
      const previous = queryClient.getQueryData(['project', cmd.projectId, 'state']);
      
      queryClient.setQueryData(['project', cmd.projectId, 'state'], (old: any) => {
        return {
          ...old,
          stepData: old.stepData.map((step: any) =>
            step.stepNumber === cmd.stepNumber
              ? {
                  ...step,
                  answers: [...step.answers, { question: cmd.question, value: cmd.answer }],
                }
              : step
          ),
        };
      });

      return { previous };
    },

    onError: (err, cmd, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ['project', cmd.projectId, 'state'],
        context?.previous
      );
    },

    onSettled: (data, err, cmd) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries(['project', cmd.projectId, 'state']);
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// components/ProjectCard.tsx - Updated to use server state
// ═══════════════════════════════════════════════════════════════

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  // Now reads from server-synced Project.currentStepNumber
  // which is kept in sync with machine state via DB trigger
  
  return (
    <Card onClick={onClick}>
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <CardDescription>
          {project.code} · {relativeTime(project.updatedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <span className="text-xs text-fg-3">
          Step {project.currentStepNumber} · {STEP_LABELS[project.currentStepNumber]}
        </span>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// machines/PlanningMachineContext.tsx - Updated for server sync
// ═══════════════════════════════════════════════════════════════

export function PlanningMachineProvider({ projectId, children }: Props) {
  const { data: projectState } = useProjectState(projectId);
  const syncMutation = useSyncMachineState();

  const [actor] = useState(() => {
    // Initialize from server state, not localStorage
    const initialSnapshot = projectState?.machineSnapshot;
    
    return createActor(planningMachine, {
      input: { projectId, entryPath: projectState?.entryPath },
      snapshot: initialSnapshot,
    });
  });

  // Sync to server every 10 seconds or on state change
  useEffect(() => {
    const subscription = actor.subscribe((snapshot) => {
      const snapshotWithChecksum = addChecksum(snapshot);
      
      // Debounced sync
      syncMutation.mutate({
        type: 'SYNC_MACHINE_STATE',
        projectId,
        snapshot: snapshotWithChecksum,
        correlationId: nanoid(),
        timestamp: new Date(),
      });
    });

    return () => subscription.unsubscribe();
  }, [actor, projectId]);

  return (
    <PlanningMachineContext.Provider value={{ actor }}>
      {children}
    </PlanningMachineContext.Provider>
  );
}
```

## Migration Strategy

### Phase 1: Add Database Layer (Non-Breaking)

```bash
# Week 1: Infrastructure
1. Set up PostgreSQL database
2. Create schema (tables, indexes, triggers)
3. Add database connection pool
4. Implement repository pattern
```

### Phase 2: Parallel Run (Dual Write)

```bash
# Week 2-3: Dual write to both old and new systems
1. Write to both in-memory store AND database
2. Read from database, fallback to in-memory
3. Compare results, log discrepancies
4. Fix data consistency issues
```

### Phase 3: Migrate Existing Data

```bash
# Week 3: Data migration
1. Export localStorage snapshots from active users
2. Migrate seed data to database
3. Backfill project_state_events from logs
4. Verify data integrity
```

### Phase 4: Flip to Database (Breaking)

```bash
# Week 4: Cut over
1. Switch read path to database-first
2. Remove in-memory store
3. Remove localStorage persistence
4. Monitor performance
```

### Phase 5: Cleanup

```bash
# Week 5: Remove legacy code
1. Delete old store files
2. Update tests
3. Remove backward compatibility code
```

## Monitoring & Observability

### Key Metrics

```typescript
// Metrics to track
export const metrics = {
  // Latency
  'project.state.read.duration': histogram,
  'project.state.write.duration': histogram,
  
  // Throughput
  'project.state.reads': counter,
  'project.state.writes': counter,
  
  // Errors
  'project.state.conflicts': counter,
  'project.state.sync.failures': counter,
  
  // Business metrics
  'projects.step.completions': counter,
  'projects.step.duration': histogram,
};
```

### Logging

```typescript
// Structured logging
logger.info('project.state.transition', {
  projectId,
  fromStep,
  toStep,
  duration: transitionTime,
  userId,
  correlationId,
});
```

### Alerting

```yaml
alerts:
  - name: HighStateConflictRate
    condition: rate(project.state.conflicts) > 0.05
    severity: warning
    
  - name: StateSyncFailures
    condition: rate(project.state.sync.failures) > 0.01
    severity: critical
    
  - name: SlowStateReads
    condition: p95(project.state.read.duration) > 500ms
    severity: warning
```

## Testing Strategy

### Unit Tests

```typescript
describe('ProjectService.submitAnswer', () => {
  it('should update state and record event', async () => {
    const service = new ProjectService(mockDb, mockEvents, mockCache);
    
    const result = await service.submitAnswer({
      type: 'SUBMIT_ANSWER',
      projectId: 'test-1',
      stepNumber: 1,
      question: 'Test?',
      answer: 'Yes',
      correlationId: 'corr-1',
      timestamp: new Date(),
    });

    expect(result.stepData[0].answers).toHaveLength(1);
    expect(mockEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'ANSWER_SUBMITTED' })
    );
  });

  it('should reject invalid transitions', async () => {
    await expect(
      service.submitAnswer({
        projectId: 'test-1',
        stepNumber: 5, // but currently on step 1
        // ...
      })
    ).rejects.toThrow(InvalidTransitionError);
  });
});
```

### Integration Tests

```typescript
describe('State Synchronization', () => {
  it('should maintain consistency between client and server', async () => {
    // 1. Create project on server
    const project = await apiClient.projects.create({ name: 'test', entryPath: 'scratch' });
    
    // 2. Load in client machine
    const actor = createActor(planningMachine, {
      input: { projectId: project.id, entryPath: 'scratch' },
    });
    actor.start();
    
    // 3. Make local transition
    actor.send({ type: 'SUBMIT', answer: 'test answer' });
    
    // 4. Sync to server
    await syncMachineState(actor.getSnapshot());
    
    // 5. Verify server state matches
    const serverState = await apiClient.projects.getWithState(project.id);
    expect(serverState.machineSnapshot.context).toEqual(
      actor.getSnapshot().context
    );
  });
});
```

### Load Tests

```typescript
// Simulate 1000 concurrent users updating project state
import { check } from 'k6';
import http from 'k6/http';

export default function() {
  const projectId = 'test-project-1';
  const res = http.post(`/api/projects/${projectId}/answer`, {
    stepNumber: 1,
    question: 'Test question',
    answer: 'Test answer',
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## Performance Considerations

### Database Optimization

```sql
-- Materialized view for dashboard (fast reads)
CREATE MATERIALIZED VIEW dashboard_projects AS
SELECT 
  p.id,
  p.code,
  p.name,
  p.status,
  p.current_step_number,
  p.updated_at,
  COUNT(DISTINCT e.id) as event_count,
  MAX(e.created_at) as last_activity
FROM projects p
LEFT JOIN project_state_events e ON e.project_id = p.id
GROUP BY p.id;

CREATE UNIQUE INDEX ON dashboard_projects(id);

-- Refresh every minute
CREATE OR REPLACE FUNCTION refresh_dashboard_projects()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_projects;
END;
$$ LANGUAGE plpgsql;
```

### Caching Strategy

```typescript
// Multi-tier cache
export class CacheService {
  // L1: In-memory (fastest, 60s TTL)
  private l1Cache = new LRUCache({ max: 1000, ttl: 60_000 });
  
  // L2: Redis (fast, 5min TTL)
  private redis: Redis;
  
  async get(key: string): Promise<any> {
    // Try L1 first
    let value = this.l1Cache.get(key);
    if (value) return value;
    
    // Try L2
    value = await this.redis.get(key);
    if (value) {
      this.l1Cache.set(key, value);
      return value;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl: number): Promise<void> {
    this.l1Cache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

## Security Considerations

### Authorization

```typescript
// Row-level security in PostgreSQL
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select_policy ON projects
  FOR SELECT
  USING (
    -- User can see projects they own or are team members of
    id IN (
      SELECT project_id FROM project_members WHERE user_id = current_user_id()
    )
  );

CREATE POLICY projects_update_policy ON projects
  FOR UPDATE
  USING (
    id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = current_user_id() AND role IN ('owner', 'editor')
    )
  );
```

### Input Validation

```typescript
// Zod schemas for all commands
export const SubmitAnswerCommandSchema = z.object({
  type: z.literal('SUBMIT_ANSWER'),
  projectId: z.string().uuid(),
  stepNumber: z.number().int().min(1).max(10),
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(10000),
  correlationId: z.string().uuid(),
  timestamp: z.date(),
});
```

### Audit Trail

```typescript
// Every state change is logged with full context
await auditLog.record({
  action: 'PROJECT_STATE_CHANGE',
  resource: { type: 'project', id: projectId },
  actor: { userId, sessionId, ipAddress },
  changes: { from: oldState, to: newState },
  timestamp: new Date(),
});
```

## Cost Analysis

### Infrastructure Costs (AWS/Vercel)

```
Database (RDS PostgreSQL):
  - Instance: db.t4g.medium (2 vCPU, 4GB RAM)
  - Storage: 100GB SSD
  - Cost: ~$100/month

Cache (ElastiCache Redis):
  - Instance: cache.t4g.micro
  - Cost: ~$15/month

Monitoring (Datadog/New Relic):
  - Cost: ~$50/month

Total: ~$165/month for MVP scale (up to 10K users)
```

### Scalability Projections

```
Users          DB Size    QPS      Monthly Cost
─────────────────────────────────────────────────
1K users       1GB        100      $165
10K users      10GB       1K       $300
100K users     100GB      10K      $1,200
1M users       1TB        100K     $5,000
```

## Summary: Why This Is Enterprise-Grade

✅ **Single source of truth** - Database is authoritative  
✅ **Durable** - Survives restarts, works across devices  
✅ **Consistent** - ACID transactions prevent conflicts  
✅ **Auditable** - Full event log of all changes  
✅ **Scalable** - Works in distributed/serverless  
✅ **Performant** - Multi-tier caching, optimized queries  
✅ **Secure** - Row-level security, input validation  
✅ **Observable** - Metrics, logging, alerting  
✅ **Testable** - Unit, integration, load tests  
✅ **Recoverable** - Point-in-time recovery from events  
✅ **Type-safe** - End-to-end TypeScript  
✅ **Maintainable** - Clean architecture, clear boundaries  

## Next Steps

1. **Review & approval** - Stakeholder sign-off on architecture
2. **Spike work** - Proof of concept for critical paths (1 week)
3. **Implementation** - Follow migration strategy (5 weeks)
4. **Testing** - Comprehensive test suite
5. **Rollout** - Gradual rollout with monitoring
6. **Documentation** - API docs, runbooks, troubleshooting guides
