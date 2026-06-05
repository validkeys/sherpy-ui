# Workflow Chat Design Mockup

**Branch:** `feature/design-consistency`  
**Status:** ✅ First Iteration Complete - Ready for Review  
**Date:** 2026-05-25

## Overview

Created a chat-based UI mockup for the entire 10-stage planning workflow. This is a **pure design component** not yet connected to real data - designed for iteration in Storybook (to be installed).

## Design Goals

Transform the current stage-by-stage UI into a **continuous, chat-like conversation** that:
- Shows persistent conversation across all 10 stages
- Uses visual dividers between stages
- Displays answer cards (forms + options) while answering
- Shows completed Q&A with selected answers highlighted
- Includes typing indicators for loading states
- Has inline artifact pills that open dialogs
- Provides Chat/Artifacts tab switching

## Component Structure

### Main Component: `WorkflowChat`

**Location:** `src/components/workflow-chat/WorkflowChat.tsx`

**Key Features:**

1. **Message Types**
   - `text`: Plain assistant/user messages
   - `question`: Form fields or multiple choice options
   - `answer`: User's submitted answer (highlighted)
   - `artifact`: Generated document with inline pill
   - `loading`: Typing indicator
   - `divider`: Stage separator

2. **Stage Dividers**
   ```
   ─────────── ◉ STAGE 02 · Business Requirements ───────────
   ```
   - Uses botanical stage colors from design system
   - Mono uppercase stage label
   - Clean visual separation

3. **Answer Cards**
   - **For Questions**: Shows form inputs or multiple choice options
   - **After Submission**: Shows question + highlighted answer
   - Multiple choice: Letter prefix (A, B, C, D)
   - Free text: Italicized quote style

4. **Artifact Display**
   - Inline pill with file icon, name, type
   - Click to open full dialog
   - Separate "Artifacts" tab shows all generated docs
   - Organized by stage

5. **Chat Composer**
   - Pinned to bottom with gradient fade
   - Rounded corners, shadow, border
   - Enter to send, keyboard hints

## Storybook Stories

**File:** `src/components/workflow-chat/WorkflowChat.stories.tsx`

### Story: Complete Workflow

Shows all 10 stages with realistic data:

**Stage 1: Gap Analysis** (Form)
- Welcome message
- Form with 2 fields (existing requirements, project description)
- Submitted answers

**Stage 2: Business Requirements** (Interview)
- Multiple choice questions about primary user, business goals
- Free-text question about success metrics
- Generated artifact: `business-requirements.yaml`

**Stage 3: Technical Requirements** (Interview)
- Questions about tech stack, integrations
- Generated artifact: `technical-requirements.yaml`

**Stage 4: QA Test Plan** (Automated)
- Loading indicator
- Generated artifact: `qa-test-plan.yaml`

**Stage 5: Implementation Planner** (Form)
- Form questions about team, timeline, constraints

**Stage 6: Developer Summary** (Automated)
- Loading indicator
- Generated artifact: `developer-summary.yaml`

**Stage 7: Architecture Decisions** (Automated)
- Loading indicator
- Generated artifact: `architecture-decisions.yaml` (ADRs)

**Stage 8: Delivery Timeline** (Automated)
- Loading indicator
- Generated artifact: `delivery-timeline.yaml`

**Stage 9: Executive Summary** (Automated)
- Loading indicator
- Generated artifact: `executive-summary.yaml`

**Stage 10: Complete**
- Completion message with celebration
- Summary of artifacts generated

### Additional Stories

- **EarlyStage**: Shows just Stages 1-2
- **MidStage**: Shows through Stage 5

## Design Alignment

Follows original design brief from `/workspace/docs/design_brief/`:

✅ **Chat Layout**
- Max width 720px centered
- 26px circular avatars (assistant = inverse bg, user = surface border)
- Mono metadata (name, timestamp)
- 15px body text, 1.55 line height

✅ **Composer**
- Absolute positioned with gradient fade
- Rounded-xl, surface bg, border
- Keyboard hints (Enter to send)
- Send button with pill shape

✅ **Answer Cards**
- 1px border, rounded-md, surface bg
- Mono uppercase eyebrow ("PICK ONE" / "YOUR ANSWER")
- Options with letter prefixes (A, B, C, D)
- Hover states on options

✅ **Artifact Pills**
- File icon + name + type
- Mono font for metadata
- Shadow-xs, hover border change

✅ **Stage Colors**
- Uses botanical spectrum (`var(--bot-1)` through `var(--bot-9)`)
- Stage 1: lichen, 2: sage, 3: sea-glass, 4: moss, 5: dried grass
- Stage 6: honey, 7: ochre, 8: terracotta, 9: plum

✅ **Typography**
- Sans for body text
- Mono for metadata, labels, stage numbers
- Font sizes match design system

## Files Created

```
src/components/workflow-chat/
├── WorkflowChat.tsx          (523 lines) - Main component
├── WorkflowChat.stories.tsx  (567 lines) - Storybook stories with data
└── index.ts                  (2 lines)   - Exports
```

## Next Steps

### To View in Storybook

1. Install Storybook: `npx storybook@latest init`
2. Run: `npm run storybook`
3. Navigate to: "Workflow / Chat-Based Workflow"
4. Toggle light/dark mode to see both themes
5. Try all three stories: Complete, Early Stage, Mid Stage

### Design Iteration Questions

1. **Message Spacing**: Currently 28px gap between messages. Too tight? Too loose?

2. **Stage Dividers**: Should they be more prominent? Different style?

3. **Loading States**: Currently shows "Sherpy is thinking..." - Want different copy?

4. **Artifact Dialog**: Should it show more metadata? Download button? Copy button?

5. **Answer Highlighting**: Currently uses border + background tint. Want different style?

6. **Composer Position**: Fixed to bottom with 140px padding. Too much clearance?

7. **Typing Indicator**: Simple spinner + text. Want animated dots instead?

8. **Scroll Behavior**: Should it auto-scroll to new messages?

9. **Artifacts Tab**: Should it group by stage or show chronologically?

10. **Mobile**: This is desktop-first. What's the mobile strategy?

## Integration Considerations (Future)

When ready to integrate with real data:

1. **XState Machine Integration**
   - Map XState events to message creation
   - Track conversation history in machine context
   - Persist messages to database

2. **Real-time Streaming**
   - Stream assistant responses word-by-word
   - Show typing indicator during generation
   - Handle interruptions/cancellations

3. **Artifact Generation**
   - Trigger on step completion
   - Show progress during generation
   - Store artifacts in database

4. **State Restoration**
   - Load conversation history on page load
   - Restore scroll position
   - Mark current stage/question

5. **Form Validation**
   - Inline validation for form fields
   - Disable submit until valid
   - Show error states

## Design Tokens Used

All colors reference CSS variables from design system:

- `--bg-page`, `--bg-surface`, `--bg-sunken`
- `--fg-1`, `--fg-2`, `--fg-3`, `--fg-4`
- `--border-1`, `--border-2`
- `--bot-1` through `--bot-9` (botanical spectrum)
- `--accent-2` (for active states)
- `--neutral-1` through `--neutral-8`

## Accessibility Notes

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels for interactive elements
- Focus states on all interactive elements
- Reduced motion support (needs implementation)

## Performance Considerations

- Virtualized scrolling for long conversations (not yet implemented)
- Lazy load artifact content
- Memoized message components
- Debounced scroll events

---

**Ready for review!** View this component in isolation, iterate on the design, then we can discuss integration strategy.
