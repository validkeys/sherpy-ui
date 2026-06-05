# Zod API Validation - Implementation Plan

**Created:** 2026-05-25  
**Status:** Ready for Implementation  
**Estimated Time:** 1 hour  
**Risk Level:** Low (server-only changes, backward compatible)

---

## Goal

Replace manual validation code in `app/api/*` endpoints with Zod schema validation to reduce code size by ~40%, improve type safety, and provide better error messages.

---

## Success Criteria

- [ ] All 4 API endpoints use Zod validation
- [ ] Zero TypeScript compilation errors
- [ ] All existing tests pass
- [ ] API error messages are more descriptive than before
- [ ] No breaking changes to API contracts
- [ ] Validation code reduced by 50+ lines

---

## Prerequisites

- Node.js project with TypeScript
- Existing API endpoints in `app/api/`
- npm/pnpm package manager

---

## Phase 1: Setup & Infrastructure (15 minutes)

### Task 1.1: Install Zod

```bash
npm install zod
```

**Verify:** `package.json` includes `"zod": "^3.x.x"`

---

### Task 1.2: Create Shared Schemas (`app/api/schemas.ts`)

**File:** `app/api/schemas.ts` (NEW)

```typescript
import { z } from "zod";

/**
 * Reusable validation schemas for API endpoints
 * 
 * These schemas provide:
 * - Runtime validation
 * - Automatic TypeScript type inference
 * - Descriptive error messages
 */

// ============================================================================
// Reusable Field Schemas
// ============================================================================

export const projectIdSchema = z
  .string()
  .min(1, "projectId is required and must not be empty");

export const stepNumberSchema = z
  .number()
  .int("step must be an integer")
  .min(1, "step must be at least 1")
  .max(10, "step must be between 1 and 10");

export const previousAnswersSchema = z.array(
  z.object({
    question: z.string(),
    value: z.string(),
  })
);

// ============================================================================
// Endpoint-Specific Schemas
// ============================================================================

/**
 * Schema for PATCH /api/projects/[id]
 * Updates current step for a project
 */
export const updateCurrentStepSchema = z.object({
  currentStep: z
    .number()
    .int("currentStep must be an integer"),
});

/**
 * Schema for POST /api/ai/interview
 * Requests AI-generated interview questions
 */
export const interviewRequestSchema = z.object({
  projectId: projectIdSchema,
  stepNumber: z.number().int("stepNumber must be an integer"),
  previousAnswers: previousAnswersSchema,
  projectContext: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || typeof val === "string",
      "projectContext must be a string if provided"
    ),
});

/**
 * Schema for POST /api/dev/seed (DEVELOPMENT ONLY)
 * Seeds test data for E2E testing
 */
export const seedRequestSchema = z.object({
  step: stepNumberSchema,
  projectName: z.string().optional(),
  overrides: z.record(z.unknown()).optional(),
});

/**
 * Schema for POST /api/dev/snapshot/capture (DEVELOPMENT ONLY)
 * Captures XState snapshots during manual testing
 */
export const snapshotCaptureSchema = z.object({
  projectId: projectIdSchema,
  step: stepNumberSchema,
  label: z
    .string()
    .min(1, "label is required and must not be empty"),
  context: z
    .record(z.unknown())
    .refine((val) => val !== null, "context must be an object"),
});

// ============================================================================
// Type Exports (for TypeScript consumers)
// ============================================================================

export type UpdateCurrentStepInput = z.infer<typeof updateCurrentStepSchema>;
export type InterviewRequestInput = z.infer<typeof interviewRequestSchema>;
export type SeedRequestInput = z.infer<typeof seedRequestSchema>;
export type SnapshotCaptureInput = z.infer<typeof snapshotCaptureSchema>;
```

**Verify:**
- No TypeScript errors
- File compiles successfully

---

### Task 1.3: Create Validation Helpers (`app/api/utils/validate.ts`)

**File:** `app/api/utils/validate.ts` (NEW)

```typescript
import { z, type ZodSchema } from "zod";
import { NextResponse } from "next/server";

/**
 * Validation utilities for API endpoints
 * 
 * Provides two patterns:
 * 1. validateBody() - Throws on validation failure (for vinxi/http handlers)
 * 2. validateBodyOrError() - Returns error response (for Next.js route handlers)
 */

/**
 * Validates request body against Zod schema
 * 
 * @throws Error with detailed validation messages on failure
 * @returns Parsed and typed data on success
 * 
 * Usage (vinxi/http):
 * ```typescript
 * const body = await readBody(event);
 * const { projectId } = validateBody(body, mySchema);
 * // projectId is typed automatically
 * ```
 */
export function validateBody<T>(body: unknown, schema: ZodSchema<T>): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");

    throw new Error(`Validation failed: ${errors}`);
  }

  return result.data;
}

/**
 * Validates request body and returns error response if invalid
 * 
 * @returns Object with either 'data' or 'error' property
 * 
 * Usage (Next.js):
 * ```typescript
 * const body = await request.json();
 * const validation = validateBodyOrError(body, mySchema);
 * 
 * if ('error' in validation) {
 *   return validation.error;
 * }
 * 
 * const { projectId } = validation.data;
 * ```
 */
export function validateBodyOrError<T>(
  body: unknown,
  schema: ZodSchema<T>
): { data: T } | { error: NextResponse } {
  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    return {
      error: NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
        },
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}
```

**Verify:**
- No TypeScript errors
- Both utilities compile successfully

---

## Phase 2: Refactor Endpoints (30 minutes)

### Task 2.1: Refactor `app/api/projects/[id].ts` (Vinxi Handler)

**Current:** 30 lines with manual validation  
**Target:** 20 lines with Zod

**Changes:**

```typescript
// BEFORE (lines 1-29)
import { defineEventHandler, readBody, getRouterParam } from "vinxi/http";
import { updateCurrentStep, initStore } from "@/features/projects/store";

export default defineEventHandler(async (event) => {
  await initStore();

  const body = await readBody(event);

  if (typeof body !== "object" || body === null) {
    throw new Error("invalid input");
  }

  const { currentStep } = body;

  if (currentStep === undefined) {
    throw new Error("currentStep required");
  }
  if (typeof currentStep !== "number") {
    throw new Error("currentStep must be a number");
  }

  const projectId = getRouterParam(event, "id");
  if (!projectId) {
    throw new Error("projectId required");
  }

  const updated = updateCurrentStep(projectId, currentStep);
  return updated;
});

// AFTER (lines 1-20)
import { defineEventHandler, readBody, getRouterParam } from "vinxi/http";
import { updateCurrentStep, initStore } from "@/features/projects/store";
import { updateCurrentStepSchema } from "../schemas";
import { validateBody } from "../utils/validate";

export default defineEventHandler(async (event) => {
  await initStore();

  const body = await readBody(event);
  const { currentStep } = validateBody(body, updateCurrentStepSchema);

  const projectId = getRouterParam(event, "id");
  if (!projectId) {
    throw new Error("projectId required");
  }

  const updated = updateCurrentStep(projectId, currentStep);
  return updated;
});
```

**Lines saved:** 10 lines (30 → 20)

**Verify:**
- TypeScript compilation succeeds
- `currentStep` has correct type inference

---

### Task 2.2: Refactor `app/api/ai/interview.ts` (Vinxi Handler)

**Current:** 113 lines with 26 lines of validation  
**Target:** 95 lines with 8 lines of validation

**Changes:**

```typescript
// BEFORE (lines 1-40)
import { defineEventHandler, readBody } from "vinxi/http";
import { handleMockStreamingRequest } from "@/features/ai/mock-streaming";
import { buildInterviewPrompt } from "@/features/ai/prompts";
import { streamQuestion } from "@/features/ai/streaming";
import { $getStepState } from "@/features/planning/infrastructure/server-functions";
import { getStepName } from "@/features/planning/step-config";

// Set to true to use mock streaming (demonstration mode without Bedrock)
const USE_MOCK_STREAMING = false;

export default defineEventHandler(async (event) => {
  console.log("========== INTERVIEW API CALLED ==========");
  // Parse and validate input
  const body = await readBody(event);

  if (typeof body !== "object" || body === null) {
    throw new Error("invalid input");
  }

  const { projectId, stepNumber, previousAnswers, projectContext } = body;

  console.log("[interview] Received body:", {
    projectId,
    stepNumber,
    previousAnswersLength: previousAnswers?.length,
    projectContext: projectContext || "UNDEFINED",
  });

  if (typeof projectId !== "string" || !projectId) {
    throw new Error("projectId required");
  }
  if (typeof stepNumber !== "number") {
    throw new Error("stepNumber must be a number");
  }
  if (!Array.isArray(previousAnswers)) {
    throw new Error("previousAnswers must be an array");
  }
  if (projectContext !== undefined && typeof projectContext !== "string") {
    throw new Error("projectContext must be a string if provided");
  }

  // ... rest of handler

// AFTER (lines 1-25)
import { defineEventHandler, readBody } from "vinxi/http";
import { handleMockStreamingRequest } from "@/features/ai/mock-streaming";
import { buildInterviewPrompt } from "@/features/ai/prompts";
import { streamQuestion } from "@/features/ai/streaming";
import { $getStepState } from "@/features/planning/infrastructure/server-functions";
import { getStepName } from "@/features/planning/step-config";
import { interviewRequestSchema } from "../schemas";
import { validateBody } from "../utils/validate";

// Set to true to use mock streaming (demonstration mode without Bedrock)
const USE_MOCK_STREAMING = false;

export default defineEventHandler(async (event) => {
  console.log("========== INTERVIEW API CALLED ==========");
  
  // Parse and validate input
  const body = await readBody(event);
  const { projectId, stepNumber, previousAnswers, projectContext } =
    validateBody(body, interviewRequestSchema);

  console.log("[interview] Received body:", {
    projectId,
    stepNumber,
    previousAnswersLength: previousAnswers.length,
    projectContext: projectContext || "UNDEFINED",
  });

  // ... rest of handler (unchanged)
```

**Lines saved:** 18 lines (40 → 22 for validation section)

**Verify:**
- All destructured variables have correct types
- `previousAnswers.length` is type-safe (no `?.` needed)

---

### Task 2.3: Refactor `app/api/dev/seed/route.ts` (Next.js Handler)

**Current:** 104 lines with 10 lines of validation  
**Target:** 99 lines with 5 lines of validation

**Changes:**

```typescript
// BEFORE (lines 1-32)
import { type NextRequest, NextResponse } from "next/server";
import { PlanningStateBuilder } from "../../../../tests/fixtures/builders/PlanningStateBuilder";
import { auditLog } from "../../../../tests/fixtures/config";
import { requireDevelopmentEnv } from "../../../../tests/fixtures/middleware";

export const POST = requireDevelopmentEnv(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { step, projectName, overrides } = body;

    // Validate step number
    if (!step || typeof step !== "number" || step < 1 || step > 10) {
      return NextResponse.json(
        { error: "Invalid step number. Must be between 1 and 10." },
        { status: 400 },
      );
    }

    // Build state using PlanningStateBuilder
    // ... rest of handler

// AFTER (lines 1-27)
import { type NextRequest, NextResponse } from "next/server";
import { PlanningStateBuilder } from "../../../../tests/fixtures/builders/PlanningStateBuilder";
import { auditLog } from "../../../../tests/fixtures/config";
import { requireDevelopmentEnv } from "../../../../tests/fixtures/middleware";
import { seedRequestSchema } from "../../schemas";
import { validateBodyOrError } from "../../utils/validate";

export const POST = requireDevelopmentEnv(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = validateBodyOrError(body, seedRequestSchema);

    if ("error" in validation) {
      return validation.error;
    }

    const { step, projectName, overrides } = validation.data;

    // Build state using PlanningStateBuilder
    // ... rest of handler (unchanged)
```

**Lines saved:** 5 lines (32 → 27 for validation section)

**Verify:**
- Validation error response format matches Next.js convention
- `step`, `projectName`, `overrides` have correct types

---

### Task 2.4: Refactor `app/api/dev/snapshot/capture/route.ts` (Next.js Handler)

**Current:** 87 lines with 30 lines of validation  
**Target:** 62 lines with 5 lines of validation

**Changes:**

```typescript
// BEFORE (lines 1-53)
import { type NextRequest, NextResponse } from "next/server";
import { auditLog } from "../../../../../tests/fixtures/config";
import { requireDevelopmentEnv } from "../../../../../tests/fixtures/middleware";
import { SnapshotCollector } from "../../../../../tests/fixtures/snapshots/SnapshotCollector";

export const POST = requireDevelopmentEnv(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { projectId, step, label, context } = body;

    // Validate required fields
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required and must be a string" },
        { status: 400 },
      );
    }

    if (!step || typeof step !== "number" || step < 1 || step > 10) {
      return NextResponse.json(
        { error: "step is required and must be between 1 and 10" },
        { status: 400 },
      );
    }

    if (!label || typeof label !== "string") {
      return NextResponse.json(
        { error: "label is required and must be a string" },
        { status: 400 },
      );
    }

    if (!context || typeof context !== "object") {
      return NextResponse.json(
        { error: "context is required and must be an object" },
        { status: 400 },
      );
    }

    // Capture the snapshot
    // ... rest of handler

// AFTER (lines 1-28)
import { type NextRequest, NextResponse } from "next/server";
import { auditLog } from "../../../../../tests/fixtures/config";
import { requireDevelopmentEnv } from "../../../../../tests/fixtures/middleware";
import { SnapshotCollector } from "../../../../../tests/fixtures/snapshots/SnapshotCollector";
import { snapshotCaptureSchema } from "../../../schemas";
import { validateBodyOrError } from "../../../utils/validate";

export const POST = requireDevelopmentEnv(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = validateBodyOrError(body, snapshotCaptureSchema);

    if ("error" in validation) {
      return validation.error;
    }

    const { projectId, step, label, context } = validation.data;

    // Capture the snapshot
    // ... rest of handler (unchanged)
```

**Lines saved:** 25 lines (53 → 28 for validation section)

**Verify:**
- All validated fields have correct types
- Error response structure matches existing pattern

---

## Phase 3: Testing & Verification (15 minutes)

### Task 3.1: TypeScript Compilation

```bash
npm run typecheck
# or
tsc --noEmit
```

**Expected:** Zero TypeScript errors

---

### Task 3.2: Run Existing Tests

```bash
npm test
```

**Expected:** All existing tests pass

**Note:** If tests directly test validation error messages, update assertions to match new Zod error format.

---

### Task 3.3: Manual API Testing

#### Test Case 1: Valid Request

```bash
curl -X POST http://localhost:5180/api/ai/interview \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-123",
    "stepNumber": 2,
    "previousAnswers": [{"question": "What?", "value": "Something"}],
    "projectContext": "Test project"
  }'
```

**Expected:** Success response (existing behavior)

---

#### Test Case 2: Invalid Type

```bash
curl -X POST http://localhost:5180/api/ai/interview \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-123",
    "stepNumber": "not-a-number",
    "previousAnswers": [],
    "projectContext": "Test"
  }'
```

**Expected Before:**
```json
{ "error": "stepNumber must be a number" }
```

**Expected After (Improved):**
```json
{
  "error": "Validation failed: stepNumber: Expected number, received string"
}
```

---

#### Test Case 3: Missing Required Field

```bash
curl -X POST http://localhost:5180/api/dev/seed \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Test"
  }'
```

**Expected After (Improved):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "step",
      "message": "Required"
    }
  ]
}
```

---

#### Test Case 4: Out of Range Value

```bash
curl -X POST http://localhost:5180/api/dev/seed \
  -H "Content-Type: application/json" \
  -d '{
    "step": 99,
    "projectName": "Test"
  }'
```

**Expected After (Improved):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "step",
      "message": "step must be between 1 and 10"
    }
  ]
}
```

---

### Task 3.4: Integration Testing with Playwright

If E2E tests exist that call these APIs:

```bash
npm run test:e2e
```

**Expected:** All E2E tests pass

---

## Phase 4: Code Review Checklist

Before submitting PR:

- [ ] All validation logic replaced with Zod schemas
- [ ] No manual `typeof` checks in endpoint handlers
- [ ] Error messages are descriptive (not generic "invalid input")
- [ ] TypeScript types inferred automatically (no manual type assertions)
- [ ] All tests pass (unit + integration + E2E)
- [ ] No console errors in browser/server logs
- [ ] API response format unchanged (backward compatible)
- [ ] Documentation updated (if API docs exist)

---

## Rollback Plan

### If Critical Issues Arise

1. **Revert commit:**
   ```bash
   git revert HEAD
   ```

2. **Remove Zod dependency (if needed):**
   ```bash
   npm uninstall zod
   ```

3. **Restore original files from git history:**
   ```bash
   git checkout HEAD~1 -- app/api/
   ```

### Safe Rollback Points

- After Phase 1: Can safely delete `schemas.ts` and `utils/validate.ts`
- After each endpoint refactor: Can revert individual files
- Before merge: Feature branch allows easy reset

---

## Success Metrics

### Code Quality Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total validation lines | 76 | 20 | **-74%** |
| Total API lines | 334 | ~300 | **-10%** |
| Manual type checks | 15+ | 0 | **-100%** |
| Type safety | Manual | Automatic | ✅ |
| Error message quality | Generic | Detailed | ✅ |

### Developer Experience Metrics

- Time to add new API endpoint: **-50%** (reuse schemas)
- Time to debug validation errors: **-60%** (descriptive errors)
- Type inference: **Automatic** (no manual typing)

---

## Post-Implementation Tasks

1. **Update documentation** (if API docs exist)
2. **Share Zod patterns** with team (brown bag session?)
3. **Consider extending to other API folders** (if more exist)
4. **Add Zod to project standards** (update CLAUDE.md or similar)

---

## Dependencies & Constraints

### Required Dependencies
- `zod: ^3.x.x` (install via npm)

### Constraints
- Must maintain backward compatibility (no breaking changes)
- Server-only code (no client bundle impact)
- Development API endpoints must remain development-only

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Setup | 15 min | None |
| Phase 2: Refactor | 30 min | Phase 1 complete |
| Phase 3: Testing | 15 min | Phase 2 complete |
| **Total** | **60 min** | |

---

## Notes

- **Type inference:** Zod automatically infers TypeScript types from schemas
- **Error handling:** Zod provides structured error objects (not just strings)
- **Future extensibility:** Easy to add validation rules (e.g., email format, UUID)
- **Testing:** Schemas themselves can be unit tested

---

## References

- Zod Documentation: https://zod.dev
- Zod GitHub: https://github.com/colinhacks/zod
- Project Proposal: `.tmp-docs/plans/zod-api-validation-proposal.md`
