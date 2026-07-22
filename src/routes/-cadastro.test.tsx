import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AuthUser } from "@/lib/api/auth";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => (opts: Record<string, unknown>) => opts,
    useNavigate: () => mockNavigate,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

vi.mock("@/contexts/use-auth", () => ({ useAuth: vi.fn() }));

vi.mock("@/lib/api/partners", () => ({ fetchPartners: vi.fn().mockResolvedValue([]) }));

vi.mock("@/lib/api/organizations", () => ({ fetchOrganizations: vi.fn() }));

vi.mock("@/components/GoogleLoginButton", () => ({
  GoogleLoginButton: ({ role }: { role?: string }) => (
    <div data-testid="google-button" data-role={role ?? ""} />
  ),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CadastroPage } from "./cadastro";
import { useAuth } from "@/contexts/use-auth";
import { fetchOrganizations } from "@/lib/api/organizations";
import { toast } from "sonner";

const mockUseAuth = vi.mocked(useAuth);
const mockFetchOrganizations = vi.mocked(fetchOrganizations);

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

async function renderPage() {
  await act(async () => {
    render(
      <QueryClientProvider client={makeQc()}>
        <CadastroPage />
      </QueryClientProvider>,
    );
  });
}

const alunoUser: AuthUser = {
  id: "u1",
  name: "Julia Ferreira",
  email: "julia@email.com",
  role: "aluno",
};

const personalUser: AuthUser = {
  id: "u2",
  name: "Novo Personal",
  email: "novo@email.com",
  role: "personal",
  pending_approval: false,
};

const pendingPersonalUser: AuthUser = {
  ...personalUser,
  pending_approval: true,
};

async function fillAccountForm(overrides?: { email?: string }) {
  await userEvent.type(screen.getByLabelText("Nome completo"), "Novo Usuário");
  await userEvent.type(screen.getByLabelText("E-mail"), overrides?.email ?? "novo@email.com");
  await userEvent.type(screen.getByLabelText("Senha"), "Str0ng@Pass");
  await userEvent.type(screen.getByLabelText("Confirmar senha"), "Str0ng@Pass");
}

describe("CadastroPage", () => {
  let mockSignUp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp = vi.fn();
    mockUseAuth.mockReturnValue({ signUp: mockSignUp } as unknown as ReturnType<typeof useAuth>);
    mockFetchOrganizations.mockResolvedValue([
      { id: "org-1", name: "Clínica Vitalidade", domain: "clinica-vitalidade" },
      { id: "org-2", name: "Studio Movimento", domain: "studio-movimento" },
    ]);
  });

  it("starts on the role step with both options", async () => {
    await renderPage();
    expect(screen.getByText("Sou aluno")).toBeInTheDocument();
    expect(screen.getByText("Sou personal trainer")).toBeInTheDocument();
  });

  describe("aluno path", () => {
    it("goes straight to the account form and registers with role: student", async () => {
      mockSignUp.mockResolvedValue(alunoUser);
      await renderPage();

      fireEvent.click(screen.getByText("Sou aluno"));
      expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
      expect(screen.queryByTestId("google-button")).toHaveAttribute("data-role", "");

      await fillAccountForm();
      fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

      await waitFor(() =>
        expect(mockSignUp).toHaveBeenCalledWith(
          expect.objectContaining({ role: "student", email: "novo@email.com" }),
        ),
      );
      const payload = mockSignUp.mock.calls[0][0];
      expect(payload).not.toHaveProperty("trainer_mode");
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: "/aluno" }));
    });
  });

  describe("personal — solo", () => {
    async function goToSolo() {
      fireEvent.click(screen.getByText("Sou personal trainer"));
      fireEvent.click(await screen.findByText("Sozinho"));
    }

    it("shows the account form with the Google option after choosing solo", async () => {
      await renderPage();
      await goToSolo();

      expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
      expect(screen.getByTestId("google-button")).toHaveAttribute("data-role", "personal");
    });

    it("registers with role: personal and trainer_mode: solo", async () => {
      mockSignUp.mockResolvedValue(personalUser);
      await renderPage();
      await goToSolo();

      await fillAccountForm();
      fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

      await waitFor(() =>
        expect(mockSignUp).toHaveBeenCalledWith(
          expect.objectContaining({ role: "personal", trainer_mode: "solo" }),
        ),
      );
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" }));
    });

    it("goes back to the role step", async () => {
      await renderPage();
      fireEvent.click(screen.getByText("Sou personal trainer"));

      fireEvent.click(screen.getByText("Voltar"));

      expect(screen.getByText("Sou aluno")).toBeInTheDocument();
    });
  });

  describe("personal — join an existing organization", () => {
    async function goToJoin() {
      fireEvent.click(screen.getByText("Sou personal trainer"));
      fireEvent.click(await screen.findByText("Entrar numa organização existente"));
    }

    it("lists organizations fetched from the API", async () => {
      await renderPage();
      await goToJoin();

      expect(await screen.findByText("Clínica Vitalidade")).toBeInTheDocument();
      expect(screen.getByText("Studio Movimento")).toBeInTheDocument();
    });

    it("disables Continuar until an organization is selected", async () => {
      await renderPage();
      await goToJoin();
      await screen.findByText("Clínica Vitalidade");

      expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();

      fireEvent.click(screen.getByText("Clínica Vitalidade"));
      expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
    });

    it("does not show the Google option (join carries state the OAuth redirect can't)", async () => {
      await renderPage();
      await goToJoin();
      fireEvent.click(await screen.findByText("Clínica Vitalidade"));
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
      expect(screen.queryByTestId("google-button")).not.toBeInTheDocument();
    });

    it("registers with trainer_mode: join and the chosen organization_id", async () => {
      mockSignUp.mockResolvedValue(pendingPersonalUser);
      await renderPage();
      await goToJoin();
      fireEvent.click(await screen.findByText("Clínica Vitalidade"));
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      await fillAccountForm();
      fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

      await waitFor(() =>
        expect(mockSignUp).toHaveBeenCalledWith(
          expect.objectContaining({ trainer_mode: "join", organization_id: "org-1" }),
        ),
      );
      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/aguardando-aprovacao" }),
      );
    });
  });

  describe("personal — create a new organization", () => {
    async function goToCreateOrg() {
      fireEvent.click(screen.getByText("Sou personal trainer"));
      fireEvent.click(await screen.findByText("Criar uma nova organização"));
    }

    it("disables Continuar until both name and domain are filled", async () => {
      await renderPage();
      await goToCreateOrg();

      expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();

      await userEvent.type(screen.getByLabelText("Nome da organização"), "Clínica Nova");
      expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();

      await userEvent.type(screen.getByLabelText("Domínio (identificador único)"), "clinica-nova");
      expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
    });

    it("registers with trainer_mode: create_org and the entered name/domain", async () => {
      mockSignUp.mockResolvedValue(personalUser);
      await renderPage();
      await goToCreateOrg();

      await userEvent.type(screen.getByLabelText("Nome da organização"), "Clínica Nova");
      await userEvent.type(screen.getByLabelText("Domínio (identificador único)"), "clinica-nova");
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      await fillAccountForm();
      fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

      await waitFor(() =>
        expect(mockSignUp).toHaveBeenCalledWith(
          expect.objectContaining({
            trainer_mode: "create_org",
            organization_name: "Clínica Nova",
            organization_domain: "clinica-nova",
          }),
        ),
      );
    });
  });

  describe("validação do formulário de conta", () => {
    it("rejects mismatched passwords", async () => {
      await renderPage();
      fireEvent.click(screen.getByText("Sou aluno"));

      await userEvent.type(screen.getByLabelText("Nome completo"), "Fulano");
      await userEvent.type(screen.getByLabelText("E-mail"), "fulano@email.com");
      await userEvent.type(screen.getByLabelText("Senha"), "Str0ng@Pass");
      await userEvent.type(screen.getByLabelText("Confirmar senha"), "Different@Pass1");
      fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("As senhas não coincidem."));
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it("shows an error toast when registration fails", async () => {
      mockSignUp.mockRejectedValue({ message: "E-mail já possui uma conta cadastrada" });
      await renderPage();
      fireEvent.click(screen.getByText("Sou aluno"));

      await fillAccountForm();
      fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("E-mail já possui uma conta cadastrada"),
      );
    });
  });
});
