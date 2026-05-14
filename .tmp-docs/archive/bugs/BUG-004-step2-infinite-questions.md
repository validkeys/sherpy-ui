# BUG-004: Step 2 Interview Questions Don't Stop After 10 Answers

**Date:** 2026-05-12  
**Severity:** HIGH  
**Status:** NEEDS INVESTIGATION  
**Component:** `planningMachine.ts` - Step 2 Business Requirements Interview

---

## Summary

Step 2 (Business Requirements Interview) continues generating questions beyond the expected 10 answers. The machine's `checkingComplete` logic should transition to `generatingArtifact` after 10 answers, but continues to loop back to `asking` state.

---

## Steps to Reproduce

1. Create new project
2. Complete Step 1 (Gap Analysis) form
3. Wait for Step 2 to load
4. Answer 10 questions by clicking options and submitting
5. Observe: Question 11 appears
6. Answer questions 11-15
7. Observe: More questions continue to appear

---

## Expected Behavior

After 10 answers are submitted:
1. `step2Answers.length` should equal 10
2. `checkingComplete` state should evaluate guard `context.step2Answers.length < 10` as FALSE
3. Machine should transition to `generatingArtifact` state
4. Artifact generation should begin
5. Machine should transition to Step 3 (Technical Requirements)

---

## Actual Behavior

- Questions 1-15+ continue to be generated
- Machine remains in interview loop
- `checkingComplete` guard appears to always evaluate to TRUE
- Machine never transitions to `generatingArtifact`
- NEXT button remains disabled

---

## Machine Logic

```typescript
// src/features/planning/machines/planningMachine.ts:453-462
checkingComplete: {
  always: [
    {
      guard: ({ context }) => context.step2Answers.length < 10,
      target: 'asking',
    },
    {
      target: 'generatingArtifact',
    },
  ],
},
```

---

## Hypothesis

**Possible causes:**

1. **Answer accumulation bug**: The `step2Answers` array might not be accumulating correctly in the assign action (line 438-444)
2. **State persistence issue**: Context might be reset or not persisting between state transitions
3. **Guard timing issue**: Guard might be evaluated before the assign action completes
4. **Array reference issue**: The array might be getting replaced instead of appended to

---

## Investigation Needed

1. Add console.log to the `checkingComplete` guard to see actual `step2Answers.length`
2. Add console.log to the `SUBMIT_ANSWER` assign action to verify answers are being added
3. Check if `step2Answers` is initialized correctly in initial context
4. Verify XState v5 assign behavior - ensure array spread is working correctly

---

## Workaround

None identified. Step 2 cannot be completed without fixing this bug.

---

## Impact

**CRITICAL** - Blocks full workflow testing. User cannot progress past Step 2.

---

## Related Files

- `src/features/planning/machines/planningMachine.ts` (lines 432-463)
- `src/features/planning/components/InterviewStep.tsx`

---

## Test Environment

- Server: Vite 8.0.11
- Port: 5180
- Browser: Chrome (headless via agent-browser)
- Answered 15+ questions, all recorded but count check failing
