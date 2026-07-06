import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SplashScreenProps {
  onDone: () => void;
}

const PHASES = [80, 350, 700, 1050, 1450] as const;
const HIDE_AT = 2300;
const UNMOUNT_AT = 2800;

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    PHASES.forEach((delay, i) => timers.push(setTimeout(() => setPhase(i + 1), delay)));
    timers.push(setTimeout(() => setHiding(true), HIDE_AT));
    timers.push(setTimeout(onDone, UNMOUNT_AT));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const show = (minPhase: number) =>
    phase >= minPhase ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center px-8",
        "transition-all duration-500 ease-out select-none",
        hiding ? "opacity-0 scale-[1.04]" : "opacity-100 scale-100",
      )}
      style={{
        background: "linear-gradient(160deg, #0E3A53 0%, #0A1A2F 60%, #061018 100%)",
      }}
    >
      {/* Project tag */}
      <p
        className={cn(
          "font-mono text-[11px] uppercase tracking-[0.35em] text-[#8FD7E6]/50",
          "transition-all duration-500",
          show(1),
        )}
      >
        Project //
      </p>

      {/* Logo */}
      <div
        className={cn(
          "mt-6 overflow-hidden rounded-2xl shadow-2xl",
          "transition-all duration-700",
          phase >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-90",
        )}
      >
        <img src="/icons/icon.svg" alt="Núcleo For Life" className="h-20 w-20 object-contain" />
      </div>

      {/* Brand name */}
      <div className={cn("mt-5 text-center transition-all duration-700", show(2))}>
        <p className="font-display text-5xl font-bold leading-none tracking-tight text-white">
          For Life
        </p>
        <p className="font-display mt-2 text-base font-light italic tracking-wide text-[#16B8A6]">
          for life
        </p>
      </div>

      {/* Divider */}
      <div
        className={cn(
          "mt-6 h-px bg-[#16B8A6] transition-all duration-700 ease-out",
          phase >= 3 ? "w-10 opacity-40" : "w-0 opacity-0",
        )}
      />

      {/* Taglines */}
      <div className={cn("mt-5 text-center transition-all duration-700", show(4))}>
        <p className="font-sans text-[17px] font-medium text-white">Saúde, movimento e vida.</p>
        <p className="mt-1 font-sans text-sm text-white/50">Uma marca para acompanhar você.</p>
      </div>

      {/* Specialties */}
      <div className={cn("mt-8 text-center transition-all duration-700", show(5))}>
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
          Núcleo For Life
        </p>
        <p className="mt-2 font-sans text-xs text-[#16B8A6]/60">
          Avaliação física · Quadro clínico
        </p>
        <p className="font-sans text-xs text-[#16B8A6]/60">Reabilitação · Performance</p>
      </div>
    </div>
  );
}
