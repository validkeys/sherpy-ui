import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSession } from "./hooks";

describe("useSession", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => renderHook(() => useSession())).toThrow(
      "useSession must be used within an AuthProvider",
    );
  });
});
