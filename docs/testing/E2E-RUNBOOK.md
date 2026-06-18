# E2E Test Runbook

**Created:** 2026-06-17  
**Status:** Production  
**Related:** [troubleshooting.md](./troubleshooting.md), [OVERVIEW.md](../architecture/OVERVIEW.md)

---

## Overview

This runbook covers **end-to-end testing** of the Sherpy UI planning workflow, from project creation through all 10 steps to final artifact generation.

**Test Scope:**
- ✅ Full 10-step planning workflow
- ✅ AI provider integration (Bedrock/Anthropic/OpenAI)
- ✅ Database persistence (SQLite)
- ✅ State machine transitions (XState)
- ✅ UI interactions (React forms, chat interface)
- ✅ Artifact generation (YAML outputs)

**Test Duration:** ~15-20 minutes per provider

---

## Prerequisites

### 1. Environment Setup

**Required:**
- Node.js 24+
- pnpm v10.24.0
- SQLite database initialized
- AI provider credentials configured

**Install dependencies:**
```bash
pnpm install
```

### 2. AI Provider Configuration

Choose ONE provider and configure credentials:

#### Option A: AWS Bedrock (Primary)

**Setup:**
```bash
# .env
AI_PROVIDER=bedrock
AWS_REGION=ca-central-1
AWS_PROFILE=your-sso-profile  # Optional: for SSO auth

# OR use access keys
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

**Model Access:**
1. AWS Console → Bedrock → Model Access
2. Request access for Claude models
3. Wait for "Access granted" status

**Verify connectivity:**
```bash
pnpm check:provider
# Should show: ✅ AWS Bedrock connection successful
```

**Common Issues:**
- `AccessDeniedException` → Model access not granted in Bedrock console
- `ExpiredTokenException` → Run `aws sso login --profile <your-profile>`
- `RegionNotSupportedException` → Use `ca-central-1` or `us-east-1`

**See:** `.tmp-docs/AWS-BEDROCK-TROUBLESHOOTING.md`

#### Option B: Anthropic Direct API

**Setup:**
```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...
AI_MODEL_ID=claude-3-5-sonnet-20241022
```

**Verify:**
```bash
pnpm check:provider
# Should show: ✅ Anthropic API connection successful
```

#### Option C: OpenAI

**Setup:**
```bash
# .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
AI_MODEL_ID=gpt-4-turbo-preview
```

**Verify:**
```bash
pnpm check:provider
# Should show: ✅ OpenAI API connection successful
```

### 3. Database Initialization

```bash
# Start dev server (auto-creates DB)
pnpm dev

# Verify database exists
ls -la .output/server/planning.db
# Should show: planning.db file
```

**Schema check:**
```bash
# Inspect tables
sqlite3 .output/server/planning.db ".tables"
# Should show: projects, interview_answers, planning_snapshots
```

### 4. Test Environment Variables

**Optional flags:**
```bash
# Enable mock AI responses (fast testing, no API calls)
USE_MOCK_STREAMING=true

# Enable structured output (JSON mode)
USE_STRUCTURED_OUTPUT=false

# Enable Langfuse tracing
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

---

## Running E2E Tests

### Automated Tests (Playwright)

**Run all E2E tests:**
```bash
pnpm test:e2e
```

**Run specific scenarios:**
```bash
# Mock AI (fast, no API calls)
pnpm test:e2e:workflow-chat-mock

# Real AI provider
pnpm test:e2e:workflow-chat

# Debug mode (headed browser)
pnpm test:e2e:debug
```

**Test files:**
- `tests/e2e/workflow-chat.spec.ts` - Full 10-step workflow
- `tests/e2e/dashboard.spec.ts` - Project creation
- `tests/e2e/navigation.spec.ts` - Multi-project navigation

### Manual Testing

**1. Start dev server:**
```bash
pnpm dev
# Server starts at http://localhost:5180
```

**2. Open browser:**
```
http://localhost:5180
```

**3. Create test project:**
- Click "Create New Project"
- Enter project name: "E2E Test Project"
- Verify redirect to `/project/<id>/build`

**4. Test Step 1 (Gap Analysis):**
- Fill form: Project name, Has requirements (yes/no)
- Click "Submit"
- Verify AI question appears (if no requirements)
- Answer interview questions (10 total)
- Verify "Business Requirements" artifact generated

**5. Test Step 2-10:**
- Repeat for each step
- Verify state transitions
- Verify artifacts saved
- Verify navigation works (Next/Back)

**6. Verify persistence:**
- Refresh page mid-workflow
- Verify state restored correctly
- Continue workflow from restored state

---

## Test Scenarios

### Scenario 1: New Project (No Existing Requirements)

**Expected Flow:**
```
Step 1: Gap Analysis
  → Submit form (hasRequirements = "no")
  → AI generates 10 interview questions
  → User answers all 10
  → Generate "Gap Analysis" artifact
  → Navigate to Step 2

Step 2: Business Requirements
  → AI generates 10 contextual questions
  → User answers (building on Step 1 context)
  → Generate "Business Requirements" artifact
  → Navigate to Step 3

Step 3: Technical Requirements
  → AI generates 10 technical questions
  → User answers (building on Step 2 context)
  → Generate "Technical Requirements" artifact
  → Navigate to Step 4

Steps 4-10: Automated
  → Generate artifacts without user input
  → Each step completes automatically
  → Navigate to completion
```

**Validation:**
- ✅ All 10 steps complete
- ✅ All artifacts generated (YAML format)
- ✅ Context propagates (Step 2 knows Step 1 answers)
- ✅ State persists across refresh
- ✅ No console errors

### Scenario 2: Existing Requirements Skip

**Expected Flow:**
```
Step 1: Gap Analysis
  → Submit form (hasRequirements = "yes")
  → Skip interview (no questions)
  → Generate minimal artifact
  → Navigate to Step 2 (same as Scenario 1)
```

**Validation:**
- ✅ No interview questions in Step 1
- ✅ Proceeds directly to Step 2
- ✅ Step 2+ work normally

### Scenario 3: Multi-Project State Isolation

**Expected Flow:**
```
1. Create Project A → Complete Step 1
2. Create Project B → Complete Step 1
3. Navigate to Project A
4. Verify Project A state restored (not Project B)
```

**Validation:**
- ✅ No cross-project state leakage (BUG-037)
- ✅ Each project has isolated state
- ✅ Navigation restores correct state

### Scenario 4: Resume After Refresh

**Expected Flow:**
```
1. Create project → Complete Step 1-3
2. Refresh page (Ctrl+R)
3. Verify state restored
4. Continue from Step 4
```

**Validation:**
- ✅ State restored from snapshot
- ✅ No data loss
- ✅ Can continue workflow

---

## Debugging E2E Tests

### Playwright UI Mode

```bash
pnpm test:e2e:debug
```

**Features:**
- Step-through test execution
- DOM inspection at each step
- Network request inspection
- Screenshot/video recording

**See:** [Playwright UI Mode Docs](https://playwright.dev/docs/test-ui-mode)

### Browser DevTools

**Console logs:**
```javascript
// Check for errors
console.error // Red errors indicate issues

// XState machine state
window.__XSTATE_DEVTOOLS__ // If inspector enabled
```

**Network tab:**
```
Filter: /api/
Look for: 500 errors, failed requests, long latency
```

**React DevTools:**
```
Components → PlanningMachineProvider
Props → Check actor state, context
```

### Screenshots

**Automated (Playwright):**
```typescript
await page.screenshot({ path: 'screenshot.png' });
```

**Manual (browser):**
```
Cmd+Shift+4 (Mac) or PrtScn (Windows)
```

**Save to:**
`.tmp-docs/screenshots/YYYY-MM-DD-test-name.png`

### Video Recording

**Playwright:**
```typescript
// playwright.config.ts
use: {
  video: 'on', // Record all tests
}
```

**Video output:**
`test-results/<test-name>/video.webm`

---

## Common Test Failures

### 1. Timeout Waiting for AI Response

**Symptom:**
```
Error: Timeout 30000ms exceeded
  waiting for selector "button:has-text('Submit Answer')"
```

**Cause:** AI provider not responding or rate limited.

**Solution:**
1. Check provider connectivity: `pnpm check:provider`
2. Verify API keys/credentials in `.env`
3. Check provider status page (AWS, Anthropic, OpenAI)
4. Increase timeout in test:
   ```typescript
   await page.waitForSelector('button', { timeout: 60000 });
   ```

### 2. Form Values Not Updating

**Symptom:** Form submission sends empty values.

**Cause:** React synthetic events not triggered.

**Solution:** Use Playwright MCP (NOT agent-browser):
```typescript
// ✅ CORRECT - Triggers React events
await page.fill('#projectName', 'Test Project');
await page.fill('input[name="hasRequirements"]', 'no');

// ❌ WRONG - agent-browser doesn't work with React forms
```

**See:** [troubleshooting.md](./troubleshooting.md) - "E2E Testing with Playwright"

### 3. State Not Persisting

**Symptom:** Refresh page loses all progress.

**Cause:** localStorage disabled or snapshot serialization broken.

**Solution:**
1. Check localStorage enabled in browser
2. Verify snapshot saved:
   ```javascript
   localStorage.getItem('planning_state_<projectId>');
   // Should return JSON snapshot
   ```
3. Check console for serialization errors

### 4. FOREIGN KEY Constraint Failed

**Symptom:**
```
Error: FOREIGN KEY constraint failed
  at Database.run (interview_answers insert)
```

**Cause:** Project record missing before inserting answers.

**Solution:** Create project record first:
```typescript
await db.run('INSERT INTO projects (id, name) VALUES (?, ?)', [projectId, name]);
await db.run('INSERT INTO interview_answers (project_id, ...) VALUES (?, ...)', [projectId, ...]);
```

### 5. Cross-Project State Leakage (BUG-037)

**Symptom:** Navigating Project A → B shows Project A's state in Project B.

**Cause:** React component reused, no `key` prop to force unmount.

**Solution:** Verify `key={projectId}` exists:
```tsx
<PlanningMachineProvider key={projectId} projectId={projectId} />
```

**See:** `.tmp-docs/bug-reports/037-cross-project-leakage/`

---

## Test Checklist

### Pre-Test

- [ ] AI provider credentials configured
- [ ] `pnpm check:provider` passes
- [ ] Dev server starts without errors
- [ ] Database initialized (`.output/server/planning.db` exists)
- [ ] Browser DevTools open (for debugging)

### During Test

- [ ] Project creation successful
- [ ] Step 1 form submission works
- [ ] AI questions appear (if applicable)
- [ ] Can answer interview questions
- [ ] Artifacts generated (view in UI)
- [ ] Navigation works (Next/Back buttons)
- [ ] State persists on refresh
- [ ] No console errors
- [ ] No 500 errors in Network tab

### Post-Test

- [ ] All 10 steps completed
- [ ] All artifacts saved in database
- [ ] Screenshot/video recorded (if failures)
- [ ] Bug report filed (if issues found)
- [ ] Test duration logged (~15-20 min expected)

---

## Test Data Examples

### Valid Test Inputs

**Step 1 (Gap Analysis):**
```
Project Name: E2E Test Project
Has Existing Requirements: No
```

**Step 2 (Business Requirements) - Example Answers:**
```
Q: What problem does this solve?
A: Automate invoice processing to reduce manual data entry errors

Q: Who are the primary users?
A: Finance team members processing 100+ invoices per day

Q: What is the expected outcome?
A: Reduce invoice processing time by 50% and eliminate data entry errors
```

**Step 3 (Technical Requirements) - Example Answers:**
```
Q: What is the preferred technology stack?
A: React frontend, Node.js backend, PostgreSQL database

Q: What are the integration requirements?
A: Integrate with Salesforce CRM and QuickBooks accounting software

Q: What are the performance requirements?
A: Process 1000 invoices per hour, 99.9% uptime
```

### Expected Artifact Structure

**Business Requirements (Step 2):**
```yaml
business_requirements:
  overview:
    project_name: "E2E Test Project"
    problem_statement: "..."
    target_audience: "..."
  
  features:
    - id: "F001"
      name: "Invoice Upload"
      description: "..."
      priority: high
  
  success_metrics:
    - metric: "Processing Time"
      target: "50% reduction"
```

---

## Troubleshooting Decision Tree

```
Test Failure
    │
    ├─ AI not responding?
    │   ├─ Check: pnpm check:provider
    │   ├─ Check: API keys in .env
    │   └─ Check: Provider status page
    │
    ├─ Form not submitting?
    │   ├─ Check: Using Playwright (not agent-browser)
    │   ├─ Check: React synthetic events triggered
    │   └─ Check: Browser console for errors
    │
    ├─ State not persisting?
    │   ├─ Check: localStorage enabled
    │   ├─ Check: Snapshot serialization errors
    │   └─ Check: Console for XState errors
    │
    ├─ Database errors?
    │   ├─ Check: FOREIGN KEY constraints
    │   ├─ Check: Project record exists first
    │   └─ Check: Schema matches code
    │
    └─ Cross-project issues?
        ├─ Check: key={projectId} on provider
        ├─ Check: Snapshot validation
        └─ See: BUG-037 fix
```

---

## AWS Bedrock Specific

### Model ID by Region

| Region | Prefix | Example |
|--------|--------|---------|
| US East (N. Virginia) | `us.` | `us.anthropic.claude-sonnet-4-5-...` |
| US West (Oregon) | `us.` | `us.anthropic.claude-sonnet-4-5-...` |
| Canada (Central) | `amer.` | `amer.anthropic.claude-sonnet-4-5-...` |
| Europe (Frankfurt) | `eu.` | `eu.anthropic.claude-sonnet-4-5-...` |
| Asia Pacific (Tokyo) | `apac.` | `apac.anthropic.claude-sonnet-4-5-...` |

**Important:** Canada Central (`ca-central-1`) uses `amer.` prefix, NOT `us.` or `ca.`

### SSO Authentication

**Login:**
```bash
# On host machine (outside container)
aws sso login --profile your-profile-name
```

**Verify:**
```bash
aws sts get-caller-identity
# Should show: UserId, Account, Arn
```

**Token expiry:** SSO tokens expire after 8-12 hours. Re-run `aws sso login` if expired.

### Firewall Configuration (kdev container)

**Required endpoints:**
```yaml
firewall:
  allow:
    - "bedrock-runtime.ca-central-1.amazonaws.com"
    - "sts.amazonaws.com"
    - "sts.ca-central-1.amazonaws.com"
    - "oidc.ca-central-1.amazonaws.com"
    - "portal.sso.ca-central-1.amazonaws.com"
```

**See:** `.tmp-docs/BEDROCK-FINAL-CONFIGURATION.md`

---

## Test Commands Reference

```bash
# Environment check
pnpm check:provider

# Unit + integration tests
pnpm test

# E2E tests (all scenarios)
pnpm test:e2e

# E2E with mock AI (fast)
pnpm test:e2e:workflow-chat-mock

# E2E debug mode (headed browser)
pnpm test:e2e:debug

# Type check
pnpm typecheck

# Lint
pnpm lint

# Start dev server
pnpm dev

# Build production
pnpm build

# Run production server
NODE_ENV=production pnpm start
```

---

## Filing Bug Reports

**When to file:**
- Test fails unexpectedly
- Console errors appear
- State doesn't persist
- Artifacts not generated
- UI doesn't match expected behavior

**Bug report template:**
```markdown
# BUG-XXX: Short Description

**Date:** YYYY-MM-DD
**Severity:** Critical | High | Medium | Low
**Status:** Open | In Progress | Fixed

## Reproduction Steps

1. Start dev server
2. Create new project
3. [Specific steps...]
4. Observe error

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happened]

## Error Messages

```
[Console errors, stack traces]
```

## Screenshots

[Attach screenshots]

## Environment

- AI Provider: Bedrock | Anthropic | OpenAI
- Browser: Chrome 120 | Firefox 121 | Safari 17
- Node.js: 24.x
- OS: macOS | Windows | Linux

## Root Cause (if known)

[Technical analysis]

## Fix (if known)

[Code changes needed]
```

**Save to:** `.tmp-docs/bug-reports/XXX-short-description/`

---

## Related Documentation

- [troubleshooting.md](./troubleshooting.md) - Test failure patterns
- [OVERVIEW.md](../architecture/OVERVIEW.md) - System architecture
- [state-machine.md](../architecture/state-machine.md) - XState workflow
- [ai-providers.md](../architecture/ai-providers.md) - AI integration
- [Fixed Bugs Archive](../../.tmp-docs/bug-reports/FIXED-BUGS.md)

---

**Last Updated:** 2026-06-17  
**Maintainer:** Development Team  
**Test Status:** 1033/1044 passing (11 skipped)
