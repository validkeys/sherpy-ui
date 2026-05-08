interface AnsweredMessageProps {
  stepName: string;
  question: string;
  answer: string;
}

export function AnsweredMessage({
  stepName,
  question,
  answer,
}: AnsweredMessageProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-[9.5px] text-fg-3 uppercase tracking-[0.06em]">
        {stepName}
      </span>
      {/* Question */}
      <div className="flex gap-2.5 items-start">
        <span className="w-6 h-6 rounded-full shrink-0 grid place-items-center font-mono text-[10px] bg-bot-2/10 border border-bot-2/20 text-bot-2">
          AI
        </span>
        <div className="flex-1 text-[12.5px] leading-[1.5] text-fg-2">
          {question}
        </div>
      </div>
      {/* Answer */}
      <div className="flex gap-2.5 items-start">
        <span className="w-6 h-6 rounded-full shrink-0 grid place-items-center font-mono text-[10px] bg-surface border border-border-2 text-fg-1">
          KW
        </span>
        <div className="flex-1 font-serif text-[16px] leading-[1.6] text-fg-1 italic">
          {answer}
        </div>
      </div>
    </div>
  );
}
