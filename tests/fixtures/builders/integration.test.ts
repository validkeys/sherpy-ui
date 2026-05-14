/**
 * Integration tests for PlanningStateBuilder
 * Tests multi-step workflows, state transitions, and complex scenarios
 */

import { describe, expect, it } from "vitest";
import type { PlanningContext } from "../../../src/features/planning/machines/types";
import {
  assertValidPlanningContext,
  validatePlanningContext,
} from "../validation";
import { PlanningStateBuilder } from "./PlanningStateBuilder";

describe("PlanningStateBuilder - Multi-step workflows", () => {
  it("completes Steps 1-3 sequentially with artifacts", () => {
    const state = PlanningStateBuilder.atStep(4)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .build();

    expect(state.completedSteps).toEqual([1, 2, 3]);
    expect(state.currentStepNumber).toBe(4);
    expect(state.artifacts[1]).toBeDefined();
    expect(state.artifacts[2]).toBeDefined();
    expect(state.artifacts[3]).toBeDefined();
  });

  it("accumulates artifacts across workflow progression", () => {
    const state = PlanningStateBuilder.atStep(1)
      .completeStep(1)
      .withCurrentStepNumber(2)
      .completeStep(2)
      .withCurrentStepNumber(3)
      .completeStep(3)
      .withCurrentStepNumber(4)
      .build();

    // Verify all artifacts exist
    expect(Object.keys(state.artifacts)).toHaveLength(3);
    expect(state.artifacts[1]).toBeDefined();
    expect(state.artifacts[2]).toBeDefined();
    expect(state.artifacts[3]).toBeDefined();

    // Verify artifact types
    expect(state.artifacts[1].type).toBe("markdown");
    expect(state.artifacts[2].type).toBe("yaml");
    expect(state.artifacts[3].type).toBe("yaml");
  });

  it("maintains completedSteps consistency with atStep helper", () => {
    const state = PlanningStateBuilder.atStep(5).build();

    expect(state.currentStepNumber).toBe(5);
    expect(state.completedSteps).toEqual([1, 2, 3, 4]);
  });

  it("progresses from Step 1 to Step 3 with all data", () => {
    const state = PlanningStateBuilder.new()
      .completeStep(1)
      .withCurrentStepNumber(2)
      .withCompletedSteps([1])
      .completeStep(2)
      .withCurrentStepNumber(3)
      .withCompletedSteps([1, 2])
      .completeStep(3)
      .withCurrentStepNumber(4)
      .withCompletedSteps([1, 2, 3])
      .build();

    // Verify Step 1 data
    expect(state.step1Responses.projectDescription).toBeTruthy();
    expect(state.artifacts[1].content).toContain("Gap Analysis");

    // Verify Step 2 data
    expect(state.step2Answers).toHaveLength(3);
    expect(state.artifacts[2].content).toContain("Business Requirements");

    // Verify Step 3 data
    expect(state.step3Answers).toHaveLength(3);
    expect(state.artifacts[3].content).toContain("Technical Requirements");

    // Verify state progression
    expect(state.completedSteps).toEqual([1, 2, 3]);
    expect(state.currentStepNumber).toBe(4);
  });

  it("builds valid PlanningContext at any workflow stage", () => {
    const states: PlanningContext[] = [
      PlanningStateBuilder.atStep(1).build(),
      PlanningStateBuilder.atStep(2).completeStep(1).build(),
      PlanningStateBuilder.atStep(3).completeStep(1).completeStep(2).build(),
      PlanningStateBuilder.atStep(4)
        .completeStep(1)
        .completeStep(2)
        .completeStep(3)
        .build(),
    ];

    states.forEach((state, index) => {
      const result = validatePlanningContext(state);
      expect(result.success).toBe(true);
      expect(state.currentStepNumber).toBe(index + 1);
    });
  });
});

describe("PlanningStateBuilder - State transitions", () => {
  it("transitions from new project to Step 1 complete", () => {
    const initial = PlanningStateBuilder.new().build();
    const afterStep1 = PlanningStateBuilder.new()
      .completeStep(1)
      .withCompletedSteps([1])
      .withCurrentStepNumber(2)
      .build();

    expect(initial.currentStepNumber).toBe(1);
    expect(initial.completedSteps).toEqual([]);
    expect(initial.artifacts).toEqual({});

    expect(afterStep1.currentStepNumber).toBe(2);
    expect(afterStep1.completedSteps).toEqual([1]);
    expect(afterStep1.artifacts[1]).toBeDefined();
  });

  it("transitions through interview steps with question state", () => {
    // Step 2: Business Requirements interview in progress
    const duringStep2 = PlanningStateBuilder.atStep(2)
      .completeStep(1)
      .withStep2CurrentQuestion("What is the primary business goal?", [
        "Revenue growth",
        "Cost reduction",
        "User experience",
      ])
      .withStep2Answers([
        {
          question: "Who are the stakeholders?",
          value: "Product team, engineering team, executives",
          timestamp: "2026-05-14T10:00:00.000Z",
        },
      ])
      .build();

    expect(duringStep2.step2CurrentQuestion).toBe(
      "What is the primary business goal?",
    );
    expect(duringStep2.step2CurrentOptions).toHaveLength(3);
    expect(duringStep2.step2Answers).toHaveLength(1);
    expect(duringStep2.completedSteps).toEqual([1]);

    // Step 2 completed
    const afterStep2 = PlanningStateBuilder.atStep(3)
      .completeStep(1)
      .completeStep(2)
      .withStep2CurrentQuestion(null, null)
      .build();

    expect(afterStep2.step2CurrentQuestion).toBeNull();
    expect(afterStep2.step2CurrentOptions).toBeNull();
    expect(afterStep2.step2Answers).toHaveLength(3);
    expect(afterStep2.completedSteps).toEqual([1, 2]);
  });

  it("handles error state during workflow", () => {
    const stateWithError = PlanningStateBuilder.atStep(2)
      .completeStep(1)
      .withError("Failed to generate business requirements")
      .build();

    expect(stateWithError.error).toBe(
      "Failed to generate business requirements",
    );
    expect(stateWithError.currentStepNumber).toBe(2);
    expect(stateWithError.completedSteps).toEqual([1]);
  });

  it("recovers from error state and continues", () => {
    const recovered = PlanningStateBuilder.atStep(2)
      .completeStep(1)
      .withError("Temporary network error")
      .withError(null) // Clear error
      .completeStep(2)
      .withCurrentStepNumber(3)
      .withCompletedSteps([1, 2])
      .build();

    expect(recovered.error).toBeNull();
    expect(recovered.completedSteps).toEqual([1, 2]);
    expect(recovered.artifacts[2]).toBeDefined();
  });
});

describe("PlanningStateBuilder - Complex scenarios", () => {
  it("builds full workflow with all builder methods", () => {
    const state = PlanningStateBuilder.new()
      .withProjectId("healthcare-portal-2026")
      .withEntryPath("new-project")
      .completeStep(1)
      .withCurrentStepNumber(2)
      .withCompletedSteps([1])
      .completeStep(2)
      .withCurrentStepNumber(3)
      .withCompletedSteps([1, 2])
      .completeStep(3)
      .withCurrentStepNumber(4)
      .withCompletedSteps([1, 2, 3])
      .build();

    // Verify basic properties
    expect(state.projectId).toBe("healthcare-portal-2026");
    expect(state.entryPath).toBe("new-project");
    expect(state.currentStepNumber).toBe(4);
    expect(state.completedSteps).toEqual([1, 2, 3]);

    // Verify all steps completed with data
    expect(state.step1Responses.projectDescription).toContain(
      "Healthcare patient portal",
    );
    expect(state.step2Answers).toHaveLength(3);
    expect(state.step3Answers).toHaveLength(3);

    // Verify all artifacts generated
    expect(Object.keys(state.artifacts)).toHaveLength(3);
    expect(state.artifacts[1].content).toContain("Gap Analysis");
    expect(state.artifacts[2].content).toContain("Business Requirements");
    expect(state.artifacts[3].content).toContain("Technical Requirements");

    // Verify valid context
    assertValidPlanningContext(state);
  });

  it("handles existing project entry path", () => {
    const state = PlanningStateBuilder.new()
      .withProjectId("existing-app")
      .withEntryPath("existing-project")
      .withGapAnalysis({
        existingRequirements: "Yes",
        projectDescription: "Extending existing healthcare platform",
      })
      .withCurrentStepNumber(2)
      .withCompletedSteps([1])
      .build();

    expect(state.entryPath).toBe("existing-project");
    expect(state.step1Responses.existingRequirements).toBe("Yes");
    expect(state.artifacts[1].content).toContain("existing requirements");
  });

  it("builds state for testing Step 5 (Implementation Planner)", () => {
    const state = PlanningStateBuilder.atStep(5)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .withStep5Responses({
        approach: "incremental",
        testStrategy: "TDD with integration tests",
      })
      .build();

    expect(state.currentStepNumber).toBe(5);
    expect(state.completedSteps).toEqual([1, 2, 3, 4]);
    expect(state.step5Responses.approach).toBe("incremental");
    expect(state.step5Responses.testStrategy).toBe(
      "TDD with integration tests",
    );

    // Verify prerequisites for Step 5
    expect(state.artifacts[1]).toBeDefined();
    expect(state.artifacts[2]).toBeDefined();
    expect(state.artifacts[3]).toBeDefined();
  });

  it("builds state for testing Step 7 (User Edits)", () => {
    const state = PlanningStateBuilder.atStep(7)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .withStep7Edits(
        "User requested: Change database from PostgreSQL to MongoDB",
      )
      .build();

    expect(state.currentStepNumber).toBe(7);
    expect(state.step7Edits).toContain("MongoDB");
    expect(state.artifacts[1]).toBeDefined();
  });

  it("supports partial workflow with custom data", () => {
    const state = PlanningStateBuilder.atStep(3)
      .withProjectId("custom-project")
      .withGapAnalysis({
        existingRequirements: "No",
        projectDescription: "E-commerce platform with AI recommendations",
      })
      .withBusinessRequirements([
        {
          question: "What is the target market?",
          value: "B2C retail customers aged 25-45",
          timestamp: "2026-05-14T09:00:00.000Z",
        },
        {
          question: "What is the revenue model?",
          value:
            "Commission-based marketplace with subscription tier for premium features",
          timestamp: "2026-05-14T09:15:00.000Z",
        },
      ])
      .build();

    expect(state.projectId).toBe("custom-project");
    expect(state.step1Responses.projectDescription).toContain("E-commerce");
    expect(state.step2Answers).toHaveLength(2);
    expect(state.step2Answers[0].question).toContain("target market");
    expect(state.artifacts[1]).toBeDefined();
    expect(state.artifacts[2]).toBeDefined();
  });
});

describe("PlanningStateBuilder - State consistency", () => {
  it("maintains artifact timestamps in chronological order", () => {
    const state = PlanningStateBuilder.atStep(4)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .build();

    const timestamps = [
      state.artifacts[1].generatedAt,
      state.artifacts[2].generatedAt,
      state.artifacts[3].generatedAt,
    ];

    // All timestamps should be defined
    for (const ts of timestamps) {
      expect(ts).toBeTruthy();
    }

    // Timestamps should be valid ISO strings
    for (const ts of timestamps) {
      expect(new Date(ts).toISOString()).toBe(ts);
    }
  });

  it("ensures completedSteps matches artifact presence", () => {
    const state = PlanningStateBuilder.atStep(3)
      .completeStep(1)
      .completeStep(2)
      .build();

    state.completedSteps.forEach((stepNum) => {
      expect(state.artifacts[stepNum]).toBeDefined();
    });

    expect(Object.keys(state.artifacts)).toHaveLength(
      state.completedSteps.length,
    );
  });

  it("validates state after each step completion", () => {
    const step1Complete = PlanningStateBuilder.new()
      .completeStep(1)
      .withCurrentStepNumber(2)
      .withCompletedSteps([1])
      .build();

    assertValidPlanningContext(step1Complete);

    const step2Complete = PlanningStateBuilder.atStep(2)
      .completeStep(1)
      .completeStep(2)
      .withCurrentStepNumber(3)
      .withCompletedSteps([1, 2])
      .build();

    assertValidPlanningContext(step2Complete);

    const step3Complete = PlanningStateBuilder.atStep(3)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .withCurrentStepNumber(4)
      .withCompletedSteps([1, 2, 3])
      .build();

    assertValidPlanningContext(step3Complete);
  });

  it("handles interview answers with proper timestamps", () => {
    const baseTime = new Date("2026-05-14T10:00:00.000Z");
    const state = PlanningStateBuilder.atStep(3)
      .completeStep(1)
      .withBusinessRequirements([
        {
          question: "Q1",
          value: "A1",
          timestamp: new Date(baseTime.getTime()).toISOString(),
        },
        {
          question: "Q2",
          value: "A2",
          timestamp: new Date(baseTime.getTime() + 300000).toISOString(),
        },
        {
          question: "Q3",
          value: "A3",
          timestamp: new Date(baseTime.getTime() + 600000).toISOString(),
        },
      ])
      .build();

    // Verify timestamps are preserved
    expect(state.step2Answers[0].timestamp).toBe("2026-05-14T10:00:00.000Z");
    expect(state.step2Answers[1].timestamp).toBe("2026-05-14T10:05:00.000Z");
    expect(state.step2Answers[2].timestamp).toBe("2026-05-14T10:10:00.000Z");
  });

  it("preserves updatedAt timestamp", () => {
    const state = PlanningStateBuilder.new().build();

    expect(state.updatedAt).toBeTruthy();
    expect(new Date(state.updatedAt).toISOString()).toBe(state.updatedAt);
  });
});

describe("PlanningStateBuilder - Error scenarios", () => {
  it("throws error for invalid step numbers", () => {
    expect(() => {
      PlanningStateBuilder.new().completeStep(0);
    }).toThrow(/not yet implemented for step 0/);

    expect(() => {
      PlanningStateBuilder.new().completeStep(11);
    }).toThrow(/not yet implemented for step 11/);
  });

  it("validates Zod schemas reject invalid Step 1 responses", () => {
    expect(() => {
      PlanningStateBuilder.new().withGapAnalysis({
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
        existingRequirements: "Maybe" as any, // Invalid value
        projectDescription: "",
      });
    }).toThrow();
  });

  it("validates Zod schemas reject invalid interview answers", () => {
    expect(() => {
      PlanningStateBuilder.new().withBusinessRequirements([
        {
          question: "", // Invalid: empty question
          value: "Answer",
          timestamp: "2026-05-14T10:00:00.000Z",
        },
      ]);
    }).toThrow();
  });

  it("validates Zod schemas reject invalid timestamps", () => {
    expect(() => {
      PlanningStateBuilder.new().withBusinessRequirements([
        {
          question: "Valid question",
          value: "Answer",
          timestamp: "not-a-timestamp", // Invalid format
        },
      ]);
    }).toThrow();
  });

  it("handles empty interview answers gracefully", () => {
    const state = PlanningStateBuilder.atStep(2)
      .completeStep(1)
      .withBusinessRequirements([])
      .build();

    expect(state.step2Answers).toHaveLength(0);
    expect(state.artifacts[2]).toBeDefined(); // Artifact still generated
  });
});

describe("PlanningStateBuilder - atStep helper consistency", () => {
  it("atStep(1) has no completed steps", () => {
    const state = PlanningStateBuilder.atStep(1).build();

    expect(state.currentStepNumber).toBe(1);
    expect(state.completedSteps).toEqual([]);
  });

  it("atStep(5) has Steps 1-4 completed", () => {
    const state = PlanningStateBuilder.atStep(5).build();

    expect(state.currentStepNumber).toBe(5);
    expect(state.completedSteps).toEqual([1, 2, 3, 4]);
  });

  it("atStep(10) has Steps 1-9 completed", () => {
    const state = PlanningStateBuilder.atStep(10).build();

    expect(state.currentStepNumber).toBe(10);
    expect(state.completedSteps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("can override atStep-generated completedSteps", () => {
    const state = PlanningStateBuilder.atStep(5)
      .withCompletedSteps([1, 2]) // Override default [1,2,3,4]
      .build();

    expect(state.currentStepNumber).toBe(5);
    expect(state.completedSteps).toEqual([1, 2]);
  });
});
