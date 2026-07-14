import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollapsibleNote } from "@/components/CollapsibleNote";

describe("CollapsibleNote", () => {
  it("renders the 'plain' variant with the personal-trainer heading", () => {
    render(<CollapsibleNote notes="Controlar a fase excêntrica." variant="plain" />);
    expect(screen.getByText("Observação do Personal")).toBeInTheDocument();
    expect(screen.getByText("Controlar a fase excêntrica.")).toBeInTheDocument();
  });

  it("renders the 'callout' variant with the tip heading", () => {
    render(<CollapsibleNote notes="Mantenha o ritmo." variant="callout" />);
    expect(screen.getByText("Dica do personal")).toBeInTheDocument();
    expect(screen.getByText("Mantenha o ritmo.")).toBeInTheDocument();
  });

  it("does not show a toggle when the note fits the preview", () => {
    render(<CollapsibleNote notes="Nota curta." variant="plain" />);
    expect(screen.queryByRole("button", { name: /ver mais/i })).not.toBeInTheDocument();
  });

  it("toggles between 'Ver mais' and 'Ver menos' when the note overflows the preview", async () => {
    const user = userEvent.setup();

    // jsdom não calcula layout real; o componente decide se o texto
    // ultrapassa 2 linhas comparando scrollHeight × clientHeight no mount,
    // então o stub precisa existir antes da primeira renderização.
    const scrollHeightSpy = vi
      .spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockReturnValue(40);
    const clientHeightSpy = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockReturnValue(20);

    render(<CollapsibleNote notes="Nota longa que ultrapassa o preview." variant="callout" />);

    const toggle = await screen.findByRole("button", { name: /ver mais/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(screen.getByRole("button", { name: /ver menos/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    scrollHeightSpy.mockRestore();
    clientHeightSpy.mockRestore();
  });
});
