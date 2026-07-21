import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/api/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useRouterState: () => "/aluno",
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
    hasRole: vi.fn(),
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
};

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>,
  );
}

describe("AppSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('exibe "Perfil" ao impersonar um aluno, para visualização somente leitura', () => {
    mockUseAuth.mockReturnValue(
      buildAuth({ user: adminUser, effectiveRole: "aluno", isImpersonating: true }),
    );

    renderSidebar();

    expect(screen.getByRole("link", { name: /perfil/i })).toHaveAttribute("href", "/perfil");
  });

  it('exibe "Perfil" para um aluno real (sem impersonar)', () => {
    const alunoUser: AuthUser = {
      id: "u2",
      name: "Júlia Ferreira",
      email: "julia@test.com",
      role: "aluno",
    };
    mockUseAuth.mockReturnValue(buildAuth({ user: alunoUser, effectiveRole: "aluno" }));

    renderSidebar();

    expect(screen.getByRole("link", { name: /perfil/i })).toHaveAttribute("href", "/perfil");
  });

  describe("feature flag: attendanceCycles", () => {
    beforeEach(() => {
      // Don't rely on the ambient .env — pin a known "off" baseline so these
      // tests pass regardless of what's set on the machine running them.
      vi.stubEnv("VITE_FEATURE_ATTENDANCE_CYCLES", "false");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('esconde "Assiduidade" (dos alunos) do menu do admin quando a flag está desligada', () => {
      mockUseAuth.mockReturnValue(buildAuth({ user: adminUser, effectiveRole: "admin" }));

      renderSidebar();

      expect(screen.queryByRole("link", { name: /assiduidade/i })).not.toBeInTheDocument();
    });

    it('mostra "Assiduidade" (dos alunos) no menu do admin quando a flag está ligada', () => {
      vi.stubEnv("VITE_FEATURE_ATTENDANCE_CYCLES", "true");
      mockUseAuth.mockReturnValue(buildAuth({ user: adminUser, effectiveRole: "admin" }));

      renderSidebar();

      expect(screen.getByRole("link", { name: /assiduidade/i })).toHaveAttribute(
        "href",
        "/assiduidade-alunos",
      );
    });

    it('não esconde a "Assiduidade" do próprio aluno (rota diferente) quando a flag está desligada', () => {
      const alunoUser: AuthUser = {
        id: "u2",
        name: "Júlia Ferreira",
        email: "julia@test.com",
        role: "aluno",
      };
      mockUseAuth.mockReturnValue(buildAuth({ user: alunoUser, effectiveRole: "aluno" }));

      renderSidebar();

      expect(screen.getByRole("link", { name: /assiduidade/i })).toHaveAttribute(
        "href",
        "/aluno/assiduidade",
      );
    });
  });

  describe("feature flag: agendaCalendar", () => {
    beforeEach(() => {
      // Don't rely on the ambient .env — pin a known "off" baseline so these
      // tests pass regardless of what's set on the machine running them.
      vi.stubEnv("VITE_FEATURE_AGENDA_CALENDAR", "false");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('esconde "Agenda" do menu do admin/personal quando a flag está desligada', () => {
      mockUseAuth.mockReturnValue(buildAuth({ user: adminUser, effectiveRole: "admin" }));

      renderSidebar();

      expect(screen.queryByRole("link", { name: /^agenda$/i })).not.toBeInTheDocument();
    });

    it('mostra "Agenda" no menu do admin quando a flag está ligada', () => {
      vi.stubEnv("VITE_FEATURE_AGENDA_CALENDAR", "true");
      mockUseAuth.mockReturnValue(buildAuth({ user: adminUser, effectiveRole: "admin" }));

      renderSidebar();

      expect(screen.getByRole("link", { name: /^agenda$/i })).toHaveAttribute("href", "/agenda");
    });

    it('esconde "Minha Agenda" do menu do aluno quando a flag está desligada', () => {
      const alunoUser: AuthUser = {
        id: "u2",
        name: "Júlia Ferreira",
        email: "julia@test.com",
        role: "aluno",
      };
      mockUseAuth.mockReturnValue(buildAuth({ user: alunoUser, effectiveRole: "aluno" }));

      renderSidebar();

      expect(screen.queryByRole("link", { name: /minha agenda/i })).not.toBeInTheDocument();
    });

    it('mostra "Minha Agenda" no menu do aluno quando a flag está ligada', () => {
      vi.stubEnv("VITE_FEATURE_AGENDA_CALENDAR", "true");
      const alunoUser: AuthUser = {
        id: "u2",
        name: "Júlia Ferreira",
        email: "julia@test.com",
        role: "aluno",
      };
      mockUseAuth.mockReturnValue(buildAuth({ user: alunoUser, effectiveRole: "aluno" }));

      renderSidebar();

      expect(screen.getByRole("link", { name: /minha agenda/i })).toHaveAttribute(
        "href",
        "/aluno/agenda",
      );
    });
  });
});
