import { Activity } from "react";
import { cn } from "@/lib/utils";

export interface AskbackMsg {
  who: "user" | "assistant";
  body: string;
  streaming?: boolean;
}

export interface AskbackAsideProps {
  open: boolean;
  messages: AskbackMsg[];
  onClose?: () => void;
}

export function AskbackAside({ open, messages, onClose }: AskbackAsideProps) {
  return (
    <Activity mode={open ? "visible" : "hidden"}>
      <div
        className={cn(
          "border-[1.5px] border-bot-2 rounded-[8px] bg-bot-2-soft",
          "px-3 py-2.5 flex flex-col gap-2",
        )}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] text-bot-2 tracking-[0.06em] uppercase">
            Aside · discussing options
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] text-fg-3 cursor-pointer bg-transparent border-none p-0 hover:text-fg-1"
          >
            close × · resume
          </button>
        </div>

        {messages.map((msg, i) => (
          <div
            key={`${i}-${msg.who}-${msg.body.slice(0, 30)}`}
            className="flex gap-2 items-start text-[12.5px] text-fg-1"
          >
            <span
              className={cn(
                "font-mono text-[10px] pt-0.5 min-w-[28px] font-medium",
                "text-bot-2",
              )}
            >
              {msg.who === "user" ? "YOU" : "S"}
            </span>
            <span className="flex-1 leading-[1.5]">
              {msg.body}
              {msg.streaming && (
                <span className="inline-block w-[6px] h-[12px] ml-[3px] bg-bot-2 align-[-2px] animate-[aside-blink_1s_steps(2)_infinite]" />
              )}
            </span>
          </div>
        ))}

        <div className="border-t border-dashed border-bot-2 pt-2 flex items-center gap-2">
          <span className="text-[12px] text-fg-3 italic flex-1">
            Ask another follow-up…
          </span>
          <button
            type="button"
            className="text-[11px] px-[10px] py-[4px] rounded-pill border-none bg-inverse text-fg-on-inverse cursor-pointer"
          >
            Send ↵
          </button>
        </div>
      </div>
    </Activity>
  );
}
