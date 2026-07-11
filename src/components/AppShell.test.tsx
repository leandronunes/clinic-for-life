import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/api/auth";
import { AppShell } from "./AppShell";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
    Outlet: () => <div data-testid="outlet" />,
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

vi.mock("./AppSidebar", () => ({ AppSidebar: () => <div data-testid="app-sidebar" /> }));
vi.mock("./MobileBottomNav", () => ({ MobileBottomNav: () => <div data-testid="mobile-nav" /> }));
vi.mock("./PwaInstallButton", () => ({ PwaInstallButton: () => null }));

const adminUser: AuthUser = {
  id: "u1",
  name: "Ana Admin",
  email: "ana@test.com",
  role: "admin",
};

describe("AppShell", () => {
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

  it("renders a link to /perfil around the user's name and avatar", () => {
    mockUseAuth.mockReturnValue({
      user: adminUser,
      loading: false,
    } as ReturnType<typeof useAuth>);

    render(<AppShell />);

    const link = screen.getByRole("link", { name: /ana admin/i });
    expect(link).toHaveAttribute("href", "/perfil");
    expect(link).toHaveTextContent("Ana Admin");
  });

  it("redirects to /login when there is no authenticated user", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    } as ReturnType<typeof useAuth>);

    render(<AppShell />);

    expect(screen.getByTestId("navigate")).toHaveTextContent("/login");
  });
});
