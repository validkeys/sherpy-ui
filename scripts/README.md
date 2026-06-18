# Scripts Directory

Utility scripts for development, testing, and debugging.

---

## 📋 Active Scripts

### AI Provider Diagnostics

#### `check-provider.mjs`
**Purpose:** Universal AI provider diagnostic (auto-detects Bedrock/OpenAI/Anthropic)  
**Usage:** `pnpm check:provider`  
**Requirements:** `.env` file with AI provider credentials  
**Output:**
- Provider detection and configuration validation
- Model availability check
- Test completion (simple prompt)
- Streaming test (streaming response)
- Token usage and latency metrics

**Troubleshooting:**
- If Bedrock fails, check AWS SSO login: `aws sso login --profile <profile-name>`
- If OpenAI fails, verify `OPENAI_API_KEY` is set
- If Anthropic fails, verify `ANTHROPIC_API_KEY` is set
- See `docs/architecture/ai-providers.md` for detailed setup

---

#### `check-bedrock.mjs` (Legacy)
**Purpose:** AWS Bedrock-specific diagnostic  
**Usage:** `pnpm check:bedrock`  
**Status:** Superseded by `check-provider.mjs`  
**Keep?** Yes - useful for Bedrock-specific debugging (region checks, model ID prefixes)

---

#### `check-ai.mjs` (Legacy)
**Purpose:** Original OpenAI diagnostic  
**Usage:** `pnpm check:ai`  
**Status:** Superseded by `check-provider.mjs`  
**Keep?** No - functionality covered by universal script  
**Action:** Delete in next cleanup cycle

---

### Test Data Management

#### `seed-project.js`
**Purpose:** Seed database with test project data at specific workflow steps  
**Usage:**
```bash
pnpm seed           # Complete project (all steps)
pnpm seed:step1     # Step 1 only
pnpm seed:step2     # Through step 2
pnpm seed:step3     # Through step 3
pnpm seed:step5     # Through step 5
pnpm seed:step10    # All steps (alternative to pnpm seed)
```

**Use Cases:**
- E2E test setup (see `docs/testing/E2E-RUNBOOK.md`)
- Manual testing of specific workflow steps
- Debugging step transitions

**Data Source:** `.tmp-docs/test-data/` snapshots

---

### XState Snapshot Management

#### `generate-snapshots.ts`
**Purpose:** Generate XState machine snapshots for test fixtures  
**Usage:** `pnpm snapshots:generate`  
**Output:** JSON snapshots in `.tmp-docs/test-data/`  
**Use Cases:**
- Capture known-good machine states
- Regression testing reference data
- Seed data generation

---

#### `generate-edge-case-snapshots.ts`
**Purpose:** Generate snapshots for edge cases (errors, retries, empty states)  
**Usage:** `pnpm snapshots:generate-edge-cases`  
**Output:** JSON snapshots with error/edge-case states  
**Use Cases:**
- Error boundary testing
- Resilience validation
- BUG-037 regression prevention (project switch snapshots)

---

#### `validate-snapshots.ts`
**Purpose:** Validate snapshot integrity and list available snapshots  
**Usage:**
```bash
pnpm snapshots:validate   # Validate all snapshots
pnpm snapshots:list       # List available snapshots
pnpm snapshots:stats      # Show snapshot statistics
```

**Checks:**
- JSON schema validity
- Required fields presence
- Cross-snapshot consistency
- State machine compatibility

---

## 🗑️ Deprecated Scripts

### `check-backward-compatibility.sh`
**Status:** Obsolete (pre-BUG-033 workflow testing)  
**Last Updated:** 2026-06-12  
**Action:** Delete  
**Reason:** Old workflow removed in commit `94495b6` (test: Remove obsolete tests for pre-BUG-033 flow)

---

### `test-seed-api.sh`
**Status:** Obsolete (debugging script from early development)  
**Last Updated:** 2026-05-20  
**Action:** Delete  
**Reason:** Functionality covered by `pnpm seed` and E2E tests

---

## 🧹 Maintenance Guidelines

### When to Add a Script
- Automates repeated manual task (3+ times)
- Required for CI/CD pipeline
- Diagnostic tool for production issues
- Test data generation/validation

### When to Delete a Script
- Not referenced in `package.json` scripts
- Not documented in README, docs/, or tests
- Functionality superseded by newer script
- Related feature removed from codebase

### Documentation Requirements
Every script in this directory must have:
1. Entry in this README (purpose, usage, requirements)
2. Inline comments explaining complex logic
3. Error handling with helpful messages
4. Reference in relevant docs (if user-facing)

---

## 📊 Script Inventory

| Script | Status | NPM Script | Last Updated | Size |
|--------|--------|------------|--------------|------|
| `check-provider.mjs` | ✅ Active | `check:provider` | 2026-06-17 | 3.9K |
| `check-bedrock.mjs` | ⚠️ Legacy | `check:bedrock` | 2026-06-10 | 4.0K |
| `check-ai.mjs` | ⚠️ Legacy | `check:ai` | 2026-05-29 | 793B |
| `seed-project.js` | ✅ Active | `seed*` | 2026-05-20 | 2.8K |
| `generate-snapshots.ts` | ✅ Active | `snapshots:generate` | 2026-05-20 | 5.0K |
| `generate-edge-case-snapshots.ts` | ✅ Active | `snapshots:generate-edge-cases` | 2026-05-20 | 11K |
| `validate-snapshots.ts` | ✅ Active | `snapshots:validate` | 2026-05-20 | 11K |
| `check-backward-compatibility.sh` | ❌ Delete | None | 2026-06-12 | 2.7K |
| `test-seed-api.sh` | ❌ Delete | None | 2026-05-20 | 1.2K |

**Total:** 9 scripts (5 active, 2 legacy, 2 obsolete)  
**Cleanup Target:** Delete 2 obsolete scripts, evaluate 2 legacy scripts

---

## 🔗 Related Documentation

- **AI Provider Setup:** `docs/architecture/ai-providers.md`
- **E2E Testing:** `docs/testing/E2E-RUNBOOK.md`
- **Test Troubleshooting:** `docs/testing/troubleshooting.md`
- **Environment Variables:** `.env.example`
