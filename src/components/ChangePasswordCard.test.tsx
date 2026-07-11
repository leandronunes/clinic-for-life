import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ChangePasswordCard } from "./ChangePasswordCard";

vi.mock("@/lib/api/auth", () => ({ changePassword: vi.fn() }));
import { changePassword } from "@/lib/api/auth";
const mockChangePassword = vi.mocked(changePassword);

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function fillAndSubmit(current: string, next: string, confirm: string) {
  await userEvent.type(screen.getByLabelText("Senha atual"), current);
  await userEvent.type(screen.getByLabelText("Nova senha"), next);
  await userEvent.type(screen.getByLabelText("Confirmar nova senha"), confirm);
  await userEvent.click(screen.getByRole("button", { name: "Alterar senha" }));
}

describe("ChangePasswordCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits a valid password change and clears the form on success", async () => {
    mockChangePassword.mockResolvedValue({ message: "Senha atualizada com sucesso" });

    render(<ChangePasswordCard />, { wrapper });
    await fillAndSubmit("Old@Pass123", "N3w@Str0ngPass", "N3w@Str0ngPass");

    await waitFor(() =>
      expect(mockChangePassword).toHaveBeenCalledWith({
        current_password: "Old@Pass123",
        password: "N3w@Str0ngPass",
        password_confirmation: "N3w@Str0ngPass",
      }),
    );
    await waitFor(() => expect(screen.getByLabelText("Senha atual")).toHaveValue(""));
    expect(screen.getByLabelText("Nova senha")).toHaveValue("");
    expect(screen.getByLabelText("Confirmar nova senha")).toHaveValue("");
  });

  it("shows an inline error and keeps the fields when the current password is wrong", async () => {
    mockChangePassword.mockRejectedValue({ status: 401, message: "Senha atual incorreta" });

    render(<ChangePasswordCard />, { wrapper });
    await fillAndSubmit("Wrong@Pass1", "N3w@Str0ngPass", "N3w@Str0ngPass");

    await waitFor(() => expect(screen.getByText("Senha atual incorreta")).toBeInTheDocument());
    expect(screen.getByLabelText("Senha atual")).toHaveValue("Wrong@Pass1");
  });

  it("blocks submission client-side for a weak new password", async () => {
    render(<ChangePasswordCard />, { wrapper });
    await fillAndSubmit("Old@Pass123", "weak", "weak");

    expect(mockChangePassword).not.toHaveBeenCalled();
    expect(screen.getByText(/Senha precisa de:/)).toBeInTheDocument();
  });

  it("blocks submission client-side when confirmation doesn't match", async () => {
    render(<ChangePasswordCard />, { wrapper });
    await fillAndSubmit("Old@Pass123", "N3w@Str0ngPass", "Different@123");

    expect(mockChangePassword).not.toHaveBeenCalled();
    expect(screen.getByText("As senhas não coincidem")).toBeInTheDocument();
  });
});
