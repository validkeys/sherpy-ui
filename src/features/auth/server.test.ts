import { describe, expect, it } from "vitest";
import { getSession } from "./server";

describe("getSession", () => {
  it("returns valid UserSession shape", () => {
    const session = getSession();

    expect(session).toMatchObject({
      sub: expect.any(String),
      email: expect.any(String),
      name: expect.any(String),
      groups: expect.any(Array),
    });
    expect(session.sub).toBe("mock-user-001");
    expect(session.email).toBe("pm@example.com");
    expect(session.name).toBe("Kyle Davis");
    expect(session.groups).toContain("sherpy-users");
  });
});
