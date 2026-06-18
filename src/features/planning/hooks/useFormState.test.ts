import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type FormQuestion, useFormState } from "./useFormState";

const MOCK_QUESTIONS: FormQuestion[] = [
  {
    id: "existingRequirements",
    label: "Do you have existing requirements?",
    type: "text",
  },
  {
    id: "projectDescription",
    label: "What are you building?",
    type: "textarea",
  },
];

describe("useFormState", () => {
  beforeEach(() => {
    // Clean up DOM between tests
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("initializes with empty form data when no initialData provided", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      expect(result.current.formData).toEqual({});
      expect(result.current.errors).toEqual({});
      expect(result.current.isLocallySubmitting).toBe(false);
      expect(result.current.isFormValid).toBe(false);
    });

    it("initializes with provided initialData", () => {
      const initialData = {
        existingRequirements: "Yes",
        projectDescription: "A test project",
      };

      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          initialData,
          status: "collectingInfo",
        }),
      );

      expect(result.current.formData).toEqual(initialData);
      expect(result.current.isFormValid).toBe(true);
    });
  });

  describe("isLoading", () => {
    it("returns true when status is submitting", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "submitting",
        }),
      );

      expect(result.current.isLoading).toBe(true);
    });

    it("returns true when status is generatingArtifact", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "generatingArtifact",
        }),
      );

      expect(result.current.isLoading).toBe(true);
    });

    it("returns true when isLocallySubmitting is true", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      act(() => {
        result.current.setIsLocallySubmitting(true);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("returns false when not submitting", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("isFormValid", () => {
    it("returns false when fields are empty", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      expect(result.current.isFormValid).toBe(false);
    });

    it("returns false when some fields are empty", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          initialData: { existingRequirements: "Yes" },
          status: "collectingInfo",
        }),
      );

      expect(result.current.isFormValid).toBe(false);
    });

    it("returns false when fields contain only whitespace", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          initialData: {
            existingRequirements: "   ",
            projectDescription: "  ",
          },
          status: "collectingInfo",
        }),
      );

      expect(result.current.isFormValid).toBe(false);
    });

    it("returns true when all fields have values", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          initialData: {
            existingRequirements: "Yes",
            projectDescription: "Test",
          },
          status: "collectingInfo",
        }),
      );

      expect(result.current.isFormValid).toBe(true);
    });
  });

  describe("handleChange", () => {
    it("updates form data for a field", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      act(() => {
        result.current.handleChange("existingRequirements", "Yes");
      });

      expect(result.current.formData.existingRequirements).toBe("Yes");
    });

    it("clears error for field when user types", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      // Set an error
      act(() => {
        result.current.setErrors({ existingRequirements: "Field is required" });
      });

      expect(result.current.errors.existingRequirements).toBe(
        "Field is required",
      );

      // Type in the field
      act(() => {
        result.current.handleChange("existingRequirements", "Yes");
      });

      expect(result.current.errors.existingRequirements).toBeUndefined();
    });

    it("does not modify other field values", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          initialData: { projectDescription: "Test" },
          status: "collectingInfo",
        }),
      );

      act(() => {
        result.current.handleChange("existingRequirements", "Yes");
      });

      expect(result.current.formData.projectDescription).toBe("Test");
    });
  });

  describe("validateForm", () => {
    it("returns false and sets errors for empty fields", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateForm({});
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.existingRequirements).toBe(
        "Do you have existing requirements? is required",
      );
      expect(result.current.errors.projectDescription).toBe(
        "What are you building? is required",
      );
    });

    it("returns false and sets errors for whitespace-only fields", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateForm({
          existingRequirements: "   ",
          projectDescription: "  ",
        });
      });

      expect(isValid!).toBe(false);
      expect(Object.keys(result.current.errors).length).toBe(2);
    });

    it("returns true and clears errors for valid data", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      // Set initial errors
      act(() => {
        result.current.setErrors({
          existingRequirements: "Field is required",
        });
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateForm({
          existingRequirements: "Yes",
          projectDescription: "Test",
        });
      });

      expect(isValid!).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it("only sets errors for missing fields, not filled ones", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateForm({
          existingRequirements: "Yes",
        });
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.existingRequirements).toBeUndefined();
      expect(result.current.errors.projectDescription).toBe(
        "What are you building? is required",
      );
    });
  });

  describe("getActualFormData", () => {
    it("returns current data when DOM matches React state", () => {
      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      const currentData = {
        existingRequirements: "Yes",
        projectDescription: "Test",
      };

      let actualData: {
        data: Record<string, string>;
        recoveredFromDOM: boolean;
      };
      act(() => {
        actualData = result.current.getActualFormData(currentData);
      });

      expect(actualData!.data).toEqual(currentData);
      expect(actualData!.recoveredFromDOM).toBe(false);
    });

    it("recovers DOM values that differ from React state (BUG-010 fix)", () => {
      // Create DOM elements
      const input = document.createElement("input");
      input.id = "existingRequirements";
      input.value = "Yes from DOM";
      document.body.appendChild(input);

      const textarea = document.createElement("textarea");
      textarea.id = "projectDescription";
      textarea.value = "Description from DOM";
      document.body.appendChild(textarea);

      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      // React state is incomplete (e.g., autofill happened)
      const currentData = {};

      let actualData: {
        data: Record<string, string>;
        recoveredFromDOM: boolean;
      };
      act(() => {
        actualData = result.current.getActualFormData(currentData);
      });

      expect(actualData!.data).toEqual({
        existingRequirements: "Yes from DOM",
        projectDescription: "Description from DOM",
      });
      expect(actualData!.recoveredFromDOM).toBe(true);
    });

    it("ignores empty DOM values", () => {
      // Create DOM elements with empty values
      const input = document.createElement("input");
      input.id = "existingRequirements";
      input.value = "";
      document.body.appendChild(input);

      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      const currentData = { projectDescription: "Test" };

      let actualData: {
        data: Record<string, string>;
        recoveredFromDOM: boolean;
      };
      act(() => {
        actualData = result.current.getActualFormData(currentData);
      });

      expect(actualData!.data).toEqual(currentData);
      expect(actualData!.recoveredFromDOM).toBe(false);
    });

    it("ignores whitespace-only DOM values", () => {
      const input = document.createElement("input");
      input.id = "existingRequirements";
      input.value = "   ";
      document.body.appendChild(input);

      const { result } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      const currentData = { projectDescription: "Test" };

      let actualData: {
        data: Record<string, string>;
        recoveredFromDOM: boolean;
      };
      act(() => {
        actualData = result.current.getActualFormData(currentData);
      });

      expect(actualData!.data).toEqual(currentData);
      expect(actualData!.recoveredFromDOM).toBe(false);
    });
  });

  describe("stable callback references", () => {
    it("handleChange reference stays stable across renders", () => {
      const { result, rerender } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      const firstHandleChange = result.current.handleChange;
      rerender();
      const secondHandleChange = result.current.handleChange;

      expect(firstHandleChange).toBe(secondHandleChange);
    });

    it("validateForm reference stays stable across renders", () => {
      const { result, rerender } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      const firstValidateForm = result.current.validateForm;
      rerender();
      const secondValidateForm = result.current.validateForm;

      expect(firstValidateForm).toBe(secondValidateForm);
    });

    it("getActualFormData reference stays stable across renders", () => {
      const { result, rerender } = renderHook(() =>
        useFormState({
          questions: MOCK_QUESTIONS,
          status: "collectingInfo",
        }),
      );

      const firstGetActualFormData = result.current.getActualFormData;
      rerender();
      const secondGetActualFormData = result.current.getActualFormData;

      expect(firstGetActualFormData).toBe(secondGetActualFormData);
    });
  });
});
