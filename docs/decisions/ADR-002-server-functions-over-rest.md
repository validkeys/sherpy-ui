# ADR-002: Server Functions Over REST

**Date:** 2024-06-08  
**Status:** Accepted  
**Context:** Client/server boundary for AI calls and persistence  
**Related:** BUG-024, BUG-021

---

## Context

Sherpy UI needs to call server-side functions from React components for:
- **AI generation:** LLM calls (Bedrock/Anthropic/OpenAI)
- **Database operations:** SQLite (better-sqlite3 is Node.js only)
- **Business logic:** Artifact generation, question prompting

**Problem:** How to structure client/server communication?

**Alternatives Considered:**
1. **REST API endpoints** (`/api/ai/generate`, `/api/db/save`)
2. **Dynamic imports** (`import("./repository")` from client)
3. **TanStack Server Functions** (`$fnName` RPC pattern)

---

## Decision

**Use TanStack Server Functions (RPC pattern) for all server-side operations.**

---

## Rationale

### Why Server Functions Won

| Criteria | REST API | Dynamic Imports | Server Functions |
|----------|----------|-----------------|------------------|
| **Type Safety** | Manual types | ❌ Fails at runtime | ✅ End-to-end types |
| **Client/Server Boundary** | Clear separation | ❌ Breaks in browser | ✅ Automatic handling |
| **Testing** | Mock fetch() | ❌ Can't mock imports | ✅ Inject mocks |
| **Bundle Size** | Lightweight | ❌ Bloated (unused code) | ✅ Tree-shakable |
| **Boilerplate** | Moderate | Low | Low |
| **Error Handling** | Manual | ❌ Silent failures | ✅ Built-in |

### Key Benefits

1. **No Client/Server Boundary Issues (BUG-024)**
   ```typescript
   // ❌ WRONG - Dynamic import fails in browser
   import("./repository").then(/* ... */); // SyntaxError: better-sqlite3 not available
   
   // ✅ CORRECT - Server function executes server-side
   await $saveInterviewAnswer({ projectId, answer });
   ```

2. **End-to-End Type Safety**
   ```typescript
   // Define once, types flow everywhere
   export const $generateQuestion = createServerFn({ method: 'POST' })
     .inputValidator((data: unknown) => {
       // Zod/validator schema
       return validateQuestionInput(data);
     })
     .handler(async ({ data }) => {
       // TypeScript knows data shape
       return generateQuestion(data.projectId, data.stepNumber);
     });
   
   // Client usage - fully typed!
   const question = await $generateQuestion({
     projectId: 'abc',
     stepNumber: 2,
   }); // TypeScript validates input/output
   ```

3. **Testable with Dependency Injection**
   ```typescript
   // Factory pattern for XState machine
   export function createPlanningMachine(serverFunctions: ServerFunctions) {
     return setup({
       actors: {
         fetchQuestion: fromPromise(async ({ input }) => {
           // Use injected function
           return serverFunctions.$generateQuestion(input);
         }),
       },
     });
   }
   
   // Production
   const machine = createPlanningMachine({
     $generateQuestion: realServerFunction,
   });
   
   // Testing
   const machine = createPlanningMachine({
     $generateQuestion: vi.fn().mockResolvedValue(mockQuestion),
   });
   ```

4. **Built-in Error Handling**
   ```typescript
   // Server function automatically catches errors
   handler: async ({ data }) => {
     try {
       return await dangerousOperation(data);
     } catch (error) {
       // TanStack Start handles serialization, stack traces, etc.
       throw error;
     }
   }
   
   // Client receives structured error
   try {
     await $dangerousOperation({ id: 'abc' });
   } catch (error) {
     console.error(error.message); // Human-readable
   }
   ```

---

## Consequences

### Positive

- **✅ Zero runtime import errors:** Client never loads Node.js modules
- **✅ Type-safe RPC:** Compiler validates inputs/outputs
- **✅ Testable:** Inject mocks via factory pattern
- **✅ Tree-shakable:** Unused code eliminated at build time
- **✅ Built-in validation:** Input validators prevent bad data

### Negative

- **⚠️ No caching:** Each call hits server (mitigation: React Query)
- **⚠️ No batching:** Multiple calls = multiple requests (mitigation: rare issue)
- **⚠️ TanStack-specific:** Locked into TanStack Start (acceptable tradeoff)

### Neutral

- **Bundle size:** Server functions add ~5KB (negligible)
- **Network latency:** Same as REST (both are HTTP calls)

---

## Implementation Details

### Server Function Pattern

```typescript
// src/features/planning/infrastructure/server-functions.ts
import { createServerFn } from '@tanstack/react-start';

export const $generateQuestion = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid input');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== 'string') {
      throw new Error('projectId required');
    }
    if (typeof d.stepNumber !== 'number') {
      throw new Error('stepNumber required');
    }
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber,
      projectContext: d.projectContext,
    };
  })
  .handler(async ({ data }) => {
    // Load state
    const context = data.projectContext || await loadProjectContext(data.projectId);
    
    // Generate question (AI call)
    const question = await generateQuestion(data.stepNumber, context);
    
    // Return typed result
    return question;
  });
```

### Factory Pattern for XState

```typescript
// src/features/planning/machines/planning-machine-factory.ts
export interface ServerFunctions {
  $generateQuestion: typeof $generateQuestion;
  $generateArtifact: typeof $generateArtifact;
  $submitAnswer: typeof $submitAnswer;
}

export function createPlanningMachine(serverFunctions: ServerFunctions) {
  return setup({
    actors: {
      fetchQuestion: fromPromise(async ({ input }) => {
        return serverFunctions.$generateQuestion(input);
      }),
      generateArtifact: fromPromise(async ({ input }) => {
        return serverFunctions.$generateArtifact(input);
      }),
    },
  }).createMachine({
    /* ... */
  });
}
```

### React Query Integration

```typescript
// src/features/planning/hooks/useGenerateQuestion.ts
import { useMutation } from '@tanstack/react-query';
import { $generateQuestion } from '../infrastructure/server-functions';

export function useGenerateQuestion() {
  return useMutation({
    mutationFn: async (input: { projectId: string; stepNumber: number }) => {
      return $generateQuestion(input);
    },
    onSuccess: (question) => {
      // Cache for 5 minutes
    },
  });
}
```

---

## Lessons Learned

### 1. Dynamic Imports Fail Client-Side (BUG-024)

**Problem:** Tried `import("./repository")` from client component.

**Error:** `SyntaxError: The requested module 'better-sqlite3' does not provide an export named 'default'`

**Root Cause:** Dynamic imports execute in **caller context**. Browser can't load Node.js native modules.

**Solution:** Replace repository imports with server function calls.

```typescript
// ❌ WRONG
const repository = await import('./repository');
await repository.saveInterviewAnswer(projectId, answer);

// ✅ CORRECT
await $saveInterviewAnswer({ projectId, answer });
```

**See:** `.tmp-docs/bug-reports/024-auxiliary-persistence-client-side/`

### 2. Non-Existent REST API (BUG-021)

**Problem:** XState machine called `/api/ai/interview` endpoint that didn't exist.

**Error:** `404 Not Found`

**Root Cause:** Copy-pasted from different project, forgot to create API route.

**Solution:** Use existing `$generateQuestion` server function.

```typescript
// ❌ WRONG - REST endpoint doesn't exist
actors: {
  fetchQuestion: fromPromise(async ({ input }) => {
    const response = await fetch('/api/ai/interview', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.json();
  }),
}

// ✅ CORRECT - Use server function
actors: {
  fetchQuestion: fromPromise(async ({ input }) => {
    return serverFunctions.$generateQuestion(input);
  }),
}
```

**See:** `.tmp-docs/bug-reports/021-step2-interview-question-not-rendering/`

### 3. Context Not Propagating (OBSERVATION #4)

**Problem:** Step 2+ questions didn't receive Step 1 context.

**Root Cause:** `$generateQuestion` received `projectContext` parameter but ignored it.

**Solution:** Use passed context first, database as fallback.

```typescript
// ❌ WRONG - Ignores projectContext parameter
handler: async ({ data }) => {
  const context = await loadProjectContext(data.projectId); // Always DB
  return generateQuestion(data.stepNumber, context);
}

// ✅ CORRECT - Use projectContext first
handler: async ({ data }) => {
  const context = data.projectContext || await loadProjectContext(data.projectId);
  return generateQuestion(data.stepNumber, context);
}
```

**See:** `.tmp-docs/planning/004-observations-fixes/`

---

## When to Use REST Instead

**Use REST API if:**
- Public-facing API (external consumers)
- Need HTTP caching headers (Cache-Control, ETag)
- Need standard REST semantics (GET /resources/:id)
- Want OpenAPI spec generation

**Use Server Functions if:**
- Internal RPC (UI ↔ backend)
- Type safety end-to-end
- Need dependency injection for testing

---

## Related Decisions

- [ADR-001: XState for Workflow](./ADR-001-xstate-for-workflow.md) - How factory pattern enables testable state machines
- [ADR-003: Type-Safe Constants](./ADR-003-type-safe-constants.md) - Why constants matter

---

## Metrics

### Before Server Functions (BUG-021, BUG-024)

- REST endpoints: 3 (manual types, no validation)
- Dynamic imports: 2 (failed at runtime)
- Type safety: ❌ None (manual sync of types)
- Tests: Hard (mock fetch + imports)

### After Server Functions (Production)

- Server functions: 4 (`$generateQuestion`, `$generateArtifact`, `$submitAnswer`, `$saveInterviewAnswer`)
- Type safety: ✅ End-to-end (input/output validated)
- Tests: Easy (inject mocks via factory)
- Runtime errors: ✅ Eliminated client/server boundary issues

---

**Last Updated:** 2026-06-17  
**Supersedes:** None  
**Superseded By:** None
