# Database Documentation

**Project:** sherpy-web  
**Database:** SQLite 3  
**Location:** `~/.local/share/sherpy/sherpy.db`

---

## Quick Links

- **[Schema Documentation](./schema.md)** - Complete database schema reference
- **[Migration Guide](./migration-guide.md)** - In-memory to SQLite migration details

---

## Overview

The sherpy-web application uses SQLite for persistent storage of planning workflow data.

**Key Features:**
- ✅ Session persistence across browser refreshes
- ✅ Project recovery after crashes
- ✅ Full audit trail of planning decisions
- ✅ Foreign key CASCADE for data integrity
- ✅ UPSERT pattern for idempotent updates
- ✅ Fire-and-forget writes (non-blocking)

---

## Tables

1. **projects** - Core project metadata
2. **planning_state** - XState machine snapshots
3. **interview_answers** - Q&A records from requirements gathering
4. **form_responses** - Form submissions (steps 1, 5, 7)
5. **artifacts** - Generated documents (requirements, plans, ADRs, etc.)

---

## Quick Start

### View Database

```bash
# Check if database exists
ls -lh ~/.local/share/sherpy/sherpy.db

# Open SQLite shell
sqlite3 ~/.local/share/sherpy/sherpy.db

# View all tables
.tables

# View schema
.schema projects
```

### Query Data

```sql
-- List all projects
SELECT code, name, status, current_step 
FROM projects 
ORDER BY last_touched_at DESC;

-- Count artifacts per project
SELECT p.name, COUNT(a.id) as artifact_count
FROM projects p
LEFT JOIN artifacts a ON p.id = a.project_id
GROUP BY p.id;

-- View interview Q&A
SELECT question, answer, created_at
FROM interview_answers
WHERE project_id = 'abc12345'
ORDER BY created_at;
```

---

## API Reference

### Projects

```typescript
import { createProject, getProject, listProjects } from '@/features/projects/store';

const project = createProject({ name: "My Project", entryPath: "scratch" });
const found = getProject(project.id);
const all = listProjects();
```

### Planning State

```typescript
import { savePlanningState, loadPlanningState } from '@/lib/db/planning';

savePlanningState(projectId, snapshot);
const snapshot = loadPlanningState(projectId);
```

### Interview Answers

```typescript
import { saveInterviewAnswer, getInterviewAnswers } from '@/lib/db/interview';

saveInterviewAnswer(projectId, 2, "What is the goal?", "Build a calculator");
const answers = getInterviewAnswers(projectId, 2);
```

### Form Responses

```typescript
import { saveFormResponse, getFormResponses } from '@/lib/db/form';

saveFormResponse(projectId, 1, "projectDescription", "A simple calculator");
const responses = getFormResponses(projectId, 1);
```

### Artifacts

```typescript
import { saveArtifact, getArtifact, getArtifacts } from '@/lib/db/artifact';

saveArtifact(projectId, 2, "yaml", "# Business Requirements\n...");
const artifact = getArtifact(projectId, 2);
const all = getArtifacts(projectId);
```

---

## Testing

```bash
# Run all database tests
pnpm vitest run src/lib/db/

# Run specific test file
pnpm vitest run src/lib/db/planning.test.ts

# Run integration tests
pnpm vitest run src/lib/db/__tests__/integration.test.ts
```

**Test Results:**
- 83 tests passing
- Unit tests: 73 tests
- Integration tests: 10 tests

---

## Troubleshooting

### Database Not Created

```bash
# Manually create database directory
mkdir -p ~/.local/share/sherpy

# Run migrations manually
sqlite3 ~/.local/share/sherpy/sherpy.db < src/lib/db/schema.sql
```

### View Logs

Database errors are logged to console:

```javascript
console.error("[planning.ts] Failed to save planning state:", error);
```

### Reset Database

```bash
# Backup first (optional)
cp ~/.local/share/sherpy/sherpy.db ~/.local/share/sherpy/sherpy.db.backup

# Delete database (will be recreated on next run)
rm ~/.local/share/sherpy/sherpy.db
```

---

## Migration Status

**Branch:** `feat/sqlite-database-migration`  
**Status:** ✅ Complete  
**Date:** 2026-05-20

**Phases Completed:**
1. ✅ Infrastructure
2. ✅ Projects Store
3. ✅ Planning State
4. ✅ Interview Answers
5. ✅ Form Responses
6. ✅ Artifacts
7. ✅ Integration Testing
8. ✅ Documentation

**Commits:** 25 commits  
**Tests:** 83 passing  
**Files:** 20 created, 3 modified

---

## Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [better-sqlite3 npm package](https://www.npmjs.com/package/better-sqlite3)
- [XState Documentation](https://xstate.js.org/)

---

**Last Updated:** 2026-05-20
