import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatComposer } from "./ChatComposer";

describe("ChatComposer", () => {
  it("submits the trimmed value with the send button", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ChatComposer
        value="  build the thing  "
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSubmit).toHaveBeenCalledWith("build the thing");
  });

  it("submits on Enter and keeps Shift+Enter for new lines", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <ChatComposer
        value="first line"
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    );

    const input = screen.getByLabelText("Message");
    await user.click(input);
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSubmit).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("first line");
  });

  it("disables input and submit while submitting", () => {
    render(
      <ChatComposer
        value="pending answer"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting
      />,
    );

    expect(screen.getByLabelText("Message")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Sending message" }),
    ).toBeDisabled();
  });
});
