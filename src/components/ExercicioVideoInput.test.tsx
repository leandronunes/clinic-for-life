import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExercicioVideoInput } from "./ExercicioVideoInput";

vi.mock("@/lib/api/uploads", () => ({
  uploadVideoToS3: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { uploadVideoToS3 } from "@/lib/api/uploads";
import { toast } from "sonner";

const mockUpload = vi.mocked(uploadVideoToS3);

const mockTrack = { stop: vi.fn() };
const mockStream = { getTracks: () => [mockTrack] };

// MediaRecorder must be a proper class to support `new MediaRecorder(...)`.
// `mimeType` mirrors the real API: it reflects what the browser actually
// picked, which matters when the constructor wasn't given an explicit one
// (e.g. Safari, simulated here via `isTypeSupported` always returning false).
class FakeMediaRecorder {
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  mimeType: string;
  readonly start = vi.fn();
  readonly stop = vi.fn().mockImplementation(() => {
    this.onstop?.();
  });
  static isTypeSupported = vi.fn().mockReturnValue(false);
  static lastInstance: FakeMediaRecorder | null = null;
  static nextMimeType = "video/mp4";

  constructor(_stream: unknown, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? FakeMediaRecorder.nextMimeType;
    FakeMediaRecorder.lastInstance = this;
  }
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderInput(value = "", onChange = vi.fn()) {
  const qc = makeQueryClient();
  render(
    <QueryClientProvider client={qc}>
      <ExercicioVideoInput studentId="s1" value={value} onChange={onChange} />
    </QueryClientProvider>,
  );
}

// useIsMobile (src/hooks/use-mobile.tsx) checks window.innerWidth, not
// matchMedia's `matches` — matchMedia only needs stubbing so jsdom doesn't
// throw (it has no real implementation).
function stubIsMobile(isMobile: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, "innerWidth", {
    value: isMobile ? 375 : 1024,
    configurable: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  FakeMediaRecorder.lastInstance = null;
  FakeMediaRecorder.nextMimeType = "video/mp4";
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn().mockReturnValue("blob:mock-video"),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
    configurable: true,
  });
  stubIsMobile(false);
});

describe("ExercicioVideoInput", () => {
  describe("Remover vídeo", () => {
    it("does not show the remove button when there is no video", () => {
      renderInput("");
      expect(screen.queryByRole("button", { name: /Remover vídeo/i })).not.toBeInTheDocument();
    });

    it("shows the remove button for an uploaded (S3) video and clears it on click", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      renderInput("https://s3.example.com/exercise_123.mp4", onChange);

      const removeButton = screen.getByRole("button", { name: /Remover vídeo/i });
      await user.click(removeButton);

      expect(onChange).toHaveBeenCalledWith("");
    });

    it("shows the remove button for a YouTube link and clears it on click", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      renderInput("https://www.youtube.com/embed/abc", onChange);

      await user.click(screen.getByRole("button", { name: /Remover vídeo/i }));

      expect(onChange).toHaveBeenCalledWith("");
    });

    it("hides the remove button while an upload is in progress", async () => {
      mockUpload.mockImplementation(() => new Promise(() => {})); // never resolves
      const user = userEvent.setup();
      renderInput();
      await user.click(screen.getByRole("tab", { name: /Gravar \/ Enviar/i }));

      const file = new File(["video"], "treino.mp4", { type: "video/mp4" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Enviando para o servidor/i)).toBeInTheDocument();
      });
      expect(screen.queryByRole("button", { name: /Remover vídeo/i })).not.toBeInTheDocument();
    });
  });

  describe("YouTube tab", () => {
    it("renders the YouTube URL input by default", () => {
      renderInput();
      expect(screen.getByPlaceholderText(/youtube/i)).toBeInTheDocument();
    });

    it("calls onChange when a YouTube URL is typed", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      renderInput("", onChange);
      await user.type(screen.getByPlaceholderText(/youtube/i), "https://youtu.be/abc");
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("Gravar / Enviar tab", () => {
    async function openUploadTab() {
      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: /Gravar \/ Enviar/i }));
      return user;
    }

    it("shows Gravar agora and Enviar arquivo buttons in upload tab", async () => {
      renderInput();
      await openUploadTab();
      expect(screen.getByRole("button", { name: /Gravar agora/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Enviar arquivo/i })).toBeInTheDocument();
    });

    it("does not show the stop button before recording starts", async () => {
      renderInput();
      await openUploadTab();
      expect(screen.queryByRole("button", { name: /Parar gravação/i })).not.toBeInTheDocument();
    });

    describe("recording flow", () => {
      it("shows Parar gravação button after clicking Gravar agora", async () => {
        renderInput();
        const user = await openUploadTab();

        await user.click(screen.getByRole("button", { name: /Gravar agora/i }));

        await waitFor(() => {
          expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
            expect.objectContaining({ video: expect.anything(), audio: true }),
          );
          expect(screen.getByRole("button", { name: /Parar gravação/i })).toBeInTheDocument();
        });
      });

      it("live preview video element is rendered during recording", async () => {
        renderInput();
        const user = await openUploadTab();

        await user.click(screen.getByRole("button", { name: /Gravar agora/i }));

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Parar gravação/i })).toBeInTheDocument();
        });

        // The live preview <video> element is rendered when recording=true.
        // React sets `muted` as a property (not HTML attribute), so query by tag name.
        expect(document.querySelector("video")).toBeInTheDocument();
      });

      it("stops recording and hides stop button when Parar gravação is clicked", async () => {
        mockUpload.mockResolvedValue("https://s3.example.com/video.webm");
        renderInput();
        const user = await openUploadTab();

        await user.click(screen.getByRole("button", { name: /Gravar agora/i }));
        await waitFor(() =>
          expect(screen.getByRole("button", { name: /Parar gravação/i })).toBeInTheDocument(),
        );

        await user.click(screen.getByRole("button", { name: /Parar gravação/i }));

        await waitFor(() => {
          expect(screen.queryByRole("button", { name: /Parar gravação/i })).not.toBeInTheDocument();
        });
      });

      it("uploads with the browser's actual recording mimeType, not a hardcoded webm (Safari case)", async () => {
        // Simulates Safari: no webm codec is supported, so the constructor
        // gets no explicit mimeType and the browser falls back to mp4.
        FakeMediaRecorder.nextMimeType = "video/mp4";
        mockUpload.mockResolvedValue("https://s3.example.com/video.mp4");
        renderInput();
        const user = await openUploadTab();

        await user.click(screen.getByRole("button", { name: /Gravar agora/i }));
        await waitFor(() =>
          expect(screen.getByRole("button", { name: /Parar gravação/i })).toBeInTheDocument(),
        );

        await user.click(screen.getByRole("button", { name: /Parar gravação/i }));

        await waitFor(() => {
          expect(mockUpload).toHaveBeenCalledWith(
            "s1",
            expect.any(Blob),
            expect.stringContaining(".mp4"),
            "video/mp4",
            expect.any(Function),
          );
        });
      });
    });

    describe("on mobile", () => {
      beforeEach(() => stubIsMobile(true));

      it("opens the native camera app instead of the in-app recorder", async () => {
        renderInput();
        const user = await openUploadTab();

        await user.click(screen.getByRole("button", { name: /Gravar agora/i }));

        expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
        expect(screen.queryByRole("button", { name: /Parar gravação/i })).not.toBeInTheDocument();
        const captureInput = document.querySelector<HTMLInputElement>("input[capture]")!;
        expect(captureInput).toHaveAttribute("capture", "environment");
        expect(captureInput).toHaveAttribute("accept", "video/*");
      });

      it("uploads the video the camera app hands back", async () => {
        mockUpload.mockResolvedValue("https://s3.example.com/video.mp4");
        const onChange = vi.fn();
        renderInput("", onChange);
        await openUploadTab();

        const file = new File(["video"], "treino.mp4", { type: "video/mp4" });
        const captureInput = document.querySelector<HTMLInputElement>("input[capture]")!;
        Object.defineProperty(captureInput, "files", { value: [file], configurable: true });
        fireEvent.change(captureInput);

        await waitFor(() => {
          expect(mockUpload).toHaveBeenCalledWith(
            "s1",
            file,
            expect.stringContaining(".mp4"),
            "video/mp4",
            expect.any(Function),
          );
          expect(onChange).toHaveBeenCalledWith("https://s3.example.com/video.mp4");
        });
      });
    });

    describe("file upload", () => {
      it("does not force the camera to open on 'Enviar arquivo' — lets the user pick an existing file", async () => {
        // A `capture` attribute here would make mobile browsers jump straight
        // to the camera instead of showing the file picker. That's the
        // dedicated capture input's job (see "on mobile" above) — this
        // button is for choosing an existing video from the gallery/files.
        renderInput();
        await openUploadTab();

        const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
        expect(input).not.toHaveAttribute("capture");
      });

      it("shows error toast for non-video files", async () => {
        renderInput();
        await openUploadTab();

        const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
        const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
        // fireEvent bypasses userEvent's accept-attribute filtering for non-matching types
        Object.defineProperty(input, "files", { value: [file], configurable: true });
        fireEvent.change(input);

        expect(toast.error).toHaveBeenCalledWith("Selecione um arquivo de vídeo");
      });

      it("uploads a valid video file and calls onChange with the S3 URL", async () => {
        mockUpload.mockResolvedValue("https://s3.example.com/video.mp4");
        const onChange = vi.fn();
        renderInput("", onChange);
        const user = await openUploadTab();

        const file = new File(["video"], "treino.mp4", { type: "video/mp4" });
        const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
        await user.upload(input, file);

        await waitFor(() => {
          expect(mockUpload).toHaveBeenCalledWith(
            "s1",
            file,
            expect.stringContaining(".mp4"),
            "video/mp4",
            expect.any(Function),
          );
          expect(onChange).toHaveBeenCalledWith("https://s3.example.com/video.mp4");
          expect(toast.success).toHaveBeenCalledWith("Vídeo enviado com sucesso");
        });
      });

      it("shows error toast when upload fails", async () => {
        mockUpload.mockRejectedValue({ message: "Sem conexão" });
        renderInput();
        const user = await openUploadTab();

        const file = new File(["video"], "treino.mp4", { type: "video/mp4" });
        const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
        await user.upload(input, file);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Falha no upload do vídeo — tente novamente");
        });
      });
    });
  });
});
