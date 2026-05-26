/**
 * ArtifactDialog - Modal for viewing artifact content
 *
 * Usage:
 *   const [artifact, setArtifact] = useState<Artifact | null>(null);
 *
 *   <ArtifactDialog
 *     artifact={artifact}
 *     open={!!artifact}
 *     onOpenChange={(open) => !open && setArtifact(null)}
 *   />
 *
 * Features:
 * - Full-screen modal with CodePreview design
 * - Header: file path, name, stage info
 * - Action buttons: Copy, Download
 * - Tab navigation: Source
 * - Syntax-highlighted YAML content
 * - Footer: file metadata
 */

import { Copy, Download } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { YamlHighlight } from "@/components/doc-browser/yaml-highlight";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { CreatedArtifact } from "./types";

interface ArtifactDialogProps {
  artifact: CreatedArtifact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtifactDialog({
  artifact,
  open,
  onOpenChange,
}: ArtifactDialogProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleCopy = useCallback(() => {
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
  }, [artifact]);

  const handleDownload = useCallback(() => {
    if (!artifact) return;

    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.name}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [artifact]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  if (!artifact) return null;

  const fileSize = `${(artifact.content.length / 1024).toFixed(1)} KB`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[1200px] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">
          {artifact.name} - {artifact.stageName}
        </DialogTitle>
        <div className="flex flex-col min-w-0 bg-page overflow-hidden flex-1">
          {/* Header */}
          <div className="flex items-start gap-3 px-[22px] py-[14px] border-b border-border-1 flex-shrink-0">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <span className="font-mono text-[11px] text-fg-3 tracking-[0.02em]">
                {`artifacts / ${artifact.stageName} / ${artifact.name}`}
              </span>
              <span className="flex items-center gap-[10px] text-[16px] font-medium tracking-[-0.01em] text-fg-1">
                {artifact.stageName}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-[2px] px-[22px] border-b border-border-1 flex-shrink-0">
            <button
              type="button"
              className="font-mono text-[11px] tracking-[0.04em] px-[10px] py-2 cursor-pointer border-b-2 -mb-px transition-colors duration-[140ms] text-fg-1 border-border-emph"
            >
              Source
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <YamlHighlight code={artifact.content} />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-[22px] py-[10px] border-t border-border-1 bg-surface flex-shrink-0">
            <span className="font-mono text-[10px] text-fg-4 mr-auto">
              {fileSize} · v1 · auto-saved · {artifact.createdAt}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="w-7 h-7 flex items-center justify-center bg-surface border border-border-2 rounded-sm cursor-pointer text-fg-3 hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms]"
              aria-label={copied ? "Copied!" : "Copy"}
            >
              <Copy size={13} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="w-7 h-7 flex items-center justify-center bg-surface border border-border-2 rounded-sm cursor-pointer text-fg-3 hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms]"
              aria-label="Download"
            >
              <Download size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
