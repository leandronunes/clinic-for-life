import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PhotoUploadCard } from "./PhotoUploadCard";
import type { BioimpedanceMeasurement } from "@/lib/api/bioimpedance";

// Replace Radix UI Select with native elements so options render in jsdom.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
    disabled,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} disabled={disabled}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/lib/api/evolution-photos", () => ({
  createEvolutionPhoto: vi.fn(),
  deleteEvolutionPhoto: vi.fn(),
}));

vi.mock("@/lib/api/uploads", () => ({
  uploadPhotoToS3: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { createEvolutionPhoto, deleteEvolutionPhoto } from "@/lib/api/evolution-photos";
import { uploadPhotoToS3 } from "@/lib/api/uploads";
import { toast } from "sonner";

const mockCreate = vi.mocked(createEvolutionPhoto);
const mockDelete = vi.mocked(deleteEvolutionPhoto);
const mockUpload = vi.mocked(uploadPhotoToS3);

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false } } });
}

function renderCard(measurements: BioimpedanceMeasurement[], onSaved = vi.fn()) {
  const qc = makeQueryClient();
  render(
    <QueryClientProvider client={qc}>
      <PhotoUploadCard
        alunoId="student-1"
        alunoEmail="aluno@test.com"
        measurements={measurements}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  );
}

const measurementWithoutPhoto: BioimpedanceMeasurement = {
  id: "m1",
  student_id: "student-1",
  measured_on: "2026-05-01",
  weight_kg: 80,
  muscle_mass_kg: 40,
  fat_percentage: 20,
  bmi: 25,
  source: "import",
  photo_id: null,
  photo_url: null,
};

const measurementWithPhoto: BioimpedanceMeasurement = {
  id: "m2",
  student_id: "student-1",
  measured_on: "2026-04-01",
  weight_kg: 82,
  muscle_mass_kg: 39,
  fat_percentage: 22,
  bmi: 25.5,
  source: "import",
  photo_id: "photo-1",
  photo_url: "https://s3.example.com/photo.jpg",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn().mockReturnValue("blob:mock-photo-url"),
    revokeObjectURL: vi.fn(),
  });
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
    configurable: true,
  });
});

describe("PhotoUploadCard", () => {
  describe("empty state", () => {
    it("shows the measurement select question as the first element", () => {
      renderCard([measurementWithoutPhoto]);
      expect(screen.getByText("A qual medição InBody esta foto se refere?")).toBeInTheDocument();
    });

    it("shows no-measurements message when array is empty", () => {
      renderCard([]);
      expect(screen.getByText(/Nenhuma medição cadastrada/)).toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("does not show the upload area before a measurement is selected", () => {
      renderCard([measurementWithoutPhoto]);
      expect(screen.queryByText("Arraste uma foto ou clique para enviar")).not.toBeInTheDocument();
    });
  });

  describe("measurement without existing photo", () => {
    it("shows the upload area after selecting a measurement without photo", async () => {
      const user = userEvent.setup();
      renderCard([measurementWithoutPhoto]);

      await user.selectOptions(screen.getByRole("combobox"), "m1");

      expect(screen.getByText("Arraste uma foto ou clique para enviar")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Tirar foto/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Escolher imagem/i })).toBeInTheDocument();
    });

    it("shows preview and save button after a file is selected", async () => {
      const user = userEvent.setup();
      renderCard([measurementWithoutPhoto]);

      await user.selectOptions(screen.getByRole("combobox"), "m1");

      const file = new File(["img"], "foto.jpg", { type: "image/jpeg" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      await user.upload(input, file);

      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      expect(screen.getByAltText("foto.jpg")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Salvar foto de evolução/i })).toBeInTheDocument();
    });

    it("rejects non-image files", async () => {
      const user = userEvent.setup();
      renderCard([measurementWithoutPhoto]);

      await user.selectOptions(screen.getByRole("combobox"), "m1");

      const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      // fireEvent bypasses userEvent's accept-attribute filtering for non-matching types
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      fireEvent.change(input);

      expect(toast.error).toHaveBeenCalledWith("Selecione um arquivo de imagem");
      expect(screen.queryByRole("button", { name: /Salvar/i })).not.toBeInTheDocument();
    });

    it("uploads the photo and calls onSaved on success", async () => {
      const user = userEvent.setup();
      const onSaved = vi.fn();
      mockUpload.mockResolvedValue("https://s3.example.com/new.jpg");
      mockCreate.mockResolvedValue({
        id: "p2",
        measurement_id: "m1",
        taken_on: "2026-05-01",
        image_url: "https://s3.example.com/new.jpg",
      });

      renderCard([measurementWithoutPhoto], onSaved);

      await user.selectOptions(screen.getByRole("combobox"), "m1");

      const file = new File(["img"], "foto.jpg", { type: "image/jpeg" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      await user.upload(input, file);

      await user.click(screen.getByRole("button", { name: /Salvar foto de evolução/i }));

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith("student-1", file, expect.any(Function));
        expect(mockCreate).toHaveBeenCalledWith("student-1", {
          bioimpedance_measurement_id: "m1",
          image_url: "https://s3.example.com/new.jpg",
        });
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("aluno@test.com"));
        expect(onSaved).toHaveBeenCalled();
      });
    });

    it("shows toast error when upload fails", async () => {
      const user = userEvent.setup();
      mockUpload.mockRejectedValue({ message: "Falha de rede" });

      renderCard([measurementWithoutPhoto]);

      await user.selectOptions(screen.getByRole("combobox"), "m1");

      const file = new File(["img"], "foto.jpg", { type: "image/jpeg" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      await user.upload(input, file);

      await user.click(screen.getByRole("button", { name: /Salvar foto de evolução/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Falha de rede");
      });
    });
  });

  describe("measurement with existing photo", () => {
    it("shows the existing photo and Trocar foto button", async () => {
      const user = userEvent.setup();
      renderCard([measurementWithPhoto]);

      await user.selectOptions(screen.getByRole("combobox"), "m2");

      expect(screen.getByAltText("Foto de evolução existente")).toHaveAttribute(
        "src",
        "https://s3.example.com/photo.jpg",
      );
      expect(screen.getByRole("button", { name: /Trocar foto/i })).toBeInTheDocument();
      expect(screen.queryByText("Arraste uma foto ou clique para enviar")).not.toBeInTheDocument();
    });

    it("shows upload area after clicking Trocar foto", async () => {
      const user = userEvent.setup();
      renderCard([measurementWithPhoto]);

      await user.selectOptions(screen.getByRole("combobox"), "m2");
      await user.click(screen.getByRole("button", { name: /Trocar foto/i }));

      expect(screen.getByText("Arraste uma foto ou clique para enviar")).toBeInTheDocument();
    });

    it("shows Cancelar troca link while in replace mode with no file picked", async () => {
      const user = userEvent.setup();
      renderCard([measurementWithPhoto]);

      await user.selectOptions(screen.getByRole("combobox"), "m2");
      await user.click(screen.getByRole("button", { name: /Trocar foto/i }));

      expect(screen.getByText("Cancelar troca")).toBeInTheDocument();
    });

    it("returns to existing photo after clicking Cancelar troca", async () => {
      const user = userEvent.setup();
      renderCard([measurementWithPhoto]);

      await user.selectOptions(screen.getByRole("combobox"), "m2");
      await user.click(screen.getByRole("button", { name: /Trocar foto/i }));
      await user.click(screen.getByText("Cancelar troca"));

      expect(screen.getByAltText("Foto de evolução existente")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Trocar foto/i })).toBeInTheDocument();
    });

    it("calls deleteEvolutionPhoto before uploading the new photo", async () => {
      const user = userEvent.setup();
      mockDelete.mockResolvedValue(undefined);
      mockUpload.mockResolvedValue("https://s3.example.com/new.jpg");
      mockCreate.mockResolvedValue({
        id: "p3",
        measurement_id: "m2",
        taken_on: "2026-04-01",
        image_url: "https://s3.example.com/new.jpg",
      });

      renderCard([measurementWithPhoto]);

      await user.selectOptions(screen.getByRole("combobox"), "m2");
      await user.click(screen.getByRole("button", { name: /Trocar foto/i }));

      const file = new File(["img"], "nova.jpg", { type: "image/jpeg" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      await user.upload(input, file);

      await user.click(screen.getByRole("button", { name: /Substituir foto/i }));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith("student-1", "photo-1");
        expect(mockUpload).toHaveBeenCalledWith("student-1", file, expect.any(Function));
        expect(mockCreate).toHaveBeenCalledWith("student-1", {
          bioimpedance_measurement_id: "m2",
          image_url: "https://s3.example.com/new.jpg",
        });
      });
    });
  });

  describe("select label", () => {
    it("marks measurements that already have a photo with · com foto", () => {
      renderCard([measurementWithoutPhoto, measurementWithPhoto]);

      // The option with photo_url includes "· com foto" in its text
      const withPhotoOption = screen.getByRole("option", { name: /com foto/ });
      expect(withPhotoOption).toBeInTheDocument();

      // The option without photo (80.0 kg) must not contain "com foto"
      const withoutPhotoOption = screen.getByRole("option", { name: /80\.0 kg/ });
      expect(withoutPhotoOption).not.toHaveTextContent("com foto");
    });
  });
});
