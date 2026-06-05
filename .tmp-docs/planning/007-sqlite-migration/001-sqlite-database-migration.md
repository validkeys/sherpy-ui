# Implementation Plan: SQLite Database Migration

**Plan ID:** 001  
**Created:** 2026-05-19  
**Status:** Draft  
**Priority:** High  
**Estimated Effort:** 3-5 days

---

## Problem Statement

Currently, the Sherpy planning workflow suffers from critical data persistence issues:

### Current Architecture Issues

1. **Projects**: Stored in server-side in-memory `Map` 
   - Lost on server restart
   - Inconsistent across Vercel function instances
   - Comment in code: "TODO(M2): replace with persistent store"

2. **Planning Workflow Data**: Stored ONLY in browser localStorage
   - Interview Q&A (step 2 & 3)
   - Form responses (step 1 & 5)
   - Generated artifacts (all 10 steps)
   - XState machine state
   
3. **User-Reported Bug**: Page refresh causes data loss
   - Forms appear filled but React state empty
   - localStorage persists but with empty data
   - No server-side backup to recover from

### Impact

- **Data Loss Risk**: Browser issues, cache clears, or localStorage corruption = lost work
- **No Multi-Device Support**: Can't resume workflow on different device
- **Poor UX**: Users lose 20-30 minutes of interview work on refresh
- **No Audit Trail**: Can't track when/how data was captured
- **Reliability**: No server-side source of truth

---

## Solution: Centralized SQLite Database

Migrate from localStorage + in-memory Map to server-side SQLite database as single source of truth.

### Benefits

✅ **Reliability**: Server-side persistence survives browser issues  
✅ **Consistency**: Single source of truth, no sync issues  
✅ **Recoverability**: Can restore data after client-side failures  
✅ **Multi-Device**: Resume workflow on any device  
✅ **Audit Trail**: Track creation/update timestamps  
✅ **Scalability**: Ready for production deployment  
✅ **Transactions**: Atomic updates, no partial states

---

## Database Schema Design

### Table: `projects`

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,              -- nanoid(8)
  code TEXT NOT NULL UNIQUE,        -- SHR-0042
  name TEXT NOT NULL,               -- "mini-calculator"
  status TEXT NOT NULL,             -- "active" | "archived" | "complete"
  entry_path TEXT NOT NULL,         -- "scratch" | "doc-first"
  current_step INTEGER NOT NULL,    -- 1-10
  created_at TEXT NOT NULL,         -- ISO 8601
  last_touched_at TEXT NOT NULL,    -- ISO 8601
  
  CHECK(status IN ('active', 'archived', 'complete')),
  CHECK(entry_path IN ('scratch', 'doc-first')),
  CHECK(current_step >= 1 AND current_step <= 10)
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_last_touched ON projects(last_touched_at DESC);
```

### Table: `planning_state`

Complete XState machine state snapshot per project.

```sql
CREATE TABLE planning_state (
  project_id TEXT PRIMARY KEY,
  xstate_snapshot TEXT NOT NULL,    -- JSON serialized XState snapshot
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

**Stores entire XState snapshot as JSON** (maintains compatibility with existing XState logic).

### Table: `interview_answers`

Individual Q&A records for auditability and querying.

```sql
CREATE TABLE interview_answers (
  id TEXT PRIMARY KEY,              -- nanoid()
  project_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,     -- 2 or 3
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK(step_number IN (2, 3))
);

CREATE INDEX idx_answers_project_step ON interview_answers(project_id, step_number);
```

### Table: `form_responses`

Form submissions (step 1, 5, 7).

```sql
CREATE TABLE form_responses (
  id TEXT PRIMARY KEY,              -- nanoid()
  project_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,     -- 1, 5, or 7
  field_name TEXT NOT NULL,         -- "existingRequirements", "projectDescription"
  field_value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK(step_number IN (1, 5, 7)),
  UNIQUE(project_id, step_number, field_name)
);

CREATE INDEX idx_form_responses_project_step ON form_responses(project_id, step_number);
```

### Table: `artifacts`

Generated documents (Gap Analysis, Business Requirements, etc.).

```sql
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,              -- nanoid()
  project_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,     -- 1-10
  artifact_type TEXT NOT NULL,      -- "yaml" | "markdown"
  content TEXT NOT NULL,            -- Generated document content
  generated_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK(step_number >= 1 AND step_number <= 10),
  CHECK(artifact_type IN ('yaml', 'markdown')),
  UNIQUE(project_id, step_number)
);

CREATE INDEX idx_artifacts_project ON artifacts(project_id);
```

---

## Migration Strategy

### Phase 1: Database Infrastructure (Day 1)

**Goal**: Set up SQLite database with schema and basic CRUD operations.

#### Tasks

1. **Install Dependencies**
   ```bash
   pnpm add better-sqlite3 @types/better-sqlite3
   ```

2. **Create Database Module** (`src/lib/db/index.ts`)
   - Initialize SQLite connection
   - Run schema migrations
   - Export typed database interface

3. **Create Schema Migration** (`src/lib/db/schema.sql`)
   - All 5 tables with constraints
   - Indexes for performance

4. **Create Database Types** (`src/lib/db/types.ts`)
   - TypeScript interfaces matching schema
   - Type-safe query builders

5. **Add Seed Data Logic**
   - Migrate existing `seed.ts` to use database
   - Populate projects table with test data

**Verification**: Database initializes, schema loads, seed data works.

---

### Phase 2: Projects Store Migration (Day 1-2)

**Goal**: Replace in-memory Map with SQLite for projects.

#### Tasks

1. **Update `src/features/projects/store.ts`**
   - Replace `Map` with SQLite queries
   - Keep same function signatures (minimize breaking changes)
   - Add transaction support

2. **Implement CRUD Operations**
   ```typescript
   // Before: const store = new Map<string, Project>();
   // After: Use db.prepare() statements
   
   export function createProject(input: CreateProjectInput): Project {
     const stmt = db.prepare(`
       INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     `);
     // ... implementation
   }
   ```

3. **Update Tests** (`src/features/projects/server.test.ts`)
   - Use in-memory SQLite for tests (`:memory:`)
   - Reset database between tests

**Verification**: All existing project tests pass, dashboard loads projects from database.

---

### Phase 3: Planning State Persistence (Day 2-3)

**Goal**: Store XState snapshots in database instead of localStorage.

#### Tasks

1. **Create Planning State API** (`src/features/planning/db.ts`)
   ```typescript
   export function savePlanningState(projectId: string, snapshot: SnapshotFrom<typeof planningMachine>): void
   export function loadPlanningState(projectId: string): SnapshotFrom<typeof planningMachine> | null
   export function deletePlanningState(projectId: string): void
   ```

2. **Update State Persistence Logic** (`src/features/planning/machines/PlanningMachineContext.tsx`)
   - Replace localStorage writes with server mutations
   - Replace localStorage reads with server queries
   - Keep localStorage as cache (read from server, write to both)

3. **Create Server Functions** (`src/features/planning/server.ts`)
   ```typescript
   export const $savePlanningState = createServerFn({ method: "POST" })
   export const $loadPlanningState = createServerFn({ method: "GET" })
   ```

4. **Migration Strategy for Existing Data**
   - On page load, check localStorage first
   - If localStorage has newer data than server, sync to server
   - Then use server as source of truth

**Verification**: XState persistence works, page refresh preserves state, localStorage sync works.

---

### Phase 4: Interview Answers Persistence (Day 3)

**Goal**: Store interview Q&A in database tables for auditability.

#### Tasks

1. **Create Interview Answers API** (`src/features/planning/db.ts`)
   ```typescript
   export function saveInterviewAnswer(projectId: string, stepNumber: number, question: string, answer: string): void
   export function getInterviewAnswers(projectId: string, stepNumber: number): InterviewAnswer[]
   ```

2. **Update Interview Submit Handlers**
   - When user submits answer, write to both XState context AND database table
   - Database write happens via server function

3. **Create Server Functions**
   ```typescript
   export const $saveInterviewAnswer = createServerFn({ method: "POST" })
   export const $getInterviewAnswers = createServerFn({ method: "GET" })
   ```

**Verification**: Interview Q&A persists to database, can query answers independently of XState.

---

### Phase 5: Form Responses Persistence (Day 4)

**Goal**: Store form submissions in database.

#### Tasks

1. **Create Form Responses API** (`src/features/planning/db.ts`)
   ```typescript
   export function saveFormResponse(projectId: string, stepNumber: number, fieldName: string, fieldValue: string): void
   export function getFormResponses(projectId: string, stepNumber: number): Record<string, string>
   ```

2. **Update Form Submit Handlers** (Step 1, 5, 7)
   - Write to database on form submission
   - Use UPSERT for idempotency

3. **Create Server Functions**
   ```typescript
   export const $saveFormResponses = createServerFn({ method: "POST" })
   export const $getFormResponses = createServerFn({ method: "GET" })
   ```

**Verification**: Form data persists to database, survives page refresh.

---

### Phase 6: Artifacts Persistence (Day 4)

**Goal**: Store generated artifacts in database.

#### Tasks

1. **Create Artifacts API** (`src/features/planning/db.ts`)
   ```typescript
   export function saveArtifact(projectId: string, stepNumber: number, type: "yaml" | "markdown", content: string): void
   export function getArtifact(projectId: string, stepNumber: number): Artifact | null
   export function getAllArtifacts(projectId: string): Record<number, Artifact>
   ```

2. **Update Artifact Generation Logic**
   - After AI generates artifact, save to database
   - Also update XState context (for in-memory state)

3. **Create Server Functions**
   ```typescript
   export const $saveArtifact = createServerFn({ method: "POST" })
   export const $getArtifacts = createServerFn({ method: "GET" })
   ```

**Verification**: Artifacts persist to database, can be retrieved independently.

---

### Phase 7: Testing & Validation (Day 5)

**Goal**: Ensure all data persistence works correctly.

#### Tasks

1. **Integration Tests**
   - Test full workflow: create project → complete interviews → generate artifacts
   - Verify database contains all expected data
   - Test page refresh at each step

2. **E2E Tests Update**
   - Update existing Playwright tests to verify database state
   - Add assertions for database records after form submissions

3. **Migration Testing**
   - Test migrating existing localStorage data to database
   - Verify no data loss during migration

4. **Performance Testing**
   - Benchmark database queries
   - Ensure no UI performance regression
   - Add database query logging for debugging

**Verification**: All tests pass, no regressions, data persists correctly.

---

### Phase 8: Documentation & Cleanup (Day 5)

**Goal**: Update documentation and remove deprecated code.

#### Tasks

1. **Update Documentation**
   - Update `docs/reference/database-schema.md` with new schema
   - Document migration strategy
   - Add database troubleshooting guide

2. **Deprecation Warnings**
   - Add console warnings about localStorage deprecation
   - Provide migration path for existing users

3. **Code Cleanup**
   - Remove localStorage-only code paths after migration
   - Update comments/TODOs
   - Clean up seed data logic

**Verification**: Documentation complete, code clean, ready for production.

---

## Rollback Strategy

If issues arise during migration:

1. **Keep localStorage as Fallback**: Don't remove localStorage code until Phase 8
2. **Feature Flag**: Add `USE_DATABASE=true` env var to toggle new behavior
3. **Data Export**: Add utility to export database to JSON for backup
4. **Revert Path**: Can revert to localStorage by disabling feature flag

---

## Technical Considerations

### Why better-sqlite3?

- **Synchronous API**: Simpler than async SQLite libraries
- **Performance**: Fastest SQLite library for Node.js
- **Type-Safe**: Good TypeScript support
- **Reliable**: Battle-tested, used by Electron and many production apps

### Why Not Prisma?

- **Overhead**: Prisma adds complexity for simple schema
- **Build Time**: Prisma requires code generation
- **SQLite Support**: better-sqlite3 has better SQLite-specific features
- **Decision**: Can migrate to Prisma later if needed

### Vercel Deployment

- SQLite file stored in `/tmp` directory on Vercel (ephemeral)
- **Solution**: Use persistent storage (Turso, Cloudflare D1, or Neon)
- **Alternative**: Use Vercel Postgres for production

### Concurrent Writes

- SQLite supports concurrent reads, but writes are serialized
- **Solution**: Use WAL mode (Write-Ahead Logging) for better concurrency
- **Note**: Should be fine for single-user MVP

---

## Success Criteria

✅ All projects data persists in database  
✅ XState snapshots persist in database  
✅ Interview Q&A persists in database  
✅ Form responses persist in database  
✅ Generated artifacts persist in database  
✅ Page refresh preserves all data  
✅ localStorage serves as cache only (not source of truth)  
✅ All existing tests pass  
✅ No performance regressions  
✅ Migration path documented  

---

## Open Questions

1. **Database Location**: Should we use Turso (SQLite-as-a-service) or local SQLite file?
2. **Migration Timing**: Should we migrate existing localStorage data automatically or prompt user?
3. **Backup Strategy**: Should we implement automatic backups?
4. **Multi-User**: Do we need to support multiple users working on same project? (Future consideration)

---

## Follow-Up Tasks (Post-Migration)

- [ ] Add database backup/restore functionality
- [ ] Implement soft deletes for audit trail
- [ ] Add database migration framework (for schema updates)
- [ ] Consider moving to Turso for production (remote SQLite)
- [ ] Add database health monitoring
- [ ] Implement data export/import for users

---

## References

- Current state persistence: `src/features/planning/machines/PlanningMachineContext.tsx`
- In-memory store: `src/features/projects/store.ts` (line 4, line 82 TODO)
- Database schema docs: `docs/reference/database-schema.md`
- User bug report: mini-calculator project data loss on refresh
- BUG-014: Form data not captured (related issue)

---

## Approval & Next Steps

**Waiting for approval before starting implementation.**

Once approved:
1. Create feature branch: `feat/sqlite-database-migration`
2. Start with Phase 1 (Database Infrastructure)
3. Create PRs per phase for incremental review
4. Update this plan as implementation reveals issues

---

**Last Updated:** 2026-05-19  
**Plan Author:** Claude Code  
**Reviewer:** Pending
