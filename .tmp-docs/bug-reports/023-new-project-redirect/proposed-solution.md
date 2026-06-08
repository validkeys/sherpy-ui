# BUG-023: Proposed Solution

**Date:** 2026-06-08  
**Status:** 🔧 AWAITING APPROVAL

---

## Problem Summary

**Duplicate navigation calls** when creating a new project:
1. `CreateProjectFlow.tsx` navigates to new project (line 53)
2. `AppLayout.tsx` also navigates to new project (line 22)

This causes a race condition that may redirect users back to the previous project under certain timing conditions.

---

## Recommended Solution

### **Remove duplicate navigation from CreateProjectFlow**

Let the parent component (AppLayout) handle all navigation, following React's "lift state up" pattern.

---

## Implementation

### File 1: `src/features/projects/components/CreateProjectFlow.tsx`

**Change 1: Remove useNavigate import (line 2)**

```diff
  import { Dialog } from "@base-ui/react/dialog";
- import { useNavigate } from "@tanstack/react-router";
  import { useState } from "react";
```

**Change 2: Remove navigate constant (line 29)**

```diff
  const { mutate: createProject, isPending } = useCreateProject();
- const navigate = useNavigate();
```

**Change 3: Remove navigate call from onSuccess (lines 53-56)**

```diff
  createProject(
    { name: name.trim(), entryPath },
    {
      onSuccess: (project) => {
        onCreated?.(project.id);
        handleClose();
-       navigate({
-         to: "/project/$projectId/build",
-         params: { projectId: project.id },
-       });
      },
    },
  );
```

### File 2: `src/components/layouts/AppLayout.tsx`

**No changes needed** - Already correct:

```typescript
onCreated={(newProjectId) => {
  navigate({
    to: "/project/$projectId/build",
    params: { projectId: newProjectId },
  });
  setCreateOpen(false);
}}
```

---

## Complete Modified File

**File:** `src/features/projects/components/CreateProjectFlow.tsx`

```typescript
import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";
import { Intake } from "@/components/intake/Intake";
import { PathCard } from "@/components/intake/PathCard";
import { Button } from "@/components/ui/button";
import { useCreateProject } from "../hooks";
import type { EntryPath } from "../types";

type Step = "path-select" | "name-input";

interface CreateProjectFlowProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}

export function CreateProjectFlow({
  open,
  onClose,
  onCreated,
}: CreateProjectFlowProps) {
  const [step, setStep] = useState<Step>("path-select");
  const [entryPath, setEntryPath] = useState<EntryPath>("scratch");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  const { mutate: createProject, isPending } = useCreateProject();

  function handlePathSelect(path: EntryPath) {
    setEntryPath(path);
    setStep("name-input");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Project name is required");
      return;
    }
    if (name.trim().length > 120) {
      setNameError("Project name must be 120 characters or fewer");
      return;
    }
    setNameError("");
    createProject(
      { name: name.trim(), entryPath },
      {
        onSuccess: (project) => {
          onCreated?.(project.id);
          handleClose();
        },
      },
    );
  }

  function handleClose() {
    setStep("path-select");
    setName("");
    setNameError("");
    onClose();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup
          aria-labelledby="create-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-page border border-border-1 rounded-lg shadow-xl w-[600px] max-h-[90vh] overflow-y-auto flex flex-col pointer-events-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-1">
              <span
                id="create-project-title"
                className="text-sm font-medium text-fg-1"
              >
                {step === "path-select" ? "New project" : "Name your project"}
              </span>
              <Dialog.Close className="text-xs text-fg-3 hover:text-fg-1 transition-colors">
                Cancel
              </Dialog.Close>
            </div>

            {step === "path-select" ? (
              <Intake
                prompt={
                  <p className="text-sm text-fg-2">How do you want to start?</p>
                }
                paths={
                  <>
                    <PathCard
                      title="Start from scratch"
                      subtitle="Answer a few questions to build your project plan step by step."
                      recommended
                      onClick={() => handlePathSelect("scratch")}
                    />
                    <PathCard
                      title="Start with a doc"
                      subtitle="Upload or paste a requirements document and we'll parse it."
                      onClick={() => handlePathSelect("doc-first")}
                    />
                  </>
                }
              />
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="project-name"
                    className="text-xs font-medium text-fg-2"
                  >
                    Project name
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. billing-platform"
                    maxLength={120}
                    className="text-sm border border-border-1 rounded-md px-3 py-2 bg-surface text-fg-1 placeholder:text-fg-4 focus:outline-none focus:border-border-2"
                  />
                  {nameError && (
                    <p className="text-xs text-fg-3">{nameError}</p>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("path-select")}
                  >
                    Back
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending ? "Creating…" : "Create project"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## Benefits

1. **✅ Eliminates race condition** - Only one navigation call
2. **✅ Clearer responsibility** - Parent owns navigation logic
3. **✅ Simpler code** - Fewer imports, less complexity
4. **✅ More maintainable** - One place to update navigation logic
5. **✅ Follows React patterns** - Child emits events, parent decides actions

---

## Testing Checklist

After implementing this fix:

- [ ] Unit tests pass for CreateProjectFlow
- [ ] Unit tests pass for AppLayout
- [ ] E2E: Create new project from dashboard
- [ ] E2E: Create new project while viewing another project
- [ ] E2E: Verify URL changes to new project ID
- [ ] E2E: Verify no double navigation in Network tab
- [ ] E2E: Create multiple projects rapidly
- [ ] Manual: Verify the original bug is fixed

---

## Risk Assessment

**Risk Level:** ⚠️ **LOW**

**Potential Issues:**
- None identified - This removes problematic code without adding new logic

**Rollback Plan:**
- Simple git revert if issues arise
- Original code is fully preserved in git history

---

## Questions Before Approval

1. Are there any other places that call `onCreated` prop and expect CreateProjectFlow to NOT navigate?
2. Are there any tests that specifically assert CreateProjectFlow navigates on its own?
3. Should we add a test to ensure only ONE navigation happens?

---

**Status:** ✅ Ready for approval and implementation
