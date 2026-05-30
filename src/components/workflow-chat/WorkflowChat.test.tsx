import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Artifact, Message } from "./types";
import { WorkflowChat } from "./WorkflowChat";

const messages: Message[] = [
  {
    id: "artifact-message",
    role: "assistant",
    type: "artifact",
    timestamp: "now",
    content: "Here is the artifact.",
    artifactName: "business-requirements.yaml",
    artifactId: "business-requirements",
  },
];

describe("WorkflowChat", () => {
  it("fails closed when interactive handlers are not wired", () => {
    render(
      <WorkflowChat
        messages={[
          {
            id: "question-message",
            role: "assistant",
            type: "question",
            timestamp: "now",
            question: "Pick one",
            options: ["First", "Second"],
          },
        ]}
        artifacts={[]}
      />,
    );

    expect(screen.getByLabelText("Message")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "First" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Second" })).toBeDisabled();
    expect(screen.getByPlaceholderText("View only")).toBeDisabled();
  });

  it("submits through the composer and clears the message after submit", async () => {
    const user = userEvent.setup();
    const onSubmitMessage = vi.fn();

    render(
      <WorkflowChat
        messages={[]}
        artifacts={[]}
        onSubmitMessage={onSubmitMessage}
      />,
    );

    const composer = screen.getByLabelText("Message");
    await user.type(composer, "Phase 4 answer");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSubmitMessage).toHaveBeenCalledWith("Phase 4 answer");
    expect(composer).toHaveValue("");
  });

  it("defines a stacked mobile layout and desktop two-column layout", () => {
    const artifacts: Artifact[] = [];

    render(<WorkflowChat messages={[]} artifacts={artifacts} />);

    expect(screen.getByTestId("workflow-chat-root")).toHaveClass(
      "flex-col",
      "lg:flex-row",
    );
    expect(screen.getByTestId("workflow-chat-artifacts")).toHaveClass(
      "w-full",
      "max-h-56",
      "lg:w-1/3",
      "lg:max-h-none",
    );
    expect(screen.getByTestId("workflow-chat-messages")).toHaveClass(
      "w-full",
      "lg:w-2/3",
    );
  });

  it("opens one shared artifact dialog from chat pill and sidebar item", async () => {
    const user = userEvent.setup();
    const artifacts: Artifact[] = [
      {
        id: "business-requirements",
        name: "business-requirements.yaml",
        stage: 2,
        stageName: "Business Requirements",
        status: "created",
        content: "business: requirements",
      },
    ];

    render(<WorkflowChat messages={messages} artifacts={artifacts} />);

    await user.click(
      screen.getByRole("button", {
        name: "Open artifact business-requirements.yaml",
      }),
    );

    expect(
      screen.getByRole("dialog", { name: /business-requirements.yaml/i }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Open artifact business-requirements.yaml from artifacts",
      }),
    );

    expect(
      screen.getByRole("dialog", { name: /business-requirements.yaml/i }),
    ).toBeInTheDocument();
  });

  it("does not open artifacts without created content", async () => {
    const user = userEvent.setup();
    const artifacts: Artifact[] = [
      {
        id: "business-requirements",
        name: "business-requirements.yaml",
        stage: 2,
        stageName: "Business Requirements",
        status: "pending",
      },
    ];

    render(<WorkflowChat messages={messages} artifacts={artifacts} />);

    const unavailableArtifactButtons = screen.getAllByRole("button", {
      name: "Artifact business-requirements.yaml is not available yet",
    });

    expect(unavailableArtifactButtons).toHaveLength(2);
    expect(unavailableArtifactButtons[0]).toBeDisabled();
    expect(unavailableArtifactButtons[1]).toBeDisabled();

    await user.click(unavailableArtifactButtons[1]);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
