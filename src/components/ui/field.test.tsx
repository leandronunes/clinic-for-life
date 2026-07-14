import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "@/components/ui/field";

describe("Field", () => {
  it("renders the label and the child input", () => {
    render(
      <Field label="Título">
        <input aria-label="Título" />
      </Field>,
    );
    expect(screen.getByText("Título")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("applies a custom label className when provided", () => {
    render(
      <Field label="Foco" labelClassName="text-xs text-muted-foreground">
        <input aria-label="Foco" />
      </Field>,
    );
    expect(screen.getByText("Foco")).toHaveClass("text-muted-foreground");
  });
});
