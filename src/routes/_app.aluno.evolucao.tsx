import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/_app/aluno/evolucao")({
  head: () => ({ meta: [{ title: "Evolução — Núcleo For Life" }] }),
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold md:text-3xl">Evolução Física</h1>
      <Card className="shadow-soft">
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
          <Construction className="h-10 w-10 text-accent" />
          <p>Gráficos de evolução em construção — próxima entrega.</p>
        </CardContent>
      </Card>
    </div>
  ),
});
