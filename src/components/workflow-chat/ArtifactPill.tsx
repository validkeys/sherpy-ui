/**
 * ArtifactPill - Clickable badge for generated artifacts
 *
 * Usage:
 *   <ArtifactPill
 *     name="business-requirements.yaml"
 *     onClick={() => setDialogOpen(true)}
 *   />
 *
 * Displays:
 * - File icon
 * - Artifact filename
 * - "YAML" type indicator
 * - Hover state with border highlight
 */

import { FileText } from "lucide-react";

interface ArtifactPillProps {
  name: string;
  onClick: () => void;
  disabled?: boolean;
}

export function ArtifactPill({
  name,
  onClick,
  disabled = false,
}: ArtifactPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={
        disabled
          ? `Artifact ${name} is not available yet`
          : `Open artifact ${name}`
      }
      className="inline-flex items-center gap-2 px-3 py-2 border border-border-2 rounded-sm bg-surface font-mono text-xs text-fg-1 hover:border-fg-1 transition-colors shadow-xs mt-1.5 disabled:cursor-default disabled:opacity-50 disabled:hover:border-border-2"
    >
      <FileText className="w-3.5 h-3.5" />
      <span className="text-fg-1">{name}</span>
      <span className="text-fg-4 ml-1">·</span>
      <span className="text-fg-4">YAML</span>
    </button>
  );
}
