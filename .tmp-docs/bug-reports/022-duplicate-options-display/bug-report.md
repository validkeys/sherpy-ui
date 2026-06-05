# BUG-022: Duplicate Options Display in Multi-Choice Questions

**Reported:** 2026-06-05  
**Status:** Investigating  
**Severity:** Medium (UI/UX issue, not functional)

## Problem

Multi-option questions show duplicate options:
1. First as markdown text in the question (from LLM response)
2. Again as interactive option buttons (from parsed options)

## Example

```
Question text:
"What is the primary problem your interactive background color-changing HTML page aims to solve?

**Options:**
1. Automate manual workflow (Recommended) - Replace time-consuming manual processes
2. Improve existing solution - Enhance or replace current tooling
3. New capability - Build something entirely new
4. Type your own answer"

Then shows interactive buttons for the same options below.
```

## Root Cause

In `src/features/ai/hooks.ts` (lines 124-138), the **text mode** parsing:

1. ✅ Correctly parses options from text using `parseOptions()`
2. ❌ Does NOT strip the **Options:** section from question text
3. ❌ Calls `setText(accumulatedText)` with full text including markdown options
4. Result: UI shows both the raw markdown AND the interactive buttons

## Expected Behavior

Question text should only show the question itself, without the **Options:** section. The parsed options should only appear as interactive buttons.

## Files Affected

- `src/features/ai/hooks.ts` - useStreamingQuestion hook (line 129)
- `src/components/workflow-chat/ChatMessage.tsx` - Displays the question text

## Solution Approach

1. Add a function to strip **Options:** section from question text
2. Apply it before `setText()` in text mode (line 129)
3. Ensure JSON mode already handles this correctly (line 108)

## Notes

- JSON mode (structured output) already works correctly - it receives separate `question` and `options` fields
- Only affects text mode (legacy parsing)
- The prompts already try to prevent this (lines 92-122 in prompts.ts), but LLM still includes it sometimes
