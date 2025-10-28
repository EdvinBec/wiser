import type { TimetableEvent } from "@/types/TimetableEvent";
import { TimeAxis } from "./TimeAxis";
import { useNow } from "@/lib/useNow";
import { ScheduleColumn } from "./ScheduleColumn";
import { useI18n } from "@/lib/i18n";
import { academicWeekStart, isSameDay } from "@/utils/academicCalendar";

type Props = {
  academicYear: number; // e.g., 2025 means AY 2025/26
  weekNumber: number; // academic week (1 = week containing Oct 1)
  hours: number[];
  hourHeight: number;
  dayStart: number;
  events: TimetableEvent[];
  onEventClick?: (ev: TimetableEvent) => void;
};

export function WeekGrid({
  academicYear,
  weekNumber,
  hours,
  hourHeight,
  dayStart,
  events,
  onEventClick,
}: Props) {
  const { t } = useI18n();
  const monday = academicWeekStart(academicYear, weekNumber);
  // Show only Monday–Friday
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  // helpers for current time indicator
  const now = useNow(30000);
  const ljParts = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Ljubljana",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
  const nowTopPx = () => {
    const parts = ljParts(now);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    const minutesFromStart = (h - dayStart) * 60 + m;
    return (minutesFromStart / 60) * hourHeight;
  };
  const nowLabel = () =>
    new Intl.DateTimeFormat("sl-SI", {
      timeZone: "Europe/Ljubljana",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);

  const columnHeight = (hours.length - 1) * hourHeight;
  const HEADER_H = 40; // header row height (keep in sync with header styles)

  return (
    <div className="w-full">
      <div className="flex relative">
        {/* fixed time axis on the left (hidden on mobile, shown on md+) */}
        <div
          className="hidden md:block relative flex-shrink-0"
          style={{ paddingTop: HEADER_H }}
        >
          <TimeAxis hours={hours} hourHeight={hourHeight} />

          {/* Time indicator badge - positioned absolutely over the time axis */}
          {(() => {
            // Check if this week contains today
            const today = new Date();
            const isThisWeek = days.some(
              (day) =>
                day.getFullYear() === today.getFullYear() &&
                day.getMonth() === today.getMonth() &&
                day.getDate() === today.getDate()
            );

            if (!isThisWeek) return null;

            // Check if current time is within visible hours
            const parts = ljParts(now);
            const currentHour = Number(
              parts.find((p) => p.type === "hour")?.value ?? "0"
            );

            // Hide indicator if outside of visible hours (before 7 or after 21)
            if (currentHour < dayStart || currentHour > 21) {
              return null;
            }

            const rawTop = nowTopPx() + 8; // align with column mt-2
            const top = rawTop; // Same as the red line

            return (
              <div
                className="pointer-events-none absolute left-0 right-0 z-50 flex items-center justify-center"
                style={{ top, transform: "translateY(-50%)" }}
              >
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                  {nowLabel()}
                </span>
              </div>
            );
          })()}
        </div>

        {/* scrollable week view with better mobile support */}
        <div className="flex-1 overflow-x-auto overflow-y-visible md:overflow-x-visible [overscroll-behavior-x:contain] [touch-action:pan-y_pan-x_pinch-zoom]">
          <div className="min-w-max md:min-w-0">
            {/* day headers - compact on mobile */}
            <div className="flex text-xs md:text-sm text-muted-foreground select-none">
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className="w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px] flex-none px-2 py-2 border-b border-border"
                >
                  <div className="truncate">
                    <span className="font-medium">
                      {new Intl.DateTimeFormat(t.locale, {
                        weekday: "short",
                      }).format(d)}
                    </span>
                    <span className="ml-1 text-muted-foreground/70 text-[10px] md:text-xs">
                      {new Intl.DateTimeFormat(t.locale, {
                        day: "numeric",
                        month: "numeric",
                      }).format(d)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* columns - wider on mobile now that time axis is hidden */}
            <div className="relative flex">
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className="w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px] flex-none border-l border-border/60 last:border-r"
                >
                  <ScheduleColumn
                    hours={hours}
                    hourHeight={hourHeight}
                    dayStart={dayStart}
                    events={events.filter((ev) => isSameDay(ev.startAt, d))}
                    onEventClick={onEventClick}
                  />
                </div>
              ))}
              {(() => {
                // Check if current time is within visible hours
                const parts = ljParts(now);
                const currentHour = Number(
                  parts.find((p) => p.type === "hour")?.value ?? "0"
                );

                // Hide indicator if outside of visible hours (before 7 or after 21)
                if (currentHour < dayStart || currentHour > 21) {
                  return null;
                }

                // Check if this week contains today
                const today = new Date();
                const isThisWeek = days.some(
                  (day) =>
                    day.getFullYear() === today.getFullYear() &&
                    day.getMonth() === today.getMonth() &&
                    day.getDate() === today.getDate()
                );

                if (!isThisWeek) return null;

                const rawTop = nowTopPx() + 8; // align with column mt-2
                const top = rawTop;

                return (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-30"
                    style={{ top }}
                  >
                    {/* Red line across all columns */}
                    <div className="h-0 border-t-2 border-red-500" />
                    {/* Red dot at the start */}
                    <div className="absolute left-0 w-2 h-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
