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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-page border border-border-1 rounded-lg shadow-xl w-[600px] max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-1">
          <span className="text-sm font-medium text-fg-1">
            {step === "path-select" ? "New project" : "Name your project"}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="text-xs text-fg-3 hover:text-fg-1 transition-colors"
          >
            Cancel
          </button>
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
                className="text-sm border border-border-1 rounded-md px-3 py-2 bg-surface text-fg-1 placeholder:text-fg-4 focus:outline-none focus:border-border-2"
                autoFocus
              />
              {nameError && <p className="text-xs text-fg-3">{nameError}</p>}
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
    </div>
  );
}
