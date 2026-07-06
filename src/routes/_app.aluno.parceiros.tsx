import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Handshake, Loader2, BadgeCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchPartners, CATEGORY_FROM_BACKEND } from "@/lib/api/partners";
import { useAuth } from "@/contexts/auth-context";
import { BrandLogo } from "@/components/BrandLogo";
export const Route = createFileRoute("/_app/aluno/parceiros")({
  component: AlunoParceirosPage,
});

function buildMemberId(seed: string) {
  // Deterministic numeric ID derived from the user's id/email
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const n = (h % 99999999).toString().padStart(8, "0");
  return `NFL-${n.slice(0, 4)}-${n.slice(4)}`;
}

function AlunoParceirosPage() {
  const { user, effectiveRole } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["parceiros"],
    queryFn: () => fetchPartners(),
  });

  const seed = user?.aluno_id ?? user?.id ?? user?.email ?? "anon";
  const memberId = buildMemberId(seed);
  const nome = user?.name ?? "Aluno(a)";
  const role = effectiveRole ?? user?.role;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Parceiros</h1>
        <p className="text-sm text-muted-foreground">
          Apresente seu cartão virtual aos parceiros para acessar descontos exclusivos.
        </p>
      </div>

      {/* Cartão virtual */}
      <section aria-label="Cartão virtual do aluno">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-5 text-primary-foreground shadow-lg sm:p-7">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-black/10 blur-2xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/15 p-2 backdrop-blur">
                <BrandLogo size={36} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest opacity-80">Núcleo For Life</div>
                <div className="text-sm font-medium opacity-90">Cartão do Aluno</div>
              </div>
            </div>
            <Badge className="self-start bg-white/15 text-primary-foreground hover:bg-white/20 sm:self-auto">
              <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Membro ativo
            </Badge>
          </div>

          <div className="relative mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-widest opacity-70">Nome</div>
              <div className="text-lg font-semibold sm:text-xl">{nome}</div>
            </div>
            <div className="sm:text-right">
              <div className="text-[11px] uppercase tracking-widest opacity-70">Identificador</div>
              <div className="font-mono text-lg font-semibold tracking-wider sm:text-xl">
                {memberId}
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-80">
            <span>Apresente este cartão ao parceiro para garantir seu desconto.</span>
            <span className="capitalize">{role}</span>
          </div>
        </div>
      </section>

      {/* Lista de parceiros */}
      <section aria-label="Lista de parceiros">
        <div className="mb-3 flex items-center gap-2">
          <Handshake className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Parceiros disponíveis</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando parceiros…
          </div>
        ) : data.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum parceiro cadastrado no momento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-background">
                    {p.logo_url && (
                      <img
                        src={p.logo_url}
                        alt={`Logo ${p.name}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{p.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {CATEGORY_FROM_BACKEND[p.category]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Acessar parceiro <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
