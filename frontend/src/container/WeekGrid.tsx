import type {TimetableEvent} from '@/types/TimetableEvent';
import {TimeAxis} from './TimeAxis';
import {ScheduleColumn} from './ScheduleColumn';
import {CurrentTimeIndicator} from './CurrentTimeIndicator';
import {useI18n} from '@/lib/i18n';
import {academicWeekStart, isSameDay} from '@/utils/academicCalendar';

type Props = {
  academicYear: number; // e.g., 2025 means AY 2025/26
  weekNumber: number; // academic week (1 = week containing Oct 1)
  hours: number[];
  hourHeight: number;
  dayStart: number;
  events: TimetableEvent[];
  onEventClick?: (ev: TimetableEvent) => void;
};

const HEADER_H = 40; // header row height (keep in sync with header styles)

export function WeekGrid({
  academicYear,
  weekNumber,
  hours,
  hourHeight,
  dayStart,
  events,
  onEventClick,
}: Props) {
  const {t} = useI18n();
  const monday = academicWeekStart(academicYear, weekNumber);
  // Show only Monday–Friday
  const days = Array.from({length: 5}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const today = new Date();
  const isThisWeek = days.some((day) => isSameDay(day, today));

  return (
    <div className='w-full'>
      <div className='flex relative'>
        {/* fixed time axis on the left (hidden on mobile, shown on md+) */}
        <div
          className='hidden md:block relative flex-shrink-0'
          style={{paddingTop: HEADER_H}}>
          <TimeAxis
            hours={hours}
            hourHeight={hourHeight}
          />
        </div>

        {/* scrollable week view with better mobile support */}
        <div className='flex-1 overflow-x-auto [overflow-y:clip] md:overflow-x-hidden [overscroll-behavior-x:contain] [touch-action:pan-x_pan-y_pinch-zoom]'>
          <div className='min-w-max md:min-w-0'>
            {/* day headers - compact on mobile */}
            <div className='flex text-xs md:text-sm text-muted-foreground select-none'>
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className='w-[160px] sm:w-[180px] md:w-auto flex-none md:flex-1 px-2 py-2 border-b border-border'>
                  <div className='truncate'>
                    <span className='font-medium'>
                      {new Intl.DateTimeFormat(t.locale, {
                        weekday: 'short',
                      }).format(d)}
                    </span>
                    <span className='ml-1 text-muted-foreground/70 text-[10px] md:text-xs'>
                      {new Intl.DateTimeFormat(t.locale, {
                        day: 'numeric',
                        month: 'numeric',
                      }).format(d)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* columns */}
            <div className='relative flex overflow-visible'>
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className='w-[160px] sm:w-[180px] md:w-auto flex-none md:flex-1 border-l border-border/60 last:border-r'>
                  <ScheduleColumn
                    hours={hours}
                    hourHeight={hourHeight}
                    dayStart={dayStart}
                    events={events.filter((ev) => isSameDay(ev.startAt, d))}
                    onEventClick={onEventClick}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {isThisWeek && (
          <CurrentTimeIndicator
            hourHeight={hourHeight}
            dayStart={dayStart}
            headerOffset={HEADER_H + 8}
            variant='week'
          />
        )}
      </div>
    </div>
  );
}
