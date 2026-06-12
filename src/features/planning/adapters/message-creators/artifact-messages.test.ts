import { describe, expect, it } from "vitest";
import { STEP_STATES } from "../../machines/constants";
import type { PlanningContext } from "../../machines/types";
import type { NormalizedWorkflowState } from "../step-normalizer";
import {
  createDividerMessage,
  createLoadingMessage,
  STAGE_COLORS,
} from "./artifact-messages";

describe("artifact-messages", () => {
  describe("STAGE_COLORS", () => {
    it("defines colors for all 10 steps", () => {
      expect(Object.keys(STAGE_COLORS)).toHaveLength(10);
      expect(STAGE_COLORS[1]).toBe("var(--bot-1)");
      expect(STAGE_COLORS[2]).toBe("var(--bot-2)");
      expect(STAGE_COLORS[3]).toBe("var(--bot-3)");
      expect(STAGE_COLORS[4]).toBe("var(--bot-4)");
      expect(STAGE_COLORS[5]).toBe("var(--bot-5)");
      expect(STAGE_COLORS[6]).toBe("var(--bot-6)");
      expect(STAGE_COLORS[7]).toBe("var(--bot-7)");
      expect(STAGE_COLORS[8]).toBe("var(--bot-8)");
      expect(STAGE_COLORS[9]).toBe("var(--bot-9)");
      expect(STAGE_COLORS[10]).toBe("var(--neutral-4)");
    });
  });

  describe("createDividerMessage", () => {
    it("creates divider for Step 1", () => {
      const message = createDividerMessage(1);

      expect(message).toEqual({
        type: "divider",
        id: "divider-step-1",
        stageNumber: 1,
        stageName: "Gap Analysis Worksheet",
        stageColor: "var(--bot-1)",
      });
    });

    it("creates divider for Step 2", () => {
      const message = createDividerMessage(2);

      expect(message).toEqual({
        type: "divider",
        id: "divider-step-2",
        stageNumber: 2,
        stageName: "Business Requirements Interview",
        stageColor: "var(--bot-2)",
      });
    });

    it("creates divider for Step 3", () => {
      const message = createDividerMessage(3);

      expect(message).toEqual({
        type: "divider",
        id: "divider-step-3",
        stageNumber: 3,
        stageName: "Technical Requirements Interview",
        stageColor: "var(--bot-3)",
      });
    });

    it("creates divider for Step 10", () => {
      const message = createDividerMessage(10);

      expect(message).toEqual({
        type: "divider",
        id: "divider-step-10",
        stageNumber: 10,
        stageName: "Generate Summaries",
        stageColor: "var(--neutral-4)",
      });
    });
  });

  describe("createLoadingMessage", () => {
    const baseContext: PlanningContext = {
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as PlanningContext;

    it("returns loading message for Step 1 assessing need", () => {
      const activeState: NormalizedWorkflowState = {
        stepNumber: 1,
        status: STEP_STATES.STEP_1.ASSESSING_NEED,
      };

      const message = createLoadingMessage(baseContext, 1, activeState);

      expect(message).toEqual({
        type: "loading",
        id: "step-1-loading-artifact",
        role: "assistant",
        timestamp: "2026-01-01T00:00:00.000Z",
        content: "Generating Gap Analysis Worksheet...",
      });
    });

    it("returns loading message for Step 5 submitting", () => {
      const activeState: NormalizedWorkflowState = {
        stepNumber: 5,
        status: STEP_STATES.STEP_5.SUBMITTING,
      };

      const message = createLoadingMessage(baseContext, 5, activeState);

      expect(message).toEqual({
        type: "loading",
        id: "step-5-loading-artifact",
        role: "assistant",
        timestamp: "2026-01-01T00:00:00.000Z",
        content: "Generating Implementation Planner...",
      });
    });

    it("returns loading message for automated steps generating", () => {
      const activeState: NormalizedWorkflowState = {
        stepNumber: 4,
        status: STEP_STATES.AUTOMATED.GENERATING,
      };

      const message = createLoadingMessage(baseContext, 4, activeState);

      expect(message).toEqual({
        type: "loading",
        id: "step-4-loading-artifact",
        role: "assistant",
        timestamp: "2026-01-01T00:00:00.000Z",
        content: "Generating Style Anchors Collection...",
      });
    });

    it("returns null for Step 1 collecting info", () => {
      const activeState: NormalizedWorkflowState = {
        stepNumber: 1,
        status: STEP_STATES.STEP_1.COLLECTING_INFO,
      };

      const message = createLoadingMessage(baseContext, 1, activeState);

      expect(message).toBeNull();
    });

    it("returns null for Step 5 collecting info", () => {
      const activeState: NormalizedWorkflowState = {
        stepNumber: 5,
        status: STEP_STATES.STEP_5.COLLECTING_INFO,
      };

      const message = createLoadingMessage(baseContext, 5, activeState);

      expect(message).toBeNull();
    });

    it("returns null for interview states", () => {
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const message = createLoadingMessage(baseContext, 2, activeState);

      expect(message).toBeNull();
    });

    it("returns null for complete state", () => {
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.COMPLETE,
      };

      const message = createLoadingMessage(baseContext, 2, activeState);

      expect(message).toBeNull();
    });

    it("uses context timestamp", () => {
      const context = {
        updatedAt: "2026-01-02T12:34:56.789Z",
      } as PlanningContext;
      const activeState: NormalizedWorkflowState = {
        stepNumber: 4,
        status: STEP_STATES.AUTOMATED.GENERATING,
      };

      const message = createLoadingMessage(context, 4, activeState);

      expect(message?.timestamp).toBe("2026-01-02T12:34:56.789Z");
    });
  });
});
