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
 * - Full-screen modal (max-w-3xl, 80vh)
 * - Header: filename, stage info, creation time
 * - Content: preformatted YAML/code
 * - Scrollable content area
 */

import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Artifact } from "./types";

interface ArtifactDialogProps {
  artifact: Artifact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtifactDialog({
  artifact,
  open,
  onOpenChange,
}: ArtifactDialogProps) {
  if (!artifact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {artifact.name}
          </DialogTitle>
          <div className="font-mono text-xs text-fg-4">
            Stage {artifact.stage} · {artifact.stageName} · {artifact.createdAt}
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <pre className="text-xs font-mono text-fg-1 bg-sunken p-4 rounded-md border border-border-1">
            {artifact.content}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
