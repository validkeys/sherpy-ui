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

import { useId } from "react";
import { Button } from "@/components/ui/button";

type FormValues = Record<string, string>;

interface AnswerCardProps {
  options?: string[];
  formFields?: Array<{
    id: string;
    label: string;
    type: "text" | "textarea";
    placeholder?: string;
  }>;
  selectedOption?: number;
  disabled?: boolean;
  isSubmitting?: boolean;
  formValues?: FormValues;
  onFormValueChange?: (fieldId: string, value: string) => void;
  onSelectOption?: (option: string, index: number) => void;
  onSubmitForm?: (values: FormValues) => void;
}

export function AnswerCard({
  options,
  formFields,
  selectedOption,
  disabled = false,
  isSubmitting = false,
  formValues,
  onFormValueChange,
  onSelectOption,
  onSubmitForm,
}: AnswerCardProps) {
  const optionGroupName = useId();
  const values = formValues ?? {};

  const handleFormValueChange = (fieldId: string, value: string) => {
    onFormValueChange?.(fieldId, value);
  };

  const handleFormSubmit = () => {
    onSubmitForm?.(values);
  };

  return (
    <div className="border border-border-1 rounded-md bg-surface p-3.5 mt-1 flex flex-col gap-2.5">
      <div className="font-mono text-[10px] tracking-widest uppercase text-fg-4">
        {options ? "PICK ONE" : "YOUR ANSWER"}
      </div>

      {options ? (
        <div
          className="flex flex-col gap-1.5"
          role="radiogroup"
          aria-label="Answer options"
        >
          {options.map((option, i) => (
            <label
              key={i}
              className={`flex items-start gap-2.5 p-2.5 border rounded-sm bg-page transition-colors text-left ${
                selectedOption === i
                  ? "border-fg-1"
                  : disabled || isSubmitting
                    ? "border-border-1"
                    : "border-border-1 hover:border-fg-1"
              }`}
            >
              <input
                type="radio"
                name={optionGroupName}
                value={option}
                checked={selectedOption === i}
                disabled={disabled || isSubmitting}
                aria-label={option}
                data-testid={`answer-option-${i}`}
                onChange={() => onSelectOption?.(option, i)}
                className="sr-only"
              />
              <span className="font-mono text-[11px] text-fg-4 mt-0.5">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-[13px] text-fg-1 flex-1">{option}</span>
            </label>
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
                  value={values[field.id] ?? ""}
                  disabled={disabled || isSubmitting}
                  onChange={(event) =>
                    handleFormValueChange(field.id, event.target.value)
                  }
                  className="w-full px-3 py-2 text-sm bg-sunken border border-border-1 rounded-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:border-fg-1"
                />
              ) : (
                <input
                  type="text"
                  id={field.id}
                  placeholder={field.placeholder}
                  value={values[field.id] ?? ""}
                  disabled={disabled || isSubmitting}
                  onChange={(event) =>
                    handleFormValueChange(field.id, event.target.value)
                  }
                  className="w-full px-3 py-2 text-sm bg-sunken border border-border-1 rounded-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:border-fg-1"
                />
              )}
            </div>
          ))}
          <Button
            size="sm"
            className="self-end"
            disabled={disabled || isSubmitting}
            onClick={handleFormSubmit}
            aria-label={isSubmitting ? "Submitting answer" : "Submit answer"}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
