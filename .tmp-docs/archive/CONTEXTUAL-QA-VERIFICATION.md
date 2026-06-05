# Contextual Interview Questions - QA Verification Report

**Date:** 2026-05-12  
**Testing Objective:** Verify Business Requirements interview questions (step 2) are contextual based on Gap Analysis project description  
**Status:** ❌ **FAILED - Questions are not contextual**

---

## Executive Summary

Testing reveals that while `projectContext` is correctly passed through the system and included in the AI prompt, **the AI is not using this context to generate contextual questions**. All questions remain generic and follow the skill content templates exactly, without any reference to the specific project details.

---

## Test Setup

- **Dev Server:** http://localhost:5180 ✅ Running
- **API Endpoint:** POST /api/ai/interview ✅ Responding
- **Test Method:** Direct API calls to isolate AI behavior from UI issues

---

## API Integration Verification

### ✅ PASS: projectContext Flows Through System

**Evidence:**

1. **Frontend sends projectContext** (commit 65fcaac)
   - `planningMachine.ts` line 264: `projectContext: buildProjectContext(context)`
   - `buildProjectContext` correctly extracts Gap Analysis from step 1 answers

2. **Backend receives projectContext**
   - `app/api/ai/interview.ts` line 19: Extracts `projectContext` from request body
   - Line 30-32: Validates projectContext as optional string
   - Line 41: Assigns to `projectOverview` variable

3. **Prompt includes projectContext**
   - `src/features/ai/prompts.ts` line 23-25:
     ```typescript
     if (projectOverview) {
       systemContext += `\n\n## Project Overview (from Step 1)\n\n${projectOverview}\n`;
     }
     ```

### ❌ FAIL: AI Ignores Project Context

**Test Case 1: HTML Button Page**

```bash
curl -X POST http://localhost:5180/api/ai/interview \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "html-buttons-test",
    "stepNumber": 2,
    "previousAnswers": [],
    "projectContext": "Simple HTML page with three buttons centered vertically and horizontally. The page should display three clickable buttons in the center of the viewport using CSS flexbox for alignment."
  }'
```

**Expected Question (Contextual):**
```
What should happen when users click the three buttons on your HTML page?

**Options:**
1. Navigate to different sections - Each button links to a different part of the page
2. Trigger JavaScript actions - Buttons execute custom functions (show/hide, calculations, etc.)
3. Submit form data - Buttons send information to a server
4. Type your own answer
```

**Actual Question (Generic):**
```
What is the primary problem your project aims to solve?

**Options:**
1. Automate manual workflow (Recommended) - Replace time-consuming manual processes with automated workflows
2. Improve existing solution - Enhance or replace current tooling that's inadequate
3. New capability - Build something entirely new that doesn't exist yet
4. Type your own answer
```

**Analysis:** The AI completely ignores the HTML button context and asks the first generic question from STEP_2_CONTENT in skills-content.ts.

---

## Root Cause Analysis

### Issue: AI Follows Script Too Rigidly

The `STEP_2_CONTENT` in `src/features/ai/skills-content.ts` provides detailed interview questions with options. While line 45 instructs:

> "The user has provided a project overview in the previous step. **Use that context to tailor your questions and provide more relevant options when appropriate.**"

The AI is:
1. ✅ Receiving the project context in the prompt
2. ❌ Not using it to customize questions
3. ❌ Repeating the generic skill content verbatim

### Why This Happens

The skill content includes very specific, prescriptive questions like:

```
**Question 1:** What is the primary problem your project aims to solve?

**Options:**
1. Automate manual workflow (Recommended) - ...
2. Improve existing solution - ...
3. New capability - ...
4. Type your own answer
```

The AI interprets these as **required templates** rather than **guidelines to customize**.

---

## Recommendations

### Option 1: Strengthen Context Instructions (Quick Fix)

**File:** `src/features/ai/skills-content.ts`

Change line 39-46 from:

```typescript
export const STEP_2_CONTENT = `# Business Requirements Interview

You are conducting a structured interview to gather comprehensive business requirements for a software project.

## Context

The user has provided a project overview in the previous step. Use that context to tailor your questions and provide more relevant options when appropriate.
```

To:

```typescript
export const STEP_2_CONTENT = `# Business Requirements Interview

You are conducting a structured interview to gather comprehensive business requirements for a software project.

## CRITICAL: Use Project Context

A project overview was provided in Step 1. You MUST:
1. **Reference the project explicitly** in your questions (e.g., "For your HTML button page..." or "For your REST API...")
2. **Customize the options** to match the project type (web page vs API vs mobile app)
3. **Skip irrelevant questions** (e.g., don't ask about API endpoints for a static HTML page)

**Example of contextual question:**
If project is "HTML page with three buttons", ask:
"What should happen when users click each of the three buttons?"
NOT: "What is the primary problem your project aims to solve?"
```

### Option 2: Add Few-Shot Examples (Better Fix)

Add examples showing HOW to contextualize questions:

```typescript
## Examples of Contextual Questions

**If project is: "HTML page with three buttons centered"**
- "What should each of the three buttons do when clicked?"
- "Should the buttons have hover effects or animations?"
- "Will the button actions happen client-side (JavaScript) or require server calls?"

**If project is: "REST API for user authentication"**
- "Which authentication method will your API use (JWT, OAuth, API keys)?"
- "What user registration endpoints does your API need?"
- "Should the API support password reset workflows?"

**If project is: "iOS habit tracking app"**
- "How should the app remind users about their daily habits?"
- "Where should habit data be stored (local device, cloud, or both)?"
- "What screens does your habit tracker need (list, detail, stats)?"
```

### Option 3: Use Structured Output with Context Injection (Best Fix)

Modify the prompt to explicitly inject context into each question template:

**File:** `src/features/ai/prompts.ts` (around line 22-25)

```typescript
if (projectOverview) {
  systemContext += `\n\n## PROJECT CONTEXT - READ CAREFULLY\n\n`;
  systemContext += `The user is building: "${projectOverview}"\n\n`;
  systemContext += `IMPORTANT INSTRUCTIONS:\n`;
  systemContext += `1. Rewrite EVERY question below to reference this specific project\n`;
  systemContext += `2. Replace generic examples with project-specific ones\n`;
  systemContext += `3. If a question category doesn't apply to this project type, skip it\n`;
  systemContext += `4. Your first question should directly reference what the user is building\n\n`;
}
```

---

## Test Cases for Verification

Once fixes are implemented, retest with these three scenarios:

### Test 1: HTML Button Page
```json
{
  "projectContext": "simple html page with three buttons centered vertically and horizontally"
}
```
**Expected:** Questions mention buttons, layout, clicks, styling, HTML/CSS

### Test 2: REST API
```json
{
  "projectContext": "REST API for user authentication with JWT tokens"
}
```
**Expected:** Questions mention endpoints, JWT, auth flow, data models, security

### Test 3: Mobile App
```json
{
  "projectContext": "iOS habit tracking app with daily reminders"
}
```
**Expected:** Questions mention screens, notifications, habits, iOS, persistence

---

## Conclusion

The good news: The technical infrastructure works perfectly. `projectContext` flows from frontend → backend → AI prompt.

The bad news: The AI doesn't understand it should use the context to customize questions. The skill content's prescriptive format overrides the contextual instruction.

**Next Steps:**
1. Implement Option 3 (best fix) - add explicit context injection instructions
2. Test with all three scenarios above
3. Verify questions reference project-specific terms
4. Check that questions vary by project type

---

## Related Files

- `/workspace/src/features/planning/machines/planningMachine.ts` - buildProjectContext (lines 230-242), fetchQuestion (lines 19-87)
- `/workspace/app/api/ai/interview.ts` - API endpoint that receives projectContext
- `/workspace/src/features/ai/prompts.ts` - buildInterviewPrompt (adds projectOverview to prompt)
- `/workspace/src/features/ai/skills-content.ts` - STEP_2_CONTENT with interview questions

## Commits Referenced

- `65fcaac` - Added projectContext to API requests
- `ef9c3da` - Fixed XState actor lifecycle (StrictMode issue)
