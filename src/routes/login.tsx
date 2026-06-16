import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { BrandLogo } from "@/components/BrandLogo";
import { ParceirosVitrine } from "@/components/ParceirosVitrine";
import { validateStrongPassword } from "@/lib/mock-api";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () =>
    pageHead({
      path: "/login",
      title: "Entrar — Núcleo For Life",
      description:
        "Acesse a plataforma da Clínica For Life para acompanhar avaliações, treinos e evolução em tempo real.",
    }),
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
        <BrandLogo size={56} />
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Saúde, movimento, capacidade e <span className="text-accent">vida</span>.
          </h1>
          <p className="mt-4 text-primary-foreground/80">
            A plataforma integrada da Clínica For Life para acompanhar avaliação física,
            treinos e evolução dos seus alunos em tempo real.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/60">
          v4.0 · Núcleo For Life · MVP
        </div>
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
                  <Label htmlFor="password">Senha</Label>
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

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => toast.info("Social login mockado")}>
                    <GoogleIcon /> Google
                  </Button>
                  <Button type="button" variant="outline" onClick={() => toast.info("Social login mockado")}>
                    <AppleIcon /> Apple
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs">
            <div className="mb-2 font-medium text-foreground">Contas de demonstração</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => fillCredential("admin")}>
                Admin
              </Button>
              <Button size="sm" variant="ghost" onClick={() => fillCredential("personal")}>
                Personal
              </Button>
              <Button size="sm" variant="ghost" onClick={() => fillCredential("aluno")}>
                Aluno
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>
      <ParceirosVitrine />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 11v3.2h5.3c-.2 1.4-1.6 4.2-5.3 4.2-3.2 0-5.8-2.6-5.8-5.9S8.8 6.6 12 6.6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.7 4.2 14.6 3.2 12 3.2 6.9 3.2 2.8 7.3 2.8 12.5S6.9 21.8 12 21.8c6.9 0 9.4-4.8 9.4-7.3 0-.5-.1-.9-.1-1.3H12z" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.9-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.8-.4 6.9 1.1 9.1.7 1.1 1.6 2.4 2.8 2.3 1.1 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.7-2.2.8-1.3 1.2-2.5 1.2-2.6-.1 0-2.6-1-2.6-3.9zM14 5.6c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.5.6-1 1.6-.9 2.6 1 .1 2-.5 2.6-1.2z" />
    </svg>
  );
}
