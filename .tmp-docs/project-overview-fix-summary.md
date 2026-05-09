# Project Overview Capture Fix

## Problem
When users selected "Start from scratch" in the project creation flow, they were immediately dropped into the Business Requirements Interview (Step 2) which asked detailed questions like "What is the primary problem your project aims to solve?" without any context about what they were trying to build. The AI had no idea what project was being planned.

## Root Cause
Step 1 (Gap Analysis Worksheet) was configured as an "automated" step and had a simplified UI (`ProjectIntake`) that immediately completed Step 1 with just a binary choice ("scratch" vs "doc-first"), skipping the full interview flow. This meant no project overview was captured.

## Solution
1. **Changed Step 1 to interview type** - Modified `step-config.ts` to change Step 1 from "automated" to "interview" type, enabling multi-turn Q&A.

2. **Added Step 1 interview content** - Created `STEP_1_CONTENT` in `skills-content.ts` with a two-question flow:
   - Q1: "Do you have an existing requirements document to analyze, or are you starting from scratch?"
   - Q2 (if scratch): "Please give me a brief overview of what you're looking to build. What is this project about?"

3. **Updated Business Requirements context** - Modified `buildInterviewPrompt()` in `prompts.ts` to accept an optional `projectOverview` parameter and inject it as context for Step 2+.

4. **Wired context across steps** - Updated both API handlers (`app/api/ai/interview.ts` and `src/features/ai/server.ts`) to:
   - Fetch Step 1 answers from project state
   - Extract the project overview (2nd answer from Step 1)
   - Pass it to `buildInterviewPrompt()` for subsequent steps

5. **Simplified ProjectIntake** - Changed `ProjectIntake.tsx` to be a simple pass-through wrapper since Step 1 now uses the full interview flow.

6. **Updated tests** - Fixed affected tests in `ProjectIntake.test.tsx` and `server.test.ts` to reflect the new behavior.

## Flow After Fix
1. User clicks "Start from scratch"
2. User names their project
3. **Step 1 (Gap Analysis)** - Now asks:
   - "Do you have existing docs or starting from scratch?" → User answers "Starting from scratch"
   - "Please describe what you're looking to build" → User provides project overview
4. **Step 2 (Business Requirements)** - Receives project overview as context:
   ```
   ## Project Overview (from Step 1)
   
   [User's description of what they're building]
   
   ## Interview Categories (ask in this order)
   ...
   ```
5. AI can now tailor questions based on what the user is actually trying to build

## Files Changed
- `src/features/ai/skills-content.ts` - Added STEP_1_CONTENT, updated getSkillContent()
- `src/features/planning/step-config.ts` - Changed Step 1 type to "interview"
- `src/features/ai/prompts.ts` - Added projectOverview parameter to buildInterviewPrompt()
- `app/api/ai/interview.ts` - Fetch Step 1 context and pass to prompt builder
- `src/features/ai/server.ts` - Same context fetching for non-streaming endpoint
- `src/features/planning/components/ProjectIntake.tsx` - Simplified to pass-through wrapper
- `src/features/planning/components/ProjectIntake.test.tsx` - Updated tests
- `src/features/ai/server.test.ts` - Fixed test expectations

## Additional Fix: Options Persistence Bug

### Problem
After answering the first question in Step 1, the second question (free-form project description) would display with the old option buttons from the first question, even though it should only show a text input. The old options were still visible even during the "Computing next question..." loading state.

### Root Cause
Old options persisted in the step state until new options were parsed from the completed streamed question. This meant:
1. During the loading state ("Computing next question..."), old options were still visible
2. The `onOptionsReady` callback only fired when `options.length > 0`, so questions with no options would never clear old ones

### Solution (Two-part fix)

**Part 1: Clear options immediately on submit** (`InterviewThread.tsx`)
```typescript
onSuccess: () => {
  // Clear old options immediately before fetching next question
  updateOptions({
    stepNumber: currentStep.stepNumber,
    options: [],
  });
  setRefetchTrigger(prev => prev + 1);
}
```

**Part 2: Always update options, even when empty** (`hooks.ts`)
```typescript
// Always call onOptionsReady (even with empty array) to clear old options
if (!cancelled && currentParams.onOptionsReady) {
  const options = parseOptions(accumulatedText);
  currentParams.onOptionsReady(options); // Called even if options.length === 0
}
```

## Testing
- ✅ All 132 tests passing
- ✅ TypeScript compilation successful
- ✅ Build successful
- ✅ Options correctly cleared when follow-up question has no options
