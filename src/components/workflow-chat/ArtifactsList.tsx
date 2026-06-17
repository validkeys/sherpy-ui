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
import { useCallback } from "react";
import type { Artifact } from "./types";

interface ArtifactsListProps {
  artifacts: Artifact[];
  onArtifactClick: (artifactId: string) => void;
}

export function ArtifactsList({
  artifacts,
  onArtifactClick,
}: ArtifactsListProps) {
  const handleClick = useCallback(
    (artifactId: string, isViewable: boolean) => {
      if (isViewable) {
        onArtifactClick(artifactId);
      }
    },
    [onArtifactClick],
  );

  return (
    <div className="flex flex-col gap-1.5 p-4">
      {artifacts.map((artifact) => {
        const isViewable =
          artifact.status === "created" && artifact.content.trim().length > 0;

        return (
          <button
            key={artifact.id}
            type="button"
            onClick={() => handleClick(artifact.id, isViewable)}
            disabled={!isViewable}
            aria-label={
              isViewable
                ? `Open artifact ${artifact.name} from artifacts`
                : `Artifact ${artifact.name} is not available yet`
            }
            className={`flex flex-col gap-1 p-2.5 border rounded-sm text-left transition-colors ${
              isViewable
                ? "border-border-1 bg-surface hover:border-border-emph cursor-pointer"
                : "border-border-1 bg-sunken cursor-default opacity-80"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText
                className={`w-3 h-3 ${isViewable ? "text-fg-1" : "text-fg-2"}`}
              />
              <span
                className={`font-mono text-[11px] tracking-[0.04em] ${
                  isViewable ? "text-fg-1" : "text-fg-2"
                }`}
              >
                {artifact.name}
              </span>
            </div>
            <div
              className={`font-mono text-[10px] flex items-center gap-1.5 pl-5 ${
                isViewable ? "text-fg-1" : "text-fg-2"
              }`}
            >
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
