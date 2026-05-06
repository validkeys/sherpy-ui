import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "../../src/components/app-shell";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return <AppShell />;
}
