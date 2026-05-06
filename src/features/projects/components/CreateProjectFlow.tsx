import { Dialog } from "@base-ui/react/dialog";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Intake } from "@/components/intake/Intake";
import { PathCard } from "@/components/intake/PathCard";
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
  const navigate = useNavigate();

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
          navigate({
            to: "/project/$projectId/build",
            params: { projectId: project.id },
          });
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
                  <button
                    type="button"
                    onClick={() => setStep("path-select")}
                    className="text-xs text-fg-3 hover:text-fg-1 px-3 py-1.5 rounded transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="text-xs bg-fg-1 text-bg px-3 py-1.5 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isPending ? "Creating…" : "Create project"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
