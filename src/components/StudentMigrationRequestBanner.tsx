import { ArrowRightLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/use-auth";
import { acceptStudentMigration, rejectStudentMigration } from "@/lib/api/students";
import { fetchCurrentUser } from "@/lib/api/auth";

/**
 * Non-blocking — unlike the pending-approval waiting screen, the student
 * keeps full access to their current organization while this is pending.
 * Shown wherever the student can see it (e.g. their home screen).
 */
export function StudentMigrationRequestBanner() {
  const { user, updateUser } = useAuth();
  const request = user?.pending_migration_request;

  const refreshSession = () => fetchCurrentUser().then(updateUser);

  const acceptMut = useMutation({
    mutationFn: (id: string) => acceptStudentMigration(id),
    onSuccess: async () => {
      toast.success("Migração concluída — bem-vindo à nova organização!");
      await refreshSession();
    },
    onError: () => toast.error("Falha ao aceitar a migração."),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectStudentMigration(id),
    onSuccess: async () => {
      toast.success("Convite recusado.");
      await refreshSession();
    },
    onError: () => toast.error("Falha ao recusar o convite."),
  });

  if (!request) return null;

  const isPending = acceptMut.isPending || rejectMut.isPending;

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-soft">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ArrowRightLeft className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Convite para migrar de organização
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>{request.requested_by_name}</strong> convidou você para migrar para a
              organização <strong>{request.target_organization_name}</strong>. Se aceitar, seu
              cadastro passa a fazer parte dela.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => rejectMut.mutate(request.id)}
          >
            Recusar
          </Button>
          <Button size="sm" disabled={isPending} onClick={() => acceptMut.mutate(request.id)}>
            {acceptMut.isPending ? "Aceitando..." : "Aceitar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
