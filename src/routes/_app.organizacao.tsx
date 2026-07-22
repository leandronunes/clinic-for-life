import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchOrganizations, updateOrganization } from "@/lib/api/organizations";
import { useAuth } from "@/contexts/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/organizacao")({
  component: OrganizacaoPage,
});

export function OrganizacaoPage() {
  const { user } = useAuth();

  if (user?.role !== "admin") return <Navigate to="/dashboard" />;
  if (!user.organization_id) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Organização</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os dados da sua organização. Só você, como administrador, pode editá-los.
        </p>
      </div>

      <OrganizationCard organizationId={user.organization_id} />
    </div>
  );
}

function OrganizationCard({ organizationId }: { organizationId: string }) {
  const qc = useQueryClient();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });
  const organization = organizations?.find((o) => o.id === organizationId) ?? null;

  const [form, setForm] = useState<{ name: string; domain: string } | null>(null);
  const current =
    form ?? (organization ? { name: organization.name, domain: organization.domain } : null);

  const saveMut = useMutation({
    mutationFn: () =>
      updateOrganization(organizationId, { name: current!.name, domain: current!.domain }),
    onSuccess: () => {
      toast.success("Organização atualizada");
      qc.invalidateQueries({ queryKey: ["organizations"] });
      setForm(null);
    },
    onError: () => toast.error("Falha ao atualizar organização."),
  });

  if (isLoading || !current) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" /> Dados gerais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome da organização" className="sm:col-span-2">
            <Input
              value={current.name}
              onChange={(e) => setForm({ ...current, name: e.target.value })}
            />
          </Field>
          <Field label="Domínio (identificador único)" className="sm:col-span-2">
            <Input
              value={current.domain}
              onChange={(e) => setForm({ ...current, domain: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setForm(null)}
            disabled={!form || saveMut.isPending}
          >
            Descartar
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={!form || saveMut.isPending}>
            {saveMut.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
