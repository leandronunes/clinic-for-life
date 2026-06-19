interface BrandLogoProps {
  size?: number;
  withWordmark?: boolean;
  inverted?: boolean;
  className?: string;
}

export function BrandLogo({ size = 40, withWordmark = false, inverted = false, className }: BrandLogoProps) {
  const large = size >= 48;
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <img
        src="/icon.svg"
        alt="Núcleo For Life"
        style={{ width: size, height: size, objectFit: "contain" }}
        className="rounded-md bg-white p-1 shadow-soft"
      />
      {withWordmark && (
        <div className="leading-none">
          <div
            className={`font-medium uppercase tracking-[0.25em] whitespace-nowrap ${inverted ? "text-white/60" : "text-muted-foreground"}`}
            style={{ fontSize: large ? 11 : 9 }}
          >
            Núcleo
          </div>
          <div
            className="mt-1 font-display font-bold leading-none tracking-tight whitespace-nowrap"
            style={{ fontSize: large ? 22 : 15 }}
          >
            <span className={inverted ? "text-white" : "text-primary"}>FOR</span>{" "}
            <span className="text-accent">LIFE</span>
          </div>
        </div>
      )}
    </div>
  );
}
