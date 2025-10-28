import { useI18n } from "@/lib/i18n";
import type { TimetableEventType } from "@/types/TimetableEventType";
import { EVENT_COLORS } from "@/constants/eventColors";

// Runtime type-guard to safely index t.types
function isTimetableEventType(
  key: string,
  types: Record<TimetableEventType, string>
): key is TimetableEventType {
  return key in types;
}

export const EventTypeIndicator = ({ type }: { type: string }) => {
  const { t } = useI18n();

  // Get style from shared constants (with type assertion)
  const styles = EVENT_COLORS[type as TimetableEventType] ?? {
    bg: "bg-violet-200",
    text: "text-violet-900",
    darkBg: "dark:bg-violet-900/30",
    darkText: "dark:text-violet-200",
  };

  // Localized label: use t.types when the key matches your TimetableEventType union
  const label = isTimetableEventType(type, t.types) ? t.types[type] : type;

  return (
    <div
      className={[
        "inline-flex items-center gap-1 rounded-sm px-2 py-1 border",
        "border-gray-200 dark:border-white/10",
        styles.bg,
        styles.darkBg,
        styles.text,
        styles.darkText,
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      <span className="w-2 h-2 rounded-full bg-current" />
      <span className="text-[11px] leading-none">{label}</span>
    </div>
  );
};
