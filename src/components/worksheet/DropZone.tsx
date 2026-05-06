import { cn } from "@/lib/utils";

export type DropZoneVariant = "idle" | "dragover" | "uploading";

export interface DropZoneProps {
  variant?: DropZoneVariant;
}

export function DropZone({ variant = "idle" }: DropZoneProps) {
  const isDragover = variant === "dragover";
  const isUploading = variant === "uploading";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 p-6 rounded-[10px] text-center",
        "border-2 border-dashed transition-colors duration-150",
        isDragover ? "border-border-emph bg-surface" : "border-fg-4 bg-sunken",
        isUploading && "border-bot-2 bg-bot-2-soft",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "text-[36px] leading-none opacity-60 select-none",
          isUploading && "animate-spin",
        )}
      >
        {isUploading ? "↻" : "↓"}
      </div>

      <div className="font-serif text-[20px] text-fg-1 tracking-[-0.01em]">
        {isUploading ? "Uploading…" : "Drop the filled worksheet here"}
      </div>

      {!isUploading && (
        <>
          <p className="text-[12px] text-fg-3 max-w-[360px] leading-snug m-0">
            Markdown, Word, or paste from Confluence. Sherpy will merge the
            answers row-by-row and flag anything that still needs your eyes.
          </p>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              className="bg-inverse text-fg-on-inverse border-0 rounded-[5px] px-3.5 py-[7px] text-[12.5px] font-medium cursor-pointer focus-visible:outline-none focus-visible:shadow-focus"
            >
              Choose file…
            </button>
            <button
              type="button"
              className="bg-surface text-fg-1 border border-border-2 rounded-[5px] px-3 py-[6px] text-[12.5px] cursor-pointer focus-visible:outline-none focus-visible:shadow-focus"
            >
              Paste text
            </button>
          </div>
        </>
      )}
    </div>
  );
}
