# Structured Output Architecture

## Current Architecture (Text Parsing)

```
┌─────────────────────────────────────────────────────────────────┐
│ User submits answer                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ InterviewThread.tsx                                             │
│ - submitAnswer mutation                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ app/api/ai/interview.ts                                         │
│ - buildInterviewPrompt() from prompts.ts                        │
│ - No schema constraint                                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ streaming.ts: streamQuestion()                                  │
│ {                                                               │
│   anthropic_version: "bedrock-2023-05-31",                      │
│   max_tokens: 512,                                              │
│   messages                                                      │
│ }                                                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ AWS Bedrock (Claude 3.5 Sonnet)                                 │
│ ⚠️  Returns FREE-TEXT response                                  │
│                                                                 │
│ "What is the primary problem...                                 │
│                                                                 │
│  **Options:**                                                   │
│  1. Automate manual workflow - Description...                   │
│  2. Improve existing solution - Description..."                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ hooks.ts: useStreamingQuestion()                                │
│ - Accumulate text chunks                                        │
│ - Detect [STEP_COMPLETE] marker (string search)                 │
│ - Call parseOptions(accumulatedText)  ❌                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ parse-options.ts                                                │
│ - 3-tier regex parsing (markdown → inline → fallback)          │
│ - 25 test cases for edge cases                                 │
│ - indexOf(" - ") to find title/body separator                  │
│ - Case-insensitive (Recommended) detection                     │
│ ⚠️  Complex, brittle, high maintenance                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ InterviewThread.tsx                                             │
│ ❌ Question text includes "**Options:**..." (duplication)       │
│ ✅ Options parsed into cards                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## New Architecture (Structured Output)

```
┌─────────────────────────────────────────────────────────────────┐
│ User submits answer                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ InterviewThread.tsx                                             │
│ - submitAnswer mutation                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ app/api/ai/interview.ts                                         │
│ - buildInterviewPrompt() from prompts.ts                        │
│ - Get responseSchema from step-config.ts  ✨ NEW                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ streaming.ts: streamQuestion(messages, stepNumber)  ✨ NEW      │
│ {                                                               │
│   anthropic_version: "bedrock-2023-05-31",                      │
│   max_tokens: 512,                                              │
│   messages,                                                     │
│   response_format: {  ✨ NEW                                    │
│     type: "json_schema",                                        │
│     json_schema: INTERVIEW_QUESTION_SCHEMA                      │
│   }                                                             │
│ }                                                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ AWS Bedrock (Claude 3.5 Sonnet)                                 │
│ ✅ GUARANTEED VALID JSON (enforced by Bedrock)                  │
│                                                                 │
│ {                                                               │
│   "question": "What is the primary problem...",                 │
│   "options": [                                                  │
│     {                                                           │
│       "letter": "1",                                            │
│       "title": "Automate manual workflow",                      │
│       "body": "Replace time-consuming...",                      │
│       "recommended": true                                       │
│     },                                                          │
│     ...                                                         │
│   ],                                                            │
│   "isComplete": false                                           │
│ }                                                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ hooks.ts: useStreamingQuestion()                                │
│ - Accumulate JSON chunks                                        │
│ - JSON.parse(accumulatedText)  ✨ SIMPLE                        │
│ - Extract question, options, isComplete  ✨ TYPE-SAFE           │
│ - Fallback to parseOptions() if not JSON (backward compat)     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ InterviewThread.tsx                                             │
│ ✅ Clean question text (no **Options:** duplication)            │
│ ✅ Structured options from JSON                                 │
│ ✅ Type-safe throughout                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step Config Schema Lookup

```
┌─────────────────────────────────────────────────────────────────┐
│ step-config.ts                                                  │
│                                                                 │
│ export const STEP_CONFIG: Record<number, StepConfig> = {       │
│   1: {                                                          │
│     name: "Gap Analysis Worksheet",                             │
│     type: "interview",                                          │
│     artifactKey: "gap-analysis",                                │
│     responseSchema: INTERVIEW_QUESTION_SCHEMA  ✨ NEW           │
│   },                                                            │
│   2: {                                                          │
│     name: "Business Requirements Interview",                    │
│     type: "interview",                                          │
│     artifactKey: "business-requirements",                       │
│     responseSchema: INTERVIEW_QUESTION_SCHEMA  ✨ NEW           │
│   },                                                            │
│   ...                                                           │
│ }                                                               │
│                                                                 │
│ export function getStepResponseSchema(stepNumber: number) {    │
│   return STEP_CONFIG[stepNumber]?.responseSchema;              │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Flag Rollout Strategy

```
Phase 1: Step 1 Only
┌────────────────────────────────────────┐
│ USE_STRUCTURED_OUTPUT=true             │
│ STRUCTURED_OUTPUT_STEPS=1              │
│                                        │
│ Step 1: JSON ✅                        │
│ Step 2: Text (legacy) ⏳               │
│ Step 3: Text (legacy) ⏳               │
└────────────────────────────────────────┘
     Duration: 1 week
     Monitor: Error rates, UI rendering

Phase 2: Steps 1-3
┌────────────────────────────────────────┐
│ USE_STRUCTURED_OUTPUT=true             │
│ STRUCTURED_OUTPUT_STEPS=1,2,3          │
│                                        │
│ Step 1: JSON ✅                        │
│ Step 2: JSON ✅                        │
│ Step 3: JSON ✅                        │
└────────────────────────────────────────┘
     Duration: 2 weeks
     Monitor: Completion rates, feedback

Phase 3: All Steps
┌────────────────────────────────────────┐
│ USE_STRUCTURED_OUTPUT=true             │
│ STRUCTURED_OUTPUT_STEPS=1,2,3,...,10   │
│                                        │
│ All steps: JSON ✅                     │
│                                        │
│ DELETE: parse-options.ts 🗑️            │
└────────────────────────────────────────┘
     Duration: Ongoing
     Outcome: Fully migrated
```

---

## Rollback Strategy (Zero Downtime)

```
If Issues Detected
┌─────────────────────────────────────────┐
│ 1. Set USE_STRUCTURED_OUTPUT=false      │
│                                         │
│ 2. All steps fall back to text parsing │
│    (parse-options.ts still in codebase)│
│                                         │
│ 3. No deployment needed                 │
│    (environment variable change only)   │
│                                         │
│ 4. Investigate issue                    │
│                                         │
│ 5. Re-enable when fixed                 │
└─────────────────────────────────────────┘
     Rollback time: < 1 minute
     Downtime: ZERO
```

---

## Type Safety Flow

```typescript
// response-schemas.ts
export const INTERVIEW_QUESTION_SCHEMA = { ... };

export type InterviewQuestionResponse = {
  question: string;
  options: StepOption[];
  isComplete?: boolean;
};

// ✅ TypeScript enforces schema matches interface

// hooks.ts
const parsed: InterviewQuestionResponse = JSON.parse(json);
//    ^-- Type-safe at compile time

// InterviewThread.tsx
<QuestionCard text={parsed.question} />
<OptionStack>
  {parsed.options.map(opt => (
    <OptionCard {...opt} />
    //           ^-- All properties guaranteed to exist
  ))}
</OptionStack>
```

---

## Benefits Summary

| Aspect | Before (Text) | After (JSON) |
|--------|---------------|--------------|
| **UI Duplication** | ❌ Options appear twice | ✅ Clean separation |
| **Type Safety** | ❌ Runtime parsing errors | ✅ Compile-time guarantees |
| **Maintenance** | ❌ 25 test cases, complex regex | ✅ Simple JSON.parse() |
| **Reliability** | ❌ Edge cases (dashes, special chars) | ✅ Schema enforced by Bedrock |
| **Code Lines** | ❌ ~150 LOC parser | ✅ ~10 LOC JSON.parse() |
| **Rollback** | ❌ Requires redeployment | ✅ Feature flag (instant) |
| **Documentation** | ❌ Regex patterns unclear | ✅ JSON Schema self-documenting |
