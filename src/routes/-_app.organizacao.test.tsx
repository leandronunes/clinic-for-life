import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/api/auth";
import { OrganizacaoPage } from "./_app.organizacao";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => (opts: Record<string, unknown>) => opts,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  };
});

vi.mock("@/contexts/use-auth", () => ({ useAuth: vi.fn() }));
import { useAuth } from "@/contexts/use-auth";
const mockUseAuth = vi.mocked(useAuth);

vi.mock("@/lib/api/organizations", () => ({
  fetchOrganizations: vi.fn(),
  updateOrganization: vi.fn(),
}));
import { fetchOrganizations, updateOrganization } from "@/lib/api/organizations";
const mockFetchOrganizations = vi.mocked(fetchOrganizations);
const mockUpdateOrganization = vi.mocked(updateOrganization);

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function buildAuth(
  overrides: Partial<ReturnType<typeof useAuth>> = {},
): ReturnType<typeof useAuth> {
  return {
    user: null,
    token: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
    hasRole: vi.fn(() => false),
    canWrite: false,
    impersonatedAlunoId: null,
    effectiveAlunoId: null,
    effectiveRole: null,
    isImpersonating: false,
    impersonateAluno: vi.fn(),
    stopImpersonating: vi.fn(),
    ...overrides,
  };
}

const adminUser: AuthUser = {
  id: "u1",
  name: "Ana Admin",
  email: "ana@test.com",
  role: "admin",
  organization_id: "org-1",
};

describe("OrganizacaoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchOrganizations.mockResolvedValue([
      { id: "org-1", name: "Clínica For Life", domain: "clinica-for-life" },
    ]);
  });

  it("admin vê e edita os dados da própria organização", async () => {
    mockUseAuth.mockReturnValue(buildAuth({ user: adminUser }));
    mockUpdateOrganization.mockResolvedValue({
      id: "org-1",
      name: "Clínica Renomeada",
      domain: "clinica-for-life",
    });

    render(<OrganizacaoPage />, { wrapper });

    const nameInput = await screen.findByDisplayValue("Clínica For Life");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Clínica Renomeada");

    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(mockUpdateOrganization).toHaveBeenCalledWith("org-1", {
        name: "Clínica Renomeada",
        domain: "clinica-for-life",
      }),
    );
  });

  it("Descartar reverte as alterações não salvas", async () => {
    mockUseAuth.mockReturnValue(buildAuth({ user: adminUser }));

    render(<OrganizacaoPage />, { wrapper });

    const nameInput = await screen.findByDisplayValue("Clínica For Life");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Rascunho não salvo");

    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));

    expect(await screen.findByDisplayValue("Clínica For Life")).toBeInTheDocument();
  });

  it("personal é redirecionado para /dashboard", () => {
    mockUseAuth.mockReturnValue(buildAuth({ user: { ...adminUser, role: "personal" } }));

    render(<OrganizacaoPage />, { wrapper });

    expect(screen.getByTestId("navigate")).toHaveTextContent("/dashboard");
    expect(mockFetchOrganizations).not.toHaveBeenCalled();
  });

  it("aluno é redirecionado para /dashboard", () => {
    mockUseAuth.mockReturnValue(buildAuth({ user: { ...adminUser, role: "aluno" } }));

    render(<OrganizacaoPage />, { wrapper });

    expect(screen.getByTestId("navigate")).toHaveTextContent("/dashboard");
  });

  it("admin de uma organização solo é redirecionado para /dashboard, mesmo acessando a rota direto", () => {
    mockUseAuth.mockReturnValue(buildAuth({ user: { ...adminUser, organization_solo: true } }));

    render(<OrganizacaoPage />, { wrapper });

    expect(screen.getByTestId("navigate")).toHaveTextContent("/dashboard");
    expect(mockFetchOrganizations).not.toHaveBeenCalled();
  });
});
