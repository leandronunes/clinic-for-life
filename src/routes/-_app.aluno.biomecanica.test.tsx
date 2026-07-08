import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AvaliacaoEstruturalSection } from "./_app.aluno.biomecanica";
import type { StructuralAssessment } from "@/lib/api/structural-assessment";

vi.mock("@/lib/api/structural-assessment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/structural-assessment")>();
  return {
    ...actual,
    fetchStructuralAssessment: vi.fn(),
    updateStructuralAssessment: vi.fn(),
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  fetchStructuralAssessment,
  updateStructuralAssessment,
} from "@/lib/api/structural-assessment";

const mockFetch = vi.mocked(fetchStructuralAssessment);
const mockUpdate = vi.mocked(updateStructuralAssessment);

const baseAssessment: StructuralAssessment = {
  scoliosis: false,
  hyperkyphosis: true,
  hyperlordosis: false,
  spine_rotation: false,
  hip_rotation: false,
  scapular_girdle_imbalance: false,
  scapular_dyskinesis: false,
  shortening: false,
  limb_length_difference: false,
  pelvic_anteversion: false,
  pelvic_retroversion: false,
  knee_valgus: false,
  knee_varus: false,
  cavus_foot_arch: false,
  flat_foot_arch: false,
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderSection(canWrite: boolean) {
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <AvaliacaoEstruturalSection alunoId="s1" canWrite={canWrite} />
    </QueryClientProvider>,
  );
}

function rowFor(label: string) {
  return screen.getByText(label).closest("li")!;
}

describe("AvaliacaoEstruturalSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(baseAssessment);
    mockUpdate.mockResolvedValue(baseAssessment);
  });

  it("renders Hipercifose and Hiperlordose right after Escoliose", async () => {
    renderSection(false);

    const labels = await screen.findAllByText(/Escoliose|Hipercifose|Hiperlordose/);
    expect(labels.map((el) => el.textContent)).toEqual([
      "Escoliose",
      "Hipercifose",
      "Hiperlordose",
    ]);
  });

  it("shows Sim/Não badges reflecting each value in read-only mode", async () => {
    renderSection(false);
    await screen.findByText("Hipercifose");

    expect(within(rowFor("Hipercifose")).getByText("Sim")).toBeInTheDocument();
    expect(within(rowFor("Hiperlordose")).getByText("Não")).toBeInTheDocument();
  });

  it("toggling the Hiperlordose switch saves the new value", async () => {
    const user = userEvent.setup();
    renderSection(true);
    await screen.findByText("Hiperlordose");

    const toggle = within(rowFor("Hiperlordose")).getByRole("switch");
    await user.click(toggle);

    expect(mockUpdate).toHaveBeenCalledWith("s1", { hyperlordosis: true });
  });
});
