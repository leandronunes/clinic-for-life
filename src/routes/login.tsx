import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/use-auth";
import { BrandLogo } from "@/components/BrandLogo";
import { ParceirosVitrine } from "@/components/ParceirosVitrine";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { validateStrongPassword } from "@/lib/utils";
import { toast } from "sonner";
import type { AuthUser } from "@/lib/api/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwErrors, setPwErrors] = useState<string[]>([]);

  const handleGoogleSuccess = useCallback(
    (user: AuthUser) => {
      toast.success(`Bem-vindo(a), ${user.name.split(" ")[0]}!`);
      navigate({ to: user.role === "aluno" ? "/aluno" : "/dashboard" });
    },
    [navigate],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStrongPassword(password);
    if (errs.length) {
      setPwErrors(errs);
      toast.error("Senha não atende aos requisitos de segurança.");
      return;
    }
    setPwErrors([]);
    setLoading(true);
    try {
      const user = await signIn(email, password);
      toast.success(`Bem-vindo(a), ${user.name.split(" ")[0]}!`);
      navigate({ to: user.role === "aluno" ? "/aluno" : "/dashboard" });
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Falha no login";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fillCredential = (role: "admin" | "personal" | "aluno") => {
    const map = {
      admin: { email: "admin@forlife.app", password: "Admin@2026" },
      personal: { email: "personal@forlife.app", password: "Personal@2026" },
      aluno: { email: "aluno@forlife.app", password: "Aluno@2026" },
    };
    setEmail(map[role].email);
    setPassword(map[role].password);
  };

  return (
    <main className="flex min-h-screen flex-col">
      <div className="grid flex-1 lg:grid-cols-2">
        {/* Painel visual à esquerda */}
        <div className="relative hidden flex-col justify-between overflow-hidden p-12 text-primary-foreground lg:flex brand-gradient">
          <BrandLogo size={56} withWordmark inverted />
          <div className="relative z-10 max-w-md">
            <h1 className="text-4xl font-bold leading-tight">
              Saúde, movimento, capacidade e <span className="text-accent">vida</span>.
            </h1>
            <p className="mt-4 text-primary-foreground/80">
              A plataforma integrada da Clínica For Life para acompanhar avaliação física, treinos e
              evolução dos seus alunos em tempo real.
            </p>
          </div>
          <div className="text-xs text-primary-foreground/60">v4.0 · Núcleo For Life · MVP</div>
          {/* círculos decorativos */}
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
          <div className="pointer-events-none absolute -top-32 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        </div>

        {/* Formulário */}
        <div className="flex items-center justify-center bg-background p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <BrandLogo size={56} withWordmark />
            </div>

            <h2 className="text-2xl font-bold text-foreground">Entrar na sua conta</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use seu e-mail e senha cadastrados.
            </p>

            <Card className="mt-6 shadow-soft">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@forlife.app"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                      <Link
                        to="/esqueci-senha"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Esqueci minha senha
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Mostrar/ocultar senha"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {pwErrors.length > 0 && (
                      <p className="text-xs text-destructive">
                        Senha precisa de: {pwErrors.join(", ")}.
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Mín. 8 caracteres, com maiúscula, minúscula, número e caractere especial.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Entrar
                  </Button>

                  <div className="relative my-2 text-center text-xs text-muted-foreground">
                    <span className="bg-card px-2 relative z-10">ou continue com</span>
                    <div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
                  </div>

                  <GoogleLoginButton className="w-full" onSuccess={handleGoogleSuccess} />
                </form>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Ainda não tem uma conta?{" "}
              <Link to="/cadastro" className="font-medium text-primary hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
      <ParceirosVitrine />
      <PwaInstallBanner />
    </main>
  );
}
