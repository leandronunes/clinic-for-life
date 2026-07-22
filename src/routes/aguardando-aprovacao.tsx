import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/contexts/use-auth";

export const Route = createFileRoute("/aguardando-aprovacao")({
  component: AguardandoAprovacaoPage,
});

function AguardandoAprovacaoPage() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <BrandLogo size={56} withWordmark />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  // Só quem está com o pedido de entrada pendente fica nesta tela — qualquer
  // outra pessoa que chegue aqui direto (link salvo, etc.) segue pro app.
  if (!user.pending_approval)
    return <Navigate to={user.role === "aluno" ? "/aluno" : "/dashboard"} />;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8">
        <BrandLogo size={56} withWordmark />
      </div>
      <Card className="w-full max-w-md shadow-soft">
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-warning/15 text-warning">
            <Clock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Cadastro em análise</h1>
          <p className="text-sm text-muted-foreground">
            O admin da organização que você escolheu ainda precisa aprovar sua entrada. Assim que
            isso acontecer, você terá acesso completo à plataforma — não é preciso fazer nada por
            enquanto.
          </p>
          <Button variant="outline" onClick={signOut} className="mt-2">
            Sair
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
