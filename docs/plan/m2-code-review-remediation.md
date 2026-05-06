# M2 Code Review Remediation Plan

Source review: `code-reviews/2026-05-06-m2-code-review.yaml`

---

## Style Anchors

Reference these patterns before making changes:

| Pattern | Anchor |
|---|---|
| Store mutation with guard | `src/features/planning/store.ts:107-138` — existing `submitAnswer` |
| Server fn handler with `initStore` | `src/features/planning/server.ts:10-27` — existing `$getStepState` |
| Store delegate test | `src/features/planning/server.test.ts:110-123` — `$submitAnswer` describe block |
| Component test with userEvent | `src/features/planning/components/InterviewThread.test.tsx:85-96` |

---

## Drift Policy

- Touch **ONLY** the files listed per task. Stop if any other file must change.
- If type errors appear outside listed files, stop and report — do not fix mid-stream.
- If tests fail after a change and the fix requires modifying a test that was previously passing, stop and report.
- Revert via `git checkout -- <file>` if scope exceeds listed files.
- Run `pnpm test` after each task. All tests must pass before proceeding to next task.

---

## Priority 1 — Must fix before M3

### m2-r001 · Bug · `src/features/planning/store.ts`

**Touch ONLY:** `src/features/planning/store.ts`

**Problem:** `submitAnswer` unconditionally advances `currentStep` to `stepNumber + 1`.
Submitting a stale step (e.g. step 3 when `currentStep` is 5) regresses `currentStep` to 4.

**TDD — write test first, then implement:**

Add to `$submitAnswer (store delegate)` describe block in `src/features/planning/server.test.ts`:

```ts
it("ignores out-of-order submit — does not regress currentStep", () => {
  initProjectSteps("p1", "scratch");
  submitAnswer("p1", 1, "step 1 answer");
  // currentStep is now 2
  const before = getStepState("p1");
  expect(before.currentStep).toBe(2);

  // submit stale step 1 again
  const after = submitAnswer("p1", 1, "stale re-submit");
  expect(after.currentStep).toBe(2); // must not regress
});
```

Verify test **fails** before implementing. Then add guard:

```ts
// in submitAnswer, after: const state = getStepState(projectId)
if (stepNumber !== state.currentStep) return state;
```

Insert after line 112, before the `findIndex` call.

Verify test passes. Run `pnpm test`.

**Estimate:** 30 min

---

### m2-r002 · Risk · `src/features/planning/server.ts`

**Touch ONLY:** `src/features/planning/server.ts`

**Problem:** `$submitAnswer` handler calls `submitAnswer(...)` directly without `await initStore()`.
Hot-reload wipes in-memory projects store between calls, causing "No step state" instead of recovery.

**Note:** Server fn handlers cannot be unit-tested in Vitest without TanStack Start Vite transform.
No test can be added for this path — the fix is verified by manual hot-reload smoke test only.

**Fix:** Expand handler to async and add `initStore()`:

```ts
.handler(async ({ data }) => {
  await initStore();
  return submitAnswer(data.projectId, data.stepNumber, data.answer);
});
```

Run `pnpm test` to confirm no regressions.

**Estimate:** 30 min

---

## Priority 2 — Should fix

### m2-r004 · Risk · `src/features/planning/server.test.ts`

**Touch ONLY:** `src/features/planning/server.test.ts`

**Problem:** Test "lazy-inits step state and returns 10 steps" manually calls `initProjectSteps`
before `getStepState`. Proves pre-initialized state works, not lazy-init.
Actual lazy-init branch in `$getStepState` handler is untested.

**Fix — two changes:**

1. Rename line 65:
   ```
   "returns 10 steps when already initialized"
   ```

2. Add new test in same describe block:
   ```ts
   it("throws when step state not found (lazy-init not triggered at store level)", () => {
     const project = createProject({ name: "Test", entryPath: "scratch" });
     expect(hasStepState(project.id)).toBe(false);
     expect(() => getStepState(project.id)).toThrow(
       `No step state for project: ${project.id}`,
     );
   });
   ```

3. Add comment above the describe block:
   ```ts
   // NOTE: full lazy-init path (project lookup → initProjectSteps) lives in the
   // $getStepState server fn handler. It cannot be exercised in Vitest without
   // the TanStack Start Vite plugin transform. Only the store-level guard is tested here.
   ```

Run `pnpm test`.

**Estimate:** 30 min

---

### m2-r005 · Risk · `src/features/planning/components/InterviewThread.test.tsx`

**Touch ONLY:** `src/features/planning/components/InterviewThread.test.tsx`

**Problem:** OptionCard click → submit path untested. `selectedOption ?? inputText` branch
only exercised via `inputText`.

**Fix:** Add test to `InterviewThread` describe block:

```ts
it("clicking an OptionCard then submitting calls mutate with option letter", async () => {
  const stepState = makeStepState({
    steps: [
      {
        stepNumber: 1,
        name: "Step 1",
        status: "now" as const,
        question: "Pick one?",
        options: [
          { letter: "A", title: "Option Alpha", body: "Details", recommended: true },
          { letter: "B", title: "Option Beta",  body: "Details", recommended: false },
        ],
      },
      ...Array.from({ length: 9 }, (_, i) => ({
        stepNumber: i + 2,
        name: `Step ${i + 2}`,
        status: "pending" as const,
        question: `Q${i + 2}`,
      })),
    ],
  });

  wrap(<InterviewThread stepState={stepState} projectId="p1" />);

  await userEvent.click(screen.getByRole("button", { name: /option alpha/i }));
  await userEvent.click(screen.getByRole("button", { name: /submit/i }));

  expect(mockMutate).toHaveBeenCalledWith(
    { stepNumber: 1, answer: "A" },
    expect.objectContaining({ onSuccess: expect.any(Function) }),
  );
});
```

Note: uses `getByRole("button", { name: /option alpha/i })` not `getByText` — more robust if
`OptionCard` wraps title in a child element. If `OptionCard` is not a `<button>`, adjust role
to match rendered element (check `src/components/thread/OptionCard.tsx`).

Run `pnpm test`.

**Estimate:** 30 min

---

### m2-r003 · Risk · `src/features/planning/components/InterviewThread.tsx`

**Touch ONLY:** `src/features/planning/components/InterviewThread.tsx`

**Prerequisite:** `PlanningStep.options` is typed as `StepOption[] | undefined` in
`src/features/planning/types.ts:20` — confirmed, no type changes needed.

**Problem:** `value={selectedOption ? "" : inputText}` blanks the input when an option is
selected. No visible indicator of which option is active.

**Fix:** Derive selected option title and show it as input value:

```ts
// add after selectedOption state declaration (line 22)
const selectedOptionTitle =
  currentStep?.options?.find((o) => o.letter === selectedOption)?.title ?? "";
```

```ts
// replace line 97
value={selectedOption ? selectedOptionTitle : inputText}
```

Run `pnpm test`.

**Estimate:** 30 min

---

## Priority 3 — Deferred (M3 or later)

| ID | File | Action |
|----|------|--------|
| m2-r006 | `InterviewThread.test.tsx` | Replace `queryByText(/✓/)` with `queryByRole` or `data-testid` on `ThreadDivider` |
| m2-r007 | `InterviewThread.tsx:119` | Add `aria-label="Submit answer"` to submit button |
| m2-r008 | `ProjectIntake.tsx:37-38` | Add `aria-disabled={isPending}` to `PathCard` wrapper; extend `PathCard` with `disabled` prop in M3 |
| m2-r009 | `store.ts:60-75` | Extract triple-nested ternary to `getInitialStatus(i, entryPath)` helper |
| m2-r010 | `AnsweredMessage.tsx:13` | Wire hardcoded `"KW"` initials to user session once auth lands in M4 |

---

## Execution Order

```
1. m2-r001  store.ts guard + regression test    ~30 min
2. m2-r002  server.ts initStore                 ~30 min
3. m2-r004  server.test.ts rename + add test    ~30 min
4. m2-r005  InterviewThread.test.tsx option test ~30 min
5. m2-r003  InterviewThread.tsx UX fix          ~30 min
```

Run `pnpm test` after each task. All five green before M3 begins.
