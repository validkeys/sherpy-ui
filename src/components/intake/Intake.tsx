import type { ReactNode } from "react";

export interface IntakeProps {
  prompt: ReactNode;
  paths: ReactNode;
  meta?: ReactNode;
}

export function Intake({ prompt, paths, meta }: IntakeProps) {
  return (
    <div className="flex-1 grid place-items-center px-8 pb-6">
      <div className="w-[560px] flex flex-col gap-3.5">
        {prompt}
        <div className="grid grid-cols-2 gap-3 mt-1.5">{paths}</div>
        {meta && <div className="mt-1">{meta}</div>}
      </div>
    </div>
  );
}
