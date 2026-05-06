import { useMemo, useState } from "react";
import { CodePreview } from "@/components/doc-browser/CodePreview";
import { type DocGroup, DocList } from "@/components/doc-browser/DocList";
import { useArtifact, useArtifacts } from "../hooks";
import { downloadArtifact } from "../utils/download";

interface ArtifactBrowserProps {
  projectId: string;
}

export function ArtifactBrowser({ projectId }: ArtifactBrowserProps) {
  const artifactsQuery = useArtifacts(projectId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-select first artifact
  const effectiveSelectedKey =
    selectedKey ?? artifactsQuery.data?.[0]?.key ?? null;

  const artifactQuery = useArtifact(projectId, effectiveSelectedKey);

  const handleCopy = (artifact: typeof artifactQuery.data) => {
    if (!artifact) return;
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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

  if (artifactsQuery.isLoading) {
    return (
      <div className="grid grid-cols-[320px_1fr] flex-1 min-h-0 border-t border-border-1 mt-6">
        <div className="flex items-center justify-center text-fg-4 font-mono text-[12px] bg-sunken border-r border-border-1">
          Loading artifacts…
        </div>
      </div>
    );
  }

  if (!artifactsQuery.data || artifactsQuery.data.length === 0) {
    return (
      <div className="grid grid-cols-[320px_1fr] flex-1 min-h-0 border-t border-border-1 mt-6">
        <div className="flex items-center justify-center text-fg-4 font-mono text-[12px] bg-sunken border-r border-border-1">
          No artifacts yet
        </div>
        <div className="flex items-center justify-center text-fg-4 font-mono text-[12px]">
          Complete a planning step to generate your first artifact.
        </div>
      </div>
    );
  }

  const selectedArtifact = artifactQuery.data;

  return (
    <div className="grid grid-cols-[320px_1fr] flex-1 min-h-0 border-t border-border-1 mt-6">
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
        <div className="flex items-center justify-center text-fg-4 font-mono text-[12px]">
          select a document
        </div>
      )}
    </div>
  );
}
