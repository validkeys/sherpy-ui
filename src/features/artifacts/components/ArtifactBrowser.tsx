import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodePreview } from "@/components/doc-browser/CodePreview";
import { type DocGroup, DocList } from "@/components/doc-browser/DocList";
import { useArtifact, useArtifacts } from "../hooks";
import { downloadArtifact } from "../utils/download";

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
          <CodePreview
            filePath={`artifacts / ${selectedArtifact.key}`}
            fileName={selectedArtifact.label}
            streaming={selectedArtifact.status === "generating"}
            stageName="Planning Artifacts"
            stageColor="var(--bot-2)"
            version="v1"
            lastEdited={new Date(selectedArtifact.generatedAt).toLocaleString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              },
            )}
            fileSize={`${(selectedArtifact.content.length / 1024).toFixed(1)} KB`}
            sourceCode={selectedArtifact.content}
            onDownload={() => downloadArtifact(selectedArtifact)}
            onCopy={() => handleCopy(selectedArtifact)}
            copyButtonLabel={copied ? "Copied!" : "Copy"}
          />
        ) : (
          <div className={EMPTY_STATE_CLASS}>select a document</div>
        )}
      </>
    );
  }

  return <div className={GRID_CONTAINER_CLASS}>{content}</div>;
}
