import { describe, expect, it } from "vitest";
import type {
  DBArtifact,
  DBFormResponse,
  DBInterviewAnswer,
  DBPlanningState,
  DBProject,
} from "./types";

// Type tests: verify interfaces match schema requirements

describe("DB Types", () => {
  describe("DBProject", () => {
    it("should have all required fields", () => {
      const project: DBProject = {
        id: "abc123",
        code: "SHR-0042",
        name: "mini-calculator",
        status: "active",
        entry_path: "scratch",
        current_step: 1,
        created_at: "2026-05-19T10:00:00Z",
        last_touched_at: "2026-05-19T10:00:00Z",
      };

      expect(project.id).toBe("abc123");
      expect(project.code).toBe("SHR-0042");
      expect(project.name).toBe("mini-calculator");
      expect(project.status).toBe("active");
      expect(project.entry_path).toBe("scratch");
      expect(project.current_step).toBe(1);
      expect(project.created_at).toBe("2026-05-19T10:00:00Z");
      expect(project.last_touched_at).toBe("2026-05-19T10:00:00Z");
    });

    it("should allow all valid status values", () => {
      const statuses: Array<DBProject["status"]> = [
        "active",
        "archived",
        "complete",
      ];
      expect(statuses).toHaveLength(3);
    });

    it("should allow all valid entry_path values", () => {
      const paths: Array<DBProject["entry_path"]> = ["scratch", "doc-first"];
      expect(paths).toHaveLength(2);
    });
  });

  describe("DBPlanningState", () => {
    it("should have all required fields", () => {
      const state: DBPlanningState = {
        project_id: "abc123",
        xstate_snapshot: '{"value":"idle"}',
        created_at: "2026-05-19T10:00:00Z",
        updated_at: "2026-05-19T10:00:00Z",
      };

      expect(state.project_id).toBe("abc123");
      expect(state.xstate_snapshot).toBe('{"value":"idle"}');
      expect(state.created_at).toBe("2026-05-19T10:00:00Z");
      expect(state.updated_at).toBe("2026-05-19T10:00:00Z");
    });
  });

  describe("DBInterviewAnswer", () => {
    it("should have all required fields", () => {
      const answer: DBInterviewAnswer = {
        id: "ans123",
        project_id: "abc123",
        step_number: 2,
        question: "What is your goal?",
        answer: "Build a calculator",
        created_at: "2026-05-19T10:00:00Z",
      };

      expect(answer.id).toBe("ans123");
      expect(answer.project_id).toBe("abc123");
      expect(answer.step_number).toBe(2);
      expect(answer.question).toBe("What is your goal?");
      expect(answer.answer).toBe("Build a calculator");
      expect(answer.created_at).toBe("2026-05-19T10:00:00Z");
    });

    it("should allow valid step_number values", () => {
      const steps: Array<DBInterviewAnswer["step_number"]> = [2, 3];
      expect(steps).toHaveLength(2);
    });
  });

  describe("DBFormResponse", () => {
    it("should have all required fields", () => {
      const response: DBFormResponse = {
        id: "resp123",
        project_id: "abc123",
        step_number: 1,
        field_name: "projectDescription",
        field_value: "A calculator app",
        created_at: "2026-05-19T10:00:00Z",
      };

      expect(response.id).toBe("resp123");
      expect(response.project_id).toBe("abc123");
      expect(response.step_number).toBe(1);
      expect(response.field_name).toBe("projectDescription");
      expect(response.field_value).toBe("A calculator app");
      expect(response.created_at).toBe("2026-05-19T10:00:00Z");
    });

    it("should allow valid step_number values", () => {
      const steps: Array<DBFormResponse["step_number"]> = [1, 5, 7];
      expect(steps).toHaveLength(3);
    });
  });

  describe("DBArtifact", () => {
    it("should have all required fields", () => {
      const artifact: DBArtifact = {
        id: "art123",
        project_id: "abc123",
        step_number: 1,
        artifact_type: "yaml",
        content: "key: value",
        generated_at: "2026-05-19T10:00:00Z",
      };

      expect(artifact.id).toBe("art123");
      expect(artifact.project_id).toBe("abc123");
      expect(artifact.step_number).toBe(1);
      expect(artifact.artifact_type).toBe("yaml");
      expect(artifact.content).toBe("key: value");
      expect(artifact.generated_at).toBe("2026-05-19T10:00:00Z");
    });

    it("should allow all valid artifact_type values", () => {
      const types: Array<DBArtifact["artifact_type"]> = ["yaml", "markdown"];
      expect(types).toHaveLength(2);
    });

    it("should allow step_number from 1 to 10", () => {
      const artifact: DBArtifact = {
        id: "art123",
        project_id: "abc123",
        step_number: 10,
        artifact_type: "yaml",
        content: "key: value",
        generated_at: "2026-05-19T10:00:00Z",
      };

      expect(artifact.step_number).toBe(10);
    });
  });
});
