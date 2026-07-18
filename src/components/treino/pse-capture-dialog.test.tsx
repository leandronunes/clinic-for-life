import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PseCaptureDialog } from "./pse-capture-dialog";

describe("PseCaptureDialog", () => {
  it("disables Confirmar until a value is picked", () => {
    render(<PseCaptureDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} isPending={false} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  it("submits the picked value", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PseCaptureDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} isPending={false} />);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("radio", { name: /PSE 8 ·/ }));
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    expect(onSubmit).toHaveBeenCalledWith(8);
  });

  it("closes without submitting when Pular is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <PseCaptureDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} isPending={false} />,
    );
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Pular" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a saving state while the mutation is pending", () => {
    render(<PseCaptureDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} isPending />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Salvando..." })).toBeDisabled();
  });

  it("renders nothing when closed", () => {
    render(
      <PseCaptureDialog open={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} isPending={false} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
