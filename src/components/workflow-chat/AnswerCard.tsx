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
 *
 * Performance:
 * - Wrapped in React.memo to prevent re-renders when props unchanged
 * - Optimizes when parent ChatMessage re-renders
 */

import { memo, useCallback, useId, useState } from "react";
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

function AnswerCardComponent({
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
  const [internalFormValues, setInternalFormValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const values = formValues ?? internalFormValues;
  const fields = formFields ?? [];
  const canSubmitForm =
    fields.length > 0 &&
    fields.every((field) => values[field.id]?.trim()) &&
    !disabled &&
    !isSubmitting;

  const handleFormValueChange = useCallback(
    (fieldId: string, value: string) => {
      if (!formValues) {
        setInternalFormValues((current) => ({ ...current, [fieldId]: value }));
      }
      onFormValueChange?.(fieldId, value);
      // Clear error for this field when user starts typing
      if (errors[fieldId]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
    },
    [formValues, onFormValueChange, errors],
  );

  const handleFormSubmit = useCallback(() => {
    // Validate all fields before submit (WCAG 3.3.1 - Error Identification)
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (!values[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear errors and submit
    setErrors({});
    if (!canSubmitForm) return;
    onSubmitForm?.(values);
  }, [fields, values, canSubmitForm, onSubmitForm]);

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
          {options.map((option, i) => {
            const handleOptionSelect = () => onSelectOption?.(option, i);
            return (
              <label
                key={option}
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
                  onChange={handleOptionSelect}
                  className="sr-only"
                />
                <span className="font-mono text-[11px] text-fg-4 mt-0.5">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-[13px] text-fg-1 flex-1">{option}</span>
              </label>
            );
          })}
        </div>
      ) : formFields ? (
        <div className="flex flex-col gap-3">
          {formFields.map((field) => {
            const hasError = !!errors[field.id];
            const errorId = `${field.id}-error`;
            const handleChange = (
              event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              handleFormValueChange(field.id, event.target.value);
            };

            return (
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
                    onChange={handleChange}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : undefined}
                    aria-required="true"
                    className="w-full px-3 py-2 text-sm bg-sunken border border-border-1 rounded-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:border-fg-1"
                  />
                ) : (
                  <input
                    type="text"
                    id={field.id}
                    placeholder={field.placeholder}
                    value={values[field.id] ?? ""}
                    disabled={disabled || isSubmitting}
                    onChange={handleChange}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : undefined}
                    aria-required="true"
                    className="w-full px-3 py-2 text-sm bg-sunken border border-border-1 rounded-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:border-fg-1"
                  />
                )}
                {hasError && (
                  <div
                    id={errorId}
                    role="alert"
                    className="text-[12px] text-red-600 mt-0.5"
                  >
                    {errors[field.id]}
                  </div>
                )}
              </div>
            );
          })}
          <Button
            size="sm"
            className="self-end"
            disabled={!canSubmitForm}
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

// Memoize to prevent re-renders when props unchanged
// Optimizes when parent ChatMessage re-renders
export const AnswerCard = memo(AnswerCardComponent);
AnswerCard.displayName = "AnswerCard";
