import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function PwaInstallButton() {
  const { canInstall, install } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={install}
      className="hidden gap-2 text-xs sm:flex"
      title="Instalar aplicativo"
    >
      <Download className="h-3.5 w-3.5" />
      Instalar app
    </Button>
  );
}
