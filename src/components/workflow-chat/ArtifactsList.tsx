/**
 * ArtifactsList - Sidebar list of workflow artifacts
 *
 * Usage:
 *   <ArtifactsList artifacts={artifacts} />
 *
 * Features:
 * - Shows all potential artifacts (pending + created)
 * - Created artifacts: clickable, full opacity, bg-surface
 * - Pending artifacts: disabled, 50% opacity, bg-sunken
 * - Opens ArtifactDialog when clicking created artifact
 * - File icon + name + stage metadata
 *
 * Artifact status:
 * - "created": Has content, clickable to view
 * - "pending": Not yet generated, visual placeholder
 */

import { FileText } from "lucide-react";
import type { Artifact } from "./types";

interface ArtifactsListProps {
  artifacts: Artifact[];
  onArtifactClick: (artifactId: string) => void;
}

export function ArtifactsList({
  artifacts,
  onArtifactClick,
}: ArtifactsListProps) {
  return (
    <div className="flex flex-col gap-1.5 p-4">
      {artifacts.map((artifact) => {
        const isCreated = artifact.status === "created";

        return (
          <button
            key={artifact.id}
            type="button"
            onClick={() => isCreated && onArtifactClick(artifact.id)}
            disabled={!isCreated}
            className={`flex flex-col gap-1 p-2.5 border rounded-sm text-left transition-colors ${
              isCreated
                ? "border-border-1 bg-surface hover:border-fg-1 cursor-pointer"
                : "border-border-1 bg-sunken cursor-default opacity-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText
                className={`w-3 h-3 ${isCreated ? "text-fg-3" : "text-fg-4"}`}
              />
              <span
                className={`font-mono text-[11px] tracking-[0.04em] ${
                  isCreated ? "text-fg-1" : "text-fg-4"
                }`}
              >
                {artifact.name}
              </span>
            </div>
            <div className="font-mono text-[10px] text-fg-4 flex items-center gap-1.5 pl-5">
              <span>
                Stage {artifact.stage} · {artifact.stageName}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
