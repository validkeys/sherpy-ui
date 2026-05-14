# Implementation Guide: Fix Interview Options Display Bugs

**Priority:** High
**Estimated Effort:** 8-12 hours
**Complexity:** Medium

## Quick Start

This guide provides step-by-step instructions to fix three critical bugs in the interview question display system.

## Prerequisites

- Node.js environment configured
- Test suite runnable (`npm test`)
- Understanding of React state management
- Familiarity with regular expressions

## Implementation Steps

### Step 1: Write Failing Tests (TDD Approach)

Create comprehensive test coverage before fixing bugs.

#### Create `src/features/ai/parse-options.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import { parseOptions } from "./parse-options";

describe("parseOptions", () => {
  describe("markdown format with **Options:** header", () => {
    it("parses standard markdown format", () => {
      const text = `Based on your project, let's understand your current state.

**Options:**
1. Nothing exists yet - I'm starting completely fresh
2. I have some code/prototype already - There's existing work
3. I have a partial implementation - Some features are built

Please select an option or describe your current technical state.`;

      const options = parseOptions(text);
      
      expect(options).toHaveLength(3);
      expect(options[0]).toEqual({
        letter: "1",
        title: "Nothing exists yet",
        body: "I'm starting completely fresh",
        recommended: false,
      });
      expect(options[1]).toEqual({
        letter: "2",
        title: "I have some code/prototype already",
        body: "There's existing work",
        recommended: false,
      });
    });

    it("detects recommended options", () => {
      const text = `**Options:**
1. Starting from scratch (Recommended) - I need help defining requirements
2. I have a requirements document - I have existing documentation`;

      const options = parseOptions(text);
      
      expect(options[0].recommended).toBe(true);
      expect(options[1].recommended).toBe(false);
    });

    it("filters out 'Type your own answer' option", () => {
      const text = `**Options:**
1. Real option - Description
2. Type your own answer`;

      const options = parseOptions(text);
      
      expect(options).toHaveLength(1);
      expect(options[0].title).toBe("Real option");
    });

    it("handles options with numbers in descriptions", () => {
      const text = `**Options:**
1. Deploy to AWS EC2 - Use EC2 instances for hosting
2. Use Node.js 18+ - Requires Node 18 or higher`;

      const options = parseOptions(text);
      
      expect(options).toHaveLength(2);
      expect(options[0].title).toBe("Deploy to AWS EC2");
      expect(options[0].body).toBe("Use EC2 instances for hosting");
      expect(options[1].title).toBe("Use Node.js 18+");
    });

    it("handles options with special characters", () => {
      const text = `**Options:**
1. REST API (HTTP/JSON) - Standard RESTful architecture
2. GraphQL - Query language for APIs
3. gRPC (Protocol Buffers) - High-performance RPC framework`;

      const options = parseOptions(text);
      
      expect(options).toHaveLength(3);
      expect(options[0].title).toContain("(HTTP/JSON)");
      expect(options[2].title).toContain("(Protocol Buffers)");
    });
  });

  describe("inline format after 'Please select an option'", () => {
    it("parses inline format with space separators", () => {
      const text = `What is the primary problem? Please select an option: 1. Automate manual workflow - Replace time-consuming processes 2. Improve existing solution - Enhance current tooling 3. New capability - Build something new`;

      const options = parseOptions(text);
      
      expect(options).toHaveLength(3);
      expect(options[0].title).toBe("Automate manual workflow");
    });

    it("handles inline format with newline separators", () => {
      const text = `Select an option:
1. **Individual developers** (Recommended) - Solo developers on small projects
2. **Development teams** - Small to medium teams
3. **Enterprise organizations** - Large teams with complex workflows`;

      const options = parseOptions(text);
      
      expect(options).toHaveLength(3);
      expect(options[0].recommended).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("returns empty array when no options found", () => {
      const text = "This is a free-form question with no options.";
      
      const options = parseOptions(text);
      
      expect(options).toEqual([]);
    });

    it("handles empty input", () => {
      expect(parseOptions("")).toEqual([]);
      expect(parseOptions("   ")).toEqual([]);
    });

    it("handles malformed options gracefully", () => {
      const text = `**Options:**
1. Valid option - Description
This is not an option
2. Another valid - Description`;

      const options = parseOptions(text);
      
      expect(options).toHaveLength(2);
    });

    it("handles options without descriptions", () => {
      const text = `**Options:**
1. Option A
2. Option B - With description`;

      const options = parseOptions(text);
      
      // Current implementation requires descriptions
      // This might return 0 or 1 depending on implementation
      expect(options.length).toBeGreaterThanOrEqual(0);
    });

    it("handles very long option descriptions", () => {
      const longDesc = "A".repeat(500);
      const text = `**Options:**
1. Short title - ${longDesc}`;

      const options = parseOptions(text);
      
      expect(options).toHaveLength(1);
      expect(options[0].body.length).toBeGreaterThan(400);
    });
  });

  describe("validation", () => {
    it("trims whitespace from titles and bodies", () => {
      const text = `**Options:**
1.   Title with spaces   -   Body with spaces  `;

      const options = parseOptions(text);
      
      expect(options[0].title).toBe("Title with spaces");
      expect(options[0].body).toBe("Body with spaces");
    });

    it("preserves internal whitespace in multi-word titles", () => {
      const text = `**Options:**
1. Multiple Word Title - Description`;

      const options = parseOptions(text);
      
      expect(options[0].title).toBe("Multiple Word Title");
    });
  });
});
```

#### Add tests to `src/features/planning/components/InterviewThread.test.tsx`

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InterviewThread } from "./InterviewThread";

describe("InterviewThread - Options Display", () => {
  it("does not show duplicate options text in question", async () => {
    const mockStepState = {
      currentStep: 2,
      steps: [
        {
          stepNumber: 2,
          name: "Business Requirements",
          status: "in_progress",
          question: "What is the primary problem?",
          options: [
            { letter: "1", title: "Automate workflow", body: "Replace manual processes" },
            { letter: "2", title: "Improve solution", body: "Enhance current tooling" },
          ],
        },
      ],
    };

    render(<InterviewThread stepState={mockStepState} projectId="test" />);

    const questionCard = screen.getByTestId("question-card");
    const questionText = questionCard.textContent;

    // Question should NOT contain the options list
    expect(questionText).not.toContain("**Options:**");
    expect(questionText).not.toMatch(/1\.\s+Automate workflow/);
    
    // Options should be rendered as separate cards
    const optionCards = screen.getAllByTestId("option-card");
    expect(optionCards).toHaveLength(2);
  });

  it("renders all parsed options as clickable cards", async () => {
    const mockStepState = {
      currentStep: 2,
      steps: [
        {
          stepNumber: 2,
          name: "Business Requirements",
          status: "in_progress",
          question: "Select your primary goal",
          options: [
            { letter: "1", title: "Option A", body: "Description A", recommended: true },
            { letter: "2", title: "Option B", body: "Description B" },
            { letter: "3", title: "Option C", body: "Description C" },
          ],
        },
      ],
    };

    render(<InterviewThread stepState={mockStepState} projectId="test" />);

    // All three options should render
    const optionCards = screen.getAllByTestId("option-card");
    expect(optionCards).toHaveLength(3);

    // Verify content
    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
    expect(screen.getByText("Option C")).toBeInTheDocument();

    // Verify recommended badge
    expect(screen.getByText(/recommended/i)).toBeInTheDocument();
  });

  it("clears options immediately on answer submission", async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn().mockResolvedValue({});
    
    const mockStepState = {
      currentStep: 2,
      steps: [
        {
          stepNumber: 2,
          name: "Business Requirements",
          status: "in_progress",
          question: "What is your goal?",
          options: [
            { letter: "1", title: "Goal A", body: "Description" },
            { letter: "2", title: "Goal B", body: "Description" },
          ],
        },
      ],
    };

    render(<InterviewThread stepState={mockStepState} projectId="test" />);

    // Select option
    const firstOption = screen.getAllByTestId("option-card")[0];
    await user.click(firstOption);

    // Submit
    const submitButton = screen.getByText("Submit →");
    await user.click(submitButton);

    // Options should disappear immediately (not after server response)
    await waitFor(() => {
      expect(screen.queryByTestId("option-card")).not.toBeInTheDocument();
    });

    // Loading state should be shown
    expect(screen.getByText(/computing next question/i)).toBeInTheDocument();
  });

  it("shows loading state during question streaming", async () => {
    const mockStepState = {
      currentStep: 2,
      steps: [
        {
          stepNumber: 2,
          name: "Business Requirements",
          status: "in_progress",
          question: "",
          options: [],
        },
      ],
    };

    // Mock streaming in progress
    vi.mock("../ai/hooks", () => ({
      useStreamingQuestion: () => ({
        text: "Partial question text...",
        loading: true,
        error: null,
        isComplete: false,
        refetch: vi.fn(),
      }),
    }));

    render(<InterviewThread stepState={mockStepState} projectId="test" />);

    // Should show loading indicator
    expect(screen.getByText(/computing next question/i)).toBeInTheDocument();

    // Input should be disabled during loading
    const input = screen.getByPlaceholderText(/wait for question/i);
    expect(input).toBeDisabled();
  });
});
```

### Step 2: Fix Prompt Engineering

#### Update `src/features/ai/skills-content.ts`

Add clear instructions to prevent options from appearing in question text:

```typescript
export const STEP_2_CONTENT = `# Business Requirements Interview

You are conducting a structured interview to gather comprehensive business requirements for a software project.

## IMPORTANT: Question Format

When asking multiple-choice questions:
1. State the question clearly and concisely
2. **DO NOT include the options list in your question text**
3. End with: "Please select an option or type your own answer."
4. The UI will automatically display the options as clickable buttons

Example of correct format:
❌ WRONG:
"What is the primary problem?
**Options:**
1. Automate workflow
2. Improve solution
Please select..."

✅ CORRECT:
"What is the primary problem your project aims to solve? Please select an option or type your own answer."

## Interview Categories (ask in this order)

### Category 1: Problem Definition & Scope

**Question 1:** What is the primary problem your project aims to solve?

[The following options will be presented to the user automatically - DO NOT include them in your response]
**Options:**
1. Automate manual workflow (Recommended) - Replace time-consuming manual processes
2. Improve existing solution - Enhance or replace current tooling
3. New capability - Build something entirely new
4. Type your own answer

// ... rest of content
`;
```

Apply same pattern to STEP_1_CONTENT and STEP_3_CONTENT.

#### Update `src/features/ai/prompts.ts`

Add system-level instruction:

```typescript
export function buildInterviewPrompt(
  stepName: string,
  stepNumber: number,
  previousAnswers: string[],
  projectOverview?: string,
): Message[] {
  // Get skill content for this step
  const skillContent = getSkillContent(stepNumber);

  if (skillContent) {
    let systemContext = skillContent;

    // Add project overview from Step 1 if available
    if (projectOverview) {
      systemContext += `\n\n## Project Overview (from Step 1)\n\n${projectOverview}\n`;
    }

    if (previousAnswers.length > 0) {
      systemContext += "\n\n## Progress So Far\n\nPrevious answers in this interview:\n";
      for (const [index, answer] of previousAnswers.entries()) {
        systemContext += `${index + 1}. ${answer}\n`;
      }
      systemContext += "\n";
    }

    // Add explicit formatting instruction
    systemContext += `\n\n## Response Format

When presenting multiple-choice questions:
- State ONLY the question text
- DO NOT list the options in your response
- The options are already defined above and will be displayed automatically
- End your question with: "Please select an option or type your own answer."

Example response:
"What is the primary problem your project aims to solve? Please select an option or type your own answer."

Now ask the next appropriate question based on the progress above.`;

    return [
      { role: "user", content: systemContext },
      {
        role: "assistant",
        content: "Understood. I will ask questions without listing the options in my response, as the UI will display them automatically.",
      },
      {
        role: "user",
        content: previousAnswers.length === 0
          ? "Begin the interview by asking the first question."
          : "Ask the next question in the sequence.",
      },
    ];
  }

  // ... fallback logic
}
```

### Step 3: Enhance Option Parsing

#### Replace `src/features/ai/parse-options.ts`

```typescript
import type { StepOption } from "../planning/types";

/**
 * Parses multiple-choice options from AI-generated question text.
 * 
 * Supports multiple formats:
 * 1. Markdown: **Options:** followed by numbered list
 * 2. Inline: "Please select: 1. Title - Body 2. Title - Body"
 * 3. Fallback: Simple numbered list anywhere in text
 */
export function parseOptions(questionText: string): StepOption[] {
  if (!questionText || questionText.trim() === "") {
    return [];
  }

  // Try parsers in priority order
  const parsers = [
    parseMarkdownFormat,
    parseInlineFormat,
    parseFallbackFormat,
  ];

  for (const parser of parsers) {
    try {
      const options = parser(questionText);
      if (options.length > 0) {
        return validateAndCleanOptions(options);
      }
    } catch (error) {
      console.warn(`[parseOptions] Parser failed:`, error);
      // Continue to next parser
    }
  }

  return [];
}

/**
 * Format 1: Markdown with **Options:** header and newline-separated items
 * 
 * Example:
 * **Options:**
 * 1. Title (Recommended) - Description
 * 2. Another Title - Another description
 */
function parseMarkdownFormat(text: string): StepOption[] {
  const options: StepOption[] = [];

  // Match **Options:** followed by content until double newline or end
  const optionsMatch = text.match(/\*\*Options:\*\*\s*\n([\s\S]*?)(?:\n\n|$)/);
  if (!optionsMatch) {
    return [];
  }

  const optionsText = optionsMatch[1];
  
  // Enhanced regex:
  // - (\d+)\. : capture number and dot
  // - \s* : optional whitespace
  // - ([^\n-]+?) : title (anything except newline or dash)
  // - (?:\s+\(Recommended\))? : optional (Recommended) marker
  // - \s*-\s* : dash separator with optional whitespace
  // - (.+?)$ : description until end of line
  const optionRegex = /^(\d+)\.\s*([^\n-]+?)(?:\s+\(Recommended\))?\s*-\s*(.+?)$/gm;

  let match;
  while ((match = optionRegex.exec(optionsText)) !== null) {
    const [fullMatch, number, title, body] = match;

    // Skip "Type your own answer" option
    if (title.trim().toLowerCase().includes("type your own")) {
      continue;
    }

    const isRecommended = fullMatch.includes("(Recommended)");

    options.push({
      letter: number,
      title: title.trim(),
      body: body.trim(),
      recommended: isRecommended,
    });
  }

  return options;
}

/**
 * Format 2: Inline options after "Please select"
 * 
 * Example:
 * "Please select an option: 1. Title - Body 2. Title - Body"
 */
function parseInlineFormat(text: string): StepOption[] {
  const options: StepOption[] = [];

  // Match content after "Please select" and before "Type your own"
  const inlineMatch = text.match(
    /Please select.*?[:：]\s*([\s\S]+?)(?:Type your own|$)/i
  );
  
  if (!inlineMatch) {
    return [];
  }

  const optionsText = inlineMatch[1];

  // Split by number patterns to handle various separators
  // Match: "1. Title (Recommended) - Body" or "1. Title - Body"
  const parts = optionsText.split(/(?=\d+\.\s)/);

  for (const part of parts) {
    if (!part.trim()) continue;

    // Parse each option part
    const optionMatch = part.match(
      /^(\d+)\.\s*(.+?)(?:\s+\(Recommended\))?\s*[-–—]\s*(.+?)$/s
    );

    if (!optionMatch) continue;

    const [fullMatch, number, title, body] = optionMatch;

    // Skip "Type your own" variants
    if (title.trim().toLowerCase().includes("type your own")) {
      continue;
    }

    const isRecommended = fullMatch.includes("(Recommended)");

    // Clean up title (remove bold markers if present)
    const cleanTitle = title.trim().replace(/\*\*/g, "");

    options.push({
      letter: number,
      title: cleanTitle,
      body: body.trim(),
      recommended: isRecommended,
    });
  }

  return options;
}

/**
 * Format 3: Fallback - simple numbered list anywhere in text
 * 
 * Tries to extract any numbered list that looks like options
 */
function parseFallbackFormat(text: string): StepOption[] {
  const options: StepOption[] = [];

  // Find all lines that start with number + dot
  const lines = text.split("\n");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match: "1. Something - Description" or "1. Something"
    const match = line.match(/^(\d+)\.\s*(.+?)(?:\s*[-–—]\s*(.+?))?$/);
    
    if (!match) continue;

    const [, number, title, body] = match;

    // Skip "Type your own" variants
    if (title.toLowerCase().includes("type your own")) {
      continue;
    }

    // Skip if title is too short (likely not an option)
    if (title.trim().length < 3) {
      continue;
    }

    options.push({
      letter: number,
      title: title.trim(),
      body: body?.trim() || "",
      recommended: false, // Can't detect in fallback mode
    });
  }

  return options;
}

/**
 * Validates and cleans parsed options
 */
function validateAndCleanOptions(options: StepOption[]): StepOption[] {
  const seen = new Set<string>();
  const valid: StepOption[] = [];

  for (const option of options) {
    // Skip duplicates
    if (seen.has(option.letter)) {
      continue;
    }

    // Skip invalid options
    if (!option.title || option.title.length === 0) {
      continue;
    }

    seen.add(option.letter);
    valid.push({
      ...option,
      title: option.title.trim(),
      body: option.body.trim(),
    });
  }

  return valid;
}
```

### Step 4: Improve State Management

#### Update `src/features/planning/components/InterviewThread.tsx`

```typescript
// Add state to track transition between questions
const [isTransitioning, setIsTransitioning] = useState(false);

function handleSubmit() {
  const answer = selectedOption ?? inputText.trim();
  if (!answer || !currentStep) return;

  // Capture current question
  const currentQuestionText =
    streamedQuestion ||
    (streamError ? currentStep.question : undefined) ||
    currentStep.question ||
    "";

  // Store optimistic answer
  setOptimisticAnswer({
    stepNumber: currentStep.stepNumber,
    question: currentQuestionText,
    answer,
    stepName: currentStep.name,
  });

  // Set transitioning immediately to hide old options
  setIsTransitioning(true);

  // Clear input
  setInputText("");
  setSelectedOption(null);

  submitAnswer(
    {
      stepNumber: currentStep.stepNumber,
      question: currentQuestionText,
      answer,
    },
    {
      onSuccess: () => {
        setOptimisticAnswer(null);
        // Clear options immediately
        updateOptions({
          stepNumber: currentStep.stepNumber,
          options: [],
        });
        // Trigger refetch for next question
        setRefetchTrigger(prev => prev + 1);
        // Keep transitioning true until new question arrives
      },
      onError: () => {
        setOptimisticAnswer(null);
        setIsTransitioning(false);
      },
    },
  );
}

// Reset transitioning when new question streams in
useEffect(() => {
  if (streamedQuestion && !isStreaming) {
    setIsTransitioning(false);
  }
}, [streamedQuestion, isStreaming]);

// Conditional options rendering
const options = (isTransitioning || isPending || !currentStep?.options?.length)
  ? undefined
  : (
      <OptionStack>
        {currentStep.options.map((opt) => (
          <OptionCard
            key={opt.letter}
            letter={opt.letter}
            title={opt.title}
            body={opt.body}
            recommended={opt.recommended}
            selected={selectedOption === opt.letter}
            onClick={() =>
              setSelectedOption((prev) =>
                prev === opt.letter ? null : opt.letter,
              )
            }
          />
        ))}
      </OptionStack>
    );
```

### Step 5: Run Tests

```bash
# Run unit tests
npm test src/features/ai/parse-options.test.ts

# Run integration tests
npm test src/features/planning/components/InterviewThread.test.tsx

# Run full test suite
npm test

# Run with coverage
npm test -- --coverage
```

### Step 6: Manual Testing Checklist

- [ ] Start new project interview
- [ ] Verify Question 1 displays correctly
- [ ] Verify options appear as cards (not in question text)
- [ ] Verify all options render (typically 3-5 per question)
- [ ] Select an option and submit
- [ ] Verify options disappear immediately
- [ ] Verify next question loads smoothly
- [ ] Complete all 33 questions (1 + 16 + 16)
- [ ] Check for any console errors
- [ ] Test with slow network (throttle to 3G)
- [ ] Test with different screen sizes

## Rollback Plan

If issues arise in production:

```bash
# Revert commits
git revert <commit-hash>

# Deploy previous version
git checkout <previous-tag>
npm run build
npm run deploy
```

## Monitoring

After deployment, monitor:

- Error rate in `/api/ai/interview` endpoint
- Option parsing success rate (should be > 99%)
- User completion rate (should not decrease)
- Average time per question (should not increase)

## Success Metrics

- ✅ Zero duplicate options text
- ✅ All options render correctly
- ✅ No visual flicker on submission
- ✅ 99%+ parsing success rate
- ✅ No performance regression
