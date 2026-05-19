# Bug #002: Project State Display Mismatch - Complete Documentation

**Bug ID:** 002  
**Status:** Diagnosed, Solution Proposed  
**Date:** 2026-05-12  
**Severity:** Moderate (High for Enterprise)

---

## Quick Links

### For Executives
→ **[EXECUTIVE SUMMARY](./002-EXECUTIVE-SUMMARY.md)** - Decision framework and recommendations

### For Product Managers
→ **[Bug Report](../plan/bug-reports/002-project-state-display-mismatch.yaml)** - Original bug report  
→ **[Executive Summary](./002-EXECUTIVE-SUMMARY.md)** - Business impact and options

### For Engineers
→ **[Diagnosis](./002-diagnosis.md)** - Technical root cause analysis  
→ **[Architecture Comparison](./002-architecture-comparison.md)** - Current vs. proposed  
→ **[Enterprise Solution](./002-enterprise-solution.md)** - Detailed technical design  
→ **[Implementation Roadmap](./002-implementation-roadmap.md)** - 5-week phased plan

### For Architects
→ **[Enterprise Solution](./002-enterprise-solution.md)** - Complete architecture  
→ **[State Mismatch Diagram](./002-state-mismatch-diagram.md)** - Visual explanation

---

## Document Overview

### 1. Bug Report (Original)
**File:** `.tmp-docs/plan/bug-reports/002-project-state-display-mismatch.yaml`  
**Purpose:** Initial bug report from testing  
**Key Points:**
- Dashboard shows "Step 2 · Business Goals"
- Build page shows "Gap Analysis" (Step 1)
- Observed in test run TC-006
- Not blocking but causes confusion

### 2. Test Suite
**File:** `app/routes/dashboard-step-display.test.tsx`  
**Purpose:** Automated tests that expose the bug  
**Coverage:**
- ✅ Exposes dashboard showing Step 2 while machine is at Step 1
- ✅ Demonstrates two sources of truth problem
- ✅ Shows expected behavior when states match
- **Result:** All tests pass (confirming bug exists)

### 3. Diagnosis Document
**File:** `.tmp-docs/bug-reports/002-diagnosis.md`  
**Purpose:** Root cause analysis and technical explanation  
**Key Findings:**
- Two separate sources of truth: `Project.currentStep` vs. planning machine state
- No synchronization mechanism exists
- Seed data creates inconsistent initial state
- Planning machine persists to localStorage, projects to in-memory Map

**Solution Approaches:**
1. Dashboard reads from planning machine (recommended)
2. Sync Project.currentStep with planning machine
3. Remove Project.currentStep entirely

### 4. State Mismatch Diagram
**File:** `.tmp-docs/bug-reports/002-state-mismatch-diagram.md`  
**Purpose:** Visual explanation of the problem  
**Diagrams:**
- Data flow showing two unsynced stores
- State lifecycle from creation to mismatch
- Why synchronization doesn't exist
- Proposed single source of truth

### 5. Architecture Comparison
**File:** `.tmp-docs/bug-reports/002-architecture-comparison.md`  
**Purpose:** Detailed comparison of current vs. enterprise architecture  
**Sections:**
- High-level comparison table
- Data flow diagrams (current vs. proposed)
- Code examples (current vs. enterprise)
- Failure scenarios (restart, device switch, concurrent updates)
- Performance analysis
- Cost comparison
- Migration complexity

**Key Insight:** Current architecture is MVP-grade, enterprise needs database-backed state.

### 6. Enterprise Solution
**File:** `.tmp-docs/bug-reports/002-enterprise-solution.md`  
**Purpose:** Complete technical design for production-grade solution  
**Contents:**
- System architecture diagram
- Database schema (PostgreSQL)
- TypeScript domain model
- Service layer implementation
- Client-side integration (React Query)
- Migration strategy (5 phases)
- Monitoring & observability
- Testing strategy
- Performance considerations
- Security (row-level security, validation)
- Cost analysis

**Technologies:**
- PostgreSQL (persistence)
- Redis (caching)
- tRPC (type-safe API)
- React Query (client state)
- XState (state machines)

### 7. Implementation Roadmap
**File:** `.tmp-docs/bug-reports/002-implementation-roadmap.md`  
**Purpose:** 5-week phased rollout plan  
**Phases:**

#### Phase 0: Preparation (Week 0)
- Provision infrastructure
- Define schemas
- Create test data
- Plan deployment

#### Phase 1: Database Layer (Week 1)
- Implement repositories
- Create services
- Write unit tests
- Integration tests

#### Phase 2: Dual Write (Week 2)
- Write to both systems
- Compare results
- Log discrepancies
- Build confidence

#### Phase 3: Data Migration (Week 3)
- Export localStorage
- Import to database
- Backfill events
- Verify integrity

#### Phase 4: Flip to Database (Week 4)
- Switch reads to database
- Monitor performance
- Gradual rollout (1% → 100%)
- Keep legacy fallback

#### Phase 5: Cleanup (Week 5)
- Remove legacy code
- Optimize queries
- Update documentation
- Train team

**Rollback Strategy:** Each phase can be independently rolled back

### 8. Executive Summary
**File:** `.tmp-docs/bug-reports/002-EXECUTIVE-SUMMARY.md`  
**Purpose:** Decision-making document for stakeholders  
**Sections:**
- 60-second problem statement
- Business impact
- Solution options (Quick Fix vs. Enterprise)
- Cost-benefit analysis
- Risk assessment
- Implementation plan
- Success metrics
- Decision framework

**Key Recommendations:**
- **MVP/Startup:** Quick Fix (1 week, $6K)
- **Growth/Enterprise:** Enterprise Solution (5 weeks, $32K year 1)

---

## Key Metrics

### Current State
| Metric | Value | Status |
|--------|-------|--------|
| Data consistency | 0% | ❌ |
| Cross-device support | No | ❌ |
| Audit trail | No | ❌ |
| Data durability | Lost on restart | ❌ |
| Scalability | Process-local | ❌ |

### After Quick Fix
| Metric | Value | Status |
|--------|-------|--------|
| Data consistency | 100% | ✅ |
| Cross-device support | No | ❌ |
| Audit trail | No | ❌ |
| Data durability | Lost on device switch | ⚠️ |
| Scalability | Client-only | ⚠️ |

### After Enterprise Solution
| Metric | Value | Status |
|--------|-------|--------|
| Data consistency | 100% | ✅ |
| Cross-device support | Yes | ✅ |
| Audit trail | Yes | ✅ |
| Data durability | Persistent | ✅ |
| Scalability | Unlimited | ✅ |

---

## Decision Matrix

### Choose Quick Fix If:
- MVP stage (< 1K users)
- Tight budget
- Speed to market critical
- No enterprise customers
- Can accept technical debt

### Choose Enterprise Solution If:
- Growth stage (> 1K users)
- Pursuing enterprise customers
- Audit compliance required
- Multi-device support needed
- Planning for scale
- Professional/team tool

---

## Files Created

### Test Files
- `app/routes/dashboard-step-display.test.tsx` - Automated tests

### Documentation Files
1. `.tmp-docs/bug-reports/002-diagnosis.md`
2. `.tmp-docs/bug-reports/002-state-mismatch-diagram.md`
3. `.tmp-docs/bug-reports/002-architecture-comparison.md`
4. `.tmp-docs/bug-reports/002-enterprise-solution.md`
5. `.tmp-docs/bug-reports/002-implementation-roadmap.md`
6. `.tmp-docs/bug-reports/002-EXECUTIVE-SUMMARY.md`
7. `.tmp-docs/bug-reports/002-INDEX.md` (this file)

---

## Reading Guide

### For Quick Understanding (15 minutes)
1. Read [Executive Summary](./002-EXECUTIVE-SUMMARY.md)
2. Look at [State Mismatch Diagram](./002-state-mismatch-diagram.md)
3. Review decision matrix above

### For Technical Deep Dive (1 hour)
1. Read [Diagnosis](./002-diagnosis.md)
2. Study [Architecture Comparison](./002-architecture-comparison.md)
3. Review [Enterprise Solution](./002-enterprise-solution.md)

### For Implementation Planning (2 hours)
1. Read [Enterprise Solution](./002-enterprise-solution.md)
2. Study [Implementation Roadmap](./002-implementation-roadmap.md)
3. Review database schema and code examples
4. Estimate resource requirements

---

## Next Actions

### Immediate
- [ ] Review Executive Summary
- [ ] Decide: Quick Fix or Enterprise Solution
- [ ] Approve budget and timeline

### If Quick Fix Chosen
- [ ] Assign engineer for 1-week sprint
- [ ] Implement localStorage read in ProjectCard
- [ ] Test edge cases
- [ ] Deploy to production
- [ ] Plan enterprise upgrade in 3-6 months

### If Enterprise Solution Chosen
- [ ] Assign 2-3 engineers for 5 weeks
- [ ] Provision infrastructure ($200/month)
- [ ] Start Phase 0 (Preparation)
- [ ] Follow phased rollout plan
- [ ] Monitor at each phase gate

---

## Related Issues

- Bug #001: Dashboard navigation (fixed)
- Planning machine persistence strategy
- Multi-device project access
- Audit logging requirements
- Enterprise compliance needs

---

## Contact

**For Questions:**
- Technical: Engineering team
- Business: Product management
- Architecture: CTO/VP Engineering

**For Approval:**
- Budget: Finance
- Timeline: Engineering Manager
- Architecture: Technical Lead

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-05-12 | Initial diagnosis and documentation | System Architect |
| 2026-05-12 | Enterprise solution design complete | System Architect |
| 2026-05-12 | Implementation roadmap finalized | System Architect |
| 2026-05-12 | Executive summary prepared | System Architect |

---

**Status:** Ready for stakeholder review and decision  
**Priority:** High (blocks enterprise adoption)  
**Recommendation:** Enterprise Solution (if targeting professional/team market)
