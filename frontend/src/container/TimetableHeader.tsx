import { useI18n } from "@/lib/i18n";
import {
  Calendar,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { RoundedButton } from "@/components/RoundedButton";

type Props = {
  selectedView: "day" | "week";
  selectedDay: Date | null;
  selectedWeek: number | null;
  onChangeView: (v: "day" | "week") => void;
  onResetToToday: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export function TimetableHeader({
  selectedView,
  selectedDay,
  selectedWeek,
  onChangeView,
  onResetToToday,
  onPrev,
  onNext,
}: Props) {
  const { t } = useI18n();
  const weekday = selectedDay
    ? new Intl.DateTimeFormat(t.locale, { weekday: "long" }).format(selectedDay)
    : t.header.day;
  const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const heading =
    selectedView === "day"
      ? t.locale.startsWith("sl")
        ? capitalize(weekday)
        : weekday
      : `${t.header.weekLabel} ${selectedWeek ?? ""}`;

  const fmt = new Intl.DateTimeFormat(t.locale);
  const sub =
    selectedView === "week"
      ? fmt.format(new Date())
      : selectedDay
        ? fmt.format(selectedDay)
        : "";

  const ViewIcon = selectedView === "day" ? Calendar : CalendarRange;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full py-1">
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onResetToToday}
          title="Go to today"
          className="hidden cursor-pointer sm:flex h-14 w-14 items-center justify-center border hover:bg-muted transition-colors"
        >
          <ViewIcon className="text-muted-foreground" size={24} />
        </button>
        <div>
          <h2 className="font-extrabold text-3xl tracking-tight truncate">
            {heading}
          </h2>
          {sub && (
            <p className="text-sm ml-1 text-muted-foreground truncate">{sub}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 justify-start md:justify-end">
        <div className="inline-flex items-center rounded-md border p-1 gap-1">
          {(
            [
              { view: "day", icon: Calendar, label: t.header.day },
              { view: "week", icon: CalendarRange, label: t.header.week },
            ] as const
          ).map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              onClick={() => onChangeView(view)}
              aria-pressed={selectedView === view}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                selectedView === view
                  ? "!rounded-sm bg-muted text-foreground"
                  : "rounded-md text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <RoundedButton onClick={onPrev} icon={ChevronLeft} />
          <RoundedButton onClick={onNext} icon={ChevronRight} />
        </div>
      </div>
    </div>
  );
}
