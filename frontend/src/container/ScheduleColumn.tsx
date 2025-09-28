import { toPxFromDate } from "@/Helpers/DateHelpers";
import type { LaidOut } from "@/types/LaidOut";
import { TimetableEventBlock } from "./TimetableEventBlock";
import type { TimetableEvent } from "@/types/TimetableEvent";

type Props = {
  hours: number[];
  hourHeight: number; // px per hour (e.g., 64)
  dayStart: number; // first hour shown on the timetable
  events: TimetableEvent[];
  onEventClick?: (ev: TimetableEvent) => void;
};

export function ScheduleColumn({
  hours,
  hourHeight,
  dayStart,
  events,
  onEventClick,
}: Props) {
  const columnHeight = (hours.length - 1) * hourHeight; // overall column height in px

  // Returns list of events with layout info (if they are overlapping)
  const layout = (events: TimetableEvent[]): LaidOut[] => {
    const sorted = [...events].sort(
      (a, b) =>
        a.startAt.getTime() - b.startAt.getTime() ||
        a.finishAt.getTime() - b.finishAt.getTime()
    );

    const clusters: TimetableEvent[][] = [];
    let active: TimetableEvent[] = [];
    let cluster: TimetableEvent[] = [];
    let clusterEnd = -Infinity;

    for (const ev of sorted) {
      // remove inactive from active
      active = active.filter(
        (e) => e.finishAt.getTime() > ev.startAt.getTime()
      );
      if (cluster.length === 0) {
        cluster.push(ev);
        active.push(ev);
        clusterEnd = Math.max(clusterEnd, ev.finishAt.getTime());
      } else if (ev.startAt.getTime() < clusterEnd) {
        // overlaps chain -> same cluster
        cluster.push(ev);
        active.push(ev);
        clusterEnd = Math.max(clusterEnd, ev.finishAt.getTime());
      } else {
        // new cluster
        clusters.push(cluster);
        cluster = [ev];
        active = [ev];
        clusterEnd = ev.finishAt.getTime();
      }
    }
    if (cluster.length) clusters.push(cluster);

    const laid: LaidOut[] = [];

    for (const group of clusters) {
      type Col = { end: number };
      const cols: Col[] = [];
      const assignments: number[] = [];
      for (const ev of group) {
        let placed = false;
        for (let i = 0; i < cols.length; i++) {
          if (cols[i].end <= ev.startAt.getTime()) {
            assignments.push(i);
            cols[i].end = ev.finishAt.getTime();
            placed = true;
            break;
          }
        }
        if (!placed) {
          cols.push({ end: ev.finishAt.getTime() });
          assignments.push(cols.length - 1);
        }
      }
      const colCount = cols.length;

      group.forEach((ev, idx) => {
        const startPx = toPxFromDate(ev.startAt, dayStart, hourHeight);
        const endPx = toPxFromDate(ev.finishAt, dayStart, hourHeight);
        let top = Math.max(0, startPx);
        let bottom = Math.min(columnHeight, endPx);
        const height = Math.max(6, bottom - top);
        if (bottom <= 0 || top >= columnHeight) return; // skip invisible
        laid.push({
          ...ev,
          __top: top,
          __bottom: bottom,
          __height: height,
          __colIndex: assignments[idx],
          __colCount: colCount,
        });
      });
    }

    return laid;
  };

  const laidEvents = layout(events);

  return (
    <div className="relative flex-1 mt-2" style={{ height: columnHeight }}>
      {/* hour grid lines */}
      {hours.map((h, i) => (
        <div
          key={h}
          className="absolute left-0 right-0 border-t border-border/60"
          style={{ top: i * hourHeight }}
        />
      ))}

      {laidEvents.map((ev) => {
        const widthPct = 100 / ev.__colCount;
        const leftPct = widthPct * ev.__colIndex;
        return (
          <TimetableEventBlock
            ev={ev}
            leftPct={leftPct}
            widthPct={widthPct}
            key={ev.id}
            onClick={(e) => onEventClick?.(e)}
          />
        );
      })}
    </div>
  );
}
