import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GoogleLoginButton } from "./GoogleLoginButton";
import type { AuthUser } from "@/lib/api/auth";

const mockTriggerLogin = vi.fn();

vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: vi.fn(() => mockTriggerLogin),
}));

const mockSignInWithGoogle = vi.fn();
vi.mock("@/contexts/use-auth", () => ({
  useAuth: () => ({ signInWithGoogle: mockSignInWithGoogle }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { toast } from "sonner";
import { useGoogleLogin } from "@react-oauth/google";

const fakeUser: AuthUser = { id: "u1", name: "João Silva", email: "joao@email.com", role: "aluno" };

type GoogleSuccessCallback = (token: { access_token: string }) => Promise<void>;
type GoogleErrorCallback = () => void;

function captureCallbacks() {
  let onSuccess: GoogleSuccessCallback | undefined;
  let onError: GoogleErrorCallback | undefined;

  vi.mocked(useGoogleLogin).mockImplementation((opts: Parameters<typeof useGoogleLogin>[0]) => {
    onSuccess = opts.onSuccess as unknown as GoogleSuccessCallback;
    onError = opts.onError as GoogleErrorCallback;
    return mockTriggerLogin;
  });

  return {
    triggerSuccess: (token: { access_token: string }) => onSuccess!(token),
    triggerError: () => onError!(),
  };
}

describe("GoogleLoginButton", () => {
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGoogleLogin).mockReturnValue(mockTriggerLogin);
    // The button only renders when a Google OAuth client id is configured.
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("não renderiza nada quando VITE_GOOGLE_CLIENT_ID não está configurado", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    const { container } = render(<GoogleLoginButton onSuccess={onSuccess} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza o botão do Google", () => {
    render(<GoogleLoginButton onSuccess={onSuccess} />);
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
  });

  it("inicia o fluxo OAuth ao clicar no botão", async () => {
    render(<GoogleLoginButton onSuccess={onSuccess} />);
    await userEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(mockTriggerLogin).toHaveBeenCalled();
  });

  it("chama onSuccess com o usuário após autenticação Google bem-sucedida", async () => {
    const { triggerSuccess } = captureCallbacks();
    mockSignInWithGoogle.mockResolvedValue(fakeUser);

    render(<GoogleLoginButton onSuccess={onSuccess} />);

    await act(async () => {
      await triggerSuccess({ access_token: "google-token-abc" });
    });

    expect(mockSignInWithGoogle).toHaveBeenCalledWith("google-token-abc");
    expect(onSuccess).toHaveBeenCalledWith(fakeUser);
  });

  it("exibe toast de erro quando signInWithGoogle falha", async () => {
    const { triggerSuccess } = captureCallbacks();
    mockSignInWithGoogle.mockRejectedValue({ message: "Token inválido" });

    render(<GoogleLoginButton onSuccess={onSuccess} />);

    await act(async () => {
      await triggerSuccess({ access_token: "bad-token" });
    });

    expect(toast.error).toHaveBeenCalledWith("Token inválido");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("usa mensagem fallback quando o erro não tem message", async () => {
    const { triggerSuccess } = captureCallbacks();
    mockSignInWithGoogle.mockRejectedValue({});

    render(<GoogleLoginButton onSuccess={onSuccess} />);

    await act(async () => {
      await triggerSuccess({ access_token: "token" });
    });

    expect(toast.error).toHaveBeenCalledWith("Falha no login com Google");
  });

  it("exibe toast de erro quando o OAuth do Google falha ou é cancelado", () => {
    const { triggerError } = captureCallbacks();
    render(<GoogleLoginButton onSuccess={onSuccess} />);
    triggerError();
    expect(toast.error).toHaveBeenCalledWith("Login com Google cancelado ou falhou.");
  });

  it("desabilita o botão enquanto aguarda a resposta", async () => {
    const { triggerSuccess } = captureCallbacks();
    let resolveLogin!: (user: AuthUser) => void;
    mockSignInWithGoogle.mockReturnValue(
      new Promise<AuthUser>((resolve) => {
        resolveLogin = resolve;
      }),
    );

    render(<GoogleLoginButton onSuccess={onSuccess} />);

    act(() => {
      void triggerSuccess({ access_token: "token" });
    });

    expect(screen.getByRole("button", { name: /google/i })).toBeDisabled();

    await act(async () => {
      resolveLogin(fakeUser);
    });

    expect(screen.getByRole("button", { name: /google/i })).not.toBeDisabled();
  });
});
