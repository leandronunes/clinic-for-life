import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "forlife-pwa-banner-dismissed";

export function PwaInstallBanner() {
  const { canInstall, isInstalled, isIOS, install } = usePwaInstall();
  const [timerFired, setTimerFired] = useState(false);

  useEffect(() => {
    if (isInstalled) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const timer = setTimeout(() => setTimerFired(true), 1800);
    return () => clearTimeout(timer);
  }, [isInstalled]);

  const dismiss = () => {
    setTimerFired(false);
    sessionStorage.setItem(SESSION_KEY, "1");
  };

  const handleInstall = async () => {
    await install();
    dismiss();
  };

  // Só exibe quando há ação direta: iOS (Share nativo) ou Android com prompt disponível
  const actionable = isIOS || canInstall;
  const visible = timerFired && actionable && !isInstalled;

  if (isInstalled) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "transition-transform duration-500 ease-out",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      aria-live="polite"
    >
      <div
        className="m-3 rounded-2xl p-4 shadow-2xl"
        style={{ background: "linear-gradient(135deg, #0C2840 0%, #0A1A2F 100%)" }}
      >
        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          <img
            src="/icons/icon.svg"
            alt="For Life"
            className="h-11 w-11 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Instale o For Life</p>
            <p className="mt-0.5 text-xs text-white/55">
              {isIOS ? "Acesse pelo ícone, sem abrir o Safari." : "Acesso rápido, sem abrir o browser."}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fechar"
            className="shrink-0 -mt-0.5 text-white/35 transition-colors hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Ação */}
        <div className="mt-3">
          {isIOS ? (
            <div className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-2.5 text-xs text-white/70">
              <Share className="h-4 w-4 shrink-0 text-[#16B8A6]" />
              <span>
                Toque em <strong className="text-white">Compartilhar</strong> e depois em{" "}
                <strong className="text-white">Adicionar à Tela de Início</strong>.
              </span>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleInstall}
              className="w-full bg-[#16B8A6] font-semibold text-white hover:bg-[#13a696]"
            >
              <Download className="mr-2 h-4 w-4" />
              Instalar agora
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
