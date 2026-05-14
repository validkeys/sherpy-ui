# Bug Analysis: Interview Question Options Display Issues

**Date:** 2026-05-08
**Reporter:** User
**Status:** Analyzed - Solution Proposed

## Problem Statement

When the interview displays a question with multiple-choice options:
1. The options text appears in the question body AND as clickable option cards (duplication)
2. Only one option renders as a clickable card when multiple should be shown
3. Previously displayed options persist briefly after submitting an answer

## Reproduction

**Observed behavior:**
```
Question shown: "Based on your project overview... 
**Options:**
1. Nothing exists yet - I'm starting completely fresh
2. I have some code/prototype already
3. I have a partial implementation
4. Type your own answer

Please select an option or describe your current technical state."

UI displays:
- Full question text INCLUDING the options list
- Only one clickable card: "Nothing Exists Yet"
```

**Expected behavior:**
- Question text should NOT include the options list
- All options (except "Type your own answer") should render as clickable cards
- After answer submission, options should clear immediately

## Root Cause Analysis

### Bug 1: Duplicate Options Display

**File:** `src/features/ai/skills-content.ts`
**Lines:** 12-17 (Step 1), 54-77 (Step 2), etc.

The skill content includes full options in the prompt:
```typescript
**Question 1:** Do you have an existing requirements document...?

**Options:**
1. Starting from scratch (Recommended) - I need help...
2. I have a requirements document - I have existing...
3. Type your own answer
```

The AI model is instructed to ask questions using this format, so it echoes the options back verbatim in its response. The `parseOptions()` function then extracts these options and displays them as cards, creating duplication.

**Impact:** High - confusing UX, text appears twice

### Bug 2: Incomplete Option Parsing

**File:** `src/features/ai/parse-options.ts`
**Lines:** 40-64

Two regex patterns attempt to parse options:
1. Format 1: Markdown with `**Options:**` header (lines 14-36)
2. Format 2: Inline options after "Please select an option" (lines 40-64)

**Format 2 regex issues:**
```typescript
// Line 45 - lookahead expects space + digit
const optionRegex = /(\d+)\.\s+(?:\*\*)?([\w\s]+?)(?:\*\*)?\s*(?:\(Recommended\))?\s*-\s*([^0-9]+?)(?=\s+\d+\.|$)/g;
```

Problems:
- `[\w\s]+?` is too restrictive - doesn't match punctuation in titles
- `(?=\s+\d+\.|$)` expects ` \d+\.` separator, but AI may use newlines
- Non-greedy body match `[^0-9]+?` can break on options with numbers
- No handling for options without " (Recommended)" marker

**Impact:** High - missing options in UI

### Bug 3: Stale Options After Submission

**File:** `src/features/planning/components/InterviewThread.tsx`
**Lines:** 151-156

When answer is submitted:
```typescript
onSuccess: () => {
  setOptimisticAnswer(null);
  updateOptions({
    stepNumber: currentStep.stepNumber,
    options: [],
  });
  setRefetchTrigger(prev => prev + 1);
}
```

The `updateOptions([])` call happens, but the UI still shows old options briefly because:
1. State update is async
2. New question hasn't started streaming yet
3. React renders stale data from `currentStep?.options`

**Impact:** Medium - brief visual glitch

## Enterprise-Grade Solution

### Solution Architecture

```
┌─────────────────────────────────────────────┐
│          AI Response Pipeline               │
├─────────────────────────────────────────────┤
│                                             │
│  1. Prompt Engineering                      │
│     ├─ Instruct AI to output structured    │
│     │  question WITHOUT options text       │
│     └─ Provide options as context only     │
│                                             │
│  2. Response Parsing (Robust)               │
│     ├─ Markdown format (newline-separated) │
│     ├─ Inline format (various separators)  │
│     ├─ Fallback format (numbered list)     │
│     └─ Validation & error handling         │
│                                             │
│  3. State Management                        │
│     ├─ Immediate optimistic updates        │
│     ├─ Clear old state before new fetch    │
│     └─ Loading state during transitions    │
│                                             │
└─────────────────────────────────────────────┘
```

### Implementation Plan

#### Phase 1: Fix Prompt Engineering (Bug 1)
**Goal:** AI outputs question WITHOUT options text

**Changes to `skills-content.ts`:**
```typescript
// Old format:
**Question 1:** Do you have an existing requirements document...?

**Options:**
1. Starting from scratch (Recommended) - I need help...
2. I have a requirements document - I have existing...

// New format:
**Question 1:** Do you have an existing requirements document...?

[Present these options as clickable choices - DO NOT include them in your question text]
**Options:**
1. Starting from scratch (Recommended) - I need help...
2. I have a requirements document - I have existing...
```

Add explicit instruction in prompts.ts:
```typescript
systemContext += `\n\nIMPORTANT: When presenting multiple choice questions:
1. State the question clearly
2. DO NOT list the options in your question text
3. The UI will automatically display the options as clickable buttons
4. End with: "Please select an option or type your own answer."`;
```

#### Phase 2: Robust Option Parsing (Bug 2)
**Goal:** Parse all valid option formats reliably

**Enhanced `parse-options.ts`:**
```typescript
export function parseOptions(questionText: string): StepOption[] {
  const options: StepOption[] = [];
  
  // Try all formats in priority order
  const parsers = [
    parseMarkdownFormat,
    parseInlineFormat,
    parseFallbackFormat,
  ];
  
  for (const parser of parsers) {
    const parsed = parser(questionText);
    if (parsed.length > 0) {
      return validateOptions(parsed);
    }
  }
  
  return [];
}

function parseMarkdownFormat(text: string): StepOption[] {
  // Enhanced regex that handles more cases
}

function parseInlineFormat(text: string): StepOption[] {
  // Multiple regex patterns to try
}

function parseFallbackFormat(text: string): StepOption[] {
  // Simple numbered list without special formatting
}

function validateOptions(options: StepOption[]): StepOption[] {
  // Ensure unique letters, non-empty titles, etc.
}
```

#### Phase 3: Improved State Management (Bug 3)
**Goal:** Eliminate stale options display

**Changes to `InterviewThread.tsx`:**
```typescript
// Add loading state to distinguish between states
const [isTransitioning, setIsTransitioning] = useState(false);

function handleSubmit() {
  // ... existing code ...
  
  setIsTransitioning(true); // Set immediately
  
  submitAnswer(
    { /* ... */ },
    {
      onSuccess: () => {
        setOptimisticAnswer(null);
        // Don't show old options during transition
        updateOptions({
          stepNumber: currentStep.stepNumber,
          options: [],
        });
        setRefetchTrigger(prev => prev + 1);
      },
      onError: () => {
        setOptimisticAnswer(null);
        setIsTransitioning(false);
      },
    },
  );
}

// In hooks.ts onOptionsReady:
useEffect(() => {
  if (isComplete) {
    setIsTransitioning(false);
  }
}, [isComplete]);

// Conditional rendering:
const options = (isTransitioning || !currentStep?.options?.length) 
  ? undefined
  : (
      <OptionStack>
        {currentStep.options.map(opt => ...)}
      </OptionStack>
    );
```

### Testing Strategy

#### Unit Tests
```typescript
describe('parseOptions', () => {
  it('handles markdown format with newlines', () => {
    const text = `**Options:**\n1. Option A - Description\n2. Option B - Description`;
    expect(parseOptions(text)).toHaveLength(2);
  });
  
  it('handles inline format with various separators', () => {
    const text = 'Select: 1. Option A - Desc 2. Option B - Desc';
    expect(parseOptions(text)).toHaveLength(2);
  });
  
  it('filters out "Type your own" option', () => {
    const text = `**Options:**\n1. Real Option\n2. Type your own`;
    expect(parseOptions(text)).toHaveLength(1);
  });
  
  it('handles options with numbers in descriptions', () => {
    const text = `1. Deploy on AWS EC2 instances - Description`;
    expect(parseOptions(text)[0].title).toBe('Deploy on AWS EC2 instances');
  });
});
```

#### Integration Tests
```typescript
describe('InterviewThread', () => {
  it('does not show duplicate options text', () => {
    // Render with question that has options
    // Assert options text not in question body
    // Assert options rendered as cards
  });
  
  it('clears options immediately on submit', () => {
    // Submit answer
    // Assert options not visible during loading
  });
});
```

#### E2E Tests
```typescript
test('Interview flow displays options correctly', async () => {
  await page.goto('/interview/test-project');
  
  // Wait for question with options
  await page.waitForSelector('[data-testid="question-card"]');
  const questionText = await page.textContent('[data-testid="question-card"]');
  
  // Options should NOT be in question text
  expect(questionText).not.toContain('**Options:**');
  expect(questionText).not.toMatch(/\d+\.\s+\w+\s+-\s+/);
  
  // Options should be clickable cards
  const optionCards = await page.locator('[data-testid="option-card"]').count();
  expect(optionCards).toBeGreaterThan(0);
  
  // Select and submit
  await page.click('[data-testid="option-card"]:first-child');
  await page.click('button:has-text("Submit")');
  
  // Options should disappear immediately
  await expect(page.locator('[data-testid="option-card"]')).toHaveCount(0);
  
  // Wait for next question
  await page.waitForSelector('[data-testid="question-card"]');
});
```

### Monitoring & Observability

Add metrics to track option parsing success:
```typescript
// In parse-options.ts
function parseOptions(questionText: string): StepOption[] {
  const options = /* ... parsing logic ... */;
  
  // Track parsing success
  trackMetric('interview.options.parsed', {
    count: options.length,
    hasRecommended: options.some(o => o.recommended),
    format: detectedFormat, // 'markdown' | 'inline' | 'fallback' | 'none'
  });
  
  if (options.length === 0 && questionText.includes('**Options:**')) {
    // Alert: options present but failed to parse
    trackError('interview.options.parse_failed', {
      questionPreview: questionText.slice(0, 200),
    });
  }
  
  return options;
}
```

### Rollout Plan

1. **Dev Environment** (Day 1)
   - Deploy fixes
   - Manual testing with all 33 questions
   - Verify no regressions

2. **Staging** (Day 2-3)
   - Deploy to staging
   - Run full test suite
   - Performance testing (ensure parsing doesn't slow down streaming)

3. **Production** (Day 4-5)
   - Canary deploy (10% traffic)
   - Monitor error rates and parsing metrics
   - Full rollout if metrics are clean

### Success Criteria

- ✅ Zero duplicate options text in question display
- ✅ All valid options (typically 3-5) render as clickable cards
- ✅ Options clear immediately upon answer submission
- ✅ No visual flicker or stale data during transitions
- ✅ Parse success rate > 99% (tracked via metrics)
- ✅ Zero increase in render time or streaming latency

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI doesn't follow new instructions | High | Add response validation, fallback to showing options in question |
| New regex breaks existing questions | Medium | Comprehensive test suite covering all 33 questions |
| Performance degradation from multiple regex | Low | Benchmark parsing (should be < 1ms per question) |
| State management race conditions | Medium | Add loading states, use React 18 concurrent features |

## References

- **Files Modified:**
  - `src/features/ai/skills-content.ts` (Phases 1)
  - `src/features/ai/prompts.ts` (Phase 1)
  - `src/features/ai/parse-options.ts` (Phase 2)
  - `src/features/planning/components/InterviewThread.tsx` (Phase 3)

- **Test Files:**
  - `src/features/ai/parse-options.test.ts` (new)
  - `src/features/planning/components/InterviewThread.test.tsx` (enhanced)
  - `e2e/interview-flow.spec.ts` (new)
