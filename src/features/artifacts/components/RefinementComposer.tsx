import { useState } from "react";

interface RefinementComposerProps {
  onSubmit: (instruction: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function RefinementComposer({
  onSubmit,
  onCancel,
  isLoading,
}: RefinementComposerProps) {
  const [instruction, setInstruction] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim() && !isLoading) {
      onSubmit(instruction.trim());
    }
  };

  return (
    <div className="flex flex-col gap-3 px-[22px] py-[14px] border-t border-border-1 bg-sunken">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Describe how you want to refine this artifact..."
          className="w-full font-sans text-[13px] leading-[1.5] text-fg-1 bg-page border border-border-1 rounded p-3 resize-none focus:outline-none focus:border-border-emph min-h-[80px]"
          disabled={isLoading}
          autoFocus
        />
        <div className="flex items-center gap-[6px] justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-[12px] text-fg-2 px-[10px] py-[5px] bg-surface border border-border-2 rounded-sm cursor-pointer font-sans hover:border-border-emph hover:text-fg-1 transition-colors duration-[140ms] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!instruction.trim() || isLoading}
            className="text-[12px] font-medium px-[10px] py-[5px] bg-inverse text-fg-on-inverse border-none rounded-sm cursor-pointer font-sans disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Refining..." : "Refine"}
          </button>
        </div>
      </form>
    </div>
  );
}
