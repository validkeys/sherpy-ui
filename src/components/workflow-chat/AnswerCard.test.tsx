import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AnswerCard } from "./AnswerCard";

describe("AnswerCard", () => {
  it("reports option selection with option value and index", async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();

    render(
      <AnswerCard
        options={["First option", "Second option"]}
        onSelectOption={onSelectOption}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /Second option/i }));

    expect(onSelectOption).toHaveBeenCalledWith("Second option", 1);
  });

  it("exposes selected and disabled option state", () => {
    render(
      <AnswerCard
        options={["First option", "Second option"]}
        selectedOption={1}
        disabled
        onSelectOption={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("radio", { name: /First option/i }),
    ).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Second option/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /First option/i })).toBeDisabled();
    expect(
      screen.getByRole("radio", { name: /Second option/i }),
    ).toBeDisabled();
  });

  it("reports controlled form changes and submission values", async () => {
    const user = userEvent.setup();
    const onFormValueChange = vi.fn();
    const onSubmitForm = vi.fn();

    const { rerender } = render(
      <AnswerCard
        formFields={[
          { id: "projectName", label: "Project name", type: "text" },
          { id: "summary", label: "Summary", type: "textarea" },
        ]}
        formValues={{ projectName: "", summary: "" }}
        onFormValueChange={onFormValueChange}
        onSubmitForm={onSubmitForm}
      />,
    );

    await user.type(screen.getByLabelText("Project name"), "Sherpy");

    expect(onFormValueChange).toHaveBeenLastCalledWith("projectName", "y");

    rerender(
      <AnswerCard
        formFields={[
          { id: "projectName", label: "Project name", type: "text" },
          { id: "summary", label: "Summary", type: "textarea" },
        ]}
        formValues={{ projectName: "Sherpy", summary: "Planning assistant" }}
        onFormValueChange={onFormValueChange}
        onSubmitForm={onSubmitForm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(onSubmitForm).toHaveBeenCalledWith({
      projectName: "Sherpy",
      summary: "Planning assistant",
    });
  });
});
