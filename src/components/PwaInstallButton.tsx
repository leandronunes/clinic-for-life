import { Download, Share, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function PwaInstallButton() {
  const { canInstall, isInstalled, isIOS, install } = usePwaInstall();

  if (isInstalled) return null;

  if (canInstall) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={install}
        className="flex gap-1.5 text-xs"
        title="Instalar aplicativo"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Instalar app</span>
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex gap-1.5 text-xs"
          title="Instalar aplicativo"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Instalar app</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-72 text-sm">
        {isIOS ? (
          <div className="space-y-2">
            <p className="font-semibold">Instalar no iPhone / iPad</p>
            <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
              <li>
                Toque em <Share className="inline h-3.5 w-3.5 mx-0.5 align-text-bottom" />
                <strong> Compartilhar</strong> no Safari
              </li>
              <li>
                Selecione <strong>"Adicionar à Tela de Início"</strong>
              </li>
              <li>
                Toque em <strong>Adicionar</strong>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold">Instalar no dispositivo</p>
            <p className="text-muted-foreground">
              Procure o ícone{" "}
              <MonitorSmartphone className="inline h-3.5 w-3.5 mx-0.5 align-text-bottom" /> na barra
              de endereços do browser e toque em <strong>"Instalar"</strong>.
            </p>
            <p className="text-xs text-muted-foreground">
              Se não aparecer, abra o menu do browser (⋮) e procure{" "}
              <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
