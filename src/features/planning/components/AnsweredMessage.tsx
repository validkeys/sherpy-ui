interface AnsweredMessageProps {
  stepName: string;
  answer: string;
}

export function AnsweredMessage({ stepName, answer }: AnsweredMessageProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[9.5px] text-fg-3 uppercase tracking-[0.06em]">
        {stepName}
      </span>
      <div className="flex gap-2.5 items-start">
        <span className="w-6 h-6 rounded-full shrink-0 grid place-items-center font-mono text-[10px] bg-surface border border-border-2 text-fg-1">
          KW
        </span>
        <div className="flex-1 text-[12.5px] leading-[1.5] text-fg-1 opacity-70">
          {answer}
        </div>
      </div>
    </div>
  );
}
