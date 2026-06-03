# Manual Full Workflow Testing Guide - WorkflowChat UI

**Version:** 1.0 (Created 2026-06-02)  
**Purpose:** Iterative QA testing guide for the **chat-based WorkflowChat UI** (10-step Sherpy planning workflow)  
**Duration:** 20-30 minutes per full test run  
**Test Strategy:** Run this guide repeatedly, updating the "Test History" section after each run  
**UI Version:** WorkflowChat (NEW_UI) - Chat-based two-column layout

---

## 🆕 WorkflowChat UI Overview

**Layout:**
- **Left Column (1/3 width):** Artifacts sidebar with status indicators
  - Shows all 10 artifacts (pending → created)
  - Click to open artifact dialog for viewing content
  - Color-coded by stage
  
- **Right Column (2/3 width):** Chat conversation
  - Message history (assistant questions + user answers)
  - Stage dividers with sticky positioning
  - Composer at bottom with gradient fade

**Message Types:**
- **Text:** Assistant explanations
- **Questions:** Form fields OR multiple-choice options
- **Answers:** User responses displayed as cards
- **Artifacts:** Inline artifact pills (clickable when created)
- **Loading:** Typing indicators during generation
- **Dividers:** Stage markers with stage number and color

**Key Difference from Legacy UI:**
- ❌ No separate "Previous Answers" section
- ✅ All Q&A displayed inline in chat history
- ❌ No step-by-step navigation buttons (BACK/NEXT)
- ✅ Single scrollable conversation through all 10 stages
- ❌ No SpectrumStepper progress bar at top
- ✅ Artifacts sidebar shows overall progress

---

## 📋 Test History

### Test Run #001 - [DATE] (Baseline - WorkflowChat UI)
**Tester:** [Your Name]  
**Status:** [ ] PENDING [ ] PASSED [ ] FAILED [ ] BLOCKED  
**Result:** [To be filled]  
**Steps Completed:** [To be filled]  
**Duration:** [To be filled]

---

## 🎯 Current Status (Last Updated: 2026-06-02)

### ✅ WorkflowChat UI Features
- Two-column layout (artifacts sidebar + chat)
- Chat-based conversation flow
- Stage dividers with colors
- Multiple message types
- Artifact status indicators (pending/created)
- Modal dialog for artifact viewing
- Persistent composer at bottom

### ⚠️ Known Limitations
- Requires query param: `?workflowChat=1` (not default yet)
- `USE_NEW_UI = false` in route (must enable manually)

### ❓ Untested (WorkflowChat UI)
- Full 10-stage workflow completion
- Chat message ordering and display
- Artifact sidebar status updates
- Composer behavior across all question types
- Stage divider rendering
- Artifact dialog functionality
- State persistence with chat UI

---

## 🔧 Prerequisites

1. **Enable WorkflowChat UI:**
   ```bash
   # Option A: URL query parameter
   http://localhost:5181/project/{projectId}/build?workflowChat=1
   
   # Option B: Edit route file (permanent)
   # app/routes/project/$projectId.build.tsx
   # Change: const USE_NEW_UI = false;
   # To:     const USE_NEW_UI = true;
   ```

2. **Dev server running:** `pnpm dev` → http://localhost:5181
3. **Browser:** Chrome/Firefox with DevTools open
4. **Time:** 20-30 minutes uninterrupted
5. **Clean state:** Clear localStorage or use incognito mode for fresh test
6. **Server logs:** Terminal visible to monitor server-side logs

### Pre-Test Checklist
- [ ] WorkflowChat UI enabled (via query param or USE_NEW_UI flag)
- [ ] Server running without errors
- [ ] Browser console clear (F12)
- [ ] Network tab ready (to monitor API calls)
- [ ] Terminal visible for server logs
- [ ] Timer ready to track generation times

---

## 📝 Test Protocol

**For each test run:**
1. Start with fresh browser session (incognito recommended)
2. **Append `?workflowChat=1` to URL** (critical!)
3. Follow each step exactly as written
4. Check all verification checkboxes
5. Note actual timings vs expected
6. Screenshot key moments (stage transitions, artifacts created)
7. Record all findings in "Test History" section
8. Update "Current Status" section with latest reality

**Key Testing Focus:**
- Chat message flow and ordering
- Composer enabling/disabling
- Artifact sidebar status transitions
- Stage divider positioning
- Artifact dialog opening/closing

---

## 🧪 Step-by-Step Workflow (Chat UI)

### Step 1: Create New Project (Expected: 2 minutes)

**Actions:**
1. Navigate to http://localhost:5181
2. Click **"New project"** button
3. Select **"Start from scratch"**
4. Enter project name: `WorkflowChat Test - [DATE]`
5. Click **"Create project"**
6. **IMPORTANT:** Append `?workflowChat=1` to URL
   - Before: `/project/{projectId}/build`
   - After: `/project/{projectId}/build?workflowChat=1`
7. Press Enter to reload with WorkflowChat UI

**Expected Result:**
- **Two-column layout loads:**
  - Left: Artifacts sidebar with "artifacts" label
  - Right: Chat area with composer at bottom
- **Artifacts sidebar shows 10 pending artifacts:**
  1. Gap Analysis (Stage 1)
  2. Business Requirements (Stage 2)
  3. Technical Requirements (Stage 3)
  4. Style Anchors (Stage 4)
  5. Implementation Plan (Stage 5)
  6. Definition of Done (Stage 6)
  7. Architecture Decisions (Stage 7)
  8. Delivery Timeline (Stage 8)
  9. QA Test Plan (Stage 9)
  10. Summaries (Stage 10)
- **All artifacts dimmed/grayed (status: pending)**
- **No SpectrumStepper or BACK/NEXT buttons** (chat UI doesn't use them)
- **Chat area shows:**
  - Stage 1 divider: "Gap Analysis"
  - Welcome message from assistant
  - Form question with 2 fields

**Verification:**
- [ ] Two-column layout visible (not single-column legacy UI)
- [ ] Artifacts sidebar on left with "artifacts" label
- [ ] 10 artifacts listed, all dimmed/pending
- [ ] Chat area on right with composer at bottom
- [ ] Stage 1 divider visible with color accent
- [ ] Welcome text message from assistant
- [ ] Form question with 2 fields visible
- [ ] Composer disabled or not primary focus yet
- [ ] No BACK/NEXT navigation buttons (correct for chat UI)

**Screenshots:**
- `workflowchat-run-[N]-01-initial-load.png`
- `workflowchat-run-[N]-02-artifacts-sidebar.png`

**Actual Result:**

**Issues Found:**

---

### Step 2: Stage 1 - Gap Analysis Form (Expected: 2 minutes)

**Chat UI Behavior:**
- Assistant shows form question with fields:
  1. "Do you have existing requirements?" (text input)
  2. "What are you building?" (textarea)
- Fields render inline in chat (not separate form section)
- Submit button within the question message card

**Form Fields:**
1. **"Do you have existing requirements?"**  
   Answer: `No, starting from scratch`

2. **"What are you building?"**  
   Answer:
   ```
   A comprehensive healthcare patient portal with the following features:
   - Online appointment scheduling with calendar integration
   - Secure access to medical records and test results  
   - Direct messaging with healthcare providers
   - Prescription refill requests and medication tracking
   - Billing and insurance information management
   ```

**Actions:**
1. Locate form fields in the chat message
2. Fill both fields
3. Click **"Submit"** button within the question card
4. Watch for:
   - User answer cards appear in chat
   - Loading indicator ("Generating artifact...")
   - Artifact 1 status changes from pending → created
   - Stage 2 divider appears

**Expected Result:**
- Both text inputs accept content
- Submit button enables after both fields filled
- **Two answer cards appear in chat:**
  - Answer 1: "No, starting from scratch"
  - Answer 2: "A comprehensive healthcare patient portal..."
- **Loading message appears:** "Generating Gap Analysis artifact..."
- **After 15-25 seconds:**
  - Loading message disappears
  - **Artifact 1 in sidebar changes:**
    - From: dimmed/pending
    - To: bright/clickable (status: created)
  - **Stage 2 divider appears** with new color
  - **New assistant message:** "Great! Now let's dive into..."
  - **First business question appears** with multiple-choice options

**Verification:**
- [ ] Form fields accept input
- [ ] Submit button enables when both fields filled
- [ ] Submit creates two answer cards in chat
- [ ] Loading message displays during generation
- [ ] Artifact 1 status changes to "created" in sidebar
- [ ] Artifact 1 now clickable (not dimmed)
- [ ] Generation completes within 60 seconds
- [ ] Stage 2 divider appears with different color
- [ ] New assistant message loads
- [ ] First business question appears
- [ ] Composer at bottom ready for next input

**Screenshots:**
- `workflowchat-run-[N]-03-stage1-form-filled.png` (before submit)
- `workflowchat-run-[N]-04-stage1-answers.png` (answer cards)
- `workflowchat-run-[N]-05-stage1-generating.png` (loading indicator)
- `workflowchat-run-[N]-06-stage2-started.png` (after artifact created)

**Server Logs to Check:**
```
[generateArtifact] Starting generation...
[generateArtifact] ✅ Success! Got artifact
State changed: {"step2_businessReqs": "asking"}
```

**Actual Result:**

**Time Taken:**

**Issues Found:**

**If Blocked:** Stop here and document in Test History. Skip to "Troubleshooting" section.

---

### Step 3: Stage 2 - Business Requirements Interview Q1 (Expected: 10 seconds)

**Chat UI Behavior:**
- Stage 2 divider rendered with new color (sage/bot-2)
- Assistant text message: "Great! Now let's dive into..."
- Question message with multiple-choice options (4 buttons)
- No separate "Previous Answers" section (legacy UI feature)
- All Q&A remains in chat history (scroll up to see)

**Expected Question (Contextual):**
- References project from Stage 1 ("healthcare patient portal")
- Provides 3-4 multiple-choice options as buttons
- OR shows text input for custom answer

**Actions:**
1. Verify Stage 2 divider visible with color accent
2. Read assistant intro message
3. Read first business question
4. **Verify question is contextual** (mentions healthcare/portal)
5. Click one of the multiple-choice option buttons
6. Wait for next question to load (3-5 seconds)

**Expected Result:**
- **Stage 2 divider** displays: "Stage 2: Business Requirements"
- **Assistant message** explains this section
- **Question message** loads within 5 seconds
- **Question is contextual** - references healthcare portal
- **3-4 option buttons** visible and clickable
- **Clicking option:**
  - User answer card appears immediately
  - Loading indicator shows "Thinking..."
  - Next question loads within 5 seconds
- **Chat scrolls automatically** to show new content
- **Composer remains at bottom** (sticky positioning)

**Verification:**
- [ ] Stage 2 divider visible with new color
- [ ] Assistant intro message clear and relevant
- [ ] Question loads within 5 seconds
- [ ] Question is contextual (mentions healthcare/portal specifics)
- [ ] 3-4 multiple-choice options visible
- [ ] Option buttons clickable
- [ ] Clicking option creates answer card
- [ ] Answer card shows selected option text
- [ ] Loading indicator appears
- [ ] Next question loads within 10 seconds
- [ ] Chat auto-scrolls to new content
- [ ] No console errors

**Screenshots:**
- `workflowchat-run-[N]-07-stage2-question1.png`
- `workflowchat-run-[N]-08-stage2-answer1.png`

**Actual Question Text:**

**Is Question Contextual?** [ ] Yes [ ] No

**Issues Found:**

---

### Step 4: Stage 2 - Business Requirements Q2-Q10 (Expected: 5-7 minutes)

**Instructions:**
Answer questions 2 through 10 in the chat interface.

**For Each Question:**
1. Read the AI-generated question
2. **Click a multiple-choice option button** (most questions)
   - OR type custom answer in composer if no options shown
3. Verify answer card appears
4. Wait 3-5 seconds for next question
5. Watch chat grow with Q&A history
6. Check artifacts sidebar periodically

**Chat UI Features to Observe:**
- All previous Q&A remains visible in chat (scroll up anytime)
- Each answer renders as a card with question + answer
- Stage 2 divider stays visible at top (or sticky behavior)
- Composer remains at bottom (persistent positioning)
- Artifact 2 stays "pending" until all 10 questions answered

**Tips:**
- Click first option if unsure (all options are valid)
- Mix clicking options and typing to test both interaction modes
- Questions should build on previous answers
- Each question should reference healthcare portal context

**Verification Checklist (check after every 3-4 questions):**
- [ ] Questions 2-4: All loaded successfully
- [ ] Questions 5-7: All loaded successfully  
- [ ] Questions 8-10: All loaded successfully
- [ ] All answer cards visible in chat history
- [ ] Can scroll up to see all previous Q&A
- [ ] No duplicate questions
- [ ] No console errors
- [ ] Chat auto-scrolls to new content
- [ ] Composer always at bottom (sticky)
- [ ] Artifact 2 still pending (not created yet)
- [ ] Server logs show successful API calls

**Question 10 Special Behavior:**
After submitting the 10th answer, watch for:
- Answer card appears
- **Loading message:** "Generating Business Requirements artifact..."
- Wait 20-30 seconds
- **Artifact 2 in sidebar changes:** pending → created (clickable)
- **Stage 3 divider appears** with new color (sea-glass/bot-3)
- **New assistant message:** "Excellent! Now let's talk tech..."
- **First technical question appears**

**Expected After Question 10:**
- Loading indicator visible
- Wait 15-30 seconds for artifact generation
- **Artifact 2 status changes to "created"**
- **Artifact 2 now clickable** in sidebar
- **Stage 3 divider renders** below Stage 2 content
- Chat continues seamlessly (no page transition)
- First technical question ready

**Verification After Question 10:**
- [ ] All 10 business questions answered
- [ ] 10 answer cards visible in chat (scroll to verify)
- [ ] Artifact generation triggered (loading indicator)
- [ ] Generation completed within 60 seconds
- [ ] Artifact 2 status changed to "created" in sidebar
- [ ] Artifact 2 clickable (not dimmed)
- [ ] Stage 3 divider appeared with new color
- [ ] Technical question loaded
- [ ] Chat flow continuous (no hard transition)
- [ ] All previous content still accessible via scroll

**Screenshots:**
- `workflowchat-run-[N]-09-stage2-question5.png` (mid-interview)
- `workflowchat-run-[N]-10-stage2-question10.png` (before last submit)
- `workflowchat-run-[N]-11-stage2-generating.png` (artifact loading)
- `workflowchat-run-[N]-12-stage3-started.png` (after artifact created)

**Actual Result:**

**Total Time for Stage 2:**

**Issues Found:**

---

### Step 5: Stage 3 - Technical Requirements Interview (Expected: 5-7 minutes + 25s generation)

**Chat UI Behavior:**
Identical to Stage 2 but with technical focus.

**Expected Question Topics:**
- Architecture and design patterns
- Technology stack and frameworks
- Database and storage solutions
- Security and authentication
- Deployment and infrastructure
- Performance and scalability
- API design and integrations
- Testing strategy
- DevOps and CI/CD
- Monitoring and observability

**Process:**
1. Stage 3 divider visible with sea-glass color
2. Answer 10 technical questions (same format as Stage 2)
3. Verify questions are contextual to healthcare portal
4. After Question 10:
   - Loading message appears
   - Wait 20-30 seconds
   - **Artifact 3 status changes to "created"**
   - **Stage 4 divider appears**
   - **NO new question** (Stage 4 is automated)
   - **Loading message:** "Collecting style anchors..."

**Verification:**
- [ ] Stage 3 divider visible with correct color
- [ ] 10 technical questions completed
- [ ] Questions relevant to healthcare technical requirements
- [ ] Questions are contextual (not generic)
- [ ] All 10 answer cards visible in chat
- [ ] Artifact 3 generated and clickable
- [ ] Stage 4 divider appeared
- [ ] Stage 4 is automated (no questions, just loading)
- [ ] Composer may be disabled during automated stages

**Screenshots:**
- `workflowchat-run-[N]-13-stage3-question1.png`
- `workflowchat-run-[N]-14-stage4-automated.png`

**Actual Result:**

**Total Time for Stage 3:**

**Issues Found:**

---

### Step 6: Stage 4 - Style Anchors (Expected: 20-30 seconds, automated)

**Chat UI Behavior:**
- **No user input required** - automated stage
- **NO question message** (different from interactive stages)
- **Loading message:** "Collecting style anchors from your codebase..."
- **No composer input** needed (may be disabled)
- Watch artifacts sidebar for status change

**Expected Result:**
- Stage 4 divider visible
- Loading message appears immediately
- **After 20-30 seconds:**
  - Loading message disappears or shows completion
  - **Artifact 4 status changes to "created"**
  - **Stage 5 divider appears**
  - **Stage 5 form question appears** (Implementation Planner fields)

**Verification:**
- [ ] Stage 4 divider visible
- [ ] Loading message displayed (not question)
- [ ] No composer interaction required
- [ ] Artifact 4 generated within 60 seconds
- [ ] Artifact 4 now clickable in sidebar
- [ ] Stage 5 divider appeared
- [ ] Stage 5 form loaded
- [ ] Automated stage completed without user input

**Screenshots:**
- `workflowchat-run-[N]-15-stage4-loading.png`
- `workflowchat-run-[N]-16-stage5-form.png`

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

### Step 7: Stage 5 - Implementation Planner (Expected: 2 minutes + 20s generation)

**Chat UI Behavior:**
- Stage 5 divider with honey/bot-5 color
- **Form question** (similar to Stage 1)
- Multiple form fields (exact fields may vary)
- Submit button within question card

**Expected Form Fields:**
1. **Deployment strategy** (text or dropdown)
2. **Technology stack** (text)
3. Additional fields may be present

**Actions:**
1. Fill all form fields with relevant answers
2. Click **"Submit"** within the question card
3. Watch for:
   - Answer cards appear for each field
   - Loading message
   - Artifact 5 status change
   - Stage 6 divider appears

**Verification:**
- [ ] Stage 5 divider visible
- [ ] Form fields visible and accepting input
- [ ] Submit button enables when form complete
- [ ] Answer cards created for each field
- [ ] Artifact generation triggered
- [ ] Artifact 5 created within 60 seconds
- [ ] Stage 6 divider appeared
- [ ] Stage 6 is automated (no question)

**Screenshots:**
- `workflowchat-run-[N]-17-stage5-form-filled.png`
- `workflowchat-run-[N]-18-stage6-automated.png`

**Actual Form Fields Encountered:**

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

### Step 8: Stage 6 - Definition of Done (Expected: 20-30 seconds, automated)

**Chat UI Behavior:**
- Stage 6 divider with honey/bot-6 color
- **Automated stage** (no user input)
- Loading message appears
- Watch sidebar for Artifact 6 status change

**Expected Result:**
- Automated generation completes
- Artifact 6 status changes to "created"
- Stage 7 divider appears
- **Stage 7 may be artifact-review only** (check for question vs review message)

**Verification:**
- [ ] Stage 6 divider visible
- [ ] Automated generation completed
- [ ] Artifact 6 created and clickable
- [ ] Stage 7 divider appeared
- [ ] Stage 7 content loaded (review or form)

**Screenshots:**
- `workflowchat-run-[N]-19-stage7-content.png`

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

### Step 9: Stage 7 - Architecture Decision Records (Expected: Manual review)

**Chat UI Behavior:**
- **Artifact-only stage** (no generation)
- May show:
  - Review message: "Here are the architecture decisions extracted..."
  - Artifact pill inline (clickable)
  - OR no question (auto-continues to Stage 8)

**Expected Result:**
- Stage 7 divider visible with ochre/bot-7 color
- **May show review content or auto-continue**
- Artifact 7 already "created" (extracted from previous artifacts)
- **If manual review:**
  - Artifact pill clickable in chat
  - Composer may prompt "Type 'continue' to proceed"
- **If auto-continue:**
  - Stage 8 divider appears immediately
  - Next automated stage begins

**Actions:**
1. Check if Stage 7 shows review content or auto-continues
2. If review content shown, click artifact pill to view
3. If prompted, type "continue" in composer
4. Wait for Stage 8 divider

**Verification:**
- [ ] Stage 7 content displayed (review or auto-continue)
- [ ] Artifact 7 exists and is clickable
- [ ] If review: artifact pill works and opens dialog
- [ ] If prompted: composer accepts "continue" command
- [ ] Stage 8 divider appeared
- [ ] Transition to Stage 8 smooth

**Screenshots:**
- `workflowchat-run-[N]-20-stage7-review.png`

**Actual Result:**

**Issues Found:**

---

### Step 10: Stage 8 - Delivery Timeline (Expected: 20-30 seconds, automated)

**Chat UI Behavior:**
- Stage 8 divider with terracotta/bot-8 color
- Automated generation
- Loading message
- Artifact 8 status change

**Expected Result:**
- Automated generation completes
- Artifact 8 created and clickable
- Stage 9 divider appears
- Stage 9 begins (QA Test Plan, automated)

**Verification:**
- [ ] Stage 8 automated generation completed
- [ ] Artifact 8 created within 60 seconds
- [ ] Stage 9 divider appeared
- [ ] Stage 9 generation begins

**Screenshots:**
- `workflowchat-run-[N]-21-stage9-loading.png`

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

### Step 11: Stage 9 - QA Test Plan (Expected: 20-30 seconds, automated)

**Chat UI Behavior:**
- Stage 9 divider with plum/bot-9 color
- Automated generation
- Loading message
- Artifact 9 status change

**Expected Result:**
- Automated generation completes
- Artifact 9 created and clickable
- **Stage 10 divider appears** (final stage!)
- Stage 10 begins (Summaries, automated)

**Verification:**
- [ ] Stage 9 automated generation completed
- [ ] Artifact 9 created within 60 seconds
- [ ] Stage 10 divider appeared (neutral color)
- [ ] Stage 10 generation begins (final stage)

**Screenshots:**
- `workflowchat-run-[N]-22-stage10-loading.png`

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

### Step 12: Stage 10 - Generate Summaries (Expected: 20-30 seconds, automated)

**Chat UI Behavior:**
- Stage 10 divider with neutral/bot-10 color
- **Final automated stage**
- Loading message: "Generating executive and developer summaries..."
- Artifact 10 status change
- **Completion message** after generation

**Expected Result:**
- Automated generation completes
- Artifact 10 created and clickable
- **Completion message appears:**
  - "✅ Workflow complete! All artifacts generated."
  - OR similar success message
- **All 10 artifacts in sidebar show "created" status**
- **All artifacts clickable** (bright, not dimmed)
- Composer may show "Workflow complete" placeholder
- No more stages to load

**Verification:**
- [ ] Stage 10 automated generation completed
- [ ] Artifact 10 created within 60 seconds
- [ ] Artifact 10 clickable
- [ ] Completion message displayed in chat
- [ ] **All 10 artifacts show "created" status** in sidebar
- [ ] All artifacts clickable (none dimmed)
- [ ] No console errors
- [ ] Composer shows completion state or disabled
- [ ] Chat shows full conversation from Stage 1-10 (scrollable)

**Screenshots:**
- `workflowchat-run-[N]-23-complete.png`
- `workflowchat-run-[N]-24-all-artifacts-created.png`

**Actual Result:**

**Time Taken:**

**Issues Found:**

---

## 🔍 Artifact Viewing Testing (Expected: 5 minutes)

### Test Artifact Sidebar and Dialog

**Actions:**
1. Review artifacts sidebar on left
2. Verify all 10 artifacts show "created" status (bright, clickable)
3. Click **Artifact 1: Gap Analysis**
4. Verify artifact dialog opens
5. Review dialog contents

**Expected Artifact Dialog:**
- Modal overlay dims background
- Dialog shows:
  - Artifact name as title
  - Stage number and name
  - Created timestamp
  - Full artifact content (YAML or Markdown)
  - Syntax highlighting (if applicable)
  - Close button (X or ESC key)
  - Optional: Download button
  - Optional: Copy to clipboard button

**Verification Checklist (test 3-4 artifacts):**
- [ ] Artifact 1: Gap Analysis
  - [ ] Clicks open dialog
  - [ ] Content non-empty (>500 bytes)
  - [ ] Relevant to project (mentions healthcare portal)
  - [ ] Close button works (X icon)
  - [ ] ESC key closes dialog
  
- [ ] Artifact 2: Business Requirements
  - [ ] Contains 10 Q&A pairs (or evidence of interview)
  - [ ] Questions are contextual
  - [ ] Answers match what was entered in chat
  
- [ ] Artifact 3: Technical Requirements
  - [ ] Contains 10 technical Q&A pairs
  - [ ] Content relevant to healthcare tech stack
  
- [ ] Artifact 5/8/9: (Sample automated artifacts)
  - [ ] Content non-empty
  - [ ] Format valid (YAML/Markdown)
  - [ ] Relevant to project

**Additional Artifact Tests:**
- [ ] Click artifact pill in chat (if present in messages)
- [ ] Verify same artifact opens as in sidebar
- [ ] Click multiple artifacts in sequence
- [ ] Verify dialog updates content correctly
- [ ] No artifacts show "pending" status (all created)

**Screenshots:**
- `workflowchat-run-[N]-25-artifact-dialog-1.png`
- `workflowchat-run-[N]-26-artifact-dialog-2.png`
- `workflowchat-run-[N]-27-artifacts-sidebar-complete.png`

**Issues Found:**

---

## 🧭 Chat Navigation Testing (Expected: 3 minutes)

### Scroll and Message Review

**WorkflowChat UI Note:**
- NO BACK/NEXT buttons (not applicable to chat UI)
- Navigation is via **scrolling the chat**
- All content remains in single conversation

**Actions:**
1. Scroll to **top of chat** (Stage 1 divider)
2. Verify Stage 1 content visible
3. Scroll to **middle of chat** (Stage 5 area)
4. Verify Stage 5 content visible
5. Scroll to **bottom of chat** (Stage 10 completion)
6. Verify all stage dividers pass by during scroll

**Verification:**
- [ ] Can scroll to top of chat (Stage 1)
- [ ] Stage 1 welcome message visible
- [ ] Stage 1 form Q&A visible
- [ ] Can scroll to Stage 2 area
- [ ] Stage 2 Q&A cards visible (all 10 answers)
- [ ] Can scroll to Stage 3 area
- [ ] Stage 3 Q&A cards visible (all 10 answers)
- [ ] Can scroll to Stage 5 form area
- [ ] Stage 5 form answers visible
- [ ] Can scroll to Stage 10 completion
- [ ] All 10 stage dividers visible during scroll
- [ ] Stage dividers have correct colors
- [ ] Composer stays at bottom (sticky positioning)
- [ ] No content missing or hidden
- [ ] Scroll is smooth (no performance issues)

**Stage Divider Colors Check:**
- [ ] Stage 1: Lichen (bot-1)
- [ ] Stage 2: Sage (bot-2)
- [ ] Stage 3: Sea-glass (bot-3)
- [ ] Stage 4: Moss (bot-4)
- [ ] Stage 5: Dried grass (bot-5)
- [ ] Stage 6: Honey (bot-6)
- [ ] Stage 7: Ochre (bot-7)
- [ ] Stage 8: Terracotta (bot-8)
- [ ] Stage 9: Plum (bot-9)
- [ ] Stage 10: Neutral (bot-10 / neutral-4)

**Issues Found:**

---

## 💾 State Persistence Testing (Expected: 2 minutes)

### Page Refresh Test (CRITICAL - BUG-018)

**Actions:**
1. Scroll to **Stage 6 area** (mid-workflow)
2. Note current chat position and visible content
3. Press **F5** to refresh page
4. **IMPORTANT:** Ensure `?workflowChat=1` remains in URL
5. Wait for page to reload

**Expected Result:**
- Page reloads successfully
- **WorkflowChat UI loads** (two-column layout)
- **All 10 artifacts in sidebar show correct status:**
  - Artifacts 1-10: "created" (if workflow was complete)
  - OR partial status if workflow was interrupted
- **Chat content fully restored:**
  - All stage dividers present (1-10)
  - All messages present (questions, answers, loading, etc.)
  - Chat may scroll to bottom OR last viewed position
- **Composer state correct:**
  - If workflow complete: disabled or "complete" placeholder
  - If workflow in progress: ready for next input
- No console errors
- No SSR hydration errors

**Verification:**
- [ ] Page reloads successfully
- [ ] WorkflowChat UI loads (not legacy StepContainer UI)
- [ ] Two-column layout present
- [ ] Artifacts sidebar shows all 10 artifacts
- [ ] Artifact statuses correct (created vs pending)
- [ ] Chat content fully restored
- [ ] Can scroll through all previous messages
- [ ] All stage dividers present
- [ ] All Q&A cards present
- [ ] Composer in correct state
- [ ] No console errors
- [ ] No SSR hydration mismatch errors
- [ ] Can continue workflow if incomplete
- [ ] Can view artifacts if complete

**BUG-018 Verification:**
This test verifies the BUG-018 fix (page refresh maintaining state).
- ✅ PASS: Chat history preserved, correct stage shown
- ❌ FAIL: Reverts to Stage 1 or loses chat history

**Issues Found:**

---

### Navigate Away and Return Test

**Actions:**
1. From WorkflowChat UI, click breadcrumb or project name
2. Return to dashboard
3. Verify project card shows progress
4. Click project card to reopen
5. **IMPORTANT:** Append `?workflowChat=1` if not present

**Expected Result:**
- Dashboard shows project with progress indicator
- Reopening project returns to WorkflowChat UI
- Chat history preserved
- Artifact statuses preserved
- Can continue from where left off

**Verification:**
- [ ] Dashboard shows correct progress
- [ ] Reopening project loads WorkflowChat UI
- [ ] Chat history intact
- [ ] Artifacts sidebar intact
- [ ] Can continue workflow if incomplete

**Issues Found:**

---

## 🔄 Chat-Specific Testing (Expected: 5 minutes)

### Message Types and Rendering

**Test Each Message Type:**

1. **Text Messages (Assistant)**
   - [ ] Welcome message renders correctly
   - [ ] Stage intro messages render correctly
   - [ ] Completion message renders correctly
   - [ ] Text is readable and properly formatted

2. **Question Messages**
   - [ ] Form questions render with fields
   - [ ] Multiple-choice questions render with option buttons
   - [ ] Buttons are clickable
   - [ ] Forms are submittable

3. **Answer Cards (User)**
   - [ ] Answers display question + answer
   - [ ] Answer cards visually distinct from questions
   - [ ] Multiple answer cards render correctly
   - [ ] Answer text is complete (not truncated)

4. **Loading Messages**
   - [ ] "Generating artifact..." shows during generation
   - [ ] Typing indicator renders correctly
   - [ ] Loading messages disappear when complete

5. **Artifact Pills (Inline)**
   - [ ] Artifact mentions in chat are clickable
   - [ ] Clicking opens artifact dialog
   - [ ] Correct artifact content displayed

6. **Stage Dividers**
   - [ ] All 10 dividers render
   - [ ] Correct stage numbers (1-10)
   - [ ] Correct stage names
   - [ ] Correct colors per stage
   - [ ] Dividers visually separate stages

**Issues Found:**

---

### Composer Behavior

**Test Composer States:**

1. **Disabled State**
   - [ ] Composer disabled during automated stages (4, 6, 8, 9, 10)
   - [ ] Shows appropriate placeholder ("Generating..." or "View only")
   - [ ] Cannot type when disabled

2. **Enabled State**
   - [ ] Composer enabled during interactive stages (1, 2, 3, 5)
   - [ ] Accepts text input
   - [ ] Placeholder text clear ("Type your message...")
   - [ ] Submit button or enter key works

3. **Sticky Positioning**
   - [ ] Composer stays at bottom during scroll
   - [ ] Gradient fade above composer visible
   - [ ] Composer doesn't overlap with content

4. **Form Interaction**
   - [ ] Typing in form fields doesn't affect composer
   - [ ] Submitting form doesn't submit composer
   - [ ] Composer and form fields are independent

**Issues Found:**

---

## 📊 Test Summary Template

**After completing test run, fill this out:**

```markdown
## Test Run #[N] - [DATE] - WorkflowChat UI

**Tester:** [Your Name]  
**Duration:** [Actual time taken]  
**Project ID:** [Generated ID]  
**URL:** /project/{projectId}/build?workflowChat=1  
**Status:** [ ] PASSED [ ] FAILED [ ] BLOCKED

### Stage Results
- Stage 1 (Gap Analysis): [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Stage 2 (Business Req): [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Stage 3 (Technical Req): [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Stage 4 (Style Anchors): [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Stage 5 (Implementation): [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Stage 6 (Definition of Done): [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Stage 7 (Architecture): [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Stage 8 (Timeline): [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Stage 9 (QA Plan): [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]
- Stage 10 (Summaries): [ ] PASS [ ] FAIL [ ] BLOCKED - [Notes]

### Chat UI Features
- [ ] Two-column layout renders correctly
- [ ] Artifacts sidebar shows all 10 artifacts
- [ ] Artifact status updates (pending → created) work
- [ ] Stage dividers render with correct colors
- [ ] Chat messages render correctly (all types)
- [ ] Answer cards display Q&A properly
- [ ] Loading indicators show during generation
- [ ] Composer sticky positioning works
- [ ] Artifact dialog opens and closes correctly
- [ ] Can scroll through full chat history

### Artifacts Generated
- [ ] Artifact 1: Gap Analysis
- [ ] Artifact 2: Business Requirements
- [ ] Artifact 3: Technical Requirements
- [ ] Artifact 4: Style Anchors
- [ ] Artifact 5: Implementation Plan
- [ ] Artifact 6: Definition of Done
- [ ] Artifact 7: Architecture Decisions
- [ ] Artifact 8: Delivery Timeline
- [ ] Artifact 9: QA Test Plan
- [ ] Artifact 10: Summaries

### State Persistence
- [ ] Page refresh preserves chat history
- [ ] Page refresh preserves artifact statuses
- [ ] Navigate away and return works
- [ ] WorkflowChat UI persists (doesn't revert to legacy)

### Issues Found
1. [BUG-XXX] [Description]
2. [BUG-XXX] [Description]

### Observations
- [Any UX issues, timing issues, or improvements]
- [WorkflowChat UI vs Legacy UI differences]

### Overall Result
[ ] COMPLETE - All stages passed, 10 artifacts generated
[ ] PARTIAL - Completed through Stage [N]
[ ] BLOCKED - Cannot proceed past Stage [N]

### Action Items
- [ ] File bug for [issue]
- [ ] Update guide with [finding]
- [ ] Re-test after [fix]
```

**Then add this summary to the "Test History" section at the top of this document.**

---

## 🐛 Known Issues Reference

### WorkflowChat UI Specific Issues

*To be populated as issues are discovered*

---

## 🔧 Troubleshooting

### If WorkflowChat UI Doesn't Load

**Symptoms:**
- Legacy StepContainer UI loads instead
- No two-column layout
- No artifacts sidebar

**Solutions:**
1. Verify `?workflowChat=1` is in URL
2. Check `USE_NEW_UI` flag in route file
3. Clear browser cache and reload
4. Check console for React component errors
5. Verify `WorkflowChat` component imports correctly

**Debugging:**
```bash
# Check route configuration
grep "USE_NEW_UI" app/routes/project/\$projectId.build.tsx

# Should show: const USE_NEW_UI = true;
# Or URL should include: ?workflowChat=1
```

---

### If Chat Messages Don't Appear

**Symptoms:**
- Empty chat area
- Only stage dividers, no messages
- Composer visible but no content above it

**Solutions:**
1. Check browser console for errors
2. Verify XState machine is running (check Debug Panel)
3. Check Network tab for API call failures
4. Check server logs for message generation errors
5. Refresh page and observe initial load

**Debugging:**
```bash
# Check server logs for message generation
grep -i "message\|question\|interview" .tmp-docs/server.log

# Check for XState errors
# Browser console: look for "XState" or "planning machine" errors
```

---

### If Artifacts Don't Update Status

**Symptoms:**
- All artifacts remain "pending" (dimmed)
- Artifacts don't become clickable after generation
- Artifact dialog shows "pending" or empty content

**Solutions:**
1. Wait full 60 seconds (generation may be slow)
2. Check server logs for artifact generation success
3. Check browser console for state update errors
4. Refresh page to force status sync
5. Verify XState context includes artifacts array

**Debugging:**
```bash
# Check artifact generation logs
grep -i "artifact.*generated\|generateArtifact" .tmp-docs/server.log

# Check XState state
# Open Debug Panel in UI, check "Artifacts: X generated"
```

---

### If Stage Dividers Missing or Wrong Color

**Symptoms:**
- No stage dividers visible
- Dividers all same color
- Stage numbers incorrect

**Solutions:**
1. Check WorkflowChat message array structure
2. Verify divider messages have correct type: "divider"
3. Check stageColor values match design system
4. Refresh page and observe divider rendering
5. Check for CSS color variable issues

**Debugging:**
```javascript
// Browser console - inspect messages array
console.log(workflowChatMessages);

// Should include divider messages:
// { type: "divider", stageNumber: 1, stageName: "...", stageColor: "var(--bot-1)" }
```

---

### If Composer Stuck Disabled

**Symptoms:**
- Composer disabled during interactive stages
- Cannot type in composer
- Placeholder shows "View only" when should be active

**Solutions:**
1. Check if workflow is actually complete
2. Verify XState machine state allows input
3. Check `disabled` prop on WorkflowChat component
4. Refresh page and observe composer state
5. Check for JavaScript errors blocking UI

**Debugging:**
```javascript
// Browser console - check WorkflowChat props
// Look for: disabled={true/false}, onSubmitMessage={function/undefined}
```

---

## ⏱️ Expected Timing Reference

| Stage | Type | User Time | Generation Time | Total |
|-------|------|-----------|-----------------|-------|
| Stage 1 | Form | 2 min | 15-25s | ~2.5 min |
| Stage 2 | Interview | 5-7 min | 20-30s | ~7 min |
| Stage 3 | Interview | 5-7 min | 20-30s | ~7 min |
| Stage 4 | Automated | 0 min | 20-30s | ~0.5 min |
| Stage 5 | Form | 2 min | 15-25s | ~2.5 min |
| Stage 6 | Automated | 0 min | 20-30s | ~0.5 min |
| Stage 7 | Review | 30s | 0s | ~0.5 min |
| Stage 8 | Automated | 0 min | 20-30s | ~0.5 min |
| Stage 9 | Automated | 0 min | 20-30s | ~0.5 min |
| Stage 10 | Automated | 0 min | 20-30s | ~0.5 min |
| Artifact Review | Manual | 5 min | 0s | 5 min |
| Chat Navigation | Manual | 3 min | 0s | 3 min |
| State Persistence | Manual | 2 min | 0s | 2 min |
| **TOTAL** | | **~25-30 min** | **~3-4 min** | **~32-34 min** |

**Note:** WorkflowChat UI may feel slightly faster than legacy UI due to continuous flow (no page transitions between steps).

---

## 📁 Screenshot Organization

**Naming Convention:**
- `workflowchat-run-[N]-[step]-[description].png`
- Example: `workflowchat-run-1-06-stage2-started.png`

**Recommended Screenshots (minimum):**
1. Initial load (two-column layout)
2. Artifacts sidebar (all 10 pending)
3. Stage 1 form filled
4. Stage 1 answers in chat
5. Stage 2 question with options
6. Stage 2 answer card
7. Mid-workflow (Stage 5-6 area)
8. Artifact generation loading
9. Artifact dialog open
10. Workflow complete (all artifacts created)
11. Full chat scroll (top to bottom)
12. After page refresh

**Storage Location:** `.tmp-docs/screenshots/`

---

## 🎯 Success Criteria

A complete, successful WorkflowChat UI test run should have:

- ✅ WorkflowChat UI loads correctly (two-column layout)
- ✅ All 10 stages completed without errors
- ✅ 10 artifacts generated (one per stage)
- ✅ All artifacts show "created" status in sidebar
- ✅ All artifacts contain relevant, non-empty content
- ✅ Chat displays full conversation (Stage 1-10 scrollable)
- ✅ All message types render correctly (text, question, answer, loading, divider)
- ✅ Stage dividers visible with correct colors (1-10)
- ✅ Composer sticky positioning works throughout
- ✅ Artifact dialog opens and displays content correctly
- ✅ State persists after page refresh (BUG-018 verified)
- ✅ Chat history fully restored after refresh
- ✅ No console errors
- ✅ No server errors
- ✅ Total time within 30-35 minute range
- ✅ Contextual questions reference project specifics (Stages 2-3)

---

## 📝 Post-Test Actions

After completing each test run:

1. **Fill out Test Summary Template** (above)
2. **Add summary to Test History** (top of document)
3. **Update Current Status section** with latest reality
4. **File bugs** for any new issues found (WorkflowChat-specific)
5. **Compare with Legacy UI** testing results (if available)
6. **Save all screenshots** to `.tmp-docs/screenshots/`
7. **Share findings** with team
8. **Plan next test run** based on findings
9. **Update Known Issues** section if issues resolved

---

## 🔄 Iteration Guidelines

**When to run a new test:**
- After fixing a WorkflowChat-specific bug
- After adding WorkflowChat features
- After refactoring chat components
- Before making WorkflowChat the default UI
- Before major releases
- Weekly during active development

**How to update this guide:**
- Add new test run to Test History
- Update Current Status with latest reality
- Update Known Issues (add new, mark resolved)
- Update Expected Results if behavior changes
- Add new Troubleshooting sections as needed
- Update timing estimates based on actual runs
- Document differences from Legacy UI

**What to track over time:**
- Bug trends (WorkflowChat vs Legacy UI)
- Performance trends (chat rendering, scroll performance)
- UX issues identified
- Test run success rate
- Average completion time
- Feature parity with Legacy UI

---

## 🆚 WorkflowChat vs Legacy UI Comparison

| Feature | Legacy UI (StepContainer) | WorkflowChat UI |
|---------|---------------------------|-----------------|
| Layout | Single column, step-by-step | Two columns (sidebar + chat) |
| Navigation | BACK/NEXT buttons | Scroll chat history |
| Progress | SpectrumStepper bar | Artifacts sidebar |
| Q&A Display | "Previous Answers" section | Inline in chat history |
| Stage Transitions | Hard page-like transitions | Continuous chat flow |
| Artifacts | Review mode tab | Sidebar + dialog |
| Form Fields | Separate form section | Inline in question messages |
| Multiple Choice | Radio buttons/checkboxes | Option buttons in chat |
| Loading States | Button spinners | Typing indicators + messages |
| State Persistence | Step-based restoration | Chat history restoration |

**Key Advantages of WorkflowChat UI:**
- Conversational, natural flow
- All context visible via scroll (no "Previous Answers" needed)
- Artifacts always accessible in sidebar
- More modern chat-based UX
- Continuous conversation (no hard breaks)

**Key Advantages of Legacy UI:**
- Familiar step-based navigation
- Clear "current step" indicator
- Explicit BACK/NEXT controls
- Separate review mode tab

---

**Guide Version:** 1.0 (WorkflowChat UI)  
**Last Updated:** 2026-06-02  
**Next Review:** After first full test run  
**Maintainer:** Update after each test run  
**Related Guide:** `docs/e2e-testing/guide.md` (Legacy UI version)
