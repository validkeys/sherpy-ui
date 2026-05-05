import { FileText } from "lucide-react"

export interface ArtifactPillProps {
  name: string
  version: string
  size: string
}

export function ArtifactPill({ name, version, size }: ArtifactPillProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 border border-border-2 rounded-sm bg-surface font-mono text-[12px] text-fg-1 cursor-pointer shadow-xs mt-1.5 self-start hover:border-border-emph transition-colors">
      <FileText size={13} strokeWidth={1.5} className="text-fg-3 shrink-0" />
      <span>{name}</span>
      <span className="text-fg-4">{version} · {size}</span>
      <span className="w-[5px] h-[5px] rounded-full bg-accent animate-pulse shrink-0" />
    </div>
  )
}
