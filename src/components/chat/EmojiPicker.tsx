import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Grid simples de emojis mais usados em conversas, agrupados por categoria.
 * Evita dependência externa (emoji-mart, etc.) e mantém o bundle enxuto —
 * cobre o suficiente para uma UX estilo WhatsApp básica.
 */
const CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Sorrisos",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😊",
      "😉",
      "😍",
      "🥰",
      "😘",
      "😎",
      "🤩",
      "🥳",
      "😇",
      "🙂",
      "😌",
      "😅",
      "😂",
      "🤣",
      "😜",
      "🤪",
      "🤗",
      "🤔",
      "😴",
      "😭",
      "😤",
      "😡",
      "🥲",
      "😳",
      "🤯",
      "🥵",
      "🥶",
      "🤒",
      "🤕",
      "🤢",
      "🤮",
    ],
  },
  {
    label: "Gestos",
    emojis: [
      "👍",
      "👎",
      "👏",
      "🙏",
      "💪",
      "🙌",
      "👌",
      "✌️",
      "🤝",
      "🤞",
      "🤟",
      "🤘",
      "👊",
      "🫶",
      "👋",
      "🫡",
      "🙋",
      "🤷",
      "🤦",
    ],
  },
  {
    label: "Coração",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❣️",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
    ],
  },
  {
    label: "Fitness",
    emojis: [
      "🏋️",
      "🏋️‍♀️",
      "🏋️‍♂️",
      "🤸",
      "🤸‍♀️",
      "🤸‍♂️",
      "🧘",
      "🏃",
      "🏃‍♀️",
      "🏃‍♂️",
      "🚴",
      "🚴‍♀️",
      "🚴‍♂️",
      "🏊",
      "⛹️",
      "🥇",
      "🥈",
      "🥉",
      "🏆",
      "🎯",
      "💯",
      "🔥",
      "⚡",
      "💧",
      "🥗",
      "🍎",
      "🥦",
      "🥩",
      "🍗",
      "🥤",
      "💤",
    ],
  },
  {
    label: "Objetos",
    emojis: [
      "✅",
      "❌",
      "⚠️",
      "❓",
      "❗",
      "⭐",
      "🌟",
      "✨",
      "🎉",
      "🎊",
      "📅",
      "⏰",
      "⏳",
      "📸",
      "📷",
      "🎥",
      "📱",
      "💬",
      "📝",
      "📌",
      "📎",
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Inserir emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="top">
        <div className="flex gap-1 border-b p-2 overflow-x-auto">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => setActiveCat(i)}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                i === activeCat
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-1 max-h-56 overflow-y-auto p-2">
          {CATEGORIES[activeCat].emojis.map((e, i) => (
            <button
              key={`${e}-${i}`}
              type="button"
              onClick={() => {
                onSelect(e);
                setOpen(false);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-muted"
              aria-label={`Emoji ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
