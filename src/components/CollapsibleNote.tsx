import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

export type CollapsibleNoteVariant = "plain" | "callout";

/**
 * A note that clamps to 2 lines and reveals a "Ver mais/Ver menos" toggle
 * only when the text actually overflows. Two variants share the same
 * overflow-measuring logic: "plain" is a bordered box (exercise row notes),
 * "callout" is a highlighted tip card (guided execution dialog).
 */
export function CollapsibleNote({
  notes,
  variant,
}: {
  notes: string;
  variant: CollapsibleNoteVariant;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const previewRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    // Mede se o texto ultrapassa 2 linhas para decidir se mostra "Ver mais".
    setOverflows(el.scrollHeight - el.clientHeight > 1);
  }, [notes]);

  const showToggle = overflows || expanded;

  const text = (
    <p
      ref={previewRef}
      className={cn(
        "whitespace-pre-wrap break-words text-foreground/90",
        !expanded && "line-clamp-2",
      )}
    >
      {notes}
    </p>
  );

  const toggle = showToggle && (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      aria-expanded={expanded}
    >
      {expanded ? (
        <>
          Ver menos <ChevronUp className="h-3 w-3" />
        </>
      ) : (
        <>
          Ver mais <ChevronDown className="h-3 w-3" />
        </>
      )}
    </button>
  );

  if (variant === "callout") {
    return (
      <div className="flex gap-3 rounded-lg border-l-4 border-l-primary bg-primary/5 p-3 text-sm">
        <Lightbulb className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 text-xs font-semibold text-muted-foreground">Dica do personal</div>
          {text}
          {toggle}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <StickyNote className="h-3.5 w-3.5" />
        Observação do Personal
      </div>
      {text}
      {toggle}
    </div>
  );
}
