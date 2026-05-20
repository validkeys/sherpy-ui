# Database Schema Documentation

**Version:** 1.0  
**Last Updated:** 2026-05-14  
**Status:** Current

---

## Overview

The Sherpy planning workflow uses **localStorage** for client-side state persistence, not a traditional database. The XState v5 planning machine state is serialized and stored in the browser's localStorage, allowing users to resume their planning session after page reloads or browser restarts.

### Why localStorage?

- **Client-side only:** No backend database required for MVP
- **Instant persistence:** State saved automatically on every state change
- **XState v5 native:** Uses XState's built-in snapshot serialization
- **Privacy:** Data stays in user's browser

---

## Storage Structure

### Key Format

```
planning-machine-{projectId}
```

**Example:** `planning-machine-proj_healthcare-portal-001`

### Value Format

Complete XState v5 snapshot serialized as JSON string. See [XState Snapshot Structure](#xstate-snapshot-structure) below.

---

## XState Snapshot Structure

### Complete Snapshot Schema

```typescript
{
  // XState v5 required fields
  "status": "active" | "done" | "error" | "stopped",
  "value": string | object,
  "context": PlanningContext,
  "children": {},
  "historyValue": {},
  "tags": string[],
  
  // Optional XState fields
  "output": any,
  "error": any
}
```

### Critical Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `"active"` \| `"done"` \| `"error"` \| `"stopped"` | ✅ | Actor lifecycle status. **Must be "active" for restoration** |
| `value` | `string` \| `object` | ✅ | Current state node (e.g., `"step1.idle"` or `{"step2": "waitingForQuestion"}`) |
| `context` | `PlanningContext` | ✅ | Full application state (see below) |
| `children` | `object` | ✅ | XState child actors (usually empty `{}`) |
| `historyValue` | `object` | ✅ | XState history tracking (usually empty `{}`) |
| `tags` | `string[]` | ✅ | XState state tags |

---

## PlanningContext Schema

The `context` field contains all application state:

```typescript
type PlanningContext = {
  // Project Identity
  projectId: string;                    // e.g., "proj_healthcare-portal-001"
  entryPath: "new-project" | "existing-project";
  startedAt: string;                    // ISO 8601 timestamp
  updatedAt: string;                    // ISO 8601 timestamp
  
  // Step 1: Gap Analysis (form)
  step1Responses: Record<string, string>;
  
  // Step 2: Business Requirements (interview)
  step2Answers: InterviewAnswer[];
  step2CurrentQuestion: string | null;
  step2CurrentOptions: string[] | null;
  
  // Step 3: Technical Requirements (interview)
  step3Answers: InterviewAnswer[];
  step3CurrentQuestion: string | null;
  step3CurrentOptions: string[] | null;
  
  // Step 5: Implementation Planner (form)
  step5Responses: Record<string, string>;
  
  // Step 7: Architecture Decisions (artifact-only)
  step7Edits: string | null;
  
  // Artifacts (generated documents)
  artifacts: StepArtifactMap;           // Record<number, Artifact | undefined>
  
  // Navigation
  completedSteps: number[];             // Array of completed step numbers (1-10)
  currentStepNumber: number;            // Current step (1-10)
  
  // Error state
  error: string | null;
};
```

### Supporting Types

```typescript
type InterviewAnswer = {
  question: string;    // The question text
  value: string;       // User's answer
  timestamp: string;   // ISO 8601 timestamp
};

type Artifact = {
  type: "yaml" | "markdown";
  content: string;              // Generated document content
  generatedAt: string;          // ISO 8601 timestamp
};

type StepArtifactMap = Record<number, Artifact | undefined>;
```

---

## Example Snapshots

### Example 1: Step 1 (Gap Analysis - Initial State)

```json
{
  "status": "active",
  "value": {
    "step1": "idle"
  },
  "context": {
    "projectId": "proj_healthcare-portal-001",
    "entryPath": "new-project",
    "startedAt": "2026-05-14T10:00:00.000Z",
    "updatedAt": "2026-05-14T10:00:00.000Z",
    "step1Responses": {},
    "step2Answers": [],
    "step2CurrentQuestion": null,
    "step2CurrentOptions": null,
    "step3Answers": [],
    "step3CurrentQuestion": null,
    "step3CurrentOptions": null,
    "step5Responses": {},
    "step7Edits": null,
    "artifacts": {},
    "completedSteps": [],
    "currentStepNumber": 1,
    "error": null
  },
  "children": {},
  "historyValue": {},
  "tags": []
}
```

### Example 2: Step 5 (Implementation Planner - Mid-Workflow)

```json
{
  "status": "active",
  "value": {
    "step5": "idle"
  },
  "context": {
    "projectId": "proj_healthcare-portal-001",
    "entryPath": "new-project",
    "startedAt": "2026-05-14T10:00:00.000Z",
    "updatedAt": "2026-05-14T10:15:30.000Z",
    "step1Responses": {
      "existingRequirements": "No, starting from scratch",
      "projectDescription": "Healthcare patient portal with appointment scheduling"
    },
    "step2Answers": [
      {
        "question": "What is the primary problem your healthcare patient portal aims to solve?",
        "value": "Automate manual appointment scheduling workflow",
        "timestamp": "2026-05-14T10:02:00.000Z"
      },
      {
        "question": "Who are the primary users of this system?",
        "value": "Patients, healthcare providers, and administrative staff",
        "timestamp": "2026-05-14T10:02:30.000Z"
      }
      // ... 8 more answers (10 total)
    ],
    "step2CurrentQuestion": null,
    "step2CurrentOptions": null,
    "step3Answers": [
      {
        "question": "What is your preferred technology stack?",
        "value": "React, TypeScript, Node.js, PostgreSQL",
        "timestamp": "2026-05-14T10:08:00.000Z"
      }
      // ... 9 more answers (10 total)
    ],
    "step3CurrentQuestion": null,
    "step3CurrentOptions": null,
    "step5Responses": {},
    "step7Edits": null,
    "artifacts": {
      "1": {
        "type": "markdown",
        "content": "# Gap Analysis\n\n## Current State\nNo existing requirements...",
        "generatedAt": "2026-05-14T10:01:45.000Z"
      },
      "2": {
        "type": "yaml",
        "content": "# Business Requirements\n\nproject:\n  name: Healthcare Patient Portal...",
        "generatedAt": "2026-05-14T10:05:12.000Z"
      },
      "3": {
        "type": "yaml",
        "content": "# Technical Requirements\n\ntechnology_stack:\n  frontend: React...",
        "generatedAt": "2026-05-14T10:10:45.000Z"
      },
      "4": {
        "type": "markdown",
        "content": "# Style Anchors\n\n## Component Pattern\n```tsx\nexport function...",
        "generatedAt": "2026-05-14T10:12:30.000Z"
      }
    },
    "completedSteps": [1, 2, 3, 4],
    "currentStepNumber": 5,
    "error": null
  },
  "children": {},
  "historyValue": {},
  "tags": []
}
```

### Example 3: Step 10 (Final Step - All Complete)

```json
{
  "status": "active",
  "value": {
    "step10": "idle"
  },
  "context": {
    "projectId": "proj_healthcare-portal-001",
    "entryPath": "new-project",
    "startedAt": "2026-05-14T10:00:00.000Z",
    "updatedAt": "2026-05-14T10:45:00.000Z",
    "step1Responses": {
      "existingRequirements": "No, starting from scratch",
      "projectDescription": "Healthcare patient portal with appointment scheduling"
    },
    "step2Answers": [
      /* 10 business requirement answers */
    ],
    "step2CurrentQuestion": null,
    "step2CurrentOptions": null,
    "step3Answers": [
      /* 10 technical requirement answers */
    ],
    "step3CurrentQuestion": null,
    "step3CurrentOptions": null,
    "step5Responses": {
      "deploymentStrategy": "Cloud-native on AWS",
      "techStack": "React, TypeScript, Node.js, PostgreSQL"
    },
    "step7Edits": null,
    "artifacts": {
      "1": { /* Gap Analysis */ },
      "2": { /* Business Requirements */ },
      "3": { /* Technical Requirements */ },
      "4": { /* Style Anchors */ },
      "5": { /* Implementation Plan */ },
      "6": { /* Definition of Done */ },
      "7": { /* Architecture Decisions */ },
      "8": { /* Delivery Timeline */ },
      "9": { /* QA Test Plan */ },
      "10": {
        "type": "markdown",
        "content": "# Executive Summary\n\n## Project Overview...",
        "generatedAt": "2026-05-14T10:45:00.000Z"
      }
    },
    "completedSteps": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "currentStepNumber": 10,
    "error": null
  },
  "children": {},
  "historyValue": {},
  "tags": []
}
```

---

## State Value Patterns

The `value` field represents the current state node in the XState machine:

### Simple State (String)
```json
"value": "step1"
```

### Nested State (Object)
```json
"value": {
  "step2": "waitingForQuestion"
}
```

### Common State Patterns by Step

| Step | Type | Idle State | Submitting State | Generating Artifact |
|------|------|------------|------------------|---------------------|
| 1 | Form | `{"step1": "idle"}` | `{"step1": "submitting"}` | `{"step1": "generatingArtifact"}` |
| 2 | Interview | `{"step2": "waitingForQuestion"}` | N/A | `{"step2": "generatingArtifact"}` |
| 3 | Interview | `{"step3": "waitingForQuestion"}` | N/A | `{"step3": "generatingArtifact"}` |
| 4 | Automated | `{"step4": "generating"}` | N/A | N/A (auto-generates) |
| 5 | Form | `{"step5": "idle"}` | `{"step5": "submitting"}` | `{"step5": "generatingArtifact"}` |
| 6-10 | Automated/Artifact | Similar patterns | N/A | Auto-generates on entry |

---

## Persistence Rules

### When State is Saved

State is saved to localStorage after **every state transition** EXCEPT:

❌ **Transient states (NOT saved):**
- `submitting` - Form submission in progress
- `generatingArtifact` - AI generation in progress
- `waitingForQuestion` (during fetch) - API call in progress

✅ **Stable states (saved):**
- `idle` - Ready for user input
- `waitingForQuestion` (with question loaded) - Question displayed
- `success` - Operation completed
- `error` - Error occurred

### Snapshot Status Field

The `status` field must be:
- ✅ `"active"` - Normal operation, can be restored
- ❌ `"stopped"` - Actor stopped, **cannot be restored**
- ❌ `"error"` - Actor in error state
- ❌ `"done"` - Actor reached final state

**Important:** The system automatically forces `status: "active"` when loading snapshots to prevent restoration failures.

---

## Data Constraints

### Required Fields

The following fields **must** be present for valid restoration:

```typescript
{
  status: "active",           // Must be "active"
  value: <any>,               // Must exist
  context: {
    projectId: string,        // Must be non-empty
    currentStepNumber: number // Must be 1-10
  }
}
```

### Field Sizes

| Field | Type | Max Size | Notes |
|-------|------|----------|-------|
| `projectId` | string | 100 chars | Usually 30-50 chars |
| `step1Responses` | object | ~2KB | 2-3 text fields |
| `step2Answers` | array | ~5KB | 10 Q&A pairs |
| `step3Answers` | array | ~5KB | 10 Q&A pairs |
| `artifacts[n]` | object | ~10KB each | Generated documents |
| **Total Snapshot** | JSON | ~150KB | All steps complete |

**localStorage limit:** 5-10MB per origin (browser-dependent)

---

## Validation

### Loading Validation

When loading a snapshot from localStorage, the system validates:

1. **JSON parsing succeeds**
2. **Required fields exist:**
   - `status`, `value`, `context`
3. **Context has critical fields:**
   - `projectId` (non-empty string)
   - `currentStepNumber` (number)
4. **Status is not "stopped"**
   - If stopped, force to "active"

### Validation Errors

If validation fails:
1. Log warning to console
2. Clear invalid snapshot from localStorage
3. Return `null` (start fresh)

---

## Recovery Strategies

### Corrupted Snapshot

**Symptom:** localStorage contains invalid JSON or missing fields

**Recovery:**
1. Clear localStorage key
2. Start fresh at Step 1
3. User loses progress (unavoidable)

### Stale Snapshot

**Symptom:** Snapshot from old version with incompatible schema

**Recovery:**
1. Add version field to snapshots (future enhancement)
2. Migrate old snapshots (future enhancement)
3. For now: Clear and start fresh

### Stopped Actor

**Symptom:** Snapshot has `status: "stopped"`

**Recovery:**
1. Force `status: "active"` during load
2. Actor restores successfully
3. Prevents BUG-011 (stopped actor ignores events)

---

## Testing Fixtures

For testing, use `PlanningStateBuilder` (to be implemented) to generate valid snapshots:

```typescript
// Example: Create test snapshot at Step 5
const snapshot = PlanningStateBuilder
  .atStep(5)
  .withProjectId("test-project-001")
  .build();

// Save to localStorage
localStorage.setItem(
  'planning-machine-test-project-001',
  JSON.stringify(snapshot)
);
```

---

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    localStorage                              │
│  Key: planning-machine-{projectId}                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ JSON string
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  XState v5 Snapshot                          │
│ ┌─────────────┬─────────────────────────────────────────┐   │
│ │ status      │ "active"                                │   │
│ ├─────────────┼─────────────────────────────────────────┤   │
│ │ value       │ {"step5": "idle"}                       │   │
│ ├─────────────┼─────────────────────────────────────────┤   │
│ │ context     │ PlanningContext (see below)             │   │
│ ├─────────────┼─────────────────────────────────────────┤   │
│ │ children    │ {}                                       │   │
│ ├─────────────┼─────────────────────────────────────────┤   │
│ │ historyValue│ {}                                       │   │
│ ├─────────────┼─────────────────────────────────────────┤   │
│ │ tags        │ []                                       │   │
│ └─────────────┴─────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ context field
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   PlanningContext                            │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ Project Identity                                     │    │
│ │  • projectId: string                                 │    │
│ │  • entryPath: "new-project" | "existing-project"     │    │
│ │  • startedAt: ISO timestamp                          │    │
│ │  • updatedAt: ISO timestamp                          │    │
│ ├──────────────────────────────────────────────────────┤    │
│ │ Step Data (steps 1-10)                               │    │
│ │  • step1Responses: Record<string, string>            │    │
│ │  • step2Answers: InterviewAnswer[]                   │    │
│ │  • step3Answers: InterviewAnswer[]                   │    │
│ │  • step5Responses: Record<string, string>            │    │
│ │  • step7Edits: string | null                         │    │
│ ├──────────────────────────────────────────────────────┤    │
│ │ Generated Artifacts                                  │    │
│ │  • artifacts: {                                      │    │
│ │      1: Artifact (Gap Analysis),                     │    │
│ │      2: Artifact (Business Requirements),            │    │
│ │      ...                                             │    │
│ │      10: Artifact (Summaries)                        │    │
│ │    }                                                 │    │
│ ├──────────────────────────────────────────────────────┤    │
│ │ Navigation                                           │    │
│ │  • completedSteps: number[]                          │    │
│ │  • currentStepNumber: number (1-10)                  │    │
│ ├──────────────────────────────────────────────────────┤    │
│ │ Error State                                          │    │
│ │  • error: string | null                              │    │
│ └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## References

- **Implementation:** `src/features/planning/machines/PlanningMachineContext.tsx`
- **Type Definitions:** `src/features/planning/machines/types.ts`
- **XState v5 Docs:** https://stately.ai/docs/xstate/state/snapshots
- **localStorage API:** https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

---

## Changelog

### Version 1.0 (2026-05-14)
- Initial documentation
- Documented localStorage persistence structure
- Added example snapshots for steps 1, 5, 10
- Documented validation and recovery strategies
