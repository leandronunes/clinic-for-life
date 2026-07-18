export const PSE_MIN = 1;
export const PSE_MAX = 10;

export type PseCategory = "leve" | "moderado" | "intenso" | "maximo";

/** Categorização da PSE inspirada na escala de Borg CR-10 simplificada. */
export function pseCategory(pse: number): PseCategory {
  if (pse <= 3) return "leve";
  if (pse <= 6) return "moderado";
  if (pse <= 8) return "intenso";
  return "maximo";
}

interface PseCategoryMeta {
  label: string;
  badgeClass: string;
  toggleActiveClass: string;
}

export const PSE_CATEGORY_META: Record<PseCategory, PseCategoryMeta> = {
  leve: {
    label: "Leve",
    badgeClass: "bg-success/10 text-success",
    toggleActiveClass: "data-[state=on]:bg-success data-[state=on]:text-success-foreground",
  },
  moderado: {
    label: "Moderado",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    toggleActiveClass:
      "data-[state=on]:bg-amber-500 data-[state=on]:text-white dark:data-[state=on]:text-amber-950",
  },
  intenso: {
    label: "Intenso",
    badgeClass: "bg-primary/10 text-primary",
    toggleActiveClass: "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
  },
  maximo: {
    label: "Máximo",
    badgeClass: "bg-destructive/10 text-destructive",
    toggleActiveClass: "data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground",
  },
};

/** "7 · Intenso" — usado no badge de exibição da PSE. */
export function formatPse(pse: number): string {
  return `${pse} · ${PSE_CATEGORY_META[pseCategory(pse)].label}`;
}
