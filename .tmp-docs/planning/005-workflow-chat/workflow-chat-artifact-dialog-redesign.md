# Workflow Chat Artifact Dialog Redesign

**Date:** 2026-05-26  
**Status:** ✅ Complete

## Problem

The artifact dialog in the new workflow-chat UI was poorly designed with:
- Basic modal styling
- Minimal header information
- Plain text content (no syntax highlighting)
- No action buttons
- Poor visual hierarchy

## Solution

Redesigned the ArtifactDialog component to mirror the legacy ArtifactBrowser's CodePreview design.

## Changes Made

### 1. ArtifactDialog.tsx - Complete Redesign

**Before:**
- Simple DialogContent with basic header
- Plain `<pre>` tag for content
- Minimal styling
- No action buttons

**After:**
- Full CodePreview-inspired layout with:
  - **Header**: File path, artifact name, stage indicator with color dot (clean, no buttons)
  - **Tab navigation**: "Source" tab (active)
  - **Syntax highlighting**: YamlHighlight component with line numbers and gutter
  - **Footer**: File metadata (size, version, auto-saved, timestamp) with icon-based action buttons
  - **Action buttons**: Copy icon (with "Copied!" aria-label feedback), Download icon
- Larger modal size: `max-w-[90vw] w-[1200px]` (vs `max-w-3xl`)
- Taller height: `max-h-[85vh]` (vs `80vh`)
- Proper accessibility: Added `DialogTitle` with `sr-only` class

**Design Decision:**
Moved action buttons from header to footer as icon-only buttons (matching legacy design). This keeps the header clean and focuses attention on the artifact metadata, while placing actions in a consistent location alongside other metadata in the footer.

**Key Features Added:**
- Copy to clipboard with "Copied!" feedback (1.5s timeout) - icon button in footer
- Download as `.yaml` file - icon button in footer
- Syntax-highlighted YAML with line numbers
- Professional header matching legacy design (no action buttons)
- Footer with file size, version, timestamp, and icon-based action buttons

### 2. WorkflowChat.tsx - State Management

**Added:**
- State management for selected artifact: `useState<Artifact | null>`
- `handleArtifactClick` function to find and open artifacts
- Only allows clicking "created" artifacts (not "pending")
- Renders `<ArtifactDialog>` component with state
- Passes `onArtifactClick` callback to ChatMessage

### 3. ChatMessage.tsx - Event Handling

**Added:**
- `onArtifactClick` prop to interface
- Wired up ArtifactPill onClick to call `onArtifactClick(message.artifactId)`

## Visual Comparison

### Before
- Basic modal with simple text
- No syntax highlighting
- No action buttons
- Poor spacing

### After
- Professional code preview layout
- YAML syntax highlighting with line numbers
- Copy and Download buttons
- Proper spacing and typography
- Matches legacy ArtifactBrowser design

## Files Modified

1. `src/components/workflow-chat/ArtifactDialog.tsx` (complete rewrite)
2. `src/components/workflow-chat/WorkflowChat.tsx` (added state management)
3. `src/components/workflow-chat/ChatMessage.tsx` (added event handling)

## Screenshots

- `.tmp-docs/screenshots/workflow-chat-dialog-business-requirements.png` - Final design

## Testing

Tested at `/demo/workflow-chat`:
- ✅ Clicking artifact pill opens dialog
- ✅ Dialog shows proper layout and styling
- ✅ Copy button works with feedback
- ✅ Download button creates `.yaml` file
- ✅ Close dialog works (click outside or X button)
- ✅ Syntax highlighting displays correctly
- ✅ Line numbers show in gutter
- ✅ Accessibility: DialogTitle added (sr-only)

## Accessibility

- Added `DialogTitle` with screen-reader-only class
- Proper button labels and aria attributes
- Download button has `aria-label`

## Notes

- Reused existing `YamlHighlight` component from legacy ArtifactBrowser
- Matched design system spacing, colors, and typography
- Fire-and-forget copy timeout cleanup on unmount
- Only "created" artifacts are clickable ("pending" are disabled)
