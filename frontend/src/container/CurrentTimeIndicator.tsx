import {useNow} from '@/lib/useNow';
import {useI18n} from '@/lib/i18n';

type Props = {
  hourHeight: number;
  dayStart: number;
  /** Extra pixels added above the calculated position (e.g. header height). Default 8. */
  headerOffset?: number;
  /** 'week' hides the time label on mobile and shifts line to left edge. Default 'day'. */
  variant?: 'day' | 'week';
};

const DAY_END = 21;

export function CurrentTimeIndicator({
  hourHeight,
  dayStart,
  headerOffset = 8,
  variant = 'day',
}: Props) {
  const now = useNow(30000);
  const {t} = useI18n();

  const ljParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Ljubljana',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const currentHour = Number(
    ljParts.find((p) => p.type === 'hour')?.value ?? '0',
  );
  const currentMinute = Number(
    ljParts.find((p) => p.type === 'minute')?.value ?? '0',
  );

  if (currentHour < dayStart || currentHour > DAY_END) return null;

  const minutesFromStart = (currentHour - dayStart) * 60 + currentMinute;
  const top = (minutesFromStart / 60) * hourHeight + headerOffset;

  const nowLabel = new Intl.DateTimeFormat(t.locale, {
    timeZone: 'Europe/Ljubljana',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const lineLeft = variant === 'week' ? 'left-0 md:left-16' : 'left-12 md:left-16';

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-50 overflow-visible"
      style={{top, transform: 'translateY(-50%)'}}>
      {/* Red line */}
      <div
        className={`absolute ${lineLeft} right-0 h-0 border-t-2 border-red-500 z-30`}
      />

      {/* Time label */}
      <div
        className={`absolute left-0 top-px w-12 md:w-16 -translate-y-1/2 z-40 flex items-center justify-center ${variant === 'week' ? 'hidden md:flex' : ''}`}>
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
          {nowLabel}
        </span>
      </div>

      {/* Red dot */}
      <div
        className={`absolute ${lineLeft} top-px w-2 h-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 z-[100]`}
      />
    </div>
  );
}
