import { useEffect, useState } from "react";
import { fetchPartners, CATEGORY_FROM_BACKEND, type Partner } from "@/lib/api/partners";
import { ExternalLink } from "lucide-react";

export function ParceirosVitrine({ className = "" }: { className?: string }) {
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    let alive = true;
    fetchPartners()
      .then((data) => {
        if (alive) setPartners(data);
      })
      .catch(() => void 0);
    return () => {
      alive = false;
    };
  }, []);

  if (partners.length === 0) return null;

  return (
    <section
      className={`border-t border-border bg-muted/30 py-8 ${className}`}
      aria-label="Parceiros Núcleo For Life"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Nossos parceiros</h2>
            <p className="text-xs text-muted-foreground">
              Profissionais e marcas que apoiam sua jornada.
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {partners.map((p) => (
            <li key={p.id}>
              <a
                href={p.link ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                title={`${p.name} — ${CATEGORY_FROM_BACKEND[p.category]}`}
                className="group flex h-full flex-col items-center gap-2 rounded-lg border border-border bg-card p-3 text-center transition-shadow hover:shadow-md"
              >
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-border bg-background">
                  {p.logo_url && (
                    <img
                      src={p.logo_url}
                      alt={`Logo ${p.name}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <span className="line-clamp-1 text-xs font-medium text-foreground">{p.name}</span>
                <span className="line-clamp-1 text-[10px] text-muted-foreground">
                  {CATEGORY_FROM_BACKEND[p.category]}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Acessar <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
