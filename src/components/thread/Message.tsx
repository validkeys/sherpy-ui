import { cn } from "@/lib/utils";

export type MessageWho = "assistant" | "user";

export interface MessageProps {
  who: MessageWho;
  body: string;
  streaming?: boolean;
  current?: boolean;
}

export function Message({
  who,
  body,
  streaming = false,
  current = false,
}: MessageProps) {
  const isAssistant = who === "assistant";
  return (
    <div className={cn("flex gap-2.5 items-start", !current && "opacity-70")}>
      <span
        className={cn(
          "w-6 h-6 rounded-full shrink-0 grid place-items-center font-mono text-[10px]",
          isAssistant
            ? "bg-inverse text-fg-on-inverse"
            : "bg-surface border border-border-2 text-fg-1",
        )}
      >
        {isAssistant ? "S" : "KW"}
      </span>
      <div
        className={cn(
          "flex-1 leading-[1.5] text-fg-1",
          current ? "text-[14px] font-medium" : "text-[12.5px]",
        )}
      >
        {body}
        {streaming && (
          <span className="inline-block w-[6px] h-[12px] ml-[3px] bg-bot-2 align-[-2px] animate-[aside-blink_1s_steps(2)_infinite]" />
        )}
      </div>
    </div>
  );
}
