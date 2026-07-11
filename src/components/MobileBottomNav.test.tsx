import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/api/auth";
import { MobileBottomNav } from "./MobileBottomNav";

const mockUseNavigate = vi.fn();
const mockUseRouterState = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => mockUseNavigate,
    useRouterState: () => mockUseRouterState(),
    Link: ({
      to,
      children,
      className,
    }: {
      to: string;
      children: ReactNode;
      className?: string;
    }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
  };
});

vi.mock("@/contexts/use-auth", () => ({ useAuth: vi.fn() }));
import { useAuth } from "@/contexts/use-auth";
const mockUseAuth = vi.mocked(useAuth);

vi.mock("@/hooks/use-pwa-install", () => ({ usePwaInstall: vi.fn() }));
import { usePwaInstall } from "@/hooks/use-pwa-install";
const mockUsePwaInstall = vi.mocked(usePwaInstall);

function buildAuth(
  overrides: Partial<ReturnType<typeof useAuth>> = {},
): ReturnType<typeof useAuth> {
  return {
    user: null,
    token: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    hasRole: vi.fn(),
    canWrite: false,
    impersonatedAlunoId: null,
    effectiveAlunoId: null,
    effectiveRole: null,
    isImpersonating: false,
    impersonateAluno: vi.fn(),
    stopImpersonating: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>;
}

describe("MobileBottomNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouterState.mockReturnValue("/dashboard");
    mockUsePwaInstall.mockReturnValue({
      canInstall: false,
      isInstalled: true,
      isIOS: false,
      install: vi.fn(),
    });
  });

  it('exibe a opção "Parceiros" no menu "Mais" para admin', async () => {
    const adminUser: AuthUser = { id: "u1", name: "Admin", email: "admin@test.com", role: "admin" };
    mockUseAuth.mockReturnValue(buildAuth({ user: adminUser, effectiveRole: "admin" }));

    render(<MobileBottomNav />);

    await userEvent.click(screen.getByRole("button", { name: /abrir mais opções/i }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /parceiros/i })).toHaveAttribute(
        "href",
        "/parceiros",
      );
    });
  });

  it('não exibe "Parceiros" no menu "Mais" para aluno', async () => {
    const alunoUser: AuthUser = { id: "u2", name: "Aluno", email: "aluno@test.com", role: "aluno" };
    mockUseRouterState.mockReturnValue("/aluno");
    mockUseAuth.mockReturnValue(buildAuth({ user: alunoUser, effectiveRole: "aluno" }));

    render(<MobileBottomNav />);

    await userEvent.click(screen.getByRole("button", { name: /abrir mais opções/i }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /exames/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /parceiros/i })).not.toBeInTheDocument();
  });

  it('ao impersonar, não duplica o botão de voltar na barra principal — só existe dentro de "Mais"', async () => {
    const personalUser: AuthUser = {
      id: "u3",
      name: "Personal",
      email: "personal@test.com",
      role: "personal",
    };
    mockUseAuth.mockReturnValue(
      buildAuth({ user: personalUser, effectiveRole: "personal", isImpersonating: true }),
    );

    render(<MobileBottomNav />);

    // O Sheet "Mais" ainda não foi aberto — se algum "Voltar" aparecer aqui,
    // é porque a barra principal está duplicando o item além do que já existe
    // dentro do menu "Mais".
    expect(screen.queryByText(/voltar/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /abrir mais opções/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Voltar ao meu perfil" })).toBeInTheDocument();
    });
  });

  it('exibe "Perfil" no menu "Mais" ao impersonar um aluno, para visualização somente leitura', async () => {
    const adminUser: AuthUser = { id: "u4", name: "Admin", email: "admin@test.com", role: "admin" };
    mockUseRouterState.mockReturnValue("/aluno");
    mockUseAuth.mockReturnValue(
      buildAuth({ user: adminUser, effectiveRole: "admin", isImpersonating: true }),
    );

    render(<MobileBottomNav />);

    await userEvent.click(screen.getByRole("button", { name: /abrir mais opções/i }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /perfil/i })).toHaveAttribute("href", "/perfil");
    });
  });
});
