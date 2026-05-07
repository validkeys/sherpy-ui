import { Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { YamlHighlight } from "./yaml-highlight";

type Tab = "Source" | "Outline" | "Diff" | "Gaps";

interface CodePreviewProps {
  filePath: string;
  fileName: string;
  streaming?: boolean;
  stageName: string;
  stageColor: string;
  version: string;
  lastEdited: string;
  fileSize: string;
  sha?: string;
  gapCount?: number;
  diffLabel?: string;
  sourceCode: string;
  onDownload?: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
  onRefine?: () => void;
  copyButtonLabel?: string;
}

const TABS: Tab[] = ["Source", "Outline", "Diff", "Gaps"];

export function CodePreview({
  filePath,
  fileName,
  streaming,
  stageName,
  stageColor,
  version,
  lastEdited,
  fileSize,
  sha,
  gapCount = 0,
  diffLabel,
  sourceCode,
  onDownload,
  onCopy,
  onEdit,
  onRefine,
  copyButtonLabel = "Copy",
}: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Source");

  const TAB_CONTENT: Record<Tab, React.ReactNode> = {
    Source: <YamlHighlight code={sourceCode} />,
    Outline: (
      <div className="flex-1 flex items-center justify-center text-fg-4 font-mono text-[12px]">
        outline view
      </div>
    ),
    Diff: (
      <div className="flex-1 flex items-center justify-center text-fg-4 font-mono text-[12px]">
        diff view
      </div>
    ),
    Gaps: (
      <div className="flex-1 flex items-center justify-center text-fg-4 font-mono text-[12px]">
        {gapCount > 0
          ? `${gapCount} gap${gapCount !== 1 ? "s" : ""}`
          : "no gaps"}
      </div>
    ),
  };

  function tabLabel(tab: Tab): string {
    if (tab === "Diff" && diffLabel) return `Diff · ${diffLabel}`;
    if (tab === "Gaps" && gapCount > 0) return `Gaps · ${gapCount}`;
    return tab;
  }

  return (
    <div className="flex flex-col min-w-0 bg-page overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-[22px] py-[14px] border-b border-border-1 flex-shrink-0">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="font-mono text-[11px] text-fg-3 tracking-[0.02em]">
            {filePath}
          </span>
          <span className="flex items-center gap-[10px] text-[16px] font-medium tracking-[-0.01em] text-fg-1">
            {fileName}
            {streaming && (
              <span className="inline-flex items-center gap-[5px] font-mono text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-accent-soft text-accent uppercase tracking-[0.04em]">
                <span className="w-[5px] h-[5px] rounded-full bg-accent animate-pulse" />
                streaming
              </span>
            )}
          </span>
          <span className="flex items-center gap-[6px] font-mono text-[11px] text-fg-3">
            <span
              className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-[--stage-color]"
              style={{ "--stage-color": stageColor } as React.CSSProperties}
            />
            {stageName}
          </span>
        </div>
        <div className="flex items-center gap-[6px] flex-shrink-0">
          <button
            type="button"
            className="text-[12px] text-fg-2 px-[10px] py-[5px] bg-surface border border-border-2 rounded-sm cursor-pointer font-sans hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms]"
          >
            View diff
          </button>
          {onRefine && (
            <button
              type="button"
              onClick={onRefine}
              className="text-[12px] text-fg-2 px-[10px] py-[5px] bg-surface border border-border-2 rounded-sm cursor-pointer font-sans hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms]"
            >
              Refine
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="text-[12px] text-fg-2 px-[10px] py-[5px] bg-surface border border-border-2 rounded-sm cursor-pointer font-sans hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms]"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="text-[12px] text-fg-2 px-[10px] py-[5px] bg-surface border border-border-2 rounded-sm cursor-pointer font-sans hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms]"
          >
            {copyButtonLabel}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="text-[12px] text-fg-2 px-[10px] py-[5px] bg-surface border border-border-2 rounded-sm cursor-pointer font-sans hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms]"
          >
            Download
          </button>
          <button
            type="button"
            className="text-[12px] font-medium px-[10px] py-[5px] bg-inverse text-fg-on-inverse border-none rounded-sm cursor-pointer font-sans"
          >
            Promote
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-[2px] px-[22px] border-b border-border-1 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "font-mono text-[11px] tracking-[0.04em] px-[10px] py-2 cursor-pointer border-b-2 -mb-px transition-colors duration-[140ms]",
              activeTab === tab
                ? "text-fg-1 border-border-emph"
                : "text-fg-3 border-transparent hover:text-fg-1",
            )}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {TAB_CONTENT[activeTab]}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-[22px] py-[10px] border-t border-border-1 bg-surface flex-shrink-0">
        <span className="font-mono text-[10px] text-fg-4 mr-auto">
          {fileSize} · {version} · auto-saved{sha ? ` · sha ${sha}` : ""} ·{" "}
          {lastEdited}
        </span>
        <button
          type="button"
          className="text-[12px] text-fg-2 px-[10px] py-[5px] bg-surface border border-border-2 rounded-sm cursor-pointer font-sans hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms]"
        >
          Copy path
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="w-7 h-7 flex items-center justify-center bg-surface border border-border-2 rounded-sm cursor-pointer text-fg-3 hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms]"
          aria-label="Download"
        >
          <Download size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
