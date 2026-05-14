# Structured Output Refactor - Executive Summary

**Date:** 2026-05-08  
**Epic:** M5: Enterprise-Grade AI Integration  
**Complexity:** High | **Risk:** Medium | **Effort:** 8-12 hours

---

## Problem Statement

Current AI response handling uses text parsing which causes:
- ❌ **UI Duplication:** Question text includes `**Options:**` section, causing options to appear twice (text + cards)
- ❌ **Brittle Parser:** 25 test cases to handle edge cases (dashes in titles, special chars, whitespace variations)
- ❌ **Not Type-Safe:** Text parsing can fail silently; no compile-time guarantees
- ❌ **Maintenance Burden:** `parse-options.ts` (~150 LOC) requires constant edge case handling

## Solution: JSON Schema Structured Output

Leverage AWS Bedrock's `response_format` parameter to constrain LLM responses to valid JSON matching our schema.

### Architecture Change

**Before (Text Parsing):**
```
LLM → Free-text response → Complex regex parsing → Hope it works
```

**After (Structured Output):**
```
LLM → JSON Schema constraint → Validated JSON → Type-safe deserialization
```

### Key Benefits

1. **✅ Clean UI:** Question text separate from options (no duplication)
2. **✅ Type Safety:** TypeScript interfaces match JSON schemas exactly
3. **✅ Zero Parsing:** Direct JSON deserialization (no regex needed)
4. **✅ Simpler Code:** Delete `parse-options.ts` after full rollout (~150 LOC removed)
5. **✅ Enterprise-Grade:** Configuration-driven, self-documenting contracts
6. **✅ Maintainable:** Schema changes are explicit and versioned

## Implementation Plan

### 10 Tasks | 8-12 Hours Total

| Task | Name | Duration | Priority |
|------|------|----------|----------|
| t-struct-001 | Define JSON Schemas | 60 min | Critical |
| t-struct-002 | Add responseSchema to StepConfig | 45 min | Critical |
| t-struct-003 | Create Feature Flag System | 30 min | High |
| t-struct-004 | Update Bedrock Streaming | 90 min | Critical |
| t-struct-005 | Update Non-Streaming API | 60 min | High |
| t-struct-006 | Update React Hook | 90 min | Critical |
| t-struct-007 | Update InterviewThread Component | 45 min | High |
| t-struct-008 | Update API Route | 30 min | High |
| t-struct-009 | Comprehensive Tests | 120 min | Critical |
| t-struct-010 | Gradual Rollout + Docs | 60 min | High |

### Phased Rollout (Zero Downtime)

**Phase 1:** Step 1 only (1 question)  
**Phase 2:** Steps 1-3 (33 questions)  
**Phase 3:** All steps (full migration)

Feature flag: `USE_STRUCTURED_OUTPUT=true` + `STRUCTURED_OUTPUT_STEPS=1,2,3`

## JSON Schema Example

```typescript
// response-schemas.ts
export const INTERVIEW_QUESTION_SCHEMA = {
  type: "object",
  properties: {
    question: { 
      type: "string",
      description: "Question text WITHOUT options section" 
    },
    options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          letter: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          recommended: { type: "boolean" }
        },
        required: ["letter", "title", "body"]
      }
    },
    isComplete: { 
      type: "boolean",
      description: "True if step should complete (replaces [STEP_COMPLETE])"
    }
  },
  required: ["question", "options"]
};
```

## Bedrock Integration

```typescript
// streaming.ts
const body: any = {
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 512,
  messages,
};

// Add JSON Schema constraint
if (isStructuredOutputEnabled(stepNumber)) {
  const schema = getStepResponseSchema(stepNumber);
  if (schema) {
    body.response_format = {
      type: "json_schema",
      json_schema: schema,
    };
  }
}
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Bedrock schema support unavailable | Test in dev first; feature flag allows instant rollback |
| LLM returns invalid JSON | Bedrock enforces schema; add fallback to text parsing |
| Breaking changes to types | Schema must match existing StepOption interface exactly |
| User confusion during rollout | Gradual rollout by step; clear documentation |

## Success Criteria

- ✅ Zero duplicate option text in UI
- ✅ Question text clean (no `**Options:**` section)
- ✅ Type-safe LLM responses
- ✅ All 159 tests passing
- ✅ Feature flag enables safe rollout
- ✅ Rollback procedure tested

## Why This is Enterprise-Grade

1. **Configuration-Driven:** Schemas live in `step-config.ts` alongside step definitions
2. **Type-Safe:** Compile-time guarantees via TypeScript + JSON Schema
3. **Observable:** Langfuse tracking preserved throughout
4. **Testable:** Mock JSON responses in tests
5. **Reversible:** Feature flag allows instant rollback to text mode
6. **Self-Documenting:** JSON Schema describes contract explicitly

## Files Modified

**New:**
- `src/features/planning/response-schemas.ts` - JSON Schema definitions
- `src/features/ai/feature-flags.ts` - Gradual rollout flags
- `src/features/ai/structured-output.test.ts` - Comprehensive tests
- `docs/structured-output-rollout.md` - Architecture decision record

**Modified:**
- `src/features/planning/step-config.ts` - Add `responseSchema` field
- `src/features/ai/streaming.ts` - Add `response_format` parameter
- `src/features/ai/server.ts` - Add `response_format` to non-streaming
- `src/features/ai/hooks.ts` - Parse JSON responses
- `src/features/planning/components/InterviewThread.tsx` - Use structured options
- `app/api/ai/interview.ts` - Pass `stepNumber` to streaming

**Eventually Deleted:**
- `src/features/ai/parse-options.ts` - No longer needed after full rollout
- `src/features/ai/parse-options.test.ts` - Delete with parser

## Next Steps

1. **Review Plan:** Team reviews `structured-output-refactor.yaml`
2. **Start Phase 1:** Implement t-struct-001 through t-struct-003 (foundation)
3. **Phase 2:** Implement t-struct-004 through t-struct-008 (integration)
4. **Phase 3:** Implement t-struct-009 and t-struct-010 (testing + rollout)
5. **Deploy:** Gradual rollout starting with Step 1
6. **Monitor:** Track error rates, response times, user feedback
7. **Scale:** Expand to all steps once validated

---

**Estimated Timeline:** 1-2 sprints (8-12 hours development + 2-3 weeks gradual rollout)

**Approval Required:** Engineering Lead, Product Manager

**Question:** Proceed with implementation of Phase 1 (foundation tasks)?
