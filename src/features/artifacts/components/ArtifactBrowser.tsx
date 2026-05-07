import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodePreview } from "@/components/doc-browser/CodePreview";
import { type DocGroup, DocList } from "@/components/doc-browser/DocList";
import { $refineArtifact } from "@/features/ai/server";
import { useArtifact, useArtifacts, useUpdateArtifact } from "../hooks";
import { downloadArtifact } from "../utils/download";
import { RefinementComposer } from "./RefinementComposer";

interface ArtifactBrowserProps {
  projectId: string;
}

const GRID_CONTAINER_CLASS =
  "grid grid-cols-[320px_1fr] flex-1 min-h-0 border-t border-border-1 mt-6";
const EMPTY_STATE_CLASS =
  "flex items-center justify-center text-fg-4 font-mono text-[12px]";
const LEFT_PANEL_CLASS =
  "flex items-center justify-center text-fg-4 font-mono text-[12px] bg-sunken border-r border-border-1";

export function ArtifactBrowser({ projectId }: ArtifactBrowserProps) {
  const artifactsQuery = useArtifacts(projectId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [refineMode, setRefineMode] = useState(false);

  // Prefetch business-requirements (always first in seed data)
  const firstArtifactQuery = useArtifact(projectId, "business-requirements");

  // Auto-select first artifact
  const effectiveSelectedKey =
    selectedKey ?? artifactsQuery.data?.[0]?.key ?? null;

  const customArtifactQuery = useArtifact(
    projectId,
    effectiveSelectedKey !== "business-requirements"
      ? effectiveSelectedKey
      : null,
  );

  // Use prefetched if it matches, otherwise use custom query
  const selectedArtifact =
    effectiveSelectedKey === "business-requirements"
      ? firstArtifactQuery.data
      : customArtifactQuery.data;

  const updateMutation = useUpdateArtifact(
    projectId,
    effectiveSelectedKey ?? "",
  );

  const refineMutation = useMutation({
    mutationFn: async (instruction: string) => {
      if (!effectiveSelectedKey) throw new Error("No artifact selected");
      return await $refineArtifact({
        data: {
          projectId,
          key: effectiveSelectedKey,
          instruction,
        },
      });
    },
    onSuccess: () => {
      setRefineMode(false);
      // Invalidate the artifact query to refetch updated content
      void artifactsQuery.refetch();
    },
  });

  const handleEdit = useCallback(() => {
    if (selectedArtifact) {
      setEditContent(selectedArtifact.content);
      setEditMode(true);
    }
  }, [selectedArtifact]);

  const handleSave = useCallback(() => {
    updateMutation.mutate(editContent, {
      onSuccess: () => {
        setEditMode(false);
      },
    });
  }, [editContent, updateMutation]);

  const handleCancel = useCallback(() => {
    setEditMode(false);
    setEditContent("");
  }, []);

  const handleRefine = useCallback(() => {
    setRefineMode(true);
  }, []);

  const handleRefineSubmit = useCallback(
    (instruction: string) => {
      refineMutation.mutate(instruction);
    },
    [refineMutation],
  );

  const handleRefineCancel = useCallback(() => {
    setRefineMode(false);
  }, []);

  const handleCopy = useCallback((artifact: typeof firstArtifactQuery.data) => {
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const groups: DocGroup[] = useMemo(() => {
    if (!artifactsQuery.data) return [];

    const artifacts = artifactsQuery.data;
    const artifactDocs = artifacts.map((artifact) => ({
      name: artifact.key,
      streaming: artifact.status === "generating",
      version: "v1",
      time: new Date(artifact.generatedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      size: `${(artifact.content.length / 1024).toFixed(1)} KB`,
      stageColor: "var(--bot-2)",
    }));

    return [
      {
        label: "Planning Artifacts",
        stageColor: "var(--bot-2)",
        docs: artifactDocs,
      },
    ];
  }, [artifactsQuery.data]);

  // Determine content based on state
  let content: React.ReactNode;

  if (artifactsQuery.isLoading) {
    content = <div className={LEFT_PANEL_CLASS}>Loading artifacts…</div>;
  } else if (!artifactsQuery.data || artifactsQuery.data.length === 0) {
    content = (
      <>
        <div className={LEFT_PANEL_CLASS}>No artifacts yet</div>
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
          editMode ? (
            <div className="flex flex-col min-w-0 bg-page overflow-hidden">
              {/* Header */}
              <div className="flex items-start gap-3 px-[22px] py-[14px] border-b border-border-1 flex-shrink-0">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="font-mono text-[11px] text-fg-3 tracking-[0.02em]">
                    {`artifacts / ${selectedArtifact.key}`}
                  </span>
                  <span className="flex items-center gap-[10px] text-[16px] font-medium tracking-[-0.01em] text-fg-1">
                    {selectedArtifact.label}
                    <span className="inline-flex items-center gap-[5px] font-mono text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-accent-soft text-accent uppercase tracking-[0.04em]">
                      editing
                    </span>
                  </span>
                  <span className="flex items-center gap-[6px] font-mono text-[11px] text-fg-3">
                    <span
                      className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-[--stage-color]"
                      style={
                        {
                          "--stage-color": "var(--bot-2)",
                        } as React.CSSProperties
                      }
                    />
                    Planning Artifacts
                  </span>
                </div>
                <div className="flex items-center gap-[6px] flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-[12px] text-fg-2 px-[10px] py-[5px] bg-surface border border-border-2 rounded-sm cursor-pointer font-sans hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="text-[12px] font-medium px-[10px] py-[5px] bg-inverse text-fg-on-inverse border-none rounded-sm cursor-pointer font-sans disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              {/* Edit Content */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-[22px]">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 w-full font-mono text-[12px] leading-[1.6] text-fg-1 bg-sunken border border-border-1 rounded p-3 resize-none focus:outline-none focus:border-border-emph"
                  spellCheck={false}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 px-[22px] py-[10px] border-t border-border-1 bg-surface flex-shrink-0">
                <span className="font-mono text-[10px] text-fg-4 mr-auto">
                  {`${(editContent.length / 1024).toFixed(1)} KB`} · v1 ·
                  editing ·{" "}
                  {new Date(selectedArtifact.generatedAt).toLocaleString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    },
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col min-h-0 flex-1">
              <CodePreview
                filePath={`artifacts / ${selectedArtifact.key}`}
                fileName={selectedArtifact.label}
                streaming={selectedArtifact.status === "generating"}
                stageName="Planning Artifacts"
                stageColor="var(--bot-2)"
                version="v1"
                lastEdited={new Date(
                  selectedArtifact.generatedAt,
                ).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                fileSize={`${(selectedArtifact.content.length / 1024).toFixed(1)} KB`}
                sourceCode={selectedArtifact.content}
                onDownload={() => downloadArtifact(selectedArtifact)}
                onCopy={() => handleCopy(selectedArtifact)}
                onEdit={handleEdit}
                onRefine={handleRefine}
                copyButtonLabel={copied ? "Copied!" : "Copy"}
              />
              {refineMode && (
                <RefinementComposer
                  onSubmit={handleRefineSubmit}
                  onCancel={handleRefineCancel}
                  isLoading={refineMutation.isPending}
                />
              )}
            </div>
          )
        ) : (
          <div className={EMPTY_STATE_CLASS}>select a document</div>
        )}
      </>
    );
  }

  return <div className={GRID_CONTAINER_CLASS}>{content}</div>;
}
