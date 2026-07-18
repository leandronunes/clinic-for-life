import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PseScale } from "./pse-scale";

describe("PseScale (interactive)", () => {
  it("renders a button for every value from 1 to 10", () => {
    render(<PseScale value={null} onChange={vi.fn()} />);
    for (let n = 1; n <= 10; n++) {
      expect(screen.getByRole("radio", { name: new RegExp(`PSE ${n} ·`) })).toBeInTheDocument();
    }
  });

  it("calls onChange with the picked number", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PseScale value={null} onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: /PSE 7 ·/ }));

    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("marks the current value as pressed", () => {
    render(<PseScale value={4} onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /PSE 4 ·/ })).toHaveAttribute("data-state", "on");
    expect(screen.getByRole("radio", { name: /PSE 5 ·/ })).toHaveAttribute("data-state", "off");
  });
});

describe("PseScale (readOnly)", () => {
  it("renders nothing when value is null", () => {
    const { container } = render(<PseScale value={null} readOnly />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a badge with the number and category label", () => {
    render(<PseScale value={7} readOnly />);
    expect(screen.getByText(/7 · Intenso/)).toBeInTheDocument();
  });

  it("categorizes a low value as Leve", () => {
    render(<PseScale value={2} readOnly />);
    expect(screen.getByText(/2 · Leve/)).toBeInTheDocument();
  });

  it("categorizes the top of the scale as Máximo", () => {
    render(<PseScale value={10} readOnly />);
    expect(screen.getByText(/10 · Máximo/)).toBeInTheDocument();
  });
});
