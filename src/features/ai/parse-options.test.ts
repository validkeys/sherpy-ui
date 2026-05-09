import { describe, expect, it } from "vitest";
import { parseOptions } from "./parse-options";

describe("parseOptions", () => {
  describe("Format 1: Markdown with **Options:**", () => {
    it("should parse basic markdown options with newlines", () => {
      const text = `What is the primary problem your project aims to solve?

**Options:**
1. Automate manual workflow - Replace time-consuming manual processes
2. Improve existing solution - Enhance or replace current tooling
3. New capability - Build something entirely new

Please select an option or type your own answer.`;

      const options = parseOptions(text);

      expect(options).toHaveLength(3);
      expect(options[0]).toEqual({
        letter: "1",
        title: "Automate manual workflow",
        body: "Replace time-consuming manual processes",
        recommended: false,
      });
    });

    it("should parse recommended option in markdown format", () => {
      const text = `What should be the overall application structure?

**Options:**
1. Layered architecture (Recommended) - Clear separation of presentation, business logic, data
2. Feature-based - Organize by feature/domain rather than technical layer

Please select an option.`;

      const options = parseOptions(text);

      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({
        letter: "1",
        title: "Layered architecture",
        body: "Clear separation of presentation, business logic, data",
        recommended: true,
      });
      expect(options[1].recommended).toBe(false);
    });

    it("should skip 'Type your own answer' option in markdown format", () => {
      const text = `What is your choice?

**Options:**
1. Option A - Description A
2. Option B - Description B
3. Type your own answer - Custom input

Select one.`;

      const options = parseOptions(text);

      expect(options).toHaveLength(2);
      expect(options.find((o) => o.title.toLowerCase().includes("type your own"))).toBeUndefined();
    });

    it("should handle multi-line option bodies in markdown format", () => {
      const text = `Choose an architecture:

**Options:**
1. Microservices - Multiple independent services, better scaling but higher complexity
2. Serverless - Event-driven, scales automatically, but vendor lock-in

Select one.`;

      const options = parseOptions(text);

      expect(options).toHaveLength(2);
      expect(options[0].body).toBe("Multiple independent services, better scaling but higher complexity");
      expect(options[1].body).toBe("Event-driven, scales automatically, but vendor lock-in");
    });
  });

  describe("Format 2: Inline options", () => {
    it("should parse inline options with bold titles", () => {
      const text = `Please select an option or type your own answer: 1. **Automate manual workflow** (Recommended) - Replace time-consuming manual processes with automated workflows 2. **Improve existing solution** - Enhance or replace current tooling that's inadequate 3. **New capability** - Build something entirely new that doesn't exist yet`;

      const options = parseOptions(text);

      expect(options).toHaveLength(3);
      expect(options[0]).toEqual({
        letter: "1",
        title: "Automate manual workflow",
        body: "Replace time-consuming manual processes with automated workflows",
        recommended: true,
      });
      expect(options[1].recommended).toBe(false);
    });

    it("should parse inline options without bold titles", () => {
      const text = `Please select an option: 1. Option A - Description for option A 2. Option B - Description for option B`;

      const options = parseOptions(text);

      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({
        letter: "1",
        title: "Option A",
        body: "Description for option A",
        recommended: false,
      });
    });

    it("should skip 'Type your own answer' in inline format", () => {
      const text = `Please select an option: 1. Real option - Real description 2. Type your own answer - Custom input`;

      const options = parseOptions(text);

      expect(options).toHaveLength(1);
      expect(options[0].title).toBe("Real option");
    });

    it("should handle inline options with parenthetical content in body", () => {
      const text = `Select: 1. **JWT tokens** (Recommended) - Stateless, scalable, works across services 2. **OAuth 2.0** - Delegated authorization (good for third-party integrations)`;

      const options = parseOptions(text);

      expect(options).toHaveLength(2);
      expect(options[1].body).toContain("(good for third-party integrations)");
    });
  });

  describe("Edge cases", () => {
    it("should return empty array when no options found", () => {
      const text = "This is just a plain question with no options.";
      const options = parseOptions(text);
      expect(options).toEqual([]);
    });

    it("should handle empty string", () => {
      const options = parseOptions("");
      expect(options).toEqual([]);
    });

    it("should handle options with numbers in titles", () => {
      const text = `**Options:**
1. 3-tier architecture - Frontend, backend, database
2. 2-factor authentication - Enhanced security`;

      const options = parseOptions(text);

      expect(options).toHaveLength(2);
      expect(options[0].title).toBe("3-tier architecture");
      expect(options[1].title).toBe("2-factor authentication");
    });

    it("should handle options with special characters", () => {
      const text = `**Options:**
1. REST API (v2.0) - Standard HTTP/S endpoints
2. GraphQL - Client-defined queries & mutations`;

      const options = parseOptions(text);

      expect(options).toHaveLength(2);
      expect(options[0].title).toContain("REST API");
      expect(options[1].title).toBe("GraphQL");
    });

    it("should handle markdown options with varying whitespace", () => {
      const text = `**Options:**

1. Option A - Description A

2. Option B - Description B


3. Option C - Description C`;

      const options = parseOptions(text);

      expect(options).toHaveLength(3);
    });

    it("should handle inline options with long bodies", () => {
      const text = `Please select: 1. **Monolithic application** (Recommended) - Single deployable unit, simpler to develop and deploy initially, better for small to medium projects 2. **Microservices** - Multiple independent services, better scaling but higher complexity`;

      const options = parseOptions(text);

      expect(options).toHaveLength(2);
      expect(options[0].body.length).toBeGreaterThan(50);
    });

    it("should handle options with dashes in title", () => {
      const text = `**Options:**
1. Pre-commit hooks - Run checks before commits
2. Post-deploy monitoring - Track after release`;

      const options = parseOptions(text);

      expect(options).toHaveLength(2);
      expect(options[0].title).toBe("Pre-commit hooks");
    });

    it("should handle mixed case in 'Type your own answer'", () => {
      const text = `**Options:**
1. Option A - Description A
2. TYPE YOUR OWN ANSWER - Custom
3. Option B - Description B`;

      const options = parseOptions(text);

      expect(options).toHaveLength(2);
      expect(options.find((o) => o.title.toLowerCase().includes("type your own"))).toBeUndefined();
    });
  });

  describe("Real-world examples from skills-content.ts", () => {
    it("should parse Step 2 Question 1 options", () => {
      const text = `What is the primary problem your project aims to solve?

**Options:**
1. Automate manual workflow (Recommended) - Replace time-consuming manual processes with automated workflows
2. Improve existing solution - Enhance or replace current tooling that's inadequate
3. New capability - Build something entirely new that doesn't exist yet
4. Type your own answer`;

      const options = parseOptions(text);

      expect(options).toHaveLength(3);
      expect(options[0].recommended).toBe(true);
    });

    it("should parse Step 3 Question 5 with 6 options", () => {
      const text = `What data persistence strategy is appropriate?

**Options:**
1. File-based storage (Recommended) - Simple, portable, no database dependency
2. SQLite - Embedded relational database, good for local tools
3. PostgreSQL - Full-featured relational database, better for complex queries
4. NoSQL (MongoDB, etc.) - Flexible schema, good for document-based data
5. In-memory only - Fast but no persistence, suitable for ephemeral data
6. Type your own answer`;

      const options = parseOptions(text);

      expect(options).toHaveLength(5);
      expect(options[3].title).toContain("NoSQL");
    });

    it("should handle AI echoing options as text before **Options:**", () => {
      const text = `I'll help you choose the right architecture pattern. Here are your options:

1. Monolithic application (Recommended) - Single deployable unit
2. Microservices - Multiple independent services

**Options:**
1. Monolithic application (Recommended) - Single deployable unit, simpler to develop and deploy initially
2. Microservices - Multiple independent services, better scaling but higher complexity
3. Type your own answer`;

      const options = parseOptions(text);

      // Should only parse the structured **Options:** section, not the echoed text
      expect(options).toHaveLength(2);
      expect(options[0].body).toBe("Single deployable unit, simpler to develop and deploy initially");
    });

    it("should handle AI response without **Options:** header", () => {
      const text = `Let me ask you about your testing strategy.

Please select an option or type your own answer: 1. **Test-driven development (TDD)** (Recommended) - Write tests first 2. **Behavior-driven development (BDD)** - Focus on user behavior scenarios 3. **Test after implementation** - Build first, test later`;

      const options = parseOptions(text);

      expect(options).toHaveLength(3);
      expect(options[0].title).toBe("Test-driven development (TDD)");
    });
  });

  describe("Failure modes that need fallback", () => {
    it("should handle malformed markdown options", () => {
      const text = `**Options:**
1 Option A Description A
2. Option B - Description B`;

      const options = parseOptions(text);

      // Should still parse the well-formed option
      expect(options.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle missing option numbers", () => {
      const text = `**Options:**
Option A - Description A
2. Option B - Description B`;

      const options = parseOptions(text);

      expect(options.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle option without dash separator", () => {
      const text = `**Options:**
1. Option A Description A
2. Option B - Description B`;

      const options = parseOptions(text);

      expect(options.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Recommended flag detection", () => {
    it("should detect (Recommended) in various positions", () => {
      const text = `**Options:**
1. Option A (Recommended) - Description A
2. Option B - Description B (Recommended)`;

      const options = parseOptions(text);

      expect(options[0].recommended).toBe(true);
      // Note: (Recommended) should only count if it's in the title section, not the body
      expect(options[1].recommended).toBe(false);
    });

    it("should handle lowercase (recommended)", () => {
      const text = `**Options:**
1. Option A (recommended) - Description A
2. Option B - Description B`;

      const options = parseOptions(text);

      // Case-insensitive matching
      expect(options[0].recommended).toBe(true);
    });
  });
});
