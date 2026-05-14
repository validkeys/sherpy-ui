/**
 * PlanningStateBuilder Tests
 * Verifies builder creates valid PlanningContext states
 */

import { describe, expect, it } from "vitest";
import type { PlanningContext } from "../../../src/features/planning/machines/types";
import { PlanningStateBuilder } from "./PlanningStateBuilder";

describe("PlanningStateBuilder", () => {
  describe("new()", () => {
    it("creates minimal valid state", () => {
      const state = PlanningStateBuilder.new().build();

      expect(state.projectId).toBe("test-project");
      expect(state.entryPath).toBe("new-project");
      expect(state.startedAt).toBeDefined();
      expect(state.updatedAt).toBeDefined();
      expect(state.step1Responses).toEqual({});
      expect(state.step2Answers).toEqual([]);
      expect(state.step2CurrentQuestion).toBeNull();
      expect(state.step2CurrentOptions).toBeNull();
      expect(state.step3Answers).toEqual([]);
      expect(state.step3CurrentQuestion).toBeNull();
      expect(state.step3CurrentOptions).toBeNull();
      expect(state.step5Responses).toEqual({});
      expect(state.step7Edits).toBeNull();
      expect(state.artifacts).toEqual({});
      expect(state.completedSteps).toEqual([]);
      expect(state.currentStepNumber).toBe(1);
      expect(state.error).toBeNull();
    });

    it("generates valid ISO timestamps", () => {
      const state = PlanningStateBuilder.new().build();

      expect(() => new Date(state.startedAt)).not.toThrow();
      expect(() => new Date(state.updatedAt)).not.toThrow();
    });
  });

  describe("atStep()", () => {
    it("creates state at step 1", () => {
      const state = PlanningStateBuilder.atStep(1).build();

      expect(state.currentStepNumber).toBe(1);
      expect(state.completedSteps).toEqual([]);
    });

    it("creates state at step 5 with completed steps 1-4", () => {
      const state = PlanningStateBuilder.atStep(5).build();

      expect(state.currentStepNumber).toBe(5);
      expect(state.completedSteps).toEqual([1, 2, 3, 4]);
    });

    it("creates state at step 10 with completed steps 1-9", () => {
      const state = PlanningStateBuilder.atStep(10).build();

      expect(state.currentStepNumber).toBe(10);
      expect(state.completedSteps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe("fluent API", () => {
    it("chains withProjectId", () => {
      const state = PlanningStateBuilder.new()
        .withProjectId("custom-project-123")
        .build();

      expect(state.projectId).toBe("custom-project-123");
    });

    it("chains withEntryPath", () => {
      const state = PlanningStateBuilder.new()
        .withEntryPath("existing-project")
        .build();

      expect(state.entryPath).toBe("existing-project");
    });

    it("chains withStep1Responses", () => {
      const responses = {
        existingRequirements: "Yes, we have PRD",
        projectDescription: "A healthcare portal",
      };

      const state = PlanningStateBuilder.new()
        .withStep1Responses(responses)
        .build();

      expect(state.step1Responses).toEqual(responses);
    });

    it("chains withStep2Answers", () => {
      const answers = [
        {
          question: "What is the primary goal?",
          value: "Improve user experience",
          timestamp: "2026-05-14T10:00:00.000Z",
        },
      ];

      const state = PlanningStateBuilder.new()
        .withStep2Answers(answers)
        .build();

      expect(state.step2Answers).toEqual(answers);
    });

    it("chains withStep2CurrentQuestion", () => {
      const state = PlanningStateBuilder.new()
        .withStep2CurrentQuestion("What is the budget?", ["< $100k", "> $100k"])
        .build();

      expect(state.step2CurrentQuestion).toBe("What is the budget?");
      expect(state.step2CurrentOptions).toEqual(["< $100k", "> $100k"]);
    });

    it("chains withStep3Answers", () => {
      const answers = [
        {
          question: "What framework?",
          value: "React",
          timestamp: "2026-05-14T11:00:00.000Z",
        },
      ];

      const state = PlanningStateBuilder.new()
        .withStep3Answers(answers)
        .build();

      expect(state.step3Answers).toEqual(answers);
    });

    it("chains withStep3CurrentQuestion", () => {
      const state = PlanningStateBuilder.new()
        .withStep3CurrentQuestion("What database?", ["PostgreSQL", "MongoDB"])
        .build();

      expect(state.step3CurrentQuestion).toBe("What database?");
      expect(state.step3CurrentOptions).toEqual(["PostgreSQL", "MongoDB"]);
    });

    it("chains withStep5Responses", () => {
      const responses = {
        deploymentStrategy: "Cloud",
        techStack: "React, Node.js",
      };

      const state = PlanningStateBuilder.new()
        .withStep5Responses(responses)
        .build();

      expect(state.step5Responses).toEqual(responses);
    });

    it("chains withStep7Edits", () => {
      const edits = "# Architecture Decision\n\nUpdated content";

      const state = PlanningStateBuilder.new().withStep7Edits(edits).build();

      expect(state.step7Edits).toBe(edits);
    });

    it("chains withArtifact", () => {
      const artifact = {
        type: "yaml" as const,
        content: "key: value",
        generatedAt: "2026-05-14T12:00:00.000Z",
      };

      const state = PlanningStateBuilder.new()
        .withArtifact(2, artifact)
        .build();

      expect(state.artifacts[2]).toEqual(artifact);
    });

    it("chains multiple withArtifact calls", () => {
      const artifact1 = {
        type: "yaml" as const,
        content: "step1: data",
        generatedAt: "2026-05-14T12:00:00.000Z",
      };
      const artifact2 = {
        type: "markdown" as const,
        content: "# Step 2",
        generatedAt: "2026-05-14T13:00:00.000Z",
      };

      const state = PlanningStateBuilder.new()
        .withArtifact(1, artifact1)
        .withArtifact(2, artifact2)
        .build();

      expect(state.artifacts[1]).toEqual(artifact1);
      expect(state.artifacts[2]).toEqual(artifact2);
    });

    it("chains withCompletedSteps", () => {
      const state = PlanningStateBuilder.new()
        .withCompletedSteps([1, 2, 3])
        .build();

      expect(state.completedSteps).toEqual([1, 2, 3]);
    });

    it("chains withCurrentStepNumber", () => {
      const state = PlanningStateBuilder.new().withCurrentStepNumber(7).build();

      expect(state.currentStepNumber).toBe(7);
    });

    it("chains withError", () => {
      const state = PlanningStateBuilder.new()
        .withError("API connection failed")
        .build();

      expect(state.error).toBe("API connection failed");
    });

    it("chains multiple methods", () => {
      const state = PlanningStateBuilder.new()
        .withProjectId("multi-chain-test")
        .withEntryPath("existing-project")
        .withStep1Responses({ key: "value" })
        .withCurrentStepNumber(3)
        .withCompletedSteps([1, 2])
        .build();

      expect(state.projectId).toBe("multi-chain-test");
      expect(state.entryPath).toBe("existing-project");
      expect(state.step1Responses).toEqual({ key: "value" });
      expect(state.currentStepNumber).toBe(3);
      expect(state.completedSteps).toEqual([1, 2]);
    });
  });

  describe("complex scenarios", () => {
    it("builds state for step 2 in progress with partial answers", () => {
      const state = PlanningStateBuilder.atStep(2)
        .withStep1Responses({
          existingRequirements: "No",
          projectDescription: "E-commerce platform",
        })
        .withStep2Answers([
          {
            question: "What is the primary goal?",
            value: "Increase sales",
            timestamp: "2026-05-14T10:00:00.000Z",
          },
        ])
        .withStep2CurrentQuestion("What is the target audience?", [
          "B2B",
          "B2C",
          "Both",
        ])
        .build();

      expect(state.currentStepNumber).toBe(2);
      expect(state.completedSteps).toEqual([1]);
      expect(state.step1Responses).toHaveProperty("projectDescription");
      expect(state.step2Answers).toHaveLength(1);
      expect(state.step2CurrentQuestion).toBe("What is the target audience?");
      expect(state.step2CurrentOptions).toEqual(["B2B", "B2C", "Both"]);
    });

    it("builds state for step 5 with all previous steps completed", () => {
      const state = PlanningStateBuilder.atStep(5)
        .withStep1Responses({
          existingRequirements: "Yes",
          projectDescription: "Mobile app",
        })
        .withStep2Answers([
          {
            question: "Q1",
            value: "A1",
            timestamp: "2026-05-14T10:00:00.000Z",
          },
        ])
        .withStep3Answers([
          {
            question: "Q1",
            value: "A1",
            timestamp: "2026-05-14T11:00:00.000Z",
          },
        ])
        .withArtifact(2, {
          type: "yaml",
          content: "business: requirements",
          generatedAt: "2026-05-14T10:30:00.000Z",
        })
        .withArtifact(3, {
          type: "yaml",
          content: "technical: requirements",
          generatedAt: "2026-05-14T11:30:00.000Z",
        })
        .build();

      expect(state.currentStepNumber).toBe(5);
      expect(state.completedSteps).toEqual([1, 2, 3, 4]);
      expect(state.artifacts[2]).toBeDefined();
      expect(state.artifacts[3]).toBeDefined();
    });

    it("builds state with error", () => {
      const state = PlanningStateBuilder.atStep(3)
        .withError("Network timeout during artifact generation")
        .build();

      expect(state.currentStepNumber).toBe(3);
      expect(state.error).toBe("Network timeout during artifact generation");
    });
  });

  describe("type safety", () => {
    it("returns PlanningContext type", () => {
      const state = PlanningStateBuilder.new().build();

      const context: PlanningContext = state;
      expect(context).toBeDefined();
    });

    it("accepts valid artifact types", () => {
      const yamlArtifact = {
        type: "yaml" as const,
        content: "key: value",
        generatedAt: "2026-05-14T12:00:00.000Z",
      };
      const mdArtifact = {
        type: "markdown" as const,
        content: "# Title",
        generatedAt: "2026-05-14T12:00:00.000Z",
      };

      const state = PlanningStateBuilder.new()
        .withArtifact(1, yamlArtifact)
        .withArtifact(2, mdArtifact)
        .build();

      expect(state.artifacts[1]?.type).toBe("yaml");
      expect(state.artifacts[2]?.type).toBe("markdown");
    });

    it("accepts valid entry paths", () => {
      const newProject = PlanningStateBuilder.new()
        .withEntryPath("new-project")
        .build();
      const existingProject = PlanningStateBuilder.new()
        .withEntryPath("existing-project")
        .build();

      expect(newProject.entryPath).toBe("new-project");
      expect(existingProject.entryPath).toBe("existing-project");
    });
  });

  describe("Step 1 (Gap Analysis) methods", () => {
    describe("withGapAnalysis()", () => {
      it("populates Step 1 responses and generates artifact", () => {
        const state = PlanningStateBuilder.new()
          .withGapAnalysis({
            existingRequirements: "No",
            projectDescription: "Healthcare portal",
          })
          .build();

        expect(state.step1Responses).toEqual({
          existingRequirements: "No",
          projectDescription: "Healthcare portal",
        });
        expect(state.artifacts[1]).toBeDefined();
        expect(state.artifacts[1]?.type).toBe("markdown");
        expect(state.artifacts[1]?.content).toContain("Healthcare portal");
        expect(state.artifacts[1]?.content).toContain("Gap Analysis");
      });

      it("generates artifact with new project guidance", () => {
        const state = PlanningStateBuilder.new()
          .withGapAnalysis({
            existingRequirements: "No",
            projectDescription: "E-commerce platform",
          })
          .build();

        expect(state.artifacts[1]?.content).toContain("new project");
        expect(state.artifacts[1]?.content).toContain(
          "business requirements interview",
        );
      });

      it("generates artifact with existing project guidance", () => {
        const state = PlanningStateBuilder.new()
          .withGapAnalysis({
            existingRequirements: "Yes, we have a PRD",
            projectDescription: "Mobile app",
          })
          .build();

        expect(state.artifacts[1]?.content).toContain("existing requirements");
        expect(state.artifacts[1]?.content).toContain(
          "Review existing documentation",
        );
      });

      it("validates responses with Zod schema", () => {
        const builder = PlanningStateBuilder.new();

        expect(() => {
          builder.withGapAnalysis({
            existingRequirements: "", // invalid - cannot be empty
            projectDescription: "Test",
          });
        }).toThrow();

        expect(() => {
          builder.withGapAnalysis({
            existingRequirements: "No",
            projectDescription: "", // invalid - cannot be empty
          });
        }).toThrow();
      });

      it("generates valid ISO timestamp in artifact", () => {
        const state = PlanningStateBuilder.new()
          .withGapAnalysis({
            existingRequirements: "No",
            projectDescription: "Test project",
          })
          .build();

        const generatedAt = state.artifacts[1]?.generatedAt;
        expect(generatedAt).toBeDefined();
        expect(() => new Date(generatedAt!)).not.toThrow();
      });

      it("chains with other builder methods", () => {
        const state = PlanningStateBuilder.new()
          .withProjectId("gap-test-123")
          .withGapAnalysis({
            existingRequirements: "No",
            projectDescription: "Chain test",
          })
          .withCurrentStepNumber(1)
          .build();

        expect(state.projectId).toBe("gap-test-123");
        expect(state.step1Responses.projectDescription).toBe("Chain test");
        expect(state.artifacts[1]).toBeDefined();
      });
    });

    describe("completeStep(1)", () => {
      it("completes Step 1 with default healthcare data", () => {
        const state = PlanningStateBuilder.new().completeStep(1).build();

        expect(state.step1Responses.existingRequirements).toBe("No");
        expect(state.step1Responses.projectDescription).toContain("Healthcare");
        expect(state.step1Responses.projectDescription).toContain("portal");
      });

      it("generates Gap Analysis artifact", () => {
        const state = PlanningStateBuilder.new().completeStep(1).build();

        expect(state.artifacts[1]).toBeDefined();
        expect(state.artifacts[1]?.type).toBe("markdown");
        expect(state.artifacts[1]?.content).toContain("Gap Analysis");
        expect(state.artifacts[1]?.generatedAt).toBeDefined();
      });

      it("throws for invalid step numbers", () => {
        const builder = PlanningStateBuilder.new();

        expect(() => {
          builder.completeStep(0);
        }).toThrow("completeStep not yet implemented for step 0");

        expect(() => {
          builder.completeStep(11);
        }).toThrow("completeStep not yet implemented for step 11");
      });

      it("chains with atStep() for multi-step scenarios", () => {
        const state = PlanningStateBuilder.atStep(2)
          .completeStep(1) // Add Step 1 data even though we're at Step 2
          .build();

        expect(state.currentStepNumber).toBe(2);
        expect(state.completedSteps).toEqual([1]);
        expect(state.step1Responses.projectDescription).toBeTruthy();
        expect(state.artifacts[1]).toBeDefined();
      });
    });
  });

  describe("Step 2 (Business Requirements) methods", () => {
    describe("withBusinessRequirements()", () => {
      it("populates Step 2 answers and generates artifact", () => {
        const answers = [
          {
            question: "What is the primary goal?",
            value: "Improve patient care",
            timestamp: "2026-05-14T10:00:00.000Z",
          },
        ];
        const state = PlanningStateBuilder.new()
          .withBusinessRequirements(answers)
          .build();

        expect(state.step2Answers).toEqual(answers);
        expect(state.artifacts[2]).toBeDefined();
        expect(state.artifacts[2]?.type).toBe("yaml");
      });

      it("generates YAML artifact with multiple answers", () => {
        const answers = [
          {
            question: "What is the business goal?",
            value: "Increase revenue",
            timestamp: "2026-05-14T10:00:00.000Z",
          },
          {
            question: "Who are the users?",
            value: "Sales team and customers",
            timestamp: "2026-05-14T10:05:00.000Z",
          },
          {
            question: "What are success metrics?",
            value: "20% increase in conversions",
            timestamp: "2026-05-14T10:10:00.000Z",
          },
        ];
        const state = PlanningStateBuilder.new()
          .withBusinessRequirements(answers)
          .build();

        const artifact = state.artifacts[2];
        expect(artifact?.content).toContain("Business Requirements");
        expect(artifact?.content).toContain("What is the business goal?");
        expect(artifact?.content).toContain("Increase revenue");
        expect(artifact?.content).toContain("total_questions: 3");
      });

      it("validates answers with Zod schema", () => {
        const builder = PlanningStateBuilder.new();

        expect(() => {
          builder.withBusinessRequirements([
            {
              question: "", // invalid - cannot be empty
              value: "Test answer",
              timestamp: "2026-05-14T10:00:00.000Z",
            },
          ]);
        }).toThrow();

        expect(() => {
          builder.withBusinessRequirements([
            {
              question: "Test question",
              value: "", // invalid - cannot be empty
              timestamp: "2026-05-14T10:00:00.000Z",
            },
          ]);
        }).toThrow();

        expect(() => {
          builder.withBusinessRequirements([
            {
              question: "Test question",
              value: "Test answer",
              timestamp: "not-a-valid-date", // invalid timestamp
            },
          ]);
        }).toThrow();
      });

      it("generates valid ISO timestamp in artifact", () => {
        const state = PlanningStateBuilder.new()
          .withBusinessRequirements([
            {
              question: "Test question",
              value: "Test answer",
              timestamp: "2026-05-14T10:00:00.000Z",
            },
          ])
          .build();

        const generatedAt = state.artifacts[2]?.generatedAt;
        expect(generatedAt).toBeDefined();
        expect(() => new Date(generatedAt!)).not.toThrow();
      });

      it("chains with other builder methods", () => {
        const state = PlanningStateBuilder.new()
          .withProjectId("business-test-123")
          .withBusinessRequirements([
            {
              question: "Goal?",
              value: "Success",
              timestamp: "2026-05-14T10:00:00.000Z",
            },
          ])
          .withCurrentStepNumber(2)
          .build();

        expect(state.projectId).toBe("business-test-123");
        expect(state.step2Answers).toHaveLength(1);
        expect(state.currentStepNumber).toBe(2);
        expect(state.artifacts[2]).toBeDefined();
      });

      it("handles empty answer array", () => {
        const state = PlanningStateBuilder.new()
          .withBusinessRequirements([])
          .build();

        expect(state.step2Answers).toEqual([]);
        expect(state.artifacts[2]).toBeDefined();
        expect(state.artifacts[2]?.content).toContain("total_questions: 0");
      });
    });

    describe("completeStep(2)", () => {
      it("completes Step 2 with default healthcare data", () => {
        const state = PlanningStateBuilder.new().completeStep(2).build();

        expect(state.step2Answers).toHaveLength(3);
        expect(state.step2Answers[0]?.question).toContain("business goal");
        expect(state.step2Answers[0]?.value).toContain("patient engagement");
      });

      it("generates Business Requirements artifact", () => {
        const state = PlanningStateBuilder.new().completeStep(2).build();

        expect(state.artifacts[2]).toBeDefined();
        expect(state.artifacts[2]?.type).toBe("yaml");
        expect(state.artifacts[2]?.content).toContain("Business Requirements");
        expect(state.artifacts[2]?.content).toContain("total_questions: 3");
      });

      it("includes all default answers", () => {
        const state = PlanningStateBuilder.new().completeStep(2).build();

        const questions = state.step2Answers.map((a) => a.question);
        expect(questions).toContain(
          "What is the primary business goal for this project?",
        );
        expect(questions).toContain(
          "Who are the primary users of this system?",
        );
        expect(questions).toContain("What are the key success metrics?");
      });

      it("chains with Step 1 completion", () => {
        const state = PlanningStateBuilder.atStep(2)
          .completeStep(1)
          .completeStep(2)
          .build();

        expect(state.step1Responses).toBeTruthy();
        expect(state.step2Answers).toHaveLength(3);
        expect(state.artifacts[1]).toBeDefined();
        expect(state.artifacts[2]).toBeDefined();
      });
    });
  });

  describe("Step 3 (Technical Requirements) methods", () => {
    describe("withTechnicalRequirements()", () => {
      it("populates Step 3 answers and generates artifact", () => {
        const answers = [
          {
            question: "What are the constraints?",
            value: "Must scale to 1M users",
            timestamp: "2026-05-14T11:00:00.000Z",
          },
        ];
        const state = PlanningStateBuilder.new()
          .withTechnicalRequirements(answers)
          .build();

        expect(state.step3Answers).toEqual(answers);
        expect(state.artifacts[3]).toBeDefined();
        expect(state.artifacts[3]?.type).toBe("yaml");
      });

      it("generates YAML artifact with multiple answers", () => {
        const answers = [
          {
            question: "What are technical constraints?",
            value: "HIPAA compliance required",
            timestamp: "2026-05-14T11:00:00.000Z",
          },
          {
            question: "What is the tech stack?",
            value: "React, Node.js, PostgreSQL",
            timestamp: "2026-05-14T11:05:00.000Z",
          },
          {
            question: "What are security requirements?",
            value: "End-to-end encryption, MFA",
            timestamp: "2026-05-14T11:10:00.000Z",
          },
        ];
        const state = PlanningStateBuilder.new()
          .withTechnicalRequirements(answers)
          .build();

        const artifact = state.artifacts[3];
        expect(artifact?.content).toContain("Technical Requirements");
        expect(artifact?.content).toContain("technical constraints");
        expect(artifact?.content).toContain("HIPAA compliance");
        expect(artifact?.content).toContain("total_questions: 3");
      });

      it("validates answers with Zod schema", () => {
        const builder = PlanningStateBuilder.new();

        expect(() => {
          builder.withTechnicalRequirements([
            {
              question: "", // invalid - cannot be empty
              value: "Test answer",
              timestamp: "2026-05-14T11:00:00.000Z",
            },
          ]);
        }).toThrow();

        expect(() => {
          builder.withTechnicalRequirements([
            {
              question: "Test question",
              value: "", // invalid - cannot be empty
              timestamp: "2026-05-14T11:00:00.000Z",
            },
          ]);
        }).toThrow();

        expect(() => {
          builder.withTechnicalRequirements([
            {
              question: "Test question",
              value: "Test answer",
              timestamp: "invalid-timestamp",
            },
          ]);
        }).toThrow();
      });

      it("generates valid ISO timestamp in artifact", () => {
        const state = PlanningStateBuilder.new()
          .withTechnicalRequirements([
            {
              question: "Test question",
              value: "Test answer",
              timestamp: "2026-05-14T11:00:00.000Z",
            },
          ])
          .build();

        const generatedAt = state.artifacts[3]?.generatedAt;
        expect(generatedAt).toBeDefined();
        expect(() => new Date(generatedAt!)).not.toThrow();
      });

      it("chains with other builder methods", () => {
        const state = PlanningStateBuilder.new()
          .withProjectId("technical-test-123")
          .withTechnicalRequirements([
            {
              question: "Constraints?",
              value: "High availability",
              timestamp: "2026-05-14T11:00:00.000Z",
            },
          ])
          .withCurrentStepNumber(3)
          .build();

        expect(state.projectId).toBe("technical-test-123");
        expect(state.step3Answers).toHaveLength(1);
        expect(state.currentStepNumber).toBe(3);
        expect(state.artifacts[3]).toBeDefined();
      });

      it("handles empty answer array", () => {
        const state = PlanningStateBuilder.new()
          .withTechnicalRequirements([])
          .build();

        expect(state.step3Answers).toEqual([]);
        expect(state.artifacts[3]).toBeDefined();
        expect(state.artifacts[3]?.content).toContain("total_questions: 0");
      });
    });

    describe("completeStep(3)", () => {
      it("completes Step 3 with default healthcare data", () => {
        const state = PlanningStateBuilder.new().completeStep(3).build();

        expect(state.step3Answers).toHaveLength(3);
        expect(state.step3Answers[0]?.question).toContain(
          "technical constraints",
        );
        expect(state.step3Answers[0]?.value).toContain("HIPAA");
      });

      it("generates Technical Requirements artifact", () => {
        const state = PlanningStateBuilder.new().completeStep(3).build();

        expect(state.artifacts[3]).toBeDefined();
        expect(state.artifacts[3]?.type).toBe("yaml");
        expect(state.artifacts[3]?.content).toContain("Technical Requirements");
        expect(state.artifacts[3]?.content).toContain("total_questions: 3");
      });

      it("includes all default answers", () => {
        const state = PlanningStateBuilder.new().completeStep(3).build();

        const questions = state.step3Answers.map((a) => a.question);
        expect(questions).toContain(
          "What are the technical constraints for this project?",
        );
        expect(questions).toContain("What is the preferred technology stack?");
        expect(questions).toContain("What are the security requirements?");
      });

      it("chains with previous step completions", () => {
        const state = PlanningStateBuilder.atStep(3)
          .completeStep(1)
          .completeStep(2)
          .completeStep(3)
          .build();

        expect(state.step1Responses).toBeTruthy();
        expect(state.step2Answers).toHaveLength(3);
        expect(state.step3Answers).toHaveLength(3);
        expect(state.artifacts[1]).toBeDefined();
        expect(state.artifacts[2]).toBeDefined();
        expect(state.artifacts[3]).toBeDefined();
      });
    });

    describe("completeStep(4) - Style Anchors", () => {
      it("completes Step 4 with style anchors artifact", () => {
        const state = PlanningStateBuilder.new().completeStep(4).build();

        expect(state.artifacts[4]).toBeDefined();
        expect(state.artifacts[4]?.type).toBe("yaml");
        expect(state.artifacts[4]?.content).toContain("Style Anchors");
      });

      it("generates realistic style anchor examples", () => {
        const state = PlanningStateBuilder.new().completeStep(4).build();

        const artifact = state.artifacts[4];
        expect(artifact?.content).toContain("React");
        expect(artifact?.content).toContain("TypeScript");
      });
    });

    describe("completeStep(5) - Implementation Planner", () => {
      it("completes Step 5 with implementation plan responses", () => {
        const state = PlanningStateBuilder.new().completeStep(5).build();

        expect(state.step5Responses).toBeTruthy();
        expect(Object.keys(state.step5Responses).length).toBeGreaterThan(0);
        expect(state.artifacts[5]).toBeDefined();
      });

      it("generates implementation plan artifact", () => {
        const state = PlanningStateBuilder.new().completeStep(5).build();

        const artifact = state.artifacts[5];
        expect(artifact?.type).toBe("yaml");
        expect(artifact?.content).toContain("Implementation Plan");
      });
    });

    describe("completeStep(6) - QA Test Plan", () => {
      it("completes Step 6 with QA test plan artifact", () => {
        const state = PlanningStateBuilder.new().completeStep(6).build();

        expect(state.artifacts[6]).toBeDefined();
        expect(state.artifacts[6]?.type).toBe("yaml");
        expect(state.artifacts[6]?.content).toContain("QA Test Plan");
      });
    });

    describe("completeStep(7) - Architecture Decisions", () => {
      it("completes Step 7 with architecture decisions artifact", () => {
        const state = PlanningStateBuilder.new().completeStep(7).build();

        expect(state.artifacts[7]).toBeDefined();
        expect(state.artifacts[7]?.type).toBe("markdown");
        expect(state.artifacts[7]?.content).toContain("Architecture Decision");
      });
    });

    describe("completeStep(8) - Delivery Timeline", () => {
      it("completes Step 8 with delivery timeline artifact", () => {
        const state = PlanningStateBuilder.new().completeStep(8).build();

        expect(state.artifacts[8]).toBeDefined();
        expect(state.artifacts[8]?.type).toBe("yaml");
        expect(state.artifacts[8]?.content).toContain("Delivery Timeline");
      });
    });

    describe("completeStep(9) - Definition of Done", () => {
      it("completes Step 9 with definition of done artifact", () => {
        const state = PlanningStateBuilder.new().completeStep(9).build();

        expect(state.artifacts[9]).toBeDefined();
        expect(state.artifacts[9]?.type).toBe("yaml");
        expect(state.artifacts[9]?.content).toContain("Definition of Done");
      });
    });

    describe("completeStep(10) - Executive Summary", () => {
      it("completes Step 10 with executive summary artifact", () => {
        const state = PlanningStateBuilder.new().completeStep(10).build();

        expect(state.artifacts[10]).toBeDefined();
        expect(state.artifacts[10]?.type).toBe("markdown");
        expect(state.artifacts[10]?.content).toContain("Executive Summary");
      });
    });

    describe("completeStep() - Full workflow", () => {
      it("completes all 10 steps sequentially", () => {
        const builder = PlanningStateBuilder.new();

        for (let step = 1; step <= 10; step++) {
          builder.completeStep(step);
        }

        const state = builder.build();

        // Verify all artifacts exist
        for (let step = 1; step <= 10; step++) {
          expect(state.artifacts[step]).toBeDefined();
          expect(state.artifacts[step]?.generatedAt).toBeTruthy();
        }
      });

      it("throws error for step > 10", () => {
        expect(() => {
          PlanningStateBuilder.new().completeStep(11);
        }).toThrow(/not yet implemented for step 11/);
      });

      it("throws error for step < 1", () => {
        expect(() => {
          PlanningStateBuilder.new().completeStep(0);
        }).toThrow(/not yet implemented for step 0/);
      });
    });
  });
});
