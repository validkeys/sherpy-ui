/**
 * useFormState - Manages form state and validation for FormStep component
 *
 * Extracted from FormStep.tsx to reduce component complexity
 * Handles: form data, validation, error messages, submission state
 */

import { useCallback, useState } from "react";

export type FormQuestion = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
};

type UseFormStateOptions = {
  questions: FormQuestion[];
  initialData?: Record<string, string>;
  status: string;
};

type UseFormStateReturn = {
  formData: Record<string, string>;
  errors: Record<string, string>;
  isLocallySubmitting: boolean;
  isLoading: boolean;
  isFormValid: boolean;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setIsLocallySubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleChange: (id: string, value: string) => void;
  validateForm: (data: Record<string, string>) => boolean;
  getActualFormData: (currentData: Record<string, string>) => {
    data: Record<string, string>;
    recoveredFromDOM: boolean;
  };
};

export function useFormState({
  questions,
  initialData = {},
  status,
}: UseFormStateOptions): UseFormStateReturn {
  const [formData, setFormData] = useState<Record<string, string>>(initialData);
  const [isLocallySubmitting, setIsLocallySubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isLoading =
    status === "submitting" ||
    status === "generatingArtifact" ||
    isLocallySubmitting;

  const isFormValid = questions.every((q) => {
    const value = formData[q.id];
    return value && value.trim().length > 0;
  });

  const handleChange = useCallback((id: string, value: string) => {
    console.log("[useFormState] Field changed:", { id, value });
    setFormData((prev) => {
      const next = { ...prev, [id]: value };
      console.log("[useFormState] Updated formData:", next);
      return next;
    });
    // Clear error for this field when user starts typing
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  /**
   * BUG-010 FIX: Read actual DOM values at submit time
   * Handles cases where form values exist in DOM but React onChange didn't fire:
   * - Browser autofill
   * - Programmatic value setting (testing tools, automation)
   * - Paste events that don't trigger onChange
   * - Race conditions between value setting and state updates
   */
  const getActualFormData = useCallback(
    (currentData: Record<string, string>) => {
      const actualFormData = { ...currentData };
      let recoveredFromDOM = false;

      questions.forEach((q) => {
        const element = document.getElementById(q.id) as
          | HTMLInputElement
          | HTMLTextAreaElement;
        const domValue = element?.value;
        if (domValue?.trim()) {
          if (actualFormData[q.id] !== domValue) {
            console.log(
              "[useFormState] 🔧 BUG-010 FIX: Using current DOM value for field:",
              q.id,
            );
            actualFormData[q.id] = domValue;
            recoveredFromDOM = true;
          }
        }
      });

      if (recoveredFromDOM) {
        console.warn(
          "[useFormState] ⚠️ BUG-010 RECOVERY: React state was incomplete, recovered values from DOM",
        );
        console.warn(
          "[useFormState] This can happen with autofill, paste, or programmatic form filling",
        );
        console.warn("[useFormState] Recovered data:", actualFormData);
      }

      return { data: actualFormData, recoveredFromDOM };
    },
    [questions],
  );

  /**
   * Validate form data and set error messages for missing fields
   * Returns true if valid, false if invalid (and sets errors)
   */
  const validateForm = useCallback(
    (data: Record<string, string>) => {
      const missingFields = questions.filter((q) => {
        const value = data[q.id];
        return !value || value.trim().length === 0;
      });

      if (missingFields.length > 0) {
        // Set error messages for missing fields (WCAG 3.3.1 - Error Identification)
        const newErrors: Record<string, string> = {};
        missingFields.forEach((field) => {
          newErrors[field.id] = `${field.label} is required`;
        });
        setErrors(newErrors);

        console.error(
          "[useFormState] ❌ VALIDATION FAILED: form data incomplete",
          {
            formData: data,
            missingFieldIds: missingFields.map((q) => q.id),
            requiredFieldIds: questions.map((q) => q.id),
            timestamp: new Date().toISOString(),
          },
        );
        return false;
      }

      // Clear errors on successful validation
      setErrors({});
      return true;
    },
    [questions],
  );

  return {
    formData,
    errors,
    isLocallySubmitting,
    isLoading,
    isFormValid,
    setFormData,
    setIsLocallySubmitting,
    setErrors,
    handleChange,
    validateForm,
    getActualFormData,
  };
}
