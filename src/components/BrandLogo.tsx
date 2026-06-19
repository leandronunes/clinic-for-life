interface BrandLogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

export function BrandLogo({ size = 40, withWordmark = false, className }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <img
        src="/icon.svg"
        alt="Núcleo For Life"
        style={{ width: size, height: size, objectFit: "contain" }}
        className="rounded-md bg-white p-1 shadow-soft"
      />
      {withWordmark && (
        <div className="leading-tight">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Núcleo</div>
          <div className="text-base font-bold">
            <span className="text-primary">FOR</span>{" "}
            <span className="text-accent">LIFE</span>
          </div>
        </div>
      )}
    </div>
  );
}
