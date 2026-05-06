export interface ChattedPillProps {
  count: number;
  onClick?: () => void;
}

export function ChattedPill({ count, onClick }: ChattedPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 font-mono text-[10px] px-[10px] py-[3px] rounded-pill border-[1.5px] border-bot-2 bg-bot-2-soft text-bot-2 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:shadow-focus"
    >
      <span>💬</span>
      <span>chatted · {count} msgs</span>
      <span className="text-fg-3">· view</span>
    </button>
  );
}
