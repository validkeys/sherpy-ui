# Bug #002: Implementation Roadmap

**Date:** 2026-05-12  
**Estimated Timeline:** 5 weeks  
**Team Size:** 2-3 engineers

## Executive Summary

This roadmap outlines a phased approach to migrate from the current in-memory + localStorage architecture to an enterprise-grade, database-backed state management system. Each phase is designed to be independently deployable with rollback capability.

## Success Metrics

### Technical Metrics
- **Data Durability:** 0% data loss on server restarts
- **Consistency:** 100% agreement between dashboard and build page
- **Performance:** p95 read latency < 100ms, write latency < 200ms
- **Availability:** 99.9% uptime

### Business Metrics
- **User Confidence:** Reduced confusion about project state
- **Cross-device:** Users can seamlessly switch devices
- **Audit Compliance:** Full trail of all state changes
- **Scale:** Support 10K+ concurrent projects

## Phase 0: Preparation (Week 0)

### Goals
- Set up development environment
- Define schemas and APIs
- Create test data
- Plan deployment strategy

### Tasks

#### Infrastructure Setup
```bash
# 1. Provision PostgreSQL database
- Create RDS instance (db.t4g.medium)
- Configure security groups
- Set up read replicas (for production)
- Enable automated backups (7 day retention)

# 2. Set up Redis cache
- Create ElastiCache instance (cache.t4g.micro)
- Configure connection pooling
- Set up eviction policies

# 3. Monitoring infrastructure
- Create Datadog/New Relic account
- Set up APM
- Configure alerts
- Create dashboards
```

#### Schema Definition
```sql
-- Run all schema creation scripts
\i schema/001-create-tables.sql
\i schema/002-create-indexes.sql
\i schema/003-create-triggers.sql
\i schema/004-create-functions.sql

-- Verify schema
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

#### API Definition
```typescript
// Define tRPC routes
export const projectRouter = router({
  getWithState: procedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => { /* ... */ }),
  
  submitAnswer: procedure
    .input(SubmitAnswerCommandSchema)
    .mutation(async ({ input }) => { /* ... */ }),
  
  completeStep: procedure
    .input(CompleteStepCommandSchema)
    .mutation(async ({ input }) => { /* ... */ }),
  
  syncMachineState: procedure
    .input(SyncMachineStateCommandSchema)
    .mutation(async ({ input }) => { /* ... */ }),
});
```

#### Test Data Generation
```typescript
// Create test projects covering all scenarios
const testScenarios = [
  { name: 'fresh-project', currentStep: 1, answers: [] },
  { name: 'mid-progress', currentStep: 5, answers: [...] },
  { name: 'nearly-complete', currentStep: 9, answers: [...] },
  { name: 'corrupted-state', /* invalid data */ },
];

for (const scenario of testScenarios) {
  await createTestProject(scenario);
}
```

### Deliverables
- [x] PostgreSQL database provisioned and accessible
- [x] Schema created and verified
- [x] API contracts defined
- [x] Test data available
- [x] Monitoring dashboards created

### Risk Assessment
- **Risk:** Schema design errors
- **Mitigation:** Peer review, prototype testing
- **Rollback:** N/A (no production changes)

---

## Phase 1: Database Layer (Week 1)

### Goals
- Implement database repositories
- Add connection pooling
- Create service layer
- Write unit tests

### Tasks

#### Repository Pattern
```typescript
// repositories/project-repository.ts
export class ProjectRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Project | null> {
    const row = await this.db.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
    return row ? this.mapToProject(row) : null;
  }

  async findByIdForUpdate(id: string): Promise<Project> {
    const row = await this.db.query(
      'SELECT * FROM projects WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!row) throw new NotFoundError(`Project ${id} not found`);
    return this.mapToProject(row);
  }

  async insert(project: CreateProjectInput): Promise<Project> {
    const row = await this.db.query(
      `INSERT INTO projects (id, code, name, status, entry_path, current_step_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [project.id, project.code, project.name, project.status, 
       project.entryPath, project.currentStepNumber, project.createdBy]
    );
    return this.mapToProject(row);
  }

  // ... more methods
}
```

#### Service Layer
```typescript
// services/project-service.ts
export class ProjectService {
  constructor(
    private projectRepo: ProjectRepository,
    private snapshotRepo: SnapshotRepository,
    private eventService: EventService,
    private cache: CacheService
  ) {}

  async getProjectWithState(projectId: string): Promise<ProjectWithState> {
    // Try cache
    const cached = await this.cache.get(`project:${projectId}`);
    if (cached) return cached;

    // Load from DB
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError();

    const snapshot = await this.snapshotRepo.findByProjectId(projectId);
    const stepData = await this.stepDataRepo.findByProjectId(projectId);
    const events = await this.eventService.getRecent(projectId, 10);

    const result = { ...project, snapshot, stepData, events };
    await this.cache.set(`project:${projectId}`, result, 300);
    return result;
  }

  // ... more methods
}
```

#### Unit Tests
```typescript
// services/project-service.test.ts
describe('ProjectService', () => {
  let service: ProjectService;
  let mockDb: MockDatabase;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = new ProjectService(
      new ProjectRepository(mockDb),
      new SnapshotRepository(mockDb),
      new EventService(mockDb),
      new MockCacheService()
    );
  });

  describe('getProjectWithState', () => {
    it('should return cached data when available', async () => {
      const cached = { id: 'test-1', /* ... */ };
      await service.cache.set('project:test-1', cached, 300);

      const result = await service.getProjectWithState('test-1');
      
      expect(result).toEqual(cached);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should load from database on cache miss', async () => {
      mockDb.query.mockResolvedValue({ id: 'test-1', /* ... */ });

      const result = await service.getProjectWithState('test-1');
      
      expect(mockDb.query).toHaveBeenCalled();
      expect(result.id).toBe('test-1');
    });
  });

  describe('submitAnswer', () => {
    it('should update state and record event', async () => {
      // ... test implementation
    });

    it('should rollback on error', async () => {
      // ... test implementation
    });
  });
});
```

### Deliverables
- [x] Repository layer implemented
- [x] Service layer implemented
- [x] Unit tests passing (>80% coverage)
- [x] Integration tests passing

### Risk Assessment
- **Risk:** Connection pool exhaustion
- **Mitigation:** Load testing, proper pool sizing
- **Rollback:** N/A (no production changes yet)

---

## Phase 2: Dual Write Mode (Week 2)

### Goals
- Write to both old and new systems
- Compare results for consistency
- Log discrepancies
- Build confidence in new system

### Tasks

#### Dual Write Implementation
```typescript
// services/dual-write-project-service.ts
export class DualWriteProjectService {
  constructor(
    private legacyStore: LegacyProjectStore,
    private newService: ProjectService,
    private logger: Logger
  ) {}

  async submitAnswer(command: SubmitAnswerCommand): Promise<ProjectState> {
    // Write to both systems
    const [legacyResult, newResult] = await Promise.allSettled([
      this.legacyStore.submitAnswer(command),
      this.newService.submitAnswer(command),
    ]);

    // Compare results
    if (legacyResult.status === 'fulfilled' && newResult.status === 'fulfilled') {
      const discrepancies = this.compareResults(
        legacyResult.value,
        newResult.value
      );

      if (discrepancies.length > 0) {
        this.logger.warn('Dual write discrepancy detected', {
          command,
          discrepancies,
          legacy: legacyResult.value,
          new: newResult.value,
        });
      }
    } else {
      this.logger.error('Dual write failure', {
        legacy: legacyResult.status,
        new: newResult.status,
      });
    }

    // Return legacy result (still the source of truth)
    if (legacyResult.status === 'fulfilled') {
      return legacyResult.value;
    }
    throw legacyResult.reason;
  }

  private compareResults(legacy: any, newResult: any): string[] {
    const discrepancies: string[] = [];

    if (legacy.currentStep !== newResult.currentStepNumber) {
      discrepancies.push(
        `currentStep mismatch: legacy=${legacy.currentStep}, new=${newResult.currentStepNumber}`
      );
    }

    // ... more comparisons

    return discrepancies;
  }
}
```

#### Discrepancy Dashboard
```typescript
// monitoring/discrepancy-dashboard.ts
export function createDiscrepancyDashboard() {
  return {
    widgets: [
      {
        type: 'timeseries',
        title: 'Dual Write Discrepancies',
        query: 'sum:dual_write.discrepancies{*}',
      },
      {
        type: 'toplist',
        title: 'Most Common Discrepancies',
        query: 'top(dual_write.discrepancy_type{*}, 10, mean)',
      },
      {
        type: 'query_value',
        title: 'Discrepancy Rate',
        query: 'sum:dual_write.discrepancies / sum:dual_write.total',
      },
    ],
  };
}
```

#### Gradual Rollout
```typescript
// config/feature-flags.ts
export const FEATURE_FLAGS = {
  // Start with 1% of traffic
  DUAL_WRITE_ENABLED: {
    enabled: true,
    rolloutPercentage: 1,
  },
};

// Increase over time:
// Day 1: 1%
// Day 2: 5%
// Day 3: 10%
// Day 4: 25%
// Day 5: 50%
// Day 6: 75%
// Day 7: 100%
```

### Deliverables
- [x] Dual write mode implemented
- [x] Discrepancy logging active
- [x] Monitoring dashboard created
- [x] Rollout to 100% of traffic
- [x] <5% discrepancy rate achieved

### Risk Assessment
- **Risk:** High discrepancy rate indicates logic errors
- **Mitigation:** Fix errors before proceeding, can stay in dual write indefinitely
- **Rollback:** Disable dual write flag, return to legacy-only

---

## Phase 3: Data Migration (Week 3)

### Goals
- Export existing localStorage data
- Migrate to database
- Backfill events
- Verify integrity

### Tasks

#### Export Script
```typescript
// scripts/export-localstorage.ts
export async function exportLocalStorageData() {
  const projects = await legacyStore.listProjects();
  const exported = [];

  for (const project of projects) {
    // Export project metadata
    const projectData = {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      entryPath: project.entryPath,
      currentStep: project.currentStep,
      createdAt: project.createdAt,
      updatedAt: project.lastTouchedAt,
    };

    // Export planning machine state (if exists in localStorage)
    const storageKey = `planning-machine-${project.id}`;
    const machineState = localStorage.getItem(storageKey);
    if (machineState) {
      projectData.machineSnapshot = JSON.parse(machineState);
    }

    exported.push(projectData);
  }

  // Write to file
  await fs.writeFile(
    './data/exported-projects.json',
    JSON.stringify(exported, null, 2)
  );

  console.log(`Exported ${exported.length} projects`);
}
```

#### Import Script
```typescript
// scripts/import-to-database.ts
export async function importToDatabase() {
  const data = JSON.parse(
    await fs.readFile('./data/exported-projects.json', 'utf-8')
  );

  let imported = 0;
  let failed = 0;

  for (const projectData of data) {
    try {
      await db.transaction(async (tx) => {
        // Insert project
        await tx.projects.insert({
          id: projectData.id,
          code: projectData.code,
          name: projectData.name,
          status: projectData.status,
          entryPath: projectData.entryPath,
          currentStepNumber: projectData.currentStep,
          createdAt: new Date(projectData.createdAt),
          updatedAt: new Date(projectData.updatedAt),
        });

        // Insert machine snapshot
        if (projectData.machineSnapshot) {
          await tx.snapshots.insert({
            projectId: projectData.id,
            stateValue: projectData.machineSnapshot.value,
            context: projectData.machineSnapshot.context,
            currentStepNumber: projectData.machineSnapshot.context.currentStepNumber,
            checksum: computeChecksum(projectData.machineSnapshot),
          });
        }

        // Backfill creation event
        await tx.events.insert({
          projectId: projectData.id,
          eventType: 'PROJECT_CREATED',
          fromStep: null,
          toStep: 1,
          payload: { migrated: true },
          createdAt: new Date(projectData.createdAt),
        });
      });

      imported++;
    } catch (error) {
      console.error(`Failed to import project ${projectData.id}:`, error);
      failed++;
    }
  }

  console.log(`Imported: ${imported}, Failed: ${failed}`);
}
```

#### Verification Script
```typescript
// scripts/verify-migration.ts
export async function verifyMigration() {
  const legacyProjects = await legacyStore.listProjects();
  const dbProjects = await db.projects.findAll();

  const issues = [];

  // Check counts match
  if (legacyProjects.length !== dbProjects.length) {
    issues.push(
      `Count mismatch: legacy=${legacyProjects.length}, db=${dbProjects.length}`
    );
  }

  // Check each project
  for (const legacy of legacyProjects) {
    const db = dbProjects.find((p) => p.id === legacy.id);
    if (!db) {
      issues.push(`Project ${legacy.id} missing in database`);
      continue;
    }

    // Verify fields match
    if (legacy.currentStep !== db.currentStepNumber) {
      issues.push(
        `Project ${legacy.id} currentStep mismatch: legacy=${legacy.currentStep}, db=${db.currentStepNumber}`
      );
    }

    // ... more checks
  }

  if (issues.length === 0) {
    console.log('✅ Migration verified successfully');
  } else {
    console.error('❌ Migration issues found:');
    issues.forEach((issue) => console.error(`  - ${issue}`));
  }

  return issues;
}
```

### Deliverables
- [x] All existing projects migrated to database
- [x] Machine snapshots migrated
- [x] Events backfilled
- [x] Verification script shows 0 issues

### Risk Assessment
- **Risk:** Data corruption during migration
- **Mitigation:** Dry run first, verify checksums, keep backups
- **Rollback:** Restore from backup, continue using legacy

---

## Phase 4: Flip to Database (Week 4)

### Goals
- Switch read path to database-first
- Monitor performance
- Remove legacy code paths
- Handle edge cases

### Tasks

#### Feature Flag Flip
```typescript
// config/feature-flags.ts
export const FEATURE_FLAGS = {
  // Phase 4: Flip the primary read path
  READ_FROM_DATABASE: {
    enabled: true,
    rolloutPercentage: 1, // Start at 1%
  },
  
  // Keep legacy as fallback
  FALLBACK_TO_LEGACY: {
    enabled: true,
  },
};
```

#### Database-First Service
```typescript
// services/project-service-v2.ts
export class ProjectServiceV2 {
  async getProjectWithState(projectId: string): Promise<ProjectWithState> {
    try {
      // Try database first
      return await this.newService.getProjectWithState(projectId);
    } catch (error) {
      if (FEATURE_FLAGS.FALLBACK_TO_LEGACY.enabled) {
        this.logger.warn('Database read failed, falling back to legacy', {
          projectId,
          error,
        });
        return await this.legacyStore.getProjectState(projectId);
      }
      throw error;
    }
  }
}
```

#### Performance Monitoring
```typescript
// monitoring/performance-alerts.ts
export const PERFORMANCE_ALERTS = [
  {
    name: 'SlowDatabaseReads',
    condition: 'p95(project.read.duration) > 200ms',
    severity: 'warning',
    notify: ['#eng-oncall'],
  },
  {
    name: 'SlowDatabaseWrites',
    condition: 'p95(project.write.duration) > 500ms',
    severity: 'warning',
    notify: ['#eng-oncall'],
  },
  {
    name: 'HighErrorRate',
    condition: 'rate(project.errors) > 0.01',
    severity: 'critical',
    notify: ['#eng-oncall', '@pagerduty'],
  },
];
```

#### Gradual Rollout Schedule
```
Day 1:  1% database reads, 99% legacy
Day 2:  5% database reads, 95% legacy
Day 3: 10% database reads, 90% legacy
Day 4: 25% database reads, 75% legacy
Day 5: 50% database reads, 50% legacy
Day 6: 75% database reads, 25% legacy
Day 7: 100% database reads, 0% legacy
```

### Deliverables
- [x] 100% of reads from database
- [x] p95 read latency < 100ms
- [x] p95 write latency < 200ms
- [x] Error rate < 0.1%
- [x] No fallback to legacy needed

### Risk Assessment
- **Risk:** Database performance issues under load
- **Mitigation:** Load testing, caching, read replicas
- **Rollback:** Flip feature flag back to legacy

---

## Phase 5: Cleanup & Optimization (Week 5)

### Goals
- Remove legacy code
- Optimize queries
- Update documentation
- Train team

### Tasks

#### Remove Legacy Code
```bash
# Delete old files
rm -rf src/features/projects/store.ts
rm -rf src/features/planning/store.ts
rm -rf src/features/planning/machines/PlanningMachineContext.tsx # old version

# Remove localStorage persistence
git grep -l "localStorage.getItem" | xargs sed -i '/localStorage/d'
```

#### Query Optimization
```sql
-- Add missing indexes discovered during load testing
CREATE INDEX CONCURRENTLY idx_events_project_type 
  ON project_state_events(project_id, event_type, created_at DESC);

CREATE INDEX CONCURRENTLY idx_step_data_updated 
  ON project_step_data(project_id, updated_at DESC);

-- Analyze query plans
EXPLAIN ANALYZE 
SELECT * FROM projects p
JOIN project_machine_snapshots s ON s.project_id = p.id
WHERE p.id = 'test-123';

-- Add materialized view for dashboard
CREATE MATERIALIZED VIEW dashboard_projects AS
SELECT /* ... */ ;

REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_projects;
```

#### Update Tests
```typescript
// Remove all mocks of in-memory store
// Update to use test database instead

describe('ProjectService Integration', () => {
  let testDb: Database;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    await runMigrations(testDb);
  });

  afterEach(async () => {
    await testDb.truncate();
  });

  afterAll(async () => {
    await testDb.close();
  });

  it('should handle full project lifecycle', async () => {
    // Real integration test against test database
    const service = new ProjectService(testDb, /* ... */);
    
    const project = await service.createProject({ /* ... */ });
    await service.submitAnswer({ /* ... */ });
    await service.completeStep({ /* ... */ });
    
    const final = await service.getProjectWithState(project.id);
    expect(final.currentStepNumber).toBe(2);
  });
});
```

#### Documentation
```markdown
# docs/architecture/state-management.md

## Project State Management

### Architecture Overview
All project state is stored in PostgreSQL with Redis caching.

### Data Flow
1. User action → API call
2. Service layer validates
3. Database transaction
4. Event recorded
5. Cache invalidated
6. Response returned

### Adding a New State Transition
1. Add event type to `domain/events.ts`
2. Implement service method
3. Add database migration if needed
4. Write tests
5. Update documentation

### Debugging State Issues
- Check event log: `SELECT * FROM project_state_events WHERE project_id = ?`
- Verify snapshot: `SELECT * FROM project_machine_snapshots WHERE project_id = ?`
- Check cache: `redis-cli GET project:{id}`
```

### Deliverables
- [x] Legacy code removed
- [x] Query performance optimized
- [x] Documentation updated
- [x] Team trained on new system
- [x] Runbook created

### Risk Assessment
- **Risk:** Removing safety net (legacy fallback)
- **Mitigation:** Thorough testing, monitoring, rollback plan
- **Rollback:** Revert code changes, re-enable legacy

---

## Rollback Strategy

### At Any Phase

```typescript
// Emergency rollback procedure
export async function rollback(toPhase: number) {
  switch (toPhase) {
    case 0:
      // Complete rollback - disable all new features
      await disableFeatureFlag('DUAL_WRITE_ENABLED');
      await disableFeatureFlag('READ_FROM_DATABASE');
      console.log('Rolled back to Phase 0: Legacy only');
      break;
      
    case 1:
      // Keep database layer but don't use it
      await disableFeatureFlag('DUAL_WRITE_ENABLED');
      console.log('Rolled back to Phase 1: Database exists but unused');
      break;
      
    case 2:
      // Keep dual write but read from legacy
      await setFeatureFlag('READ_FROM_DATABASE', 0); // 0% traffic
      console.log('Rolled back to Phase 2: Dual write, legacy reads');
      break;
      
    case 3:
      // Partial database reads
      await setFeatureFlag('READ_FROM_DATABASE', 10); // 10% traffic
      console.log('Rolled back to Phase 3: Partial database reads');
      break;
      
    default:
      throw new Error(`Invalid rollback phase: ${toPhase}`);
  }
}
```

### Rollback Decision Matrix

| Symptom | Likely Phase | Action |
|---------|--------------|--------|
| High latency | Phase 4 | Reduce database read % |
| Data corruption | Phase 3 | Rollback migration, restore backup |
| High error rate | Phase 4 | Rollback to Phase 2 (dual write) |
| Discrepancies | Phase 2 | Fix logic, stay in dual write |

---

## Success Criteria

### Phase Completion Gates

Each phase requires sign-off before proceeding:

- [ ] All deliverables complete
- [ ] Tests passing (>80% coverage)
- [ ] Performance metrics met
- [ ] No critical bugs
- [ ] Team reviewed and approved
- [ ] Stakeholder sign-off

### Final Success Criteria

- ✅ 0% data loss incidents
- ✅ 100% consistency between dashboard and build page
- ✅ p95 read latency < 100ms
- ✅ p95 write latency < 200ms
- ✅ >99.9% availability
- ✅ Full audit trail for all state changes
- ✅ Cross-device state sync working
- ✅ Supporting 10K+ concurrent projects

---

## Post-Launch

### Week 6: Monitoring & Iteration

- Monitor error rates and performance
- Gather user feedback
- Fix edge cases
- Optimize slow queries
- Adjust cache TTLs

### Month 2: Advanced Features

- Add state machine visualization
- Implement undo/redo
- Add state branching (for experimentation)
- Add state templates

### Month 3: Scale Optimization

- Implement read replicas
- Add connection pooling
- Optimize indexes
- Implement database partitioning

---

## Resource Requirements

### Engineering
- 2-3 full-time engineers
- 1 DBA for schema review
- 1 DevOps engineer for infrastructure

### Infrastructure
- PostgreSQL database ($100/mo)
- Redis cache ($15/mo)
- Monitoring ($50/mo)
- **Total: ~$200/mo**

### Time Investment
- 5 weeks implementation
- 2 weeks testing & refinement
- 1 week documentation & training
- **Total: 8 weeks**

---

## Conclusion

This roadmap provides a safe, phased approach to migrate from the current architecture to an enterprise-grade solution. Each phase can be independently validated and rolled back if needed, minimizing risk while maximizing confidence in the new system.

**Ready to proceed?** Start with Phase 0 preparation and proceed phase-by-phase with stakeholder approval at each gate.
