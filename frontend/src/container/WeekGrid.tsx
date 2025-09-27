import type { TimetableEvent } from "@/types/TimetableEvent";
import { TimeAxis } from "./TimeAxis";
import { useNow } from "@/lib/useNow";
import { ScheduleColumn } from "./ScheduleColumn";
import { useI18n } from "@/lib/i18n";

type Props = {
  academicYear: number; // e.g., 2025 means AY 2025/26
  weekNumber: number; // academic week (1 = week containing Oct 1)
  hours: number[];
  hourHeight: number;
  dayStart: number;
  events: TimetableEvent[];
  onEventClick?: (ev: TimetableEvent) => void;
};

function toMonday(d: Date) {
  const day = d.getDay();
  const diff = (day + 6) % 7; // 0 for Mon, 6 for Sun
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function academicWeek1Monday(academicYear: number) {
  // Week containing Oct 1 of academicYear
  const oct1 = new Date(academicYear, 9, 1);
  return toMonday(oct1);
}

function academicWeekStart(academicYear: number, weekNumber: number) {
  const start = academicWeek1Monday(academicYear);
  const d = new Date(start);
  d.setDate(start.getDate() + (weekNumber - 1) * 7);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

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
      <div className="flex relative overflow-x-hidden">
        {/* fixed time axis on the left (with time label overlay) */}
        <div className="relative" style={{ paddingTop: HEADER_H }}>
          <TimeAxis hours={hours} hourHeight={hourHeight} />
          {(() => {
            const rawTop = nowTopPx() + 8; // align with column mt-2
            const top = Math.min(
              Math.max(rawTop + HEADER_H, 8),
              columnHeight + 8 + HEADER_H
            );
            return (
              <div
                className="pointer-events-none absolute left-0 w-16 -translate-y-1/2 z-20"
                style={{ top }}
              >
                <div className="text-xs text-blue-600">{nowLabel()}</div>
              </div>
            );
          })()}
        </div>

        {/* scrollable on small screens; fits and centers on large screens */}
        <div className="flex-1 overflow-x-auto lg:overflow-visible lg:px-2">
          <div className="min-w-max lg:min-w-0 lg:max-w-[1200px] lg:mx-auto">
            {/* day headers */}
            <div className="flex lg:grid lg:grid-cols-5 text-sm text-muted-foreground select-none">
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className="w-[220px] flex-none lg:w-auto lg:min-w-0 px-2 py-2 border-b border-border"
                >
                  {new Intl.DateTimeFormat(t.locale, {
                    weekday: "short",
                  }).format(d)}
                  <span className="ml-2 text-muted-foreground/70">
                    {new Intl.DateTimeFormat(t.locale).format(d)}
                  </span>
                </div>
              ))}
            </div>

            {/* columns */}
            <div className="relative flex lg:grid lg:grid-cols-5">
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className="w-[220px] flex-none lg:w-auto lg:min-w-0 border-l border-border/60 last:border-r"
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
                const rawTop = nowTopPx() + 8; // align with column mt-2
                const top = Math.min(Math.max(rawTop, 8), columnHeight + 8);
                return (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20"
                    style={{ top }}
                  >
                    <div className="h-0 border-t-2 border-blue-500" />
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
