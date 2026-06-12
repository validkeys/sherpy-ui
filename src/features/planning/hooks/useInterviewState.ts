/**
 * M7-006: Interview state management hook
 * Extracted from InterviewThread component to improve testability and reusability
 *
 * Manages local UI state for interview Q&A interaction:
 * - Text input for custom answers
 * - Option selection for multiple-choice questions
 * - Optimistic updates during submission
 * - Transition states between questions
 */

import { useCallback, useReducer } from "react";

/**
 * Consolidated state for interview interactions
 * Replaces 4 separate useState calls with single reducer for clearer state transitions
 */
export type InterviewState = {
  /** Current text in composer input (for custom answers) */
  inputText: string;
  /** Selected option letter (A, B, C, etc.) */
  selectedOption: string | null;
  /** Optimistic answer shown immediately after submit (before server confirms) */
  optimisticAnswer: {
    stepNumber: number;
    question: string;
    answer: string;
    stepName: string;
  } | null;
  /** Hide options during transition between questions */
  isTransitioning: boolean;
};

/**
 * Actions for interview state transitions
 * Clear action types make state updates predictable and testable
 */
export type InterviewAction =
  | { type: "INPUT_CHANGED"; payload: string }
  | { type: "OPTION_SELECTED"; payload: string | null }
  | {
      type: "SUBMIT_STARTED";
      payload: {
        stepNumber: number;
        question: string;
        answer: string;
        stepName: string;
      };
    }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_ERROR" }
  | { type: "RESET" };

/**
 * Reducer for interview state management
 * Centralizes all state transitions in one place for easier testing and debugging
 *
 * Key invariant: Input and option selection are mutually exclusive
 * - Typing in input clears selected option
 * - Selecting option clears input text
 */
export function interviewReducer(
  state: InterviewState,
  action: InterviewAction,
): InterviewState {
  switch (action.type) {
    case "INPUT_CHANGED":
      return {
        ...state,
        inputText: action.payload,
        // Clear selected option when user starts typing custom answer
        selectedOption: action.payload ? null : state.selectedOption,
      };

    case "OPTION_SELECTED":
      return {
        ...state,
        selectedOption: action.payload,
        // Clear input when option selected (mutually exclusive)
        inputText: "",
      };

    case "SUBMIT_STARTED":
      return {
        ...state,
        optimisticAnswer: action.payload,
        // Clear both input and selection immediately
        inputText: "",
        selectedOption: null,
        isTransitioning: true,
      };

    case "SUBMIT_SUCCESS":
      return {
        ...state,
        optimisticAnswer: null,
        isTransitioning: false,
      };

    case "SUBMIT_ERROR":
      return {
        ...state,
        optimisticAnswer: null,
        isTransitioning: false,
      };

    case "RESET":
      return {
        inputText: "",
        selectedOption: null,
        optimisticAnswer: null,
        isTransitioning: false,
      };

    default:
      return state;
  }
}

/**
 * Initial state for interview interactions
 */
const initialState: InterviewState = {
  inputText: "",
  selectedOption: null,
  optimisticAnswer: null,
  isTransitioning: false,
};

/**
 * Hook for managing interview Q&A interaction state
 *
 * Provides stable action callbacks and current state for:
 * - Text input changes
 * - Option selection
 * - Submission lifecycle (start, success, error)
 * - State reset
 *
 * @returns {object} Current state and action callbacks
 *
 * @example
 * ```tsx
 * const { state, actions } = useInterviewState();
 *
 * // User types custom answer
 * <input value={state.inputText} onChange={e => actions.setInputText(e.target.value)} />
 *
 * // User selects option
 * <button onClick={() => actions.selectOption("A")}>Option A</button>
 *
 * // Submit answer
 * actions.startSubmit({ stepNumber: 2, question: "...", answer: "...", stepName: "..." });
 * // ... server call ...
 * actions.finishSubmit(); // or actions.failSubmit()
 * ```
 */
export function useInterviewState() {
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  // Stable action callbacks (don't change between renders)
  const actions = {
    /**
     * Update text input value
     * Clears selected option if user starts typing
     */
    setInputText: useCallback((text: string) => {
      dispatch({ type: "INPUT_CHANGED", payload: text });
    }, []),

    /**
     * Select or deselect an option
     * Pass null to deselect current option
     * Clears text input when option selected
     */
    selectOption: useCallback((letter: string | null) => {
      dispatch({ type: "OPTION_SELECTED", payload: letter });
    }, []),

    /**
     * Start answer submission
     * Shows optimistic answer and clears input/selection
     */
    startSubmit: useCallback(
      (payload: {
        stepNumber: number;
        question: string;
        answer: string;
        stepName: string;
      }) => {
        dispatch({ type: "SUBMIT_STARTED", payload });
      },
      [],
    ),

    /**
     * Mark submission as successful
     * Clears optimistic answer and exits transition state
     */
    finishSubmit: useCallback(() => {
      dispatch({ type: "SUBMIT_SUCCESS" });
    }, []),

    /**
     * Mark submission as failed
     * Clears optimistic answer and exits transition state
     */
    failSubmit: useCallback(() => {
      dispatch({ type: "SUBMIT_ERROR" });
    }, []),

    /**
     * Reset all state to initial values
     * Useful for clearing form after step completion
     */
    reset: useCallback(() => {
      dispatch({ type: "RESET" });
    }, []),
  };

  return { state, actions };
}
