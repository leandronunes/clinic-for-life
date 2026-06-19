import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { BrandLogo } from "@/components/BrandLogo";
import { ParceirosVitrine } from "@/components/ParceirosVitrine";
import { validateStrongPassword } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({
  component: CadastroPage,
});

function CadastroPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwErrors, setPwErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (password !== passwordConfirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    const errs = validateStrongPassword(password);
    if (errs.length) {
      setPwErrors(errs);
      toast.error("Senha não atende aos requisitos de segurança.");
      return;
    }
    setPwErrors([]);
    setLoading(true);
    try {
      const user = await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirm,
        phone: phone.trim() || undefined,
      });
      toast.success(`Conta criada com sucesso! Bem-vindo(a), ${user.name.split(" ")[0]}.`);
      navigate({ to: user.role === "aluno" ? "/aluno" : "/dashboard" });
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Falha no cadastro";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <div className="grid flex-1 lg:grid-cols-2">
        {/* Painel visual à esquerda */}
        <div className="relative hidden flex-col justify-between overflow-hidden p-12 text-primary-foreground lg:flex brand-gradient">
          <BrandLogo size={56} />
          <div className="relative z-10 max-w-md">
            <h1 className="text-4xl font-bold leading-tight">
              Crie sua conta e comece a sua <span className="text-accent">jornada</span>.
            </h1>
            <p className="mt-4 text-primary-foreground/80">
              Junte-se à Clínica For Life e acompanhe sua avaliação física, treinos e
              evolução em um único lugar.
            </p>
          </div>
          <div className="text-xs text-primary-foreground/60">v4.0 · Núcleo For Life · MVP</div>
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
          <div className="pointer-events-none absolute -top-32 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        </div>

        {/* Formulário */}
        <div className="flex items-center justify-center bg-background p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <BrandLogo size={56} withWordmark />
            </div>

            <h2 className="text-2xl font-bold text-foreground">Criar conta</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Preencha os dados abaixo para se cadastrar como aluno.
            </p>

            <Card className="mt-6 shadow-soft">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={120}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={255}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (opcional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="(11) 99999-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
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

                  <div className="space-y-2">
                    <Label htmlFor="password_confirmation">Confirmar senha</Label>
                    <Input
                      id="password_confirmation"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Criar conta
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
      <ParceirosVitrine />
    </main>
  );
}
