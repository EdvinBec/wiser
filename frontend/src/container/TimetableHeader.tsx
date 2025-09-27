import { useI18n } from "@/lib/i18n";
import { Calendar, CalendarRange } from "lucide-react";

type Props = {
  selectedView: "day" | "week";
  selectedDay: Date | null;
  selectedWeek: number | null;
  onChangeView: (v: "day" | "week") => void;
  leftButton: React.ReactNode;
  rightButton: React.ReactNode;
};

export function TimetableHeader({
  selectedView,
  selectedDay,
  selectedWeek,
  onChangeView,
  leftButton,
  rightButton,
}: Props) {
  const { t } = useI18n();
  const weekday = selectedDay
    ? new Intl.DateTimeFormat(t.locale, { weekday: "long" }).format(selectedDay)
    : t.header.day;
  const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const heading = selectedView === "day"
    ? (t.locale.startsWith("sl") ? capitalize(weekday) : weekday)
    : `${t.header.weekLabel} ${selectedWeek ?? ""}`;

  const sub = selectedView === "week"
    ? new Intl.DateTimeFormat(t.locale).format(
        (() => {
          const today = new Date();
          return today;
        })()
      )
    : (selectedDay ? new Intl.DateTimeFormat(t.locale).format(selectedDay) : "");

  const ViewIcon = selectedView === "day" ? Calendar : CalendarRange;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full">
      {/* Left: icon + title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-md border bg-card">
          <ViewIcon className="text-muted-foreground" size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="font-extrabold text-3xl tracking-tight truncate">{heading}</h2>
          {sub && <p className="text-sm mt-1 text-muted-foreground truncate">{sub}</p>}
        </div>
      </div>

      {/* Right: view toggle + nav */}
      <div className="flex items-center gap-3 flex-wrap justify-start md:justify-end">
        <div className="inline-flex items-center rounded-md border bg-card p-1">
          <button
            onClick={() => onChangeView("day")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              selectedView === "day"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            aria-pressed={selectedView === "day"}
          >
            <Calendar size={16} /> {t.header.day}
          </button>
          <button
            onClick={() => onChangeView("week")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              selectedView === "week"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            aria-pressed={selectedView === "week"}
          >
            <CalendarRange size={16} /> {t.header.week}
          </button>
        </div>
        <div className="flex gap-2">
          {leftButton}
          {rightButton}
        </div>
      </div>
    </div>
  );
}
