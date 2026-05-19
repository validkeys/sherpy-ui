# Before vs After: Text Parsing → Structured Output

## Side-by-Side Comparison

### Response Format

#### Before (Text Parsing)
```text
What is the primary problem your project aims to solve?

**Options:**
1. Automate manual workflow (Recommended) - Replace time-consuming manual processes
2. Improve existing solution - Enhance or replace current tooling
3. New capability - Build something entirely new
4. Type your own answer
```

**Issues:**
- Question text includes `**Options:**` section
- Options must be parsed with complex regex
- No structure enforcement
- `[STEP_COMPLETE]` marker is string-based

#### After (Structured Output)
```json
{
  "question": "What is the primary problem your project aims to solve?",
  "options": [
    {
      "letter": "1",
      "title": "Automate manual workflow",
      "body": "Replace time-consuming manual processes",
      "recommended": true
    },
    {
      "letter": "2",
      "title": "Improve existing solution",
      "body": "Enhance or replace current tooling",
      "recommended": false
    },
    {
      "letter": "3",
      "title": "New capability",
      "body": "Build something entirely new",
      "recommended": false
    }
  ],
  "isComplete": false
}
```

**Benefits:**
- ✅ Clean question text (no `**Options:**`)
- ✅ Structured options (no parsing needed)
- ✅ Schema enforced by Bedrock
- ✅ Boolean `isComplete` flag

---

## Code Comparison

### Parsing Logic

#### Before (parse-options.ts - 150 lines)
```typescript
export function parseOptions(questionText: string): StepOption[] {
  // Try tier 1: Markdown with **Options:** header
  const optionsMatch = text.match(/\*\*Options:\*\*\s*\n([\s\S]+)/i);
  if (!optionsMatch) {
    return [];
  }

  const optionsText = optionsMatch[1];
  const options: StepOption[] = [];

  // Split by lines and process each option line
  const lines = optionsText.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Split on " - " to separate title from body
    const dashIndex = trimmedLine.indexOf(" - ");
    if (dashIndex === -1) continue;

    const prefix = trimmedLine.substring(0, dashIndex);
    const body = trimmedLine.substring(dashIndex + 3);

    // Extract number and title from prefix
    const prefixMatch = prefix.match(/^(\d+)\.\s+(.+)$/);
    if (!prefixMatch) continue;

    const [, number, titlePart] = prefixMatch;

    // Extract title and check for (Recommended)
    const recommendedMatch = titlePart.match(/^(.+?)\s*\((?:Recommended|recommended)\)\s*$/);
    const title = recommendedMatch ? recommendedMatch[1].trim() : titlePart.trim();
    const isRecommended = !!recommendedMatch;

    // Skip "Type your own" options
    if (title.toLowerCase().includes("type your own")) {
      continue;
    }

    options.push({
      letter: number.trim(),
      title,
      body: body.trim(),
      recommended: isRecommended,
    });
  }

  return options;
}

// + 100 more lines for inline format and fallback parsing
// + 25 test cases covering edge cases
```

**Problems:**
- Complex regex patterns
- Edge cases: dashes in titles, special characters, whitespace variations
- String manipulation prone to errors
- High maintenance burden

#### After (hooks.ts - 10 lines)
```typescript
// In useStreamingQuestion hook
if (isStructuredOutputEnabled(currentParams.stepNumber)) {
  // Parse JSON response
  try {
    const parsed: InterviewQuestionResponse = JSON.parse(accumulatedText);
    setText(parsed.question); // Clean question text only
    setOptions(parsed.options); // Structured options
    setIsComplete(parsed.isComplete ?? false);
  } catch (err) {
    console.error('[useStreamingQuestion] Failed to parse JSON:', err);
    setError(new Error('Invalid JSON response'));
  }
} else {
  // Legacy text mode (fallback)
  const parsedOptions = parseOptions(accumulatedText);
  setOptions(parsedOptions);
}
```

**Benefits:**
- ✅ Simple JSON.parse()
- ✅ Type-safe deserialization
- ✅ Fallback to text parsing (backward compat)
- ✅ Minimal code (~90% reduction)

---

### API Integration

#### Before (streaming.ts)
```typescript
const cmd = new InvokeModelWithResponseStreamCommand({
  modelId: BEDROCK_MODEL_ID,
  contentType: "application/json",
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 512,
    messages,
    // ❌ No schema constraint - LLM can return anything
  }),
});
```

#### After (streaming.ts)
```typescript
const body: any = {
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 512,
  messages,
};

// ✅ Add JSON Schema constraint
if (isStructuredOutputEnabled(stepNumber)) {
  const schema = getStepResponseSchema(stepNumber);
  if (schema) {
    body.response_format = {
      type: "json_schema",
      json_schema: schema,
    };
  }
}

const cmd = new InvokeModelWithResponseStreamCommand({
  modelId: BEDROCK_MODEL_ID,
  contentType: "application/json",
  body: JSON.stringify(body),
});
```

**Benefits:**
- ✅ Bedrock enforces schema at API level
- ✅ Invalid JSON cannot be returned
- ✅ Feature flag enables gradual rollout

---

## UI Rendering

### Question Display

#### Before
```tsx
<QuestionCard
  text={questionText}
  // ❌ Includes "**Options:** 1. ... 2. ..." in text
/>

{/* Options also rendered as cards */}
<OptionStack>
  {options.map(opt => <OptionCard {...opt} />)}
</OptionStack>

{/* Result: Options appear TWICE (text + cards) */}
```

#### After
```tsx
<QuestionCard
  text={parsed.question}
  // ✅ Clean question text only
/>

{/* Options rendered as cards */}
<OptionStack>
  {parsed.options.map(opt => <OptionCard {...opt} />)}
</OptionStack>

{/* Result: Options appear ONCE (cards only) */}
```

---

## Testing Comparison

### Test Complexity

#### Before (parse-options.test.ts - 25 tests)
```typescript
describe("parseOptions", () => {
  it("should handle options with dashes in titles", () => {
    const text = `**Options:**
1. Pre-commit hooks - Run checks before commits
2. Post-deploy monitoring - Track after release`;
    
    const options = parseOptions(text);
    expect(options[0].title).toBe("Pre-commit hooks");
  });

  it("should handle options with numbers in titles", () => {
    const text = `**Options:**
1. 3-tier architecture - Frontend, backend, database`;
    
    const options = parseOptions(text);
    expect(options[0].title).toBe("3-tier architecture");
  });

  it("should handle markdown options with varying whitespace", () => {
    const text = `**Options:**

1. Option A - Description A

2. Option B - Description B


3. Option C - Description C`;
    
    const options = parseOptions(text);
    expect(options).toHaveLength(3);
  });

  // + 22 more edge case tests
});
```

#### After (structured-output.test.ts - Simpler)
```typescript
describe("Structured Output", () => {
  it("should parse valid JSON response", () => {
    const json = JSON.stringify({
      question: "What is your choice?",
      options: [
        { letter: "1", title: "Option A", body: "Description A", recommended: true }
      ],
      isComplete: false
    });

    const parsed: InterviewQuestionResponse = JSON.parse(json);
    
    expect(parsed.question).toBe("What is your choice?");
    expect(parsed.options).toHaveLength(1);
    expect(parsed.options[0].title).toBe("Option A");
    // ✅ No edge cases - schema guarantees structure
  });

  it("should handle invalid JSON gracefully", () => {
    const invalidJson = "{ invalid json";
    
    expect(() => JSON.parse(invalidJson)).toThrow();
    // Fallback to text parsing
  });
});
```

**Benefits:**
- ✅ Fewer tests needed (schema guarantees structure)
- ✅ Focus on happy path + error handling
- ✅ No edge case hunting

---

## Maintenance Impact

### Before
```
Files to maintain:
├── parse-options.ts (150 LOC)
│   ├── Tier 1: Markdown parsing
│   ├── Tier 2: Inline parsing  
│   └── Tier 3: Fallback parsing
├── parse-options.test.ts (500 LOC)
│   └── 25 edge case tests
└── AI prompts with formatting rules
    └── "DO NOT echo options..."

Issues:
- AI sometimes echoes options (duplication)
- New edge cases discovered regularly
- Regex patterns hard to understand
- High cognitive load for maintenance
```

### After
```
Files to maintain:
├── response-schemas.ts (100 LOC)
│   ├── INTERVIEW_QUESTION_SCHEMA
│   ├── ARTIFACT_RESPONSE_SCHEMA
│   └── TypeScript types
├── feature-flags.ts (30 LOC)
│   └── Gradual rollout control
└── Simple JSON.parse() in hooks

Benefits:
- AI CANNOT return invalid structure (Bedrock enforces)
- Schema is self-documenting
- TypeScript catches errors at compile time
- Low cognitive load
- Easy to extend (add new fields to schema)
```

---

## Migration Path

### Phase 1: Foundation (2-3 hours)
```
✓ Create response-schemas.ts
✓ Add responseSchema to step-config.ts
✓ Create feature-flags.ts
```

### Phase 2: Integration (2-3 hours)
```
✓ Update streaming.ts with response_format
✓ Update server.ts (non-streaming)
✓ Pass stepNumber through call chain
```

### Phase 3: Consumption (2-3 hours)
```
✓ Update hooks.ts to parse JSON
✓ Update InterviewThread.tsx to use structured options
✓ Update API route
```

### Phase 4: Testing + Rollout (2-3 hours)
```
✓ Comprehensive tests
✓ Documentation
✓ Gradual rollout (Step 1 → Steps 1-3 → All)
✓ Monitor and iterate
```

---

## Success Metrics

### Before (Current State)
- ❌ Question text duplication in UI
- ❌ 25 edge case tests required
- ❌ ~150 LOC parser maintenance
- ❌ New edge cases discovered monthly
- ❌ Parser failures possible

### After (Target State)
- ✅ Zero question text duplication
- ✅ ~10 core tests (schema guarantees)
- ✅ ~10 LOC parsing (JSON.parse)
- ✅ Zero edge cases (schema enforced)
- ✅ Parse failures impossible (Bedrock validates)

---

## Decision: Why Structured Output?

1. **Modern Best Practice:** JSON Schema structured output is the industry standard for LLM integrations
2. **AWS Bedrock Support:** Native support for `response_format` parameter (Claude 3.5+)
3. **Type Safety:** Compile-time guarantees eliminate runtime parsing errors
4. **Maintainability:** Schema-driven approach is self-documenting and easy to extend
5. **User Experience:** Clean UI without duplication
6. **Enterprise Ready:** Configuration-driven, testable, observable, reversible

---

**Recommendation:** Proceed with structured output migration. The benefits far outweigh the implementation effort, and the gradual rollout strategy ensures zero risk.
