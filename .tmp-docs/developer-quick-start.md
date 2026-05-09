# Developer Quick Start: Structured Output Refactor

**Plan Status:** ✅ PRODUCTION READY  
**Start Here:** This is your fast-track guide to begin development

---

## 🚀 Quick Start (5 minutes)

### 1. Read the Plan
```bash
# Main plan with all task details
open /workspace/.tmp-docs/plans/structured-output-refactor.yaml

# Executive summary (5 min read)
open /workspace/.tmp-docs/plan-review-summary.md
```

### 2. Setup Environment
```bash
# Create feature branch
git checkout -b feature/structured-output

# Verify tests pass
npm test              # Should show 159 tests passing
npm run typecheck     # Should show 0 errors

# Set feature flags (disabled initially)
export USE_STRUCTURED_OUTPUT=false
export STRUCTURED_OUTPUT_STEPS=1
```

### 3. Start Phase 1
```bash
# Begin with task t-struct-001
# Location: /workspace/.tmp-docs/plans/structured-output-refactor.yaml
# Lines: 138-212
```

---

## 📋 Task Workflow (Per Task)

### Step 1: Read Task Instructions
- Open plan YAML
- Find task by ID (e.g., t-struct-001)
- Read: CRITICAL CONSTRAINTS, DRIFT POLICY, TDD CHECKLIST

### Step 2: Follow TDD Checklist (if applicable)
```bash
# 1. Write failing test first
npm test <file>.test.ts    # Verify it fails

# 2. Implement minimal code
# (Edit implementation file)

# 3. Run test again
npm test <file>.test.ts    # Verify it passes

# 4. Add edge cases
# (Add more tests)

# 5. Refactor while keeping tests green
npm run typecheck && npm test
```

### Step 3: Check for Drift
**STOP immediately if:**
- You import files not listed in "Approved for this task"
- You modify files not in the `files:` section
- Existing tests fail and you think about modifying them
- Task exceeds estimate by >30 minutes

**If drift occurs:**
```bash
# 1. STOP and revert
git restore <files>

# 2. Document incident
echo "Drift in task t-struct-XXX: <reason>" > docs/drift-incidents/task-t-struct-XXX-drift.md

# 3. Report to reviewer
# (Don't continue until reviewed)
```

### Step 4: Validate Before Moving On
```bash
npm run typecheck    # Must show 0 errors
npm test             # All tests must pass
git status           # Only expected files changed
```

---

## 🎯 Task Sequence

### Phase 1: Foundation (2-3 hours)
```
t-struct-001: Define JSON Schema for responses
  ├─ Create: src/features/planning/response-schemas.ts
  └─ Validate: npm test src/features/planning/types.test.ts

t-struct-002: Add responseSchema to StepConfig
  ├─ Modify: src/features/planning/step-config.ts
  └─ Validate: npm test src/features/planning/

t-struct-003: Create Feature Flag System
  ├─ Create: src/features/ai/feature-flags.ts
  └─ Validate: npm test src/features/ai/feature-flags.test.ts
```

### Phase 2: Bedrock Integration (2-3 hours)
```
t-struct-004: Update streaming for JSON Schema
  ├─ Modify: src/features/ai/streaming.ts
  ├─ Add: response_format parameter conditionally
  └─ Validate: npm test src/features/ai/streaming.test.ts

t-struct-005: Update generateText() for JSON Schema
  ├─ Modify: src/features/ai/server.ts
  ├─ Add: stepNumber parameter
  └─ Validate: npm test src/features/ai/server.test.ts
```

### Phase 3: UI Integration (2-3 hours)
```
t-struct-006: Update useStreamingQuestion hook
  ├─ Modify: src/features/ai/hooks.ts
  ├─ Add: JSON parsing logic
  └─ Validate: npm test src/features/ai/hooks.test.ts

t-struct-007: Update InterviewThread component
  ├─ Modify: src/features/planning/components/InterviewThread.tsx
  └─ Validate: npm test src/features/planning/components/InterviewThread.test.tsx

t-struct-008: Update API route
  ├─ Modify: app/api/ai/interview.ts
  └─ Validate: npm run typecheck
```

### Phase 4: Testing & Rollout (2-3 hours)
```
t-struct-009: Add comprehensive tests
  ├─ Create: src/features/ai/structured-output.test.ts
  ├─ Create: src/features/ai/structured-output.integration.test.ts
  └─ Validate: npm test && npm run test:integration

t-struct-010: Document rollout plan
  ├─ Create: docs/structured-output-rollout.md
  ├─ Modify: .env.example, README.md
  └─ Test: Manual rollback procedure
```

---

## 🛑 STOP Criteria (Drift Policy)

### General STOP Criteria (All Tasks)
- New dependencies introduced (not in approved list)
- Files touched outside specified targets
- Linting errors that can't be resolved in task scope
- Type errors that can't be resolved in task scope
- Tests fail and you consider modifying tests
- Task estimate exceeded by >30 minutes

### Task-Specific STOP Criteria
Each task has custom drift policy. Example for t-struct-004:

**STOP if:**
- Import anything other than `isStructuredOutputEnabled`, `getStepResponseSchema`
- Modify files other than `src/features/ai/streaming.ts`
- Add dependencies to `package.json`
- Langfuse observability breaks

**Allowed:**
- ONLY import from `./feature-flags` and `../planning/step-config`
- ONLY modify `src/features/ai/streaming.ts`
- ONLY add `stepNumber` parameter
- ONLY add `response_format` conditionally

---

## ✅ Quality Gates

### Per Task
```bash
npm run typecheck    # 0 errors
npm test             # All pass
git status           # Expected files only
```

### Per Phase
```bash
npm run typecheck    # 0 errors
npm test             # All 159+ tests pass
npm run lint         # No errors
git diff --stat      # Review changes
```

### Before PR
```bash
npm run build                # Build succeeds
npm test                     # All tests pass
npm run coverage             # >80% on new code
npm run test:integration     # Playwright tests pass
```

---

## 🔄 Rollout Strategy

### Week 1: Step 1 Only
```bash
USE_STRUCTURED_OUTPUT=true
STRUCTURED_OUTPUT_STEPS=1
```
**Monitor:** Error rates, response times, option rendering

### Week 2-3: Steps 1-3 (33 questions)
```bash
STRUCTURED_OUTPUT_STEPS=1,2,3
```
**Monitor:** User feedback, completion rates

### Week 4+: All Steps
```bash
STRUCTURED_OUTPUT_STEPS=1,2,3,4,5,6,7,8,9,10
```
**Monitor:** System-wide stability

---

## 🔙 Rollback Procedure

If issues detected:
```bash
# 1. Disable feature flag
export USE_STRUCTURED_OUTPUT=false

# 2. Restart app (zero downtime)
# App falls back to text parsing (parse-options.ts)

# 3. Monitor for 24 hours
# Check error logs, user reports

# 4. Debug root cause
# Fix and re-enable with caution
```

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `src/features/planning/response-schemas.ts` | JSON Schema definitions (NEW) |
| `src/features/planning/step-config.ts` | Step config with responseSchema (MODIFY) |
| `src/features/ai/feature-flags.ts` | Feature flag system (NEW) |
| `src/features/ai/streaming.ts` | Bedrock streaming with response_format (MODIFY) |
| `src/features/ai/server.ts` | generateText with JSON Schema (MODIFY) |
| `src/features/ai/hooks.ts` | JSON parsing in hook (MODIFY) |
| `src/features/planning/components/InterviewThread.tsx` | Use structured options (MODIFY) |
| `app/api/ai/interview.ts` | Pass stepNumber (MODIFY) |

---

## 🧪 Testing Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test src/features/ai/hooks.test.ts

# Run with coverage
npm run coverage

# Run integration tests (Playwright)
npm run test:integration

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

---

## 🆘 Need Help?

### Review Documents
- **Full Plan:** `/workspace/.tmp-docs/plans/structured-output-refactor.yaml`
- **Review Summary:** `/workspace/.tmp-docs/plan-review-summary.md`
- **Fixes Applied:** `/workspace/.tmp-docs/plan-fixes-applied.md`
- **Ready for Dev:** `/workspace/.tmp-docs/plan-ready-for-development.md`

### Common Questions

**Q: Can I add a new dependency?**  
A: NO. STOP and follow drift policy. Report to reviewer.

**Q: Test is failing, can I modify it?**  
A: NO. Fix the implementation to pass the test. Tests are the contract.

**Q: Task is taking longer than estimate?**  
A: If >30 min over, STOP and report. Don't push through.

**Q: Can I refactor adjacent code?**  
A: NO. Only touch files listed in task's `files:` section.

**Q: Feature flag is confusing, can I skip it?**  
A: NO. Feature flags are critical for zero-downtime rollout.

---

## 📊 Progress Tracking

### Checklist
- [ ] Phase 1 Complete: t-struct-001, t-struct-002, t-struct-003
- [ ] Phase 2 Complete: t-struct-004, t-struct-005
- [ ] Phase 3 Complete: t-struct-006, t-struct-007, t-struct-008
- [ ] Phase 4 Complete: t-struct-009, t-struct-010
- [ ] All tests pass (159+ tests)
- [ ] Integration tests pass
- [ ] Build succeeds
- [ ] Documentation complete

### Report Progress
After each phase, update in team chat:
```
Phase X Complete ✅
- Tasks: t-struct-XXX, t-struct-YYY
- Tests: All passing
- Drift incidents: 0
- Next: Phase Y
```

---

## 🚦 Start Now

```bash
# 1. Create branch
git checkout -b feature/structured-output

# 2. Open plan
open /workspace/.tmp-docs/plans/structured-output-refactor.yaml

# 3. Start task t-struct-001
# Follow TDD checklist
# Check drift policy
# Validate before moving on

# 4. Go!
```

---

**Good luck! Follow the plan, respect the constraints, and ship with confidence.**
