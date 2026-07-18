import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PSE_MIN, PSE_MAX, pseCategory, PSE_CATEGORY_META, formatPse } from "@/lib/pse";

const PSE_VALUES = Array.from({ length: PSE_MAX - PSE_MIN + 1 }, (_, i) => PSE_MIN + i);

/** Escala de Percepção Subjetiva de Esforço (PSE), 1-10.
 *
 * Interativa (padrão): grupo de botões numéricos para escolher um valor.
 * `readOnly`: um badge compacto "N · Categoria" — nunca renderiza os 10
 * botões desabilitados, que seriam ruído nas telas de histórico/revisão. */
export function PseScale({
  value,
  onChange,
  readOnly = false,
}: {
  value: number | null;
  onChange?: (value: number) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    if (value == null) return null;
    const category = pseCategory(value);
    return (
      <Badge
        variant="outline"
        className={cn("border-transparent", PSE_CATEGORY_META[category].badgeClass)}
      >
        PSE {formatPse(value)}
      </Badge>
    );
  }

  return (
    <ToggleGroup
      type="single"
      value={value != null ? String(value) : ""}
      onValueChange={(v) => {
        if (v) onChange?.(Number(v));
      }}
      className="flex-wrap justify-start"
      aria-label="Percepção Subjetiva de Esforço, de 1 a 10"
    >
      {PSE_VALUES.map((n) => (
        <ToggleGroupItem
          key={n}
          value={String(n)}
          aria-label={`PSE ${formatPse(n)}`}
          className={cn("h-9 w-9", PSE_CATEGORY_META[pseCategory(n)].toggleActiveClass)}
        >
          {n}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
