import {useEffect, useState, useMemo} from 'react';
import {TimetableHeader} from './TimetableHeader.tsx';
import {TimeAxis} from './TimeAxis.tsx';
import {WeekGrid} from './WeekGrid';
import {ScheduleBuilderModal} from './ScheduleBuilderModal';
import type {TimetableEvent} from '@/types/TimetableEvent.ts';
import {ScheduleColumn} from './ScheduleColumn.tsx';
import {TimetableEventBlockDetails} from './TimetableEventBlockDetailModal.tsx';
import {useI18n} from '@/lib/i18n';
import {useLocalStorageState} from '@/hooks/useLocalStorageState';
import {
  weeksInAcademicYear,
  getAcademicWeekNumber,
  academicYearForDate,
  isSameDay,
} from '@/utils/academicCalendar';
import {useTimetableNavigation} from '@/hooks/useTimetableNavigation';
import {useAcademicCalendar} from '@/hooks/useAcademicCalendar';
import {useWiseSchedule} from '@/hooks/useWiseSchedule';
import {TimetableControls} from './TimetableControls';
import {CurrentTimeIndicator} from './CurrentTimeIndicator';
import PageHeader from '@/components/PageHeader.tsx';

const HOUR_HEIGHT = 64;
const DAY_START = 7;
const DAY_END = 21;
const hours = Array.from({length: DAY_END - DAY_START + 1}, (_, i) => i + DAY_START);

export function Timetable({headerTitle}: {headerTitle?: string}) {
  const {
    selectedView,
    setSelectedView,
    selectedDay,
    setSelectedDay,
    selectedWeek,
    setSelectedWeek,
  } = useTimetableNavigation();

  const {selectedAcademicYear, setSelectedAcademicYear, academicYear} =
    useAcademicCalendar({selectedView, selectedDay});

  // The timetable is built from the student's own selections — a subject plus, where the
  // execution splits, their group. Filtering happens on the server, so what arrives here is
  // already only their events.
  const {
    selections,
    addSelection,
    removeSelection,
    updatePicks,
    events: filteredEvents,
    loading,
    error,
    publishedAt,
    hasSelections,
  } = useWiseSchedule({selectedView, selectedDay, selectedWeek, academicYear});

  const [showFilterModal, setShowFilterModal] = useState(false);

  const [isDark, setIsDark] = useLocalStorageState<boolean>('themeV2', false, {
    legacyKeys: ['themeV1'],
    serialize: (v) => (v ? 'dark' : 'light'),
    deserialize: (s) => s === 'dark',
  });
  const {t} = useI18n();

  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(null);

  // Keep URL in sync so the current view can be shared
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('v', selectedView);
    if (selectedView === 'day' && selectedDay) {
      // Format as YYYY-MM-DD in Ljubljana timezone
      params.set(
        'd',
        new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Ljubljana'}).format(
          selectedDay,
        ),
      );
    } else if (selectedView === 'week' && selectedWeek != null) {
      // Only pin the week when it is NOT the current one. Writing it unconditionally is how the
      // app poisoned its own URL: it stamped a stale academic year in, that URL then outranked
      // every later correction, and the grid stayed on a week with no data. Leaving it out means
      // a plain link always opens on whatever week the reader is actually in, which is also what
      // somebody sharing "the timetable" means.
      const currentWeek = getAcademicWeekNumber(new Date());
      const currentYear = academicYearForDate(new Date());
      if (selectedWeek !== currentWeek || selectedAcademicYear !== currentYear) {
        params.set('w', String(selectedWeek));
        params.set('y', String(selectedAcademicYear));
      }
    }
    window.history.replaceState(null, '', '?' + params.toString());
  }, [selectedView, selectedDay, selectedWeek, selectedAcademicYear]);

  // Apply theme to <html> element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('themeV2', isDark ? 'dark' : 'light'); } catch { /* storage unavailable */ }
  }, [isDark]);

  // An empty timetable has nothing to show, so open the builder straight away.
  useEffect(() => {
    if (!hasSelections) setShowFilterModal(true);
  }, [hasSelections]);

  // The old staleness toast is gone on purpose. It measured how long ago OUR scraper last ran,
  // which needed warning about. What we now show is when the SCHOOL last published, and that
  // being weeks old is normal — a 30-minute threshold against it would warn permanently.

  const handleResetToToday = () => {
    const today = new Date();
    if (selectedView === 'day') {
      setSelectedDay(today);
      return;
    }
    // Set the YEAR as well as the week. Setting only the week is what sent "today" to week N of
    // whatever year happened to be selected — the week number is meaningless without the year
    // it counts from, and the two must always move together.
    setSelectedAcademicYear(academicYearForDate(today));
    setSelectedWeek(getAcademicWeekNumber(today));
  };

  // Year and week are set side by side, never one from inside the other's updater. A state
  // updater may run more than once, and a setSelectedAcademicYear call nested in one moved the
  // year twice per click — which is how the grid ended up on a week of the wrong year.
  const onPrev = () => {
    if (selectedView === 'day') {
      setSelectedDay((prev) => {
        if (!prev) return prev;
        const next = new Date(prev);
        next.setDate(prev.getDate() - 1);
        return next;
      });
      return;
    }

    const current = selectedWeek ?? 1;
    if (current > 1) {
      setSelectedWeek(current - 1);
      return;
    }
    const previousYear = selectedAcademicYear - 1;
    setSelectedAcademicYear(previousYear);
    setSelectedWeek(weeksInAcademicYear(previousYear));
  };

  const onNext = () => {
    if (selectedView === 'day') {
      setSelectedDay((prev) => {
        if (!prev) return prev;
        const next = new Date(prev);
        next.setDate(prev.getDate() + 1);
        return next;
      });
      return;
    }

    const current = selectedWeek ?? 1;
    if (current < weeksInAcademicYear(selectedAcademicYear)) {
      setSelectedWeek(current + 1);
      return;
    }
    setSelectedAcademicYear(selectedAcademicYear + 1);
    setSelectedWeek(1);
  };

  const filteredDayEvents = useMemo(
    () =>
      selectedDay
        ? filteredEvents.filter((ev) => isSameDay(ev.startAt, selectedDay))
        : filteredEvents,
    [filteredEvents, selectedDay],
  );

  return (
    <div className="px-4 md:px-10 lg:px-16 py-4 md:py-8 max-w-7xl mx-auto overflow-x-hidden overflow-y-visible">
      <div className="mb-2 flex flex-col gap-3 border-b pb-4">
        <PageHeader headerTitle={headerTitle} />
      </div>
      <div className="flex flex-col gap-4 overflow-x-hidden">
        <TimetableHeader
          selectedView={selectedView}
          selectedDay={selectedDay}
          selectedWeek={selectedWeek}
          onChangeView={(v) => setSelectedView(v)}
          onResetToToday={handleResetToToday}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      <TimetableControls
        isDark={isDark}
        setIsDark={setIsDark}
        setShowFilterModal={setShowFilterModal}
        publishedAt={publishedAt}
      />

      <ScheduleBuilderModal
        open={showFilterModal}
        selections={selections}
        onAdd={addSelection}
        onRemove={removeSelection}
        onUpdatePicks={updatePicks}
        onClose={() => setShowFilterModal(false)}
      />

      {!hasSelections ? (
        <div className="mt-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <p className="text-sm">Urnik je še prazen.</p>
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            onClick={() => setShowFilterModal(true)}>
            Dodaj predmet
          </button>
        </div>
      ) : (
        <>
          {loading && (
            <div className="mt-4 text-sm text-muted-foreground">
              {t.common.loadingTimetable}
            </div>
          )}
          {error && (
            <div className="mt-4 text-sm text-red-600 break-words">{error}</div>
          )}

          {/* An empty grid used to say nothing at all, which is indistinguishable from a broken
              one. Say it is empty, and name the period, so a wrong week is visible as a wrong
              week instead of as missing data. */}
          {!loading && !error && filteredEvents.length === 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              {selectedView === 'day'
                ? 'Ta dan ni ničesar.'
                : `Ta teden ni ničesar (${selectedAcademicYear}/${String(
                    (selectedAcademicYear + 1) % 100,
                  ).padStart(2, '0')}, teden ${selectedWeek ?? '?'}).`}
            </div>
          )}

          {selectedView === 'day' ? (
            <div className="relative flex h-full w-full mt-2 md:mt-4 overflow-x-auto overflow-y-visible">
              <TimeAxis hours={hours} hourHeight={HOUR_HEIGHT} />
              <ScheduleColumn
                hours={hours}
                hourHeight={HOUR_HEIGHT}
                dayStart={DAY_START}
                events={filteredDayEvents}
                onEventClick={(ev) => setSelectedEvent(ev)}
              />
              {selectedDay && isSameDay(selectedDay, new Date()) && (
                <CurrentTimeIndicator hourHeight={HOUR_HEIGHT} dayStart={DAY_START} />
              )}
            </div>
          ) : (
            <div className="w-full mt-2 md:mt-4">
              <WeekGrid
                academicYear={selectedAcademicYear}
                weekNumber={selectedWeek ?? 1}
                hours={hours}
                hourHeight={HOUR_HEIGHT}
                dayStart={DAY_START}
                events={filteredEvents}
                onEventClick={(ev) => setSelectedEvent(ev)}
              />
            </div>
          )}

          <TimetableEventBlockDetails
            open={!!selectedEvent}
            event={selectedEvent ?? undefined}
            onClose={() => setSelectedEvent(null)}
          />

          <div className="mt-10 pt-4 border-t text-xs text-muted-foreground text-center">
            {t.common.disclaimerPrefix}{' '}
            <a
              href="https://www.wise-tt.com/wtt_um_feri/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-transparent hover:decoration-inherit">
              WISE
            </a>{' '}
            <span>{t.common.timetable} </span>
            <a
              href="https://github.com/EdvinBec/wiser"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-transparent hover:decoration-inherit p-0 block mt-1">
              💻 EdvinBec
            </a>
          </div>
        </>
      )}
    </div>
  );
}
