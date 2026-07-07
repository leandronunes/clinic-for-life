import { useCallback, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import type { TokenResponse } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/use-auth";
import type { AuthUser } from "@/lib/api/auth";

interface GoogleLoginButtonProps {
  onSuccess: (user: AuthUser) => void;
  className?: string;
}

export function GoogleLoginButton({ onSuccess, className }: GoogleLoginButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSuccess = useCallback(
    async (tokenResponse: Omit<TokenResponse, "error" | "error_description" | "error_uri">) => {
      setLoading(true);
      try {
        const user = await signInWithGoogle(tokenResponse.access_token);
        onSuccess(user);
      } catch (err) {
        const message = (err as { message?: string })?.message ?? "Falha no login com Google";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [signInWithGoogle, onSuccess],
  );

  const login = useGoogleLogin({
    onSuccess: handleSuccess,
    onError: () => toast.error("Login com Google cancelado ou falhou."),
  });

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={loading}
      onClick={() => login()}
      aria-label="Entrar com Google"
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
      Google
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 11v3.2h5.3c-.2 1.4-1.6 4.2-5.3 4.2-3.2 0-5.8-2.6-5.8-5.9S8.8 6.6 12 6.6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.7 4.2 14.6 3.2 12 3.2 6.9 3.2 2.8 7.3 2.8 12.5S6.9 21.8 12 21.8c6.9 0 9.4-4.8 9.4-7.3 0-.5-.1-.9-.1-1.3H12z"
      />
    </svg>
  );
}
