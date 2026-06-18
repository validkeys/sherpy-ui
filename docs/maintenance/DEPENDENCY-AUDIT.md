# Dependency Audit Report

**Last Updated:** 2026-06-17  
**Node Version:** v25.8.1 (UNSUPPORTED - project requires >=24 <25)  
**PNPM Version:** 10.24.0  

---

## 🚨 Critical Findings

### 1. Node Version Mismatch
- **Current:** v25.8.1
- **Required:** >=24 <25
- **Impact:** High - Unsupported engine warning on all pnpm commands
- **Action:** Downgrade to Node 24.x LTS before production deployment

### 2. Critical Security Vulnerabilities

#### @vitest/browser (Critical - RCE Risk)
- **Package:** `@vitest/browser` (via `@storybook/addon-vitest`)
- **Current:** 4.1.5
- **Required:** >=4.1.8
- **Vulnerabilities:**
  - [GHSA-2h32-95rg-cppp](https://github.com/advisories/GHSA-2h32-95rg-cppp) - XSS via unsanitized otelCarrier query parameter
  - [GHSA-g8mr-85jm-7xhm](https://github.com/advisories/GHSA-g8mr-85jm-7xhm) - Browser Mode API can proxy CDP, leading to RCE
- **Mitigation:**
  - Upgrade to vitest@4.1.9+ (includes fixed @vitest/browser)
  - Or remove @storybook/addon-vitest if not actively used
  - **DEV-ONLY RISK:** These vulnerabilities only affect development environment

---

## 🔴 High Severity Vulnerabilities

### h3 (TanStack Router Dependency)
- **Package:** `h3` (via `vinxi`)
- **Vulnerabilities:**
  - [GHSA-22cc-p3c6-wpvm](https://github.com/advisories/GHSA-22cc-p3c6-wpvm) - SSE injection via unsanitized newlines (High)
  - [GHSA-mp2g-9vg9-f4cg](https://github.com/advisories/GHSA-mp2g-9vg9-f4cg) - Request smuggling (TE.TE) (High)
  - [GHSA-wr4h-v87w-p3r7](https://github.com/advisories/GHSA-wr4h-v87w-p3r7) - Path traversal in serveStatic (Moderate)
  - [GHSA-4hxc-9384-m385](https://github.com/advisories/GHSA-4hxc-9384-m385) - SSE injection via carriage return (Moderate)
  - [GHSA-72gr-qfp7-vwhw](https://github.com/advisories/GHSA-72gr-qfp7-vwhw) - Double decoding bypasses path traversal protection (Moderate)
- **Required:** >=1.15.9
- **Impact:** High - SSR runtime vulnerabilities
- **Mitigation:**
  - Wait for TanStack Router/vinxi to upgrade h3 dependency
  - Track upstream: https://github.com/TanStack/router/issues
  - **PRODUCTION RISK:** These affect the production server

### fast-uri (TanStack Router Dependency)
- **Package:** `fast-uri` (via `vinxi>listhen>ufo`)
- **Vulnerability:** [GHSA-f8f5-c4w2-x3cx](https://github.com/advisories/GHSA-f8f5-c4w2-x3cx) - Host confusion via percent-encoded authority delimiters
- **Required:** >=3.2.0
- **Current:** <=3.1.1
- **Impact:** High - URL parsing vulnerabilities
- **Mitigation:** Wait for upstream vinxi update

---

## 🟡 Moderate Severity Vulnerabilities

### hono (shadcn Dependency)
- **Package:** `hono` (via `shadcn>@modelcontextprotocol/sdk`)
- **Vulnerabilities:**
  - [GHSA-88fw-hqm2-52qc](https://github.com/advisories/GHSA-88fw-hqm2-52qc) - XSS via unsanitized script attribute (Moderate)
  - [GHSA-qp7p-654g-cw7p](https://github.com/advisories/GHSA-qp7p-654g-cw7p) - CSS injection via style object values (Moderate)
- **Required:** >=4.12.18
- **Impact:** Moderate - Only affects shadcn CLI usage, not runtime
- **Mitigation:** Upgrade shadcn when new version available

### atob (Storybook Dependency)
- **Package:** `atob` (via `storybook` dependencies)
- **Vulnerability:** [GHSA-5cmp-w54x-c785](https://github.com/advisories/GHSA-5cmp-w54x-c785) - Regex DoS
- **Current:** 2.1.2
- **Required:** >=3.0.0
- **Impact:** Low - Dev-only dependency
- **Mitigation:** Wait for Storybook 10.4.6 update

---

## 📦 Outdated Dependencies (Safe Updates)

### Patch/Minor Updates Available (51 packages)
Most updates are patch-level (safe) or minor (backward compatible). Key updates:

#### Production Dependencies (18)
- `@xstate/react`: 5.0.5 → **6.1.0** (MAJOR - breaking changes expected)
- `@base-ui/react`: 1.4.1 → 1.5.0
- `react` + `react-dom`: 19.2.5 → 19.2.7
- `xstate`: 5.31.1 → 5.32.1
- `ai`: 6.0.198 → 6.0.208
- `@tanstack/react-router`: 1.169.2 → 1.170.16
- `@tanstack/react-start`: 1.167.64 → 1.168.26
- `@ai-sdk/*`: Multiple patch updates
- `@aws-sdk/*`: 3.1044.0+ → 3.1071.0
- `lucide-react`: 1.14.0 → 1.20.0

#### Development Dependencies (33)
- `@types/node`: 24.12.2 → **25.9.3** (MAJOR - requires Node 25+, incompatible with engine constraint)
- `@babel/core`: 7.29.0 → **8.0.1** (MAJOR)
- `vitest` + `@vitest/*`: 4.1.5 → 4.1.9 (fixes critical security issues)
- `@playwright/test`: 1.60.0 → 1.61.0
- `storybook` + addons: 10.3.6 → 10.4.6
- `@biomejs/biome`: 2.4.14 → 2.5.0
- `tailwindcss` + `@tailwindcss/vite`: 4.2.4 → 4.3.1
- `eslint`: 10.3.0 → 10.5.0
- `shadcn`: 4.6.0 → 4.11.0

---

## 🔧 Recommended Actions

### Immediate (Before Handoff)
1. **Fix Node version:**
   ```bash
   # Use nvm/volta to switch to Node 24.x
   nvm install 24
   nvm use 24
   ```

2. **Update vitest (fixes critical RCE vulnerabilities):**
   ```bash
   pnpm update vitest @vitest/browser-playwright @vitest/coverage-v8 -L
   ```

3. **Update safe production dependencies:**
   ```bash
   pnpm update react react-dom xstate ai lucide-react -L
   pnpm update @ai-sdk/amazon-bedrock @ai-sdk/anthropic @ai-sdk/openai -L
   pnpm update @tanstack/react-query @tanstack/react-router @tanstack/react-start -L
   ```

4. **Run tests after updates:**
   ```bash
   pnpm test
   pnpm test:e2e
   ```

### Short-Term (Next Sprint)
1. **Monitor upstream dependencies:**
   - TanStack Router/vinxi for h3 1.15.9+ (fixes SSR vulnerabilities)
   - Storybook 10.4.6+ for atob fix

2. **Evaluate @xstate/react 6.x upgrade:**
   - Review breaking changes: https://github.com/statelyai/xstate/releases/tag/@xstate/react@6.0.0
   - Plan migration if adopting new features

3. **Defer @types/node 25.x:**
   - Keep at 24.x until Node 25 LTS released
   - Current pin is correct for engine constraint

### Long-Term (Production Hardening)
1. **Dependency pinning strategy:**
   - Current: Caret ranges (`^4.0.0`) allow minor/patch updates
   - Consider: Exact pinning for production stability
   - Tradeoff: Security patches require manual intervention

2. **Automated security scanning:**
   - Add `pnpm audit` to CI pipeline
   - Set up Dependabot/Renovate for automated PRs
   - Weekly audit schedule in maintenance docs

3. **Version policy:**
   - Major updates: Require explicit approval + testing
   - Minor updates: Auto-merge if tests pass
   - Security patches: Expedited review process

---

## 📊 Dependency Health Metrics

- **Total Dependencies:** 76 (46 prod + 30 dev)
- **Outdated:** 51/76 (67%)
- **Security Vulnerabilities:** 11 (2 critical, 3 high, 6 moderate)
- **Dev-Only Vulnerabilities:** 3/11 (27%)
- **Transitive Vulnerabilities:** 8/11 (73%) - Cannot fix directly

---

## 🔒 Version Pins (Intentional)

These versions are pinned for compatibility reasons:

1. **TypeScript 6.0.2:**
   - Latest stable for TanStack Router compatibility
   - No updates needed

2. **@types/node 24.x:**
   - Matches Node 24 engine constraint
   - Do NOT upgrade to 25.x

3. **eslint 10.x:**
   - ESLint v10 is latest stable
   - Recent upgrade from v9

---

## 📝 Audit Methodology

```bash
# Commands run
pnpm outdated  # Check for newer versions
pnpm audit     # Check for known vulnerabilities

# Node environment
node --version  # v25.8.1 (WARNING: Unsupported)
pnpm --version  # 10.24.0

# Audit date
date +%Y-%m-%d  # 2026-06-17
```

---

## 🎯 Acceptance Criteria (Task 3.1)

- [x] Audit report created
- [x] Security vulnerabilities documented with severity
- [x] Outdated packages categorized (safe vs breaking)
- [x] Node version mismatch identified
- [x] Immediate actions defined
- [x] Version pins justified
- [x] Transitive dependency risks flagged

**Next:** Task 3.2 - Script Cleanup + scripts/README.md (30 min)
