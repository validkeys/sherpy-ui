import type { PlanningContext } from "../../../src/features/planning/machines/types";

const BASE_TIME = "2026-05-26T10:00:00.000Z";
const UPDATED_TIME = "2026-05-26T10:15:00.000Z";

const STEP_2_QUESTIONS = [
  [
    "What problem does this product solve?",
    "It reduces planning drift by turning interviews into structured delivery artifacts.",
  ],
  [
    "Who are the primary users?",
    "Product teams, engineering leads, and delivery managers planning software work.",
  ],
  [
    "What business outcome matters most?",
    "Faster project kickoff with clearer requirements and fewer rework cycles.",
  ],
] as const;

const STEP_3_QUESTIONS = [
  [
    "What architecture constraints should the team respect?",
    "Use the existing React, XState, and TanStack Start architecture.",
  ],
  [
    "What integrations are required?",
    "Local persistence, artifact generation, and project workflow state restoration.",
  ],
] as const;

export class PlanningStateBuilder {
  private state: PlanningContext;

  private constructor() {
    this.state = {
      projectId: `seed-${Date.now().toString(36)}`,
      entryPath: "new-project",
      startedAt: BASE_TIME,
      updatedAt: UPDATED_TIME,
      step1Responses: {},
      step2Answers: [],
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3Answers: [],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {},
      completedSteps: [],
      currentStepNumber: 1,
      error: null,
    };
  }

  static new(): PlanningStateBuilder {
    return new PlanningStateBuilder();
  }

  static atStep(stepNumber: number): PlanningStateBuilder {
    const builder = new PlanningStateBuilder();

    for (let step = 1; step < stepNumber; step++) {
      builder.completeStep(step);
    }

    return builder
      .withCurrentStepNumber(stepNumber)
      .withCompletedSteps(
        Array.from({ length: stepNumber - 1 }, (_, index) => index + 1),
      );
  }

  withProjectId(projectId: string): PlanningStateBuilder {
    this.state.projectId = projectId;
    return this;
  }

  withCurrentStepNumber(stepNumber: number): PlanningStateBuilder {
    this.state.currentStepNumber = stepNumber;

    if (stepNumber === 2) {
      this.state.step2CurrentQuestion =
        "Who needs this workflow most right now?";
      this.state.step2CurrentOptions = [
        "Product managers",
        "Engineering leads",
        "Delivery teams",
      ];
    }

    if (stepNumber === 3) {
      this.state.step3CurrentQuestion =
        "What technical risk should be handled first?";
      this.state.step3CurrentOptions = [
        "State persistence",
        "Artifact generation",
        "User authentication",
      ];
    }

    return this;
  }

  withCompletedSteps(completedSteps: number[]): PlanningStateBuilder {
    this.state.completedSteps = completedSteps;
    return this;
  }

  completeStep(stepNumber: number): PlanningStateBuilder {
    if (stepNumber === 1) {
      this.state.step1Responses = {
        existingRequirements: "No",
        projectDescription:
          "A workflow planning assistant for software delivery teams.",
      };
      this.state.artifacts[1] = {
        type: "markdown",
        content:
          "# Gap Analysis Worksheet\n\nA workflow planning assistant for software delivery teams.",
        generatedAt: "2026-05-26T10:05:00.000Z",
      };
    }

    if (stepNumber === 2) {
      this.state.step2Answers = STEP_2_QUESTIONS.map(
        ([question, value], index) => ({
          question,
          value,
          timestamp: `2026-05-26T10:1${index}:00.000Z`,
        }),
      );
      this.state.step2CurrentQuestion = null;
      this.state.step2CurrentOptions = null;
      this.state.artifacts[2] = {
        type: "yaml",
        content:
          "business_requirements:\n  summary: Workflow planning assistant\n",
        generatedAt: "2026-05-26T10:14:00.000Z",
      };
    }

    if (stepNumber === 3) {
      this.state.step3Answers = STEP_3_QUESTIONS.map(
        ([question, value], index) => ({
          question,
          value,
          timestamp: `2026-05-26T10:2${index}:00.000Z`,
        }),
      );
      this.state.step3CurrentQuestion = null;
      this.state.step3CurrentOptions = null;
      this.state.artifacts[3] = {
        type: "yaml",
        content:
          "technical_requirements:\n  architecture: Layered React workflow\n",
        generatedAt: "2026-05-26T10:24:00.000Z",
      };
    }

    if (stepNumber === 5) {
      this.state.step5Responses = {
        deploymentStrategy: "Deploy through the existing frontend pipeline.",
        techStack: "React, XState, TanStack Start, and TypeScript.",
      };
      this.state.artifacts[5] = {
        type: "yaml",
        content: "implementation_plan:\n  stack: React and XState\n",
        generatedAt: "2026-05-26T10:35:00.000Z",
      };
    }

    if (!this.state.completedSteps.includes(stepNumber)) {
      this.state.completedSteps.push(stepNumber);
    }

    return this;
  }

  build(): PlanningContext {
    return structuredClone(this.state);
  }
}
