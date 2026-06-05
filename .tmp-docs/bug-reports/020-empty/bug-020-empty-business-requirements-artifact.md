# BUG-020: Empty Business Requirements Artifact

**Reported**: 2026-05-22  
**Fixed**: 2026-05-22  
**Status**: ✅ FIXED and VERIFIED  
**Severity**: High (data loss)

## Problem

When completing Step 2 (Business Requirements) interview:
1. User answers all 10 questions
2. Immediately taken to Step 3 (Technical Requirements)
3. No indication that document generation is happening
4. Business requirements artifact exists but contains NO content from interview

## Root Cause

**Data mapping mismatch between XState machine and generateArtifact actor**

### Step 2 Machine (line 709):
```typescript
accumulatedContext: {
  responses: context.step1Responses,
  answers: context.step2Answers,  // ❌ Key name: "answers"
  projectOverview: buildProjectContext(context),
},
```

### generateArtifact Actor (line 172):
```typescript
} else if (input.stepNumber === 2 && input.accumulatedContext.step2Answers) {
  // ❌ Looking for "step2Answers" - NEVER MATCHES!
  const stepAnswers = input.accumulatedContext.step2Answers as Array<{
    value: string;
  }>;
  answers.push(...stepAnswers.map((a) => a.value));
}
```

**Result**: Condition never matches → `answers` array stays empty → artifact generated with zero interview data

## Same Issue for Step 3

Step 3 has identical problem (lines 820-825):
```typescript
accumulatedContext: {
  responses: context.step1Responses,
  step2Answers: context.step2Answers,
  step3Answers: context.step3Answers,  // ✅ Correct
  projectOverview: buildProjectContext(context),
},
```

**Step 3 works** because it uses the correct key name `step3Answers`.

## Impact

- ✅ Step 1: Works (uses `step1Responses`)
- ❌ Step 2: Broken (passes `answers`, expects `step2Answers`)
- ✅ Step 3: Works (uses `step3Answers`)
- ❓ Steps 5+: Need verification

## Solution

**Option A**: Update machine to use consistent key names
```typescript
// Line 709 - Step 2
accumulatedContext: {
  responses: context.step1Responses,
  step2Answers: context.step2Answers,  // ✅ Match actor expectation
  projectOverview: buildProjectContext(context),
},
```

**Option B**: Update actor to match machine key names
```typescript
// Line 172 - Actor
} else if (input.stepNumber === 2 && input.accumulatedContext.answers) {
  const stepAnswers = input.accumulatedContext.answers as Array<{
    value: string;
  }>;
  answers.push(...stepAnswers.map((a) => a.value));
}
```

**Recommendation**: Use **Option A** for consistency with Step 3's pattern.

## Testing Plan

1. Start fresh project
2. Complete Step 1 (Gap Analysis)
3. Answer all 10 questions in Step 2
4. Verify artifact generation loading state appears
5. Navigate to `/project/{id}/review`
6. Verify business-requirements artifact contains all 10 Q&A pairs
7. Repeat for Step 3

## Files to Change

- `src/features/planning/machines/planningMachine.ts` (line 709)

## Related Issues

- BUG-019: Interview answers not persisted to database (FIXED)
- BUG-018: SSR hydration mismatch (FIXED)
