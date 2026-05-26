/**
 * AnswerCard - Interactive question/answer card for workflow chat
 *
 * Usage:
 *   // Multiple choice
 *   <AnswerCard
 *     question="What's your primary goal?"
 *     options={["Option A", "Option B", "Option C"]}
 *   />
 *
 *   // Form fields
 *   <AnswerCard
 *     question="Tell us about your project"
 *     formFields={[
 *       { id: "name", label: "Project name", type: "text" },
 *       { id: "desc", label: "Description", type: "textarea" }
 *     ]}
 *   />
 *
 * Features:
 * - Multiple choice: lettered options (A, B, C...)
 * - Form fields: text inputs and textareas
 * - Submit button for forms
 * - Hover states on options
 */

import { Button } from "@/components/ui/button";

interface AnswerCardProps {
  question: string;
  options?: string[];
  formFields?: Array<{
    id: string;
    label: string;
    type: "text" | "textarea";
    placeholder?: string;
  }>;
}

export function AnswerCard({ question, options, formFields }: AnswerCardProps) {
  return (
    <div className="border border-border-1 rounded-md bg-surface p-3.5 mt-1 flex flex-col gap-2.5">
      <div className="font-mono text-[10px] tracking-widest uppercase text-fg-4">
        {options ? "PICK ONE" : "YOUR ANSWER"}
      </div>

      {options ? (
        <div className="flex flex-col gap-1.5">
          {options.map((option, i) => (
            <button
              key={i}
              type="button"
              className="flex items-start gap-2.5 p-2.5 border border-border-1 rounded-sm bg-page hover:border-fg-1 transition-colors text-left"
            >
              <span className="font-mono text-[11px] text-fg-4 mt-0.5">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-[13px] text-fg-1 flex-1">{option}</span>
            </button>
          ))}
        </div>
      ) : formFields ? (
        <div className="flex flex-col gap-3">
          {formFields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1.5">
              <label
                htmlFor={field.id}
                className="text-[13px] text-fg-2 font-medium"
              >
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={field.id}
                  rows={3}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm bg-sunken border border-border-1 rounded-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:border-fg-1"
                />
              ) : (
                <input
                  type="text"
                  id={field.id}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm bg-sunken border border-border-1 rounded-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:border-fg-1"
                />
              )}
            </div>
          ))}
          <Button size="sm" className="self-end">
            Submit
          </Button>
        </div>
      ) : null}
    </div>
  );
}
