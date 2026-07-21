import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { BrandLogo } from "@/components/BrandLogo";
import { forgotPassword } from "@/lib/api/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/esqueci-senha")({
  component: EsqueciSenhaPage,
});

function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      // Sempre mostra a mesma mensagem, exista ou não o e-mail — o backend
      // já não revela isso, e a UI não deve contornar essa proteção.
      setSent(true);
    } catch {
      toast.error("Não foi possível processar o pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <div className="grid flex-1 lg:grid-cols-2">
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
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
          <div className="pointer-events-none absolute -top-32 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="flex items-center justify-center bg-background p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <BrandLogo size={56} withWordmark />
            </div>

            <h2 className="text-2xl font-bold text-foreground">Esqueci minha senha</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>

            <Card className="mt-6 shadow-soft">
              <CardContent className="pt-6">
                {sent ? (
                  <p className="text-sm text-muted-foreground">
                    Se o e-mail informado estiver cadastrado, você receberá um link de redefinição
                    em instantes. O link expira em 30 minutos.
                  </p>
                ) : (
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

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Enviar link de redefinição
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary hover:underline">
                Voltar para o login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
