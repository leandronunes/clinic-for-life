import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { toast } from "sonner";

export function NotificationsCard() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications();

  async function handleToggle(checked: boolean) {
    try {
      if (checked) {
        await subscribe();
        if (Notification.permission === "granted") {
          toast.success("Notificações ativadas");
        } else {
          toast.error("Permissão de notificação negada");
        }
      } else {
        await unsubscribe();
        toast.success("Notificações desativadas");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      toast.error(message ?? "Não foi possível atualizar as notificações");
    }
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" /> Notificações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isSupported ? (
          <p className="text-sm text-muted-foreground">
            Seu navegador não é compatível com notificações push.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Novos treinos</p>
              <p className="text-xs text-muted-foreground">
                {permission === "denied"
                  ? "Notificações bloqueadas nas configurações do navegador."
                  : "Seja avisado quando seu Personal criar um novo treino."}
              </p>
            </div>
            <Switch
              checked={isSubscribed}
              disabled={isLoading || permission === "denied"}
              onCheckedChange={handleToggle}
              aria-label="Ativar notificações de novos treinos"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
