import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartnerDetailsDialog } from "./PartnerDetailsDialog";
import type { Partner } from "@/lib/api/partners";

const basePartner: Partner = {
  id: "p1",
  name: "NutriVida",
  category: "Nutrition",
  description: "Consultas de nutrição esportiva.",
  discount_details: "10% de desconto na primeira consulta.",
  coupon: "FORLIFE10",
  link: "https://nutrivida.example.com",
  created_at: "2026-01-01T00:00:00Z",
};

describe("PartnerDetailsDialog", () => {
  it("renders nothing when closed", () => {
    render(<PartnerDetailsDialog partner={basePartner} open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("NutriVida")).not.toBeInTheDocument();
  });

  it("shows name, description, discount details and coupon", () => {
    render(<PartnerDetailsDialog partner={basePartner} open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText("NutriVida")).toBeInTheDocument();
    expect(screen.getByText("Consultas de nutrição esportiva.")).toBeInTheDocument();
    expect(screen.getByText("10% de desconto na primeira consulta.")).toBeInTheDocument();
    expect(screen.getByText("FORLIFE10")).toBeInTheDocument();
  });

  it("shows a 'Visitar site' link when the partner has a link", () => {
    render(<PartnerDetailsDialog partner={basePartner} open={true} onOpenChange={vi.fn()} />);

    const visitLink = screen.getByRole("link", { name: /Visitar site/ });
    expect(visitLink).toHaveAttribute("href", "https://nutrivida.example.com");
    expect(visitLink).toHaveAttribute("target", "_blank");
  });

  it("hides the 'Visitar site' link when the partner has no link", () => {
    render(
      <PartnerDetailsDialog
        partner={{ ...basePartner, link: null }}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("link", { name: /Visitar site/ })).not.toBeInTheDocument();
  });

  it("does not show a discounts block when discount_details is empty", () => {
    render(
      <PartnerDetailsDialog
        partner={{ ...basePartner, discount_details: null }}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.queryByText("Descontos")).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when the dialog is dismissed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<PartnerDetailsDialog partner={basePartner} open={true} onOpenChange={onOpenChange} />);

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
