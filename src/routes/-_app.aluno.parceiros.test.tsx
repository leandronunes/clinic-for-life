import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/api/auth";
import type { Partner } from "@/lib/api/partners";
import { AlunoParceirosPage } from "./_app.aluno.parceiros";

vi.mock("@/lib/api/partners", () => ({ fetchPartners: vi.fn() }));
import { fetchPartners } from "@/lib/api/partners";
const mockFetchPartners = vi.mocked(fetchPartners);

vi.mock("@/contexts/use-auth", () => ({ useAuth: vi.fn() }));
import { useAuth } from "@/contexts/use-auth";
const mockUseAuth = vi.mocked(useAuth);

vi.mock("@/hooks/use-partner-card-enabled", () => ({ usePartnerCardEnabled: vi.fn() }));
import { usePartnerCardEnabled } from "@/hooks/use-partner-card-enabled";
const mockPartnerCardEnabled = vi.mocked(usePartnerCardEnabled);

const partner: Partner = {
  id: "p1",
  name: "NutriVida",
  category: "Nutrição",
  description: "Consultoria nutricional com desconto exclusivo.",
  discount_details: "20% de desconto",
  coupon: null,
  link: null,
  logo_url: null,
  created_at: "2025-01-01T00:00:00Z",
};

const alunoUser: AuthUser = {
  id: "u1",
  name: "Júlia Ferreira",
  email: "julia@test.com",
  role: "aluno",
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("AlunoParceirosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: alunoUser,
      effectiveRole: "aluno",
    } as ReturnType<typeof useAuth>);
  });

  it("mostra o cartão virtual e a lista de parceiros quando o cartão está habilitado", async () => {
    mockPartnerCardEnabled.mockReturnValue(true);
    mockFetchPartners.mockResolvedValue([partner]);

    render(<AlunoParceirosPage />, { wrapper });

    expect(screen.getByLabelText("Cartão virtual do aluno")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("NutriVida")).toBeInTheDocument());
  });

  it("esconde só o cartão virtual quando o cartão está desativado, mantendo a lista de parceiros", async () => {
    mockPartnerCardEnabled.mockReturnValue(false);
    mockFetchPartners.mockResolvedValue([partner]);

    render(<AlunoParceirosPage />, { wrapper });

    expect(screen.queryByLabelText("Cartão virtual do aluno")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("NutriVida")).toBeInTheDocument());
  });
});
