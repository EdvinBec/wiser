import { useI18n } from "@/lib/i18n";
import type { TimetableEventType } from "@/types/TimetableEventType";

const BY_TYPE = {
  Lecture: {
    bg: "bg-yellow-200",
    text: "text-yellow-900",
    darkBg: "dark:bg-yellow-900/30",
    darkText: "dark:text-yellow-200",
  },
  Tutorial: {
    bg: "bg-orange-200",
    text: "text-orange-900",
    darkBg: "dark:bg-orange-900/30",
    darkText: "dark:text-orange-200",
  },
  Lab: {
    bg: "bg-sky-200",
    text: "text-sky-900",
    darkBg: "dark:bg-sky-900/30",
    darkText: "dark:text-sky-200",
  },
  // Alias used in header legend; style same as Lab
  LabExercise: {
    bg: "bg-sky-200",
    text: "text-sky-900",
    darkBg: "dark:bg-sky-900/30",
    darkText: "dark:text-sky-200",
  },
  Seminar: {
    bg: "bg-stone-300",
    text: "text-stone-900",
    darkBg: "dark:bg-amber-950/30",
    darkText: "dark:text-stone-200",
  },
  SeminarExercise: {
    bg: "bg-green-200",
    text: "text-green-900",
    darkBg: "dark:bg-green-900/30",
    darkText: "dark:text-green-200",
  },
  Exercise: {
    bg: "bg-fuchsia-200",
    text: "text-fuchsia-900",
    darkBg: "dark:bg-fuchsia-900/30",
    darkText: "dark:text-fuchsia-200",
  },
  Exam: {
    bg: "bg-rose-200",
    text: "text-rose-900",
    darkBg: "dark:bg-rose-900/30",
    darkText: "dark:text-rose-200",
  },
  Consultation: {
    bg: "bg-cyan-200",
    text: "text-cyan-900",
    darkBg: "dark:bg-cyan-900/30",
    darkText: "dark:text-cyan-200",
  },
  ComputerExercise: {
    bg: "bg-pink-200",
    text: "text-pink-900",
    darkBg: "dark:bg-pink-900/30",
    darkText: "dark:text-pink-200",
  },
  Other: {
    bg: "bg-violet-200",
    text: "text-violet-900",
    darkBg: "dark:bg-violet-900/30",
    darkText: "dark:text-violet-200",
  },
} as const;

// Runtime type-guard to safely index t.types
function isTimetableEventType(
  key: string,
  types: Record<TimetableEventType, string>
): key is TimetableEventType {
  return key in types;
}

export const EventTypeIndicator = ({ type }: { type: string }) => {
  const { t } = useI18n();

  // Fallback style key if unknown type
  const styleKey = (type in BY_TYPE ? type : "Other") as keyof typeof BY_TYPE;
  const styles = BY_TYPE[styleKey];

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
