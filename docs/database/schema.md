# Database Schema Documentation

**Project:** sherpy-web  
**Database:** SQLite 3  
**Location:** `~/.local/share/sherpy/sherpy.db`  
**Schema Version:** 1.0  
**Last Updated:** 2026-05-20

---

## Overview

The sherpy-web application uses SQLite for persistent storage of planning workflow data. This replaces the previous in-memory-only storage, enabling:

- Session persistence across browser refreshes
- Project recovery after crashes
- Multi-device support (future)
- Full audit trail of planning decisions

**Key Characteristics:**
- Fire-and-forget writes (non-blocking, backward compatible)
- Foreign key CASCADE for data integrity
- UPSERT pattern for idempotent updates
- Synchronous operations (no async overhead)

---

## Table of Contents

1. [Tables](#tables)
   - [projects](#projects)
   - [planning_state](#planning_state)
   - [interview_answers](#interview_answers)
   - [form_responses](#form_responses)
   - [artifacts](#artifacts)
2. [Relationships](#relationships)
3. [Indexes](#indexes)
4. [Usage Patterns](#usage-patterns)
5. [Migration Notes](#migration-notes)

---

## Tables

### projects

**Purpose:** Core project metadata and tracking

```sql
CREATE TABLE IF NOT EXISTS projects (
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

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_last_touched ON projects(last_touched_at DESC);
```

**Columns:**
- `id` - Primary key, 8-character nanoid for URL-friendly identifiers
- `code` - Human-readable project code (e.g., SHR-0042), auto-incremented
- `name` - User-provided project name
- `status` - Lifecycle state: active (in-progress), archived (hidden), complete (finished)
- `entry_path` - Initial workflow choice: scratch (new project) or doc-first (existing requirements)
- `current_step` - Current step number in planning workflow (1-10)
- `created_at` - ISO 8601 timestamp of project creation
- `last_touched_at` - ISO 8601 timestamp of last modification (for sorting)

**Constraints:**
- UNIQUE on `code` (prevents duplicate project codes)
- CHECK constraints on enum fields

**Indexes:**
- `idx_projects_status` - Fast filtering by status
- `idx_projects_last_touched` - Efficient "recent projects" queries (DESC order)

**Operations:** `src/features/projects/store.ts`

---

### planning_state

**Purpose:** Complete XState machine state snapshot per project

```sql
CREATE TABLE IF NOT EXISTS planning_state (
  project_id TEXT PRIMARY KEY,
  xstate_snapshot TEXT NOT NULL,    -- JSON serialized XState snapshot
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

**Columns:**
- `project_id` - Foreign key to projects (1-to-1 relationship)
- `xstate_snapshot` - Full JSON snapshot from XState v5 `actor.getSnapshot().toJSON()`
- `created_at` - Initial snapshot timestamp
- `updated_at` - Last update timestamp

**Snapshot Structure:**
```typescript
{
  status: "active",
  value: "step2.collecting",
  context: {
    projectId: string,
    currentStepNumber: number,
    entryPath: "scratch" | "doc-first",
    startedAt: string,
    updatedAt: string,
    step1Responses: Record<string, string>,
    step2Answers: string[],
    step2CurrentQuestion: string | null,
    step3Answers: string[],
    step3CurrentQuestion: string | null,
    // ... additional context fields
  },
  children: {},
  historyValue: {}
}
```

**Validation:**
- Requires `status`, `value`, `context` fields
- Requires `context.projectId` and `context.currentStepNumber`
- Forces `status` to "active" on restoration (defense-in-depth)

**Operations:** `src/lib/db/planning.ts`

---

### interview_answers

**Purpose:** Individual Q&A records for auditability and querying

```sql
CREATE TABLE IF NOT EXISTS interview_answers (
  id TEXT PRIMARY KEY,              -- nanoid()
  project_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,     -- 2 or 3
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK(step_number IN (2, 3))
);

CREATE INDEX IF NOT EXISTS idx_answers_project_step ON interview_answers(project_id, step_number);
```

**Columns:**
- `id` - Primary key, full-length nanoid
- `project_id` - Foreign key to projects
- `step_number` - Interview step: 2 (Business Requirements) or 3 (Technical Requirements)
- `question` - LLM-generated question text
- `answer` - User's answer text
- `created_at` - Timestamp when answer was recorded

**Constraints:**
- CHECK on `step_number` (only 2 or 3 allowed)
- No UNIQUE constraint (multiple Q&A pairs per project/step)

**Index:**
- Composite index on `(project_id, step_number)` for efficient step-specific queries

**Use Cases:**
- Audit trail of requirements gathering
- AI context for subsequent steps
- Requirements traceability

**Operations:** `src/lib/db/interview.ts`

---

### form_responses

**Purpose:** Form submissions from steps 1, 5, and 7

```sql
CREATE TABLE IF NOT EXISTS form_responses (
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

CREATE INDEX IF NOT EXISTS idx_form_responses_project_step ON form_responses(project_id, step_number);
```

**Columns:**
- `id` - Primary key, full-length nanoid (updated on UPSERT)
- `project_id` - Foreign key to projects
- `step_number` - Form step: 1 (Gap Analysis), 5 (Implementation Planner), 7 (ADRs)
- `field_name` - Form field identifier (e.g., "projectDescription", "existingRequirements")
- `field_value` - User-entered value
- `created_at` - Timestamp (updated on UPSERT)

**Constraints:**
- UNIQUE on `(project_id, step_number, field_name)` - enables UPSERT
- CHECK on `step_number` (only 1, 5, or 7 allowed)

**UPSERT Behavior:**
```sql
INSERT INTO form_responses (...)
VALUES (...)
ON CONFLICT(project_id, step_number, field_name)
DO UPDATE SET
  id = excluded.id,              -- New ID for tracking
  field_value = excluded.field_value,
  created_at = excluded.created_at
```

**Index:**
- Composite index on `(project_id, step_number)` for step-specific queries

**Operations:** `src/lib/db/form.ts`

---

### artifacts

**Purpose:** Generated documents (Gap Analysis, Business Requirements, etc.)

```sql
CREATE TABLE IF NOT EXISTS artifacts (
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

CREATE INDEX IF NOT EXISTS idx_artifacts_project ON artifacts(project_id);
```

**Columns:**
- `id` - Primary key, full-length nanoid (updated on UPSERT)
- `project_id` - Foreign key to projects
- `step_number` - Planning step that generated this artifact (1-10)
- `artifact_type` - File format: "yaml" or "markdown"
- `content` - Full artifact content (can be large, 100KB+)
- `generated_at` - Timestamp (updated on UPSERT)

**Constraints:**
- UNIQUE on `(project_id, step_number)` - one artifact per step
- CHECK on `step_number` (1-10 inclusive)
- CHECK on `artifact_type` (yaml or markdown only)

**UPSERT Behavior:**
- Regenerating an artifact replaces the previous version
- New ID generated to track generation time

**Artifact Mappings:**

| Step | Name | Type | Key |
|------|------|------|-----|
| 1 | Gap Analysis Worksheet | yaml | gap-analysis |
| 2 | Business Requirements | yaml | business-requirements |
| 3 | Technical Requirements | yaml | technical-requirements |
| 4 | Style Anchors | yaml | style-anchors |
| 5 | Implementation Plan | markdown | implementation-plan |
| 6 | Plan Review | yaml | plan-review |
| 7 | Architecture Decisions | markdown | architecture-decisions |
| 8 | Delivery Timeline | yaml | delivery-timeline |
| 9 | QA Test Plan | yaml | qa-test-plan |
| 10 | Summaries | markdown | summaries |

**Operations:** `src/lib/db/artifact.ts`

---

## Relationships

```
projects (1) ─┬─ (1) planning_state
              ├─ (0..N) interview_answers
              ├─ (0..N) form_responses
              └─ (0..N) artifacts

All relationships use ON DELETE CASCADE
```

**Cascade Behavior:**
- Deleting a project automatically deletes all related records
- No orphaned data possible
- Tested in integration tests

---

## Indexes

**Explicit Indexes:**
1. `idx_projects_status` - Projects by status (active/archived/complete)
2. `idx_projects_last_touched` - Recent projects (DESC order)
3. `idx_answers_project_step` - Interview answers by project and step
4. `idx_form_responses_project_step` - Form responses by project and step
5. `idx_artifacts_project` - Artifacts by project

**Implicit Indexes:**
- Primary keys (all tables)
- Unique constraints: `projects.code`, `form_responses.(project_id, step_number, field_name)`, `artifacts.(project_id, step_number)`

**Query Patterns:**
- List projects: `SELECT * FROM projects WHERE status = 'active' ORDER BY last_touched_at DESC`
- Get project data: `SELECT * FROM [table] WHERE project_id = ?`
- Get step data: `SELECT * FROM [table] WHERE project_id = ? AND step_number = ?`

---

## Usage Patterns

### Fire-and-Forget Writes

All database writes are non-blocking to maintain backward compatibility:

```typescript
// ❌ OLD (blocking)
await db.saveProject(project);

// ✅ NEW (fire-and-forget)
saveProject(project);  // Returns immediately
```

**Error Handling:**
- Errors logged to console
- Application continues with in-memory state
- Database is "best-effort" persistence layer

### UPSERT Pattern

Form responses and artifacts use UPSERT for idempotent updates:

```typescript
// First call - INSERT
const id1 = saveFormResponse(projectId, 1, "field1", "value1");

// Second call - UPDATE (same project/step/field)
const id2 = saveFormResponse(projectId, 1, "field1", "value2");

// id1 !== id2 (new ID generated to track update time)
// Database contains only 1 row with value2
```

### XState Snapshot Persistence

Planning state is saved on every state transition:

```typescript
actor.subscribe((snapshot) => {
  savePlanningState(projectId, snapshot);  // Fire-and-forget
});
```

**Restoration:**
```typescript
const snapshot = loadPlanningState(projectId);
if (snapshot) {
  const actor = createActor(planningMachine, { snapshot });
  actor.start();
}
```

---

## Migration Notes

### From In-Memory to SQLite

**Changes Made:**
1. ✅ Created SQLite schema (`src/lib/db/schema.sql`)
2. ✅ Added database module (`src/lib/db/index.ts`)
3. ✅ Migrated projects store to SQLite (`src/features/projects/store.ts`)
4. ✅ Added planning state persistence (`src/lib/db/planning.ts`)
5. ✅ Added interview answers persistence (`src/lib/db/interview.ts`)
6. ✅ Added form responses persistence (`src/lib/db/form.ts`)
7. ✅ Added artifacts persistence (`src/lib/db/artifact.ts`)
8. ✅ Integrated persistence into server functions
9. ✅ Comprehensive test coverage (83 tests)

**Backward Compatibility:**
- In-memory store still functions as primary state
- Database is supplementary persistence layer
- No breaking changes to existing APIs
- Fire-and-forget writes ensure no performance impact

**Testing:**
- Unit tests for each database module
- Integration tests for full workflow
- 83 total tests passing

**Performance:**
- Synchronous SQLite operations (no async overhead)
- Indexed queries for fast lookups
- UPSERT for efficient updates
- No blocking on write operations

---

## API Reference

### Projects

**Module:** `src/features/projects/store.ts`

```typescript
createProject(input: CreateProjectInput): Project
getProject(id: string): Project | undefined
listProjects(): Project[]
updateProjectStatus(id: string, status: Status): Project
updateCurrentStep(id: string, step: number): Project
```

### Planning State

**Module:** `src/lib/db/planning.ts`

```typescript
savePlanningState(projectId: string, snapshot: Snapshot): void
loadPlanningState(projectId: string): Snapshot | null
deletePlanningState(projectId: string): void
hasPlanningState(projectId: string): boolean
```

### Interview Answers

**Module:** `src/lib/db/interview.ts`

```typescript
saveInterviewAnswer(projectId: string, stepNumber: 2 | 3, question: string, answer: string): string
getInterviewAnswers(projectId: string, stepNumber: 2 | 3): DBInterviewAnswer[]
deleteInterviewAnswers(projectId: string): void
```

### Form Responses

**Module:** `src/lib/db/form.ts`

```typescript
saveFormResponse(projectId: string, stepNumber: 1 | 5 | 7, fieldName: string, fieldValue: string): string
getFormResponses(projectId: string, stepNumber: 1 | 5 | 7): DBFormResponse[]
deleteFormResponses(projectId: string): void
```

### Artifacts

**Module:** `src/lib/db/artifact.ts`

```typescript
saveArtifact(projectId: string, stepNumber: number, artifactType: 'yaml' | 'markdown', content: string): string
getArtifact(projectId: string, stepNumber: number): DBArtifact | undefined
getArtifacts(projectId: string): DBArtifact[]
deleteArtifacts(projectId: string): void
```

---

## Troubleshooting

### Database Location

```bash
# Default location
~/.local/share/sherpy/sherpy.db

# Check if database exists
ls -lh ~/.local/share/sherpy/sherpy.db

# View database schema
sqlite3 ~/.local/share/sherpy/sherpy.db ".schema"
```

### Query Database Manually

```bash
# Open SQLite shell
sqlite3 ~/.local/share/sherpy/sherpy.db

# List all projects
SELECT * FROM projects;

# Check artifact count
SELECT project_id, COUNT(*) FROM artifacts GROUP BY project_id;

# View recent projects
SELECT code, name, current_step, last_touched_at 
FROM projects 
WHERE status = 'active' 
ORDER BY last_touched_at DESC 
LIMIT 10;
```

### Common Issues

**Issue:** Database file not created
- **Cause:** Migration not run
- **Fix:** Ensure `runMigrations()` is called at startup

**Issue:** Foreign key constraint violation
- **Cause:** Attempting to insert record with non-existent project_id
- **Fix:** Ensure project exists before inserting related data

**Issue:** UNIQUE constraint violation
- **Cause:** Duplicate project code or duplicate form response
- **Fix:** Use UPSERT pattern or check for existing records

---

## Future Enhancements

**Planned:**
- Multi-device sync via cloud database
- Incremental backups
- Schema versioning system
- Database compaction utilities
- Export/import functionality

**Under Consideration:**
- Full-text search on artifacts
- Version history for artifacts
- Soft deletes with trash/restore
- Database encryption at rest

---

**Last Updated:** 2026-05-20  
**Schema Version:** 1.0  
**Maintained By:** sherpy-web team
