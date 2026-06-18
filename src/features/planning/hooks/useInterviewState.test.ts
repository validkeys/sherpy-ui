/**
 * M7-006: Tests for useInterviewState hook
 * Validates reducer logic and action callbacks
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type InterviewState,
  interviewReducer,
  useInterviewState,
} from "./useInterviewState";

describe("interviewReducer", () => {
  const initialState: InterviewState = {
    inputText: "",
    selectedOption: null,
    optimisticAnswer: null,
    isTransitioning: false,
  };

  describe("INPUT_CHANGED", () => {
    it("should update input text", () => {
      const result = interviewReducer(initialState, {
        type: "INPUT_CHANGED",
        payload: "My custom answer",
      });

      expect(result.inputText).toBe("My custom answer");
      expect(result.selectedOption).toBeNull();
    });

    it("should clear selected option when typing", () => {
      const stateWithOption: InterviewState = {
        ...initialState,
        selectedOption: "A",
      };

      const result = interviewReducer(stateWithOption, {
        type: "INPUT_CHANGED",
        payload: "Custom text",
      });

      expect(result.inputText).toBe("Custom text");
      expect(result.selectedOption).toBeNull();
    });

    it("should preserve selected option when clearing input", () => {
      const stateWithBoth: InterviewState = {
        ...initialState,
        inputText: "Old text",
        selectedOption: "B",
      };

      const result = interviewReducer(stateWithBoth, {
        type: "INPUT_CHANGED",
        payload: "",
      });

      expect(result.inputText).toBe("");
      expect(result.selectedOption).toBe("B");
    });

    it("should not affect other state fields", () => {
      const stateWithOptimistic: InterviewState = {
        ...initialState,
        optimisticAnswer: {
          stepNumber: 2,
          question: "Test?",
          answer: "Yes",
          stepName: "Step 2",
        },
        isTransitioning: true,
      };

      const result = interviewReducer(stateWithOptimistic, {
        type: "INPUT_CHANGED",
        payload: "New text",
      });

      expect(result.optimisticAnswer).toEqual(
        stateWithOptimistic.optimisticAnswer,
      );
      expect(result.isTransitioning).toBe(true);
    });
  });

  describe("OPTION_SELECTED", () => {
    it("should select an option", () => {
      const result = interviewReducer(initialState, {
        type: "OPTION_SELECTED",
        payload: "C",
      });

      expect(result.selectedOption).toBe("C");
      expect(result.inputText).toBe("");
    });

    it("should clear input text when selecting option", () => {
      const stateWithText: InterviewState = {
        ...initialState,
        inputText: "Custom answer",
      };

      const result = interviewReducer(stateWithText, {
        type: "OPTION_SELECTED",
        payload: "A",
      });

      expect(result.selectedOption).toBe("A");
      expect(result.inputText).toBe("");
    });

    it("should allow deselecting option by passing null", () => {
      const stateWithOption: InterviewState = {
        ...initialState,
        selectedOption: "B",
      };

      const result = interviewReducer(stateWithOption, {
        type: "OPTION_SELECTED",
        payload: null,
      });

      expect(result.selectedOption).toBeNull();
      expect(result.inputText).toBe("");
    });

    it("should not affect other state fields", () => {
      const stateWithOptimistic: InterviewState = {
        ...initialState,
        optimisticAnswer: {
          stepNumber: 3,
          question: "Continue?",
          answer: "No",
          stepName: "Step 3",
        },
        isTransitioning: true,
      };

      const result = interviewReducer(stateWithOptimistic, {
        type: "OPTION_SELECTED",
        payload: "D",
      });

      expect(result.optimisticAnswer).toEqual(
        stateWithOptimistic.optimisticAnswer,
      );
      expect(result.isTransitioning).toBe(true);
    });
  });

  describe("SUBMIT_STARTED", () => {
    it("should set optimistic answer and clear inputs", () => {
      const stateWithInputs: InterviewState = {
        ...initialState,
        inputText: "My answer",
        selectedOption: "A",
      };

      const payload = {
        stepNumber: 2,
        question: "What is your goal?",
        answer: "My answer",
        stepName: "Business Requirements",
      };

      const result = interviewReducer(stateWithInputs, {
        type: "SUBMIT_STARTED",
        payload,
      });

      expect(result.optimisticAnswer).toEqual(payload);
      expect(result.inputText).toBe("");
      expect(result.selectedOption).toBeNull();
      expect(result.isTransitioning).toBe(true);
    });

    it("should handle submit with empty inputs", () => {
      const payload = {
        stepNumber: 1,
        question: "Test?",
        answer: "Yes",
        stepName: "Step 1",
      };

      const result = interviewReducer(initialState, {
        type: "SUBMIT_STARTED",
        payload,
      });

      expect(result.optimisticAnswer).toEqual(payload);
      expect(result.isTransitioning).toBe(true);
    });
  });

  describe("SUBMIT_SUCCESS", () => {
    it("should clear optimistic answer and exit transition", () => {
      const stateWithOptimistic: InterviewState = {
        ...initialState,
        optimisticAnswer: {
          stepNumber: 2,
          question: "Goal?",
          answer: "Build app",
          stepName: "Step 2",
        },
        isTransitioning: true,
      };

      const result = interviewReducer(stateWithOptimistic, {
        type: "SUBMIT_SUCCESS",
      });

      expect(result.optimisticAnswer).toBeNull();
      expect(result.isTransitioning).toBe(false);
    });

    it("should not affect input fields", () => {
      const stateWithInputs: InterviewState = {
        ...initialState,
        inputText: "New text",
        selectedOption: "B",
        optimisticAnswer: {
          stepNumber: 3,
          question: "Continue?",
          answer: "Yes",
          stepName: "Step 3",
        },
        isTransitioning: true,
      };

      const result = interviewReducer(stateWithInputs, {
        type: "SUBMIT_SUCCESS",
      });

      expect(result.inputText).toBe("New text");
      expect(result.selectedOption).toBe("B");
    });
  });

  describe("SUBMIT_ERROR", () => {
    it("should clear optimistic answer and exit transition", () => {
      const stateWithOptimistic: InterviewState = {
        ...initialState,
        optimisticAnswer: {
          stepNumber: 2,
          question: "Goal?",
          answer: "Build app",
          stepName: "Step 2",
        },
        isTransitioning: true,
      };

      const result = interviewReducer(stateWithOptimistic, {
        type: "SUBMIT_ERROR",
      });

      expect(result.optimisticAnswer).toBeNull();
      expect(result.isTransitioning).toBe(false);
    });

    it("should have same behavior as SUBMIT_SUCCESS", () => {
      const stateWithOptimistic: InterviewState = {
        ...initialState,
        optimisticAnswer: {
          stepNumber: 1,
          question: "Test?",
          answer: "Yes",
          stepName: "Step 1",
        },
        isTransitioning: true,
      };

      const successResult = interviewReducer(stateWithOptimistic, {
        type: "SUBMIT_SUCCESS",
      });
      const errorResult = interviewReducer(stateWithOptimistic, {
        type: "SUBMIT_ERROR",
      });

      expect(errorResult).toEqual(successResult);
    });
  });

  describe("RESET", () => {
    it("should reset all fields to initial state", () => {
      const dirtyState: InterviewState = {
        inputText: "Some text",
        selectedOption: "C",
        optimisticAnswer: {
          stepNumber: 2,
          question: "Goal?",
          answer: "Build",
          stepName: "Step 2",
        },
        isTransitioning: true,
      };

      const result = interviewReducer(dirtyState, { type: "RESET" });

      expect(result).toEqual(initialState);
    });

    it("should be idempotent", () => {
      const result1 = interviewReducer(initialState, { type: "RESET" });
      const result2 = interviewReducer(result1, { type: "RESET" });

      expect(result1).toEqual(initialState);
      expect(result2).toEqual(initialState);
    });
  });
});

describe("useInterviewState", () => {
  it("should initialize with empty state", () => {
    const { result } = renderHook(() => useInterviewState());

    expect(result.current.state).toEqual({
      inputText: "",
      selectedOption: null,
      optimisticAnswer: null,
      isTransitioning: false,
    });
  });

  describe("actions.setInputText", () => {
    it("should update input text", () => {
      const { result } = renderHook(() => useInterviewState());

      act(() => {
        result.current.actions.setInputText("My custom answer");
      });

      expect(result.current.state.inputText).toBe("My custom answer");
    });

    it("should clear selected option when typing", () => {
      const { result } = renderHook(() => useInterviewState());

      act(() => {
        result.current.actions.selectOption("A");
      });

      expect(result.current.state.selectedOption).toBe("A");

      act(() => {
        result.current.actions.setInputText("Custom");
      });

      expect(result.current.state.selectedOption).toBeNull();
      expect(result.current.state.inputText).toBe("Custom");
    });

    it("should have stable reference", () => {
      const { result, rerender } = renderHook(() => useInterviewState());

      const firstRef = result.current.actions.setInputText;
      rerender();
      const secondRef = result.current.actions.setInputText;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe("actions.selectOption", () => {
    it("should select an option", () => {
      const { result } = renderHook(() => useInterviewState());

      act(() => {
        result.current.actions.selectOption("B");
      });

      expect(result.current.state.selectedOption).toBe("B");
    });

    it("should clear input text when selecting option", () => {
      const { result } = renderHook(() => useInterviewState());

      act(() => {
        result.current.actions.setInputText("Custom answer");
      });

      expect(result.current.state.inputText).toBe("Custom answer");

      act(() => {
        result.current.actions.selectOption("C");
      });

      expect(result.current.state.inputText).toBe("");
      expect(result.current.state.selectedOption).toBe("C");
    });

    it("should allow deselecting by passing null", () => {
      const { result } = renderHook(() => useInterviewState());

      act(() => {
        result.current.actions.selectOption("A");
      });

      expect(result.current.state.selectedOption).toBe("A");

      act(() => {
        result.current.actions.selectOption(null);
      });

      expect(result.current.state.selectedOption).toBeNull();
    });

    it("should have stable reference", () => {
      const { result, rerender } = renderHook(() => useInterviewState());

      const firstRef = result.current.actions.selectOption;
      rerender();
      const secondRef = result.current.actions.selectOption;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe("actions.startSubmit", () => {
    it("should set optimistic answer and clear inputs", () => {
      const { result } = renderHook(() => useInterviewState());

      act(() => {
        result.current.actions.setInputText("My answer");
        result.current.actions.selectOption("A");
      });

      const payload = {
        stepNumber: 2,
        question: "What is your goal?",
        answer: "My answer",
        stepName: "Business Requirements",
      };

      act(() => {
        result.current.actions.startSubmit(payload);
      });

      expect(result.current.state.optimisticAnswer).toEqual(payload);
      expect(result.current.state.inputText).toBe("");
      expect(result.current.state.selectedOption).toBeNull();
      expect(result.current.state.isTransitioning).toBe(true);
    });

    it("should have stable reference", () => {
      const { result, rerender } = renderHook(() => useInterviewState());

      const firstRef = result.current.actions.startSubmit;
      rerender();
      const secondRef = result.current.actions.startSubmit;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe("actions.finishSubmit", () => {
    it("should clear optimistic answer and exit transition", () => {
      const { result } = renderHook(() => useInterviewState());

      act(() => {
        result.current.actions.startSubmit({
          stepNumber: 2,
          question: "Goal?",
          answer: "Build",
          stepName: "Step 2",
        });
      });

      expect(result.current.state.optimisticAnswer).not.toBeNull();

      act(() => {
        result.current.actions.finishSubmit();
      });

      expect(result.current.state.optimisticAnswer).toBeNull();
      expect(result.current.state.isTransitioning).toBe(false);
    });

    it("should have stable reference", () => {
      const { result, rerender } = renderHook(() => useInterviewState());

      const firstRef = result.current.actions.finishSubmit;
      rerender();
      const secondRef = result.current.actions.finishSubmit;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe("actions.failSubmit", () => {
    it("should clear optimistic answer and exit transition", () => {
      const { result } = renderHook(() => useInterviewState());

      act(() => {
        result.current.actions.startSubmit({
          stepNumber: 2,
          question: "Goal?",
          answer: "Build",
          stepName: "Step 2",
        });
      });

      expect(result.current.state.optimisticAnswer).not.toBeNull();

      act(() => {
        result.current.actions.failSubmit();
      });

      expect(result.current.state.optimisticAnswer).toBeNull();
      expect(result.current.state.isTransitioning).toBe(false);
    });

    it("should have stable reference", () => {
      const { result, rerender } = renderHook(() => useInterviewState());

      const firstRef = result.current.actions.failSubmit;
      rerender();
      const secondRef = result.current.actions.failSubmit;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe("actions.reset", () => {
    it("should reset all fields to initial state", () => {
      const { result } = renderHook(() => useInterviewState());

      // Create dirty state
      act(() => {
        result.current.actions.setInputText("Some text");
        result.current.actions.selectOption("C");
        result.current.actions.startSubmit({
          stepNumber: 2,
          question: "Goal?",
          answer: "Build",
          stepName: "Step 2",
        });
      });

      expect(result.current.state.inputText).toBe("");
      expect(result.current.state.selectedOption).toBeNull();
      expect(result.current.state.optimisticAnswer).not.toBeNull();
      expect(result.current.state.isTransitioning).toBe(true);

      // Reset
      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.state).toEqual({
        inputText: "",
        selectedOption: null,
        optimisticAnswer: null,
        isTransitioning: false,
      });
    });

    it("should have stable reference", () => {
      const { result, rerender } = renderHook(() => useInterviewState());

      const firstRef = result.current.actions.reset;
      rerender();
      const secondRef = result.current.actions.reset;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe("full interaction flow", () => {
    it("should handle complete submit success flow", () => {
      const { result } = renderHook(() => useInterviewState());

      // User types answer
      act(() => {
        result.current.actions.setInputText("My custom answer");
      });

      expect(result.current.state.inputText).toBe("My custom answer");

      // User submits
      act(() => {
        result.current.actions.startSubmit({
          stepNumber: 2,
          question: "What is your goal?",
          answer: "My custom answer",
          stepName: "Business Requirements",
        });
      });

      expect(result.current.state.inputText).toBe("");
      expect(result.current.state.optimisticAnswer).not.toBeNull();
      expect(result.current.state.isTransitioning).toBe(true);

      // Server confirms
      act(() => {
        result.current.actions.finishSubmit();
      });

      expect(result.current.state.optimisticAnswer).toBeNull();
      expect(result.current.state.isTransitioning).toBe(false);
    });

    it("should handle complete submit error flow", () => {
      const { result } = renderHook(() => useInterviewState());

      // User selects option
      act(() => {
        result.current.actions.selectOption("A");
      });

      expect(result.current.state.selectedOption).toBe("A");

      // User submits
      act(() => {
        result.current.actions.startSubmit({
          stepNumber: 3,
          question: "Continue?",
          answer: "Option A: Yes",
          stepName: "Technical Requirements",
        });
      });

      expect(result.current.state.selectedOption).toBeNull();
      expect(result.current.state.optimisticAnswer).not.toBeNull();
      expect(result.current.state.isTransitioning).toBe(true);

      // Server rejects
      act(() => {
        result.current.actions.failSubmit();
      });

      expect(result.current.state.optimisticAnswer).toBeNull();
      expect(result.current.state.isTransitioning).toBe(false);
    });

    it("should handle option toggle flow", () => {
      const { result } = renderHook(() => useInterviewState());

      // Select option A
      act(() => {
        result.current.actions.selectOption("A");
      });

      expect(result.current.state.selectedOption).toBe("A");

      // Change to option B
      act(() => {
        result.current.actions.selectOption("B");
      });

      expect(result.current.state.selectedOption).toBe("B");

      // Deselect
      act(() => {
        result.current.actions.selectOption(null);
      });

      expect(result.current.state.selectedOption).toBeNull();
    });
  });
});
