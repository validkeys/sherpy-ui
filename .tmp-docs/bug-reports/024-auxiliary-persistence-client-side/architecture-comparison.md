# BUG-024: Architecture Comparison

## Current Architecture (BROKEN)

```
┌─────────────────────────────────────────────────────────────┐
│ BROWSER (Client-Side)                                       │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ PlanningMachineContext.tsx          │                   │
│  │ (React Component)                   │                   │
│  └──────────────┬──────────────────────┘                   │
│                 │                                           │
│                 │ new StatePersistence(actor)               │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                   │
│  │ StatePersistence                    │                   │
│  │   - persistToLocalStorage() ✅      │                   │
│  │   - persistAllToDatabase()          │                   │
│  │     - $savePlanningState() ✅       │ (server fn)       │
│  │     - persistAuxiliaryTables() ❌   │                   │
│  └──────────────┬──────────────────────┘                   │
│                 │                                           │
│                 │ ❌ PROBLEM HERE                           │
│                 │ import("./repository")                    │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                   │
│  │ repository.ts                       │                   │
│  │   ↓ imports                         │                   │
│  │ server.db.ts                        │                   │
│  │   ↓ imports                         │                   │
│  │ lib/db/index.ts                     │                   │
│  │   ↓ imports                         │                   │
│  │ better-sqlite3 (Node.js)            │ ← 💥 FAILS        │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ERROR: Cannot load Node.js module in browser              │
│  SyntaxError: 'better-sqlite3' does not provide default    │
└─────────────────────────────────────────────────────────────┘
```

### Why It Fails

1. `StatePersistence` class is instantiated **in React component** (browser)
2. `persistAuxiliaryTables()` uses **dynamic import** to load `repository.ts`
3. Dynamic imports **execute in the same context** as the caller (browser)
4. `repository.ts` → `server.db.ts` → `lib/db/index.ts` → `better-sqlite3`
5. Browser cannot load Node.js native module → **SyntaxError**

### Common Misconception

> "Dynamic imports prevent bundling, so they'll work"

**FALSE:** Dynamic imports only **defer loading**, they don't change **execution context**.
- Static import: loads at bundle time
- Dynamic import: loads at runtime
- **Both execute in the caller's context** (browser in this case)

---

## Fixed Architecture (CORRECT)

```
┌─────────────────────────────────────────────────────────────┐
│ BROWSER (Client-Side)                                       │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ PlanningMachineContext.tsx          │                   │
│  │ (React Component)                   │                   │
│  └──────────────┬──────────────────────┘                   │
│                 │                                           │
│                 │ new StatePersistence(actor)               │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                   │
│  │ StatePersistence                    │                   │
│  │   - persistToLocalStorage() ✅      │                   │
│  │   - persistAllToDatabase()          │                   │
│  │     - $savePlanningState() ✅       │ (server fn)       │
│  │     - persistAuxiliaryTables() ✅   │                   │
│  └──────────────┬──────────────────────┘                   │
│                 │                                           │
│                 │ ✅ FIXED: import("./server-functions")    │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                   │
│  │ $saveInterviewAnswer (stub)         │                   │
│  │ $saveFormResponses (stub)           │                   │
│  └──────────────┬──────────────────────┘                   │
│                 │                                           │
│                 │ RPC call over HTTP                        │
│                 ▼                                           │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ Network Request
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ SERVER (Node.js)                                            │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ server-functions.ts                 │                   │
│  │   $saveInterviewAnswer.handler()    │                   │
│  └──────────────┬──────────────────────┘                   │
│                 │                                           │
│                 │ Calls repository (server-side)            │
│                 ▼                                           │
│  ┌─────────────────────────────────────┐                   │
│  │ repository.ts                       │                   │
│  │   ↓ imports                         │                   │
│  │ server.db.ts                        │                   │
│  │   ↓ imports                         │                   │
│  │ lib/db/index.ts                     │                   │
│  │   ↓ imports                         │                   │
│  │ better-sqlite3 (Node.js) ✅         │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  SUCCESS: Database operations execute server-side          │
└─────────────────────────────────────────────────────────────┘
```

### Why It Works

1. `StatePersistence` imports **server function stubs** (safe for browser)
2. Server function stubs make **RPC call** (remote procedure call)
3. Execution happens **on server** (where database access is available)
4. Response sent back to browser
5. Browser never touches Node.js modules

### Server Function Pattern

Server functions use the RPC pattern:

**Client Code:**
```typescript
// Imports a stub (safe for browser)
import { $saveInterviewAnswer } from "./server-functions";

// Calls stub (makes HTTP request to server)
await $saveInterviewAnswer({ data: { projectId, stepNumber: 2, question, answer } });
```

**Server Code:**
```typescript
// Defines the actual implementation (runs on server)
export const $saveInterviewAnswer = createServerFn({ method: "POST" })
  .handler(async ({ data }) => {
    // ✅ This code runs on server, can use Node.js modules
    const { saveInterviewAnswer } = await import("./repository");
    await saveInterviewAnswer(data.projectId, data.stepNumber, data.question, data.answer);
    return { success: true };
  });
```

---

## Code Comparison

### BEFORE (Broken)

```typescript
// File: src/features/planning/infrastructure/persistence.ts:222

private async persistAuxiliaryTables(snapshot: SnapshotType): Promise<void> {
  try {
    // ❌ Imports repository (which imports DB code)
    const { saveInterviewAnswer, saveFormResponse } = await import("./repository");

    // ❌ Tries to call DB functions from browser
    const step2Promises = snapshot.context.step2Answers.map((answer: any) =>
      saveInterviewAnswer(this.projectId, 2, answer.question, answer.answer)
    );

    await Promise.all([...step2Promises, /* etc */]);
  } catch (error) {
    // Error: SyntaxError - cannot load better-sqlite3 in browser
    console.error("[StatePersistence] Auxiliary table persistence failed:", error);
  }
}
```

**Call Chain:**
```
Browser → import("./repository") → repository.ts → server.db.ts → better-sqlite3 ❌
```

### AFTER (Fixed)

```typescript
// File: src/features/planning/infrastructure/persistence.ts:222

private async persistAuxiliaryTables(snapshot: SnapshotType): Promise<void> {
  try {
    // ✅ Imports server function stubs (safe for browser)
    const { $saveInterviewAnswer, $saveFormResponses } = await import("./server-functions");

    // ✅ Calls server functions (RPC to server)
    const step2Promises = snapshot.context.step2Answers.map((answer: any) =>
      $saveInterviewAnswer({
        data: {
          projectId: this.projectId,
          stepNumber: 2,
          question: answer.question,
          answer: answer.answer,
        },
      })
    );

    await Promise.all([...step2Promises, /* etc */]);
  } catch (error) {
    // Error handling for network/server errors (not module loading)
    console.error("[StatePersistence] Auxiliary table persistence failed:", error);
  }
}
```

**Call Chain:**
```
Browser → import("./server-functions") → RPC call → Server executes → DB access ✅
```

---

## Proven Pattern

This pattern **already works** for main state persistence:

```typescript
// File: src/features/planning/infrastructure/persistence.ts:168

private async persistAllToDatabase(snapshot: SnapshotType): Promise<void> {
  try {
    // ✅ Uses server function (works correctly)
    const { $savePlanningState } = await import("./server-functions");

    await $savePlanningState({
      data: {
        projectId: this.projectId,
        snapshot: cleanSnapshot,
      },
    });

    // ✅ No errors, persists successfully

  } catch (error) {
    console.error("[StatePersistence] Database sync failed:", error);
  }
}
```

**Auxiliary persistence should use the same pattern.**

---

## Summary

| Aspect | Current (Broken) | Fixed |
|--------|------------------|-------|
| **Import** | `./repository` | `./server-functions` |
| **Function** | `saveInterviewAnswer()` | `$saveInterviewAnswer()` |
| **Execution** | Browser (fails) | Server (works) |
| **Module Access** | Direct (impossible) | RPC (safe) |
| **Error** | SyntaxError (Node.js module) | Network/server errors only |
| **Pattern** | Direct DB access | Server function RPC |
| **Status** | ❌ Fails | ✅ Works |

**The fix:** Use server functions for all client-to-server communication.
