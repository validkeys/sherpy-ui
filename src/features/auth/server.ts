import { createServerFn } from "@tanstack/react-start";
import type { UserSession } from "./types";

// Mock session matching Okta OIDC shape
export function getSession(): UserSession {
  return {
    sub: "mock-user-001",
    email: "pm@example.com",
    name: "Kyle Davis",
    groups: ["sherpy-users"],
  };
}

export const $getSession = createServerFn({ method: "GET" }).handler(() =>
  getSession(),
);
