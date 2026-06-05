# Implementation Plan: PR #8 Code Review Fixes

**Date:** 2026-05-06  
**Related Review:** PR-8-vercel-react-review.md  
**Branch:** `fix/pr-8-code-review-issues`  
**Estimated Time:** 2-3 hours

---

## Overview

This plan addresses performance and code quality issues identified in the PR #8 code review. Issues are prioritized by impact and organized into phases.

---

## Phase 1: Critical Performance Fixes (MUST FIX)

### Task 1.1: Fix Data Fetching Waterfall in ArtifactBrowser

**Priority:** 🔴 Critical  
**File:** `src/features/artifacts/components/ArtifactBrowser.tsx`  
**Estimated Time:** 30 minutes

**Current Problem:**
```tsx
// Sequential fetching creates 300ms+ delay
const artifactsQuery = useArtifacts(projectId);
const effectiveSelectedKey = selectedKey ?? artifactsQuery.data?.[0]?.key ?? null;
const artifactQuery = useArtifact(projectId, effectiveSelectedKey);
```

**Implementation Steps:**

1. Add route loader to prefetch artifacts list
   - **File:** `app/routes/project/$projectId.review.tsx`
   - **Action:** Add `loader` export with `prefetchQuery`
   - **Code:**
   ```tsx
   import { createFileRoute } from "@tanstack/react-router";
   import { ArtifactBrowser } from "@/features/artifacts/components/ArtifactBrowser";
   
   export const Route = createFileRoute("/project/$projectId/review")({
     component: ReviewComponent,
     loader: async ({ params, context }) => {
       const queryClient = context.queryClient;
       await queryClient.prefetchQuery({
         queryKey: ["artifacts", params.projectId],
         queryFn: () => $listArtifacts({ data: { projectId: params.projectId } }),
       });
     },
   });
   
   function ReviewComponent() {
     const { projectId } = Route.useParams();
     return <ArtifactBrowser projectId={projectId} />;
   }
   ```

2. Prefetch first artifact in parallel
   - **File:** `src/features/artifacts/components/ArtifactBrowser.tsx`
   - **Action:** Add parallel query for common first artifact
   - **Code:**
   ```tsx
   export function ArtifactBrowser({ projectId }: ArtifactBrowserProps) {
     const artifactsQuery = useArtifacts(projectId);
     const [selectedKey, setSelectedKey] = useState<string | null>(null);
     const [copied, setCopied] = useState(false);
   
     // Prefetch business-requirements (always first in seed data)
     const firstArtifactQuery = useArtifact(projectId, "business-requirements");
   
     const effectiveSelectedKey =
       selectedKey ?? artifactsQuery.data?.[0]?.key ?? null;
   
     const customArtifactQuery = useArtifact(
       projectId, 
       effectiveSelectedKey !== "business-requirements" ? effectiveSelectedKey : null
     );
   
     // Use prefetched if it matches, otherwise use custom query
     const selectedArtifact =
       effectiveSelectedKey === "business-requirements"
         ? firstArtifactQuery.data
         : customArtifactQuery.data;
     
     // ... rest of component
   }
   ```

**Testing:**
- [ ] Open DevTools Network tab
- [ ] Navigate to review mode
- [ ] Verify artifacts list and first artifact load in parallel
- [ ] Measure time to first render (should be ~300ms faster)

**Success Criteria:**
- Artifacts list and first artifact fetch start simultaneously
- No waterfall visible in Network tab
- Component renders first artifact without waiting

---

### Task 1.2: Optimize Dashboard ProjectList Callback

**Priority:** 🔴 Critical  
**File:** `app/routes/dashboard.tsx`  
**Estimated Time:** 15 minutes

**Current Problem:**
```tsx
// Inline function creates new reference every render
<ProjectList
  onProjectClick={(project) => {
    navigate({ to: "/project/$projectId/build", params: { projectId: project.id } });
  }}
/>
```

**Implementation Steps:**

1. Import useCallback hook
   - **Action:** Add to imports from "react"

2. Wrap callback in useCallback
   - **Code:**
   ```tsx
   import { createFileRoute, useNavigate } from "@tanstack/react-router";
   import { useCallback, useState } from "react";
   import { LeftRail } from "../../src/components/left-rail";
   import { CreateProjectFlow } from "../../src/features/projects/components/CreateProjectFlow";
   import { ProjectList } from "../../src/features/projects/components/ProjectList";
   
   export const Route = createFileRoute("/dashboard")({
     component: DashboardComponent,
   });
   
   function DashboardComponent() {
     const [createOpen, setCreateOpen] = useState(false);
     const navigate = useNavigate();
   
     const handleProjectClick = useCallback((project: { id: string }) => {
       navigate({
         to: "/project/$projectId/build",
         params: { projectId: project.id },
       });
     }, [navigate]);
   
     return (
       <div className="grid grid-cols-[var(--left-rail-width)_1fr] h-screen min-h-[760px]">
         <LeftRail onNewProject={() => setCreateOpen(true)} />
         <main className="flex flex-col bg-page overflow-hidden">
           <ProjectList onProjectClick={handleProjectClick} />
         </main>
         <CreateProjectFlow
           open={createOpen}
           onClose={() => setCreateOpen(false)}
           onCreated={() => setCreateOpen(false)}
         />
       </div>
     );
   }
   ```

**Testing:**
- [ ] Add React DevTools Profiler
- [ ] Click on a project
- [ ] Verify ProjectList doesn't re-render when parent re-renders
- [ ] Check no performance warnings in console

**Success Criteria:**
- ProjectList component wrapped in React.memo doesn't re-render
- Callback reference stays stable across renders
- Navigation still works correctly

---

### Task 1.3: Refactor Duplicated JSX in ArtifactBrowser

**Priority:** 🔴 Critical  
**File:** `src/features/artifacts/components/ArtifactBrowser.tsx`  
**Estimated Time:** 20 minutes

**Current Problem:**
```tsx
// Grid container duplicated in 3 places
if (artifactsQuery.isLoading) {
  return <div className="grid grid-cols-[320px_1fr] flex-1...">{/* ... */}</div>;
}
if (!artifactsQuery.data || artifactsQuery.data.length === 0) {
  return <div className="grid grid-cols-[320px_1fr] flex-1...">{/* ... */}</div>;
}
return <div className="grid grid-cols-[320px_1fr] flex-1...">{/* ... */}</div>;
```

**Implementation Steps:**

1. Extract grid container className to constant
   - **Code:**
   ```tsx
   const GRID_CONTAINER_CLASS = "grid grid-cols-[320px_1fr] flex-1 min-h-0 border-t border-border-1 mt-6";
   const EMPTY_STATE_CLASS = "flex items-center justify-center text-fg-4 font-mono text-[12px]";
   const LEFT_PANEL_CLASS = "flex items-center justify-center text-fg-4 font-mono text-[12px] bg-sunken border-r border-border-1";
   ```

2. Refactor to single return with conditional content
   - **Code:**
   ```tsx
   export function ArtifactBrowser({ projectId }: ArtifactBrowserProps) {
     // ... hooks and state ...
   
     // Determine content based on state
     let content: React.ReactNode;
   
     if (artifactsQuery.isLoading) {
       content = (
         <div className={LEFT_PANEL_CLASS}>
           Loading artifacts…
         </div>
       );
     } else if (!artifactsQuery.data || artifactsQuery.data.length === 0) {
       content = (
         <>
           <div className={LEFT_PANEL_CLASS}>
             No artifacts yet
           </div>
           <div className={EMPTY_STATE_CLASS}>
             Complete a planning step to generate your first artifact.
           </div>
         </>
       );
     } else {
       content = (
         <>
           <DocList
             groups={groups}
             activeDoc={effectiveSelectedKey ?? undefined}
             onDocClick={setSelectedKey}
           />
           {selectedArtifact ? (
             <CodePreview
               filePath={`artifacts / ${selectedArtifact.key}`}
               fileName={selectedArtifact.label}
               streaming={selectedArtifact.status === "generating"}
               stageName="Planning Artifacts"
               stageColor="var(--bot-2)"
               version="v1"
               lastEdited={formatLastEdited(selectedArtifact.generatedAt)}
               fileSize={`${(selectedArtifact.content.length / 1024).toFixed(1)} KB`}
               sourceCode={selectedArtifact.content}
               onDownload={() => downloadArtifact(selectedArtifact)}
               onCopy={() => handleCopy(selectedArtifact)}
               copyButtonLabel={copied ? "Copied!" : "Copy"}
             />
           ) : (
             <div className={EMPTY_STATE_CLASS}>
               select a document
             </div>
           )}
         </>
       );
     }
   
     return <div className={GRID_CONTAINER_CLASS}>{content}</div>;
   }
   ```

**Testing:**
- [ ] Test loading state appears correctly
- [ ] Test empty state shows both messages
- [ ] Test artifact list renders normally
- [ ] Visual regression check - layout unchanged

**Success Criteria:**
- Single grid container in return statement
- No layout or style changes visible
- Reduced bundle size by ~200 bytes
- Code is more maintainable

---

## Phase 2: Medium Priority Fixes (SHOULD FIX)

### Task 2.1: Add Timeout Cleanup for Copy Handler

**Priority:** 🟡 Medium  
**File:** `src/features/artifacts/components/ArtifactBrowser.tsx`  
**Estimated Time:** 15 minutes

**Current Problem:**
```tsx
// setTimeout not cleaned up - can cause setState on unmounted component
const handleCopy = (artifact) => {
  setCopied(true);
  setTimeout(() => setCopied(false), 1500);
};
```

**Implementation Steps:**

1. Add useRef for timeout tracking
   - **Code:**
   ```tsx
   import { useCallback, useEffect, useMemo, useRef, useState } from "react";
   
   export function ArtifactBrowser({ projectId }: ArtifactBrowserProps) {
     const artifactsQuery = useArtifacts(projectId);
     const [selectedKey, setSelectedKey] = useState<string | null>(null);
     const [copied, setCopied] = useState(false);
     const copyTimeoutRef = useRef<NodeJS.Timeout>();
     
     // ... rest of state
   ```

2. Update handleCopy to clear existing timeout
   - **Code:**
   ```tsx
   const handleCopy = useCallback((artifact: typeof artifactQuery.data) => {
     if (!artifact) return;
     
     // Clear any existing timeout
     if (copyTimeoutRef.current) {
       clearTimeout(copyTimeoutRef.current);
     }
     
     navigator.clipboard.writeText(artifact.content);
     setCopied(true);
     
     copyTimeoutRef.current = setTimeout(() => {
       setCopied(false);
     }, 1500);
   }, []);
   ```

3. Add cleanup effect
   - **Code:**
   ```tsx
   // Cleanup timeout on unmount
   useEffect(() => {
     return () => {
       if (copyTimeoutRef.current) {
         clearTimeout(copyTimeoutRef.current);
       }
     };
   }, []);
   ```

**Testing:**
- [ ] Copy artifact content
- [ ] Navigate away before 1.5 seconds
- [ ] Check console for setState warnings (should be none)
- [ ] Copy, wait for "Copied!" to disappear
- [ ] Copy again immediately (should work correctly)

**Success Criteria:**
- No console warnings when navigating during timeout
- Timeout is cleared on unmount
- Multiple rapid copies work correctly

---

### Task 2.2: Remove Non-null Assertion in useArtifact Hook

**Priority:** 🟡 Medium  
**File:** `src/features/artifacts/hooks.ts`  
**Estimated Time:** 10 minutes

**Current Problem:**
```tsx
// Non-null assertion relies on enabled guard
queryFn: () => $getArtifact({ data: { projectId, key: key! } }),
```

**Implementation Steps:**

1. Add explicit null check in queryFn
   - **Code:**
   ```tsx
   export function useArtifact(projectId: string, key: string | null) {
     return useQuery({
       queryKey: ["artifact", projectId, key],
       queryFn: () => {
         if (!key) {
           throw new Error("Artifact key is required for fetching");
         }
         return $getArtifact({ data: { projectId, key } });
       },
       enabled: !!key,
     });
   }
   ```

**Testing:**
- [ ] Run `pnpm tsc --noEmit` - no type errors
- [ ] Load artifacts in review mode
- [ ] Switch between artifacts
- [ ] Check no errors in console

**Success Criteria:**
- No TypeScript errors
- No non-null assertions in code
- Runtime behavior unchanged
- Type safety improved

---

## Phase 3: Minor Improvements (NICE TO HAVE)

### Task 3.1: Extract Date Formatting Helpers

**Priority:** 🟢 Low  
**File:** `src/features/artifacts/components/ArtifactBrowser.tsx`  
**Estimated Time:** 15 minutes

**Implementation Steps:**

1. Create formatting utility functions
   - **File:** `src/features/artifacts/utils/formatters.ts`
   - **Code:**
   ```tsx
   export function formatTime(isoString: string): string {
     return new Date(isoString).toLocaleTimeString("en-US", {
       hour: "numeric",
       minute: "2-digit",
     });
   }
   
   export function formatLastEdited(isoString: string): string {
     return new Date(isoString).toLocaleString("en-US", {
       month: "short",
       day: "numeric",
       hour: "numeric",
       minute: "2-digit",
     });
   }
   
   export function formatSize(bytes: number): string {
     return `${(bytes / 1024).toFixed(1)} KB`;
   }
   ```

2. Update ArtifactBrowser to use helpers
   - **Code:**
   ```tsx
   import { formatLastEdited, formatSize, formatTime } from "../utils/formatters";
   
   // In useMemo for groups
   const artifactDocs = artifacts.map((artifact) => ({
     name: artifact.key,
     streaming: artifact.status === "generating",
     version: "v1",
     time: formatTime(artifact.generatedAt),
     size: formatSize(artifact.content.length),
     stageColor: PLANNING_STAGE_COLOR,
   }));
   
   // In CodePreview
   lastEdited={formatLastEdited(selectedArtifact.generatedAt)}
   fileSize={formatSize(selectedArtifact.content.length)}
   ```

3. Add tests for formatters
   - **File:** `src/features/artifacts/utils/formatters.test.ts`
   - **Code:**
   ```tsx
   import { describe, expect, it } from "vitest";
   import { formatLastEdited, formatSize, formatTime } from "./formatters";
   
   describe("formatters", () => {
     it("formatTime returns short time format", () => {
       const result = formatTime("2026-05-06T14:30:00Z");
       expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
     });
   
     it("formatLastEdited returns date with time", () => {
       const result = formatLastEdited("2026-05-06T14:30:00Z");
       expect(result).toContain("May");
       expect(result).toContain("6");
     });
   
     it("formatSize converts bytes to KB", () => {
       expect(formatSize(1024)).toBe("1.0 KB");
       expect(formatSize(2560)).toBe("2.5 KB");
     });
   });
   ```

**Testing:**
- [ ] Run `pnpm test --run`
- [ ] Visual check - dates/sizes display correctly
- [ ] No rendering changes

**Success Criteria:**
- Formatting logic extracted and testable
- Tests pass
- No visual changes
- Code is more maintainable

---

### Task 3.2: Extract Magic Strings to Constants

**Priority:** 🟢 Low  
**Files:** 
- `src/features/artifacts/components/ArtifactBrowser.tsx`
- `src/components/doc-browser/CodePreview.tsx`
**Estimated Time:** 10 minutes

**Implementation Steps:**

1. Create constants file
   - **File:** `src/features/artifacts/constants.ts`
   - **Code:**
   ```tsx
   export const PLANNING_STAGE_COLOR = "var(--bot-2)";
   export const PLANNING_STAGE_NAME = "Planning Artifacts";
   export const ARTIFACT_VERSION = "v1";
   ```

2. Update ArtifactBrowser imports and usage
   - **Code:**
   ```tsx
   import { ARTIFACT_VERSION, PLANNING_STAGE_COLOR, PLANNING_STAGE_NAME } from "../constants";
   
   // In groups mapping
   stageColor: PLANNING_STAGE_COLOR,
   version: ARTIFACT_VERSION,
   
   // In CodePreview
   stageName={PLANNING_STAGE_NAME}
   stageColor={PLANNING_STAGE_COLOR}
   version={ARTIFACT_VERSION}
   ```

**Testing:**
- [ ] Visual check - no changes in UI
- [ ] Run `pnpm tsc --noEmit`
- [ ] Test all artifact views

**Success Criteria:**
- No magic strings in components
- Constants are reusable
- No visual changes

---

### Task 3.3: Add Accessibility Labels

**Priority:** 🟢 Low  
**File:** `src/components/doc-browser/CodePreview.tsx`  
**Estimated Time:** 5 minutes

**Implementation Steps:**

1. Add aria-label to copy button
   - **Code:**
   ```tsx
   <button
     type="button"
     onClick={onCopy}
     aria-label={copyButtonLabel === "Copied!" ? "Copied to clipboard" : "Copy to clipboard"}
     className="text-[12px] text-fg-2 px-[10px] py-[5px] bg-surface border border-border-2 rounded-sm cursor-pointer font-sans hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms]"
   >
     {copyButtonLabel}
   </button>
   ```

**Testing:**
- [ ] Test with screen reader (if available)
- [ ] Check with axe DevTools
- [ ] Verify aria-label changes with button state

**Success Criteria:**
- Copy button has descriptive aria-label
- Label reflects current state (Copy vs Copied)
- No a11y warnings in DevTools

---

## Phase 4: Optional Optimizations

### Task 4.1: Optimize Seed Data Bundle Size

**Priority:** ⚪ Optional  
**File:** `src/features/artifacts/store.ts`  
**Estimated Time:** 30 minutes

**Note:** This is optional as the store runs server-side and seed data isn't included in client bundle.

**Implementation Steps:**

1. Add `"server-only"` directive
   - **Code:**
   ```tsx
   "server-only";
   
   import type { Artifact } from "./types";
   
   const artifactStore = new Map<string, Map<string, Artifact>>();
   // ... rest of code
   ```

2. Verify bundle size
   - **Command:** `pnpm build && pnpm analyze`
   - **Check:** Seed data not in client chunks

**Testing:**
- [ ] Run `pnpm build`
- [ ] Check bundle analyzer
- [ ] Verify store.ts in server chunks only
- [ ] Test artifacts still seed correctly

**Success Criteria:**
- Seed data not in client bundle
- Server functions work correctly
- Bundle size reduced by ~4KB

---

## Testing Checklist (After All Fixes)

### Automated Tests
- [ ] `pnpm tsc --noEmit` - no TypeScript errors
- [ ] `pnpm test --run` - all tests pass (92+)
- [ ] `pnpm biome check` - no lint errors

### Manual Testing
- [ ] Navigate to dashboard
- [ ] Click on a project - goes to build mode
- [ ] Switch to review mode
- [ ] Verify artifacts list loads quickly
- [ ] Select different artifacts
- [ ] Copy artifact content
- [ ] Download artifact
- [ ] Navigate away during copy timeout
- [ ] Check Network tab - no waterfalls
- [ ] Open React DevTools Profiler
- [ ] Verify no unnecessary re-renders

### Performance Testing
- [ ] Measure time to first artifact render
- [ ] Compare before/after Network waterfall
- [ ] Check bundle size difference
- [ ] Profile with React DevTools

### Accessibility Testing
- [ ] Tab through all interactive elements
- [ ] Test with keyboard navigation
- [ ] Run axe DevTools scan
- [ ] Check screen reader announcements

---

## Implementation Order

**Day 1 (Critical Fixes - 1.5 hours):**
1. Task 1.2: Dashboard callback optimization (15 min)
2. Task 1.3: Refactor duplicated JSX (20 min)
3. Task 1.1: Fix data fetching waterfall (30 min)
4. Task 2.2: Remove non-null assertion (10 min)
5. Testing critical fixes (15 min)

**Day 2 (Medium & Minor Fixes - 1 hour):**
1. Task 2.1: Add timeout cleanup (15 min)
2. Task 3.1: Extract formatters (15 min)
3. Task 3.2: Extract constants (10 min)
4. Task 3.3: Add a11y labels (5 min)
5. Final testing (15 min)

**Optional (If Time Permits):**
1. Task 4.1: Bundle optimization (30 min)

---

## Success Metrics

### Performance Improvements
- **Target:** 300ms faster initial load in review mode
- **Measure:** Chrome DevTools Performance tab
- **Before:** ~800ms to first artifact
- **After:** ~500ms to first artifact

### Code Quality
- **Target:** No console warnings
- **Target:** No unnecessary re-renders
- **Target:** 95+ tests passing

### Bundle Size
- **Target:** No increase (or slight decrease)
- **Measure:** `pnpm build && du -sh .output`

---

## Rollback Plan

If issues arise:
1. Each task is in a separate commit
2. Git revert specific commits if needed
3. Branch protection - requires passing tests
4. Can cherry-pick safe fixes

---

## Documentation Updates

After implementation:
- [ ] Update PR description with performance improvements
- [ ] Add comment on PR #8 with fixes applied
- [ ] Update CHANGELOG.md with optimization notes
- [ ] Consider adding performance testing guide

---

**Created:** 2026-05-06  
**Estimated Total Time:** 2-3 hours  
**Priority:** Complete Phase 1 before merging PR #8
