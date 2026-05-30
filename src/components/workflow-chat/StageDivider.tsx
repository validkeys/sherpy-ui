/**
 * StageDivider - Sticky stage header with push-off behavior
 *
 * Usage:
 *   <StageDivider
 *     stageNumber={2}
 *     stageName="Business Requirements"
 *     stageColor="#8AA89A"
 *   />
 *
 * Features:
 * - Sticky positioning at top of scroll container
 * - Push-off effect: later stages push earlier ones up via z-index
 * - Semi-transparent background with backdrop blur
 * - Horizontal divider lines on both sides
 * - Stage indicator pill with colored dot
 */

interface StageDividerProps {
  stageNumber: number;
  stageName: string;
  stageColor: string;
}

export function StageDivider({
  stageNumber,
  stageName,
  stageColor,
}: StageDividerProps) {
  return (
    <div
      className="sticky top-0 flex items-center gap-3 my-8 px-8 bg-page/95 backdrop-blur-sm"
      style={{ zIndex: stageNumber }}
    >
      <div className="flex-1 h-px bg-border-1" />
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border-1 shadow-sm">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: stageColor }}
        />
        <span className="font-mono text-[10px] text-fg-3 uppercase tracking-wider">
          Stage {stageNumber.toString().padStart(2, "0")}
        </span>
        <span className="text-xs text-fg-1 font-medium">{stageName}</span>
      </div>
      <div className="flex-1 h-px bg-border-1" />
    </div>
  );
}
