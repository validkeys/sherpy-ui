# BUG-021: Step 2 Interview Question Not Rendering in WorkflowChat

**Status**: 🔴 OPEN - CRITICAL  
**Date Reported**: 2026-05-30  
**Reporter**: Phase 9 E2E Testing  
**Severity**: Critical (Blocks workflow completion)  
**Affects**: WorkflowChat UI (Phase 9)  
**Branch**: main  

## Summary

Step 2 (Business Requirements Interview) fails to display the first interview question in WorkflowChat UI, despite the XState machine successfully transitioning to the "answering" state. The chat shows no question, leaving users unable to proceed.

## Environment

- **Project**: seed-mpsevqae (fresh seed at Step 1)
- **URL**: http://localhost:5180/project/seed-mpsevqae/build?workflowChat=1
- **Feature Flag**: `USE_NEW_UI = false` (WorkflowChat accessed via query param)
- **Test Tool**: Playwright MCP

## Steps to Reproduce

1. Seed fresh project at Step 1:
   ```bash
   pnpm seed:step1
   ```

2. Navigate to WorkflowChat:
   ```
   http://localhost:5180/project/seed-mpsevqae/build?workflowChat=1
   ```

3. Complete Step 1 form:
   - Fill "Do you have existing requirements?"
   - Fill "What are you building?"
   - Click "Submit answer"

4. Wait for Step 1 artifact to generate

5. Observe Step 2 state

## Expected Behavior

After Step 1 completes:
1. Machine transitions to Step 2 state: `"step2_businessReqs": "asking"`
2. `fetchQuestion` actor fetches first interview question
3. Machine transitions to `"step2_businessReqs": "answering"`
4. **Question appears in chat** as a Sherpy message
5. Chat composer becomes active (not "View only")
6. User can type answer or select from options

## Actual Behavior

After Step 1 completes:
1. ✅ Machine transitions to Step 2 state: `"step2_businessReqs": "asking"`
2. ✅ `fetchQuestion` actor is invoked (console log: `[fetchQuestion] Input: {...}`)
3. ✅ Machine transitions to `"step2_businessReqs": "answering"`
4. ❌ **No question appears in chat**
5. ❌ Chat composer shows "Type your message..." but remains disabled ("View only")
6. ❌ Stage indicator shows "STAGE 02 Business Requirements Interview" but no question
7. ❌ No Sherpy message with question text

## Debug Panel Evidence

```json
Current State: {
  "step2_businessReqs": "answering"
}

Current Step Number: 2
Completed Steps: [1]
Step 1 Responses: ✅ (captured correctly)
Step 2 Answers: 0 items
```

**Key finding**: State is `"answering"` (not `"asking"`), which means `fetchQuestion` completed and `onDone` transition occurred. However, `context.step2CurrentQuestion` must be `null`.

## Console Logs

```
[   85583ms] [LOG] [generateArtifact] Starting with input: {projectId: seed-mpsevqae, stepNumber: 1, ...}
[   85620ms] [LOG] [persistFormResponses] ✅ Saved: Step 1, 2 responses
[   95417ms] [LOG] [generateArtifact] ✅ Success! Got artifact: {id: 6hjFcJ8D, ...}
[   95419ms] [LOG] [fetchQuestion] Input: {projectId: seed-mpsevqae, stepNumber: 2, previousAnswers: Array(0), ...}
[   95421ms] [LOG] [XState Planning Machine] {value: Object, context: Object}
[   98843ms] [LOG] [XState Planning Machine] {value: Object, context: Object}
```

**Missing log**: No `[fetchQuestion] ✅ Success` or similar log after line 95419, suggesting:
- Either the promise completed silently without logging, OR
- The promise failed but `onError` didn't trigger, OR
- The success case doesn't have logging

## Root Cause Analysis

### Code Flow

**1. Message Rendering** (`src/components/workflow-chat/WorkflowChat.tsx`):
```typescript
// WorkflowChat renders messages from props
{messages.map((message) => (
  <ChatMessage
    key={message.id}
    message={message}
    ...
  />
))}
```

**2. Message Creation** (`src/features/planning/hooks/useWorkflowChatData.ts`):
```typescript
const messages = useMemo(
  () => adaptMachineSnapshotToMessages({ context, stateValue }),
  [context, stateValue],
);
```

**3. Message Adapter** (`src/features/planning/adapters/machine-to-messages.adapter.ts:182-186, 303-367`):
```typescript
// Step 2 message creation
if (stepNumber === 2) {
  messages.push(...createInterviewMessages(stepNumber, context.step2Answers));
  messages.push(
    ...createCurrentInterviewMessages(context, stepNumber, activeState),
  );
}

// Current question rendering (lines 355-366)
if (!currentQuestion) return []; // ⚠️ THIS IS THE ISSUE

return [
  {
    type: "question",
    id: `step-${stepNumber}-current-question`,
    role: "assistant",
    timestamp: context.updatedAt,
    question: currentQuestion,
    ...(currentOptions ? { options: currentOptions } : {}),
  },
];
```

**The Bug**: `currentQuestion` (which comes from `context.step2CurrentQuestion`) is `null`, causing the adapter to return an empty array instead of a question message.

**4. XState Machine** (`src/features/planning/machines/planningMachine.ts:672-702`):
```typescript
step2_businessReqs: {
  initial: "asking",
  states: {
    asking: {
      invoke: {
        id: "fetchQ2",
        src: "fetchQuestion",
        input: ({ context }) => ({
          projectId: context.projectId,
          stepNumber: 2,
          previousAnswers: context.step2Answers.map((a) => a.value),
          projectContext: buildProjectContext(context),
        }),
        onDone: {
          target: "answering",
          actions: assign({
            step2CurrentQuestion: ({ event }) => event.output.question, // ⚠️ THIS SHOULD SET THE QUESTION
            step2CurrentOptions: ({ event }) => event.output.options ?? null,
            updatedAt: () => new Date().toISOString(),
          }),
        },
        onError: {
          target: "asking",
          actions: assign({
            error: ({ event }) => `Failed to fetch question: ${event.error}`,
          }),
        },
      },
    },
    answering: {
      // User answers the question here
      on: {
        SUBMIT_ANSWER: { ... }
      }
    },
    ...
  }
}
```

### Hypothesis: `event.output.question` is null or undefined

**Possible causes**:

1. **API returned invalid response**: `/api/ai/interview` endpoint returned response without `question` field
2. **Streaming issue**: `fetchQuestion` actor failed to parse streamed response correctly
3. **Event payload missing**: `onDone` event doesn't have `output.question` for some reason
4. **Race condition**: Question is set but immediately cleared by another action

## Verification Needed

### 1. Check API Response
```bash
# Manual API test
curl -X POST http://localhost:5180/api/ai/interview \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "seed-mpsevqae",
    "stepNumber": 2,
    "previousAnswers": [],
    "projectContext": "Project: A cloud-based project management platform..."
  }'
```

### 2. Add Debug Logging
Add to `planningMachine.ts` line 688:
```typescript
onDone: {
  target: "answering",
  actions: [
    ({ event }) => {
      console.log("[fetchQuestion] ✅ onDone event:", event);
      console.log("[fetchQuestion] ✅ output:", event.output);
      console.log("[fetchQuestion] ✅ question:", event.output.question);
    },
    assign({
      step2CurrentQuestion: ({ event }) => {
        const question = event.output.question;
        console.log("[fetchQuestion] ✅ Assigning question to context:", question);
        return question;
      },
      step2CurrentOptions: ({ event }) => event.output.options ?? null,
      updatedAt: () => new Date().toISOString(),
    }),
  ],
},
```

### 3. Test in Old UI
Navigate to: `http://localhost:5180/project/seed-mpsevqae/build` (without `?workflowChat=1`)

Does the question appear in the old UI? This will tell us if the issue is:
- **Adapter-specific**: Old UI works → Bug is in `machine-to-messages.adapter.ts`
- **Machine-specific**: Old UI fails → Bug is in `fetchQuestion` actor or API

## Impact

**Severity**: 🔴 CRITICAL

- **User Impact**: Workflow completely blocked at Step 2
- **Phase 9 Impact**: Cannot complete E2E testing
- **Scope**: Affects ALL WorkflowChat users attempting Business Requirements interview
- **Workaround**: None (must use old UI)

## Related Issues

- **BUG-018**: SSR hydration mismatch (fixed with `ssr: false`, but may be related to state persistence)
- **BUG-019**: Interview answers not persisted (fixed, but similar persistence pattern)
- **BUG-020**: Empty business requirements artifact (fixed, data mapping issue)

## Files Involved

### Primary
- `src/features/planning/adapters/machine-to-messages.adapter.ts` (lines 182-186, 303-367)
- `src/features/planning/machines/planningMachine.ts` (lines 672-702)
- `src/features/planning/hooks/useWorkflowChatData.ts` (lines 44-49)

### Secondary
- `src/components/workflow-chat/WorkflowChat.tsx`
- `app/routes/api/ai/interview.ts` (interview API endpoint)

## Screenshots

1. **Initial state** (Step 1): `.tmp-docs/screenshots/phase9-step1-initial.png`
2. **Form filled**: `.tmp-docs/screenshots/phase9-step1-filled.png`
3. **Step 1 complete**: `.tmp-docs/screenshots/phase9-step1-submitted.png`
4. **Step 2 empty** (BUG): `.tmp-docs/screenshots/phase9-step2-view.png`
5. **Debug panel**: `.tmp-docs/screenshots/phase9-step2-debug-panel.png`
6. **After wait** (still empty): `.tmp-docs/screenshots/phase9-step2-after-wait.png`

## Next Steps

### Immediate Actions
1. ✅ Create bug report (this document)
2. 🔲 Add debug logging to `onDone` handler
3. 🔲 Test `/api/ai/interview` endpoint manually
4. 🔲 Test Step 2 in old UI (compare behavior)
5. 🔲 Check if `context.step2CurrentQuestion` is actually null via debug panel

### Investigation
1. 🔲 Verify `fetchQuestion` actor returns valid response
2. 🔲 Verify `event.output.question` is present in `onDone`
3. 🔲 Verify `assign` action executes successfully
4. 🔲 Check for race conditions or clearing actions

### Fix Implementation
1. 🔲 Identify root cause (API vs actor vs assignment)
2. 🔲 Implement fix
3. 🔲 Add test case to prevent regression
4. 🔲 Verify fix in WorkflowChat
5. 🔲 Resume Phase 9 E2E testing

## Test Case (Regression Prevention)

```typescript
// src/features/planning/adapters/machine-to-messages.adapter.test.ts

describe("adaptMachineSnapshotToMessages - Step 2 Interview", () => {
  it("should render current question when in answering state", () => {
    const context: PlanningContext = {
      projectId: "test-project",
      currentStepNumber: 2,
      step2CurrentQuestion: "What is the primary goal?",
      step2CurrentOptions: ["Option A", "Option B"],
      step2Answers: [],
      updatedAt: "2026-05-30T10:00:00.000Z",
      // ... other required fields
    };

    const stateValue = { step2_businessReqs: "answering" };

    const messages = adaptMachineSnapshotToMessages({ context, stateValue });

    const questionMessage = messages.find(
      (m) => m.type === "question" && m.id === "step-2-current-question"
    );

    expect(questionMessage).toBeDefined();
    expect(questionMessage?.question).toBe("What is the primary goal?");
    expect(questionMessage?.options).toEqual(["Option A", "Option B"]);
  });

  it("should show loading state when in asking state without question", () => {
    const context: PlanningContext = {
      projectId: "test-project",
      currentStepNumber: 2,
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step2Answers: [],
      updatedAt: "2026-05-30T10:00:00.000Z",
      // ... other required fields
    };

    const stateValue = { step2_businessReqs: "asking" };

    const messages = adaptMachineSnapshotToMessages({ context, stateValue });

    const loadingMessage = messages.find(
      (m) => m.type === "loading" && m.content.includes("Loading next question")
    );

    expect(loadingMessage).toBeDefined();
  });

  it("should NOT render question when in answering state but question is null", () => {
    const context: PlanningContext = {
      projectId: "test-project",
      currentStepNumber: 2,
      step2CurrentQuestion: null, // ⚠️ THIS IS THE BUG SCENARIO
      step2CurrentOptions: null,
      step2Answers: [],
      updatedAt: "2026-05-30T10:00:00.000Z",
      // ... other required fields
    };

    const stateValue = { step2_businessReqs: "answering" };

    const messages = adaptMachineSnapshotToMessages({ context, stateValue });

    const questionMessage = messages.find(
      (m) => m.type === "question" && m.id === "step-2-current-question"
    );

    // This currently passes (no question rendered) but SHOULD fail
    // After fix, this test should expect a fallback message or error state
    expect(questionMessage).toBeUndefined();
  });
});
```

## References

- **Test Results**: `.tmp-docs/phase-9-test-results.md`
- **Plan Document**: `docs/planning/003-workflow-chat-integration/plan.md`
- **Phase 8 Results**: `.tmp-docs/phase-8-test-results.md` (Step 7 artifact-only test - passed)
- **Previous Bugs**: BUG-018, BUG-019, BUG-020 (all fixed)

## Priority

**P0 - Critical**: Must be fixed before Phase 9 can proceed. Blocks WorkflowChat feature from being production-ready.
