import {useEffect, useState, useMemo} from 'react';
import {TimetableHeader} from './TimetableHeader.tsx';
import {TimeAxis} from './TimeAxis.tsx';
import {WeekGrid} from './WeekGrid';
import {OnboardingFiltersModal} from './OnboardingFiltersModal';
import type {TimetableEvent} from '@/types/TimetableEvent.ts';
import {ScheduleColumn} from './ScheduleColumn.tsx';
import {TimetableEventBlockDetails} from './TimetableEventBlockDetailModal.tsx';
import {useI18n} from '@/lib/i18n';
import {useLocalStorageState} from '@/hooks/useLocalStorageState';
import {
  weeksInAcademicYear,
  getAcademicWeekNumber,
  isSameDay,
} from '@/utils/academicCalendar';
import {useTimetableNavigation} from '@/hooks/useTimetableNavigation';
import {useAcademicCalendar} from '@/hooks/useAcademicCalendar';
import {useTimetableData} from '@/hooks/useTimetableData';
import {useTimetableFilters} from '@/hooks/useTimetableFilters';
import {useCoursePreferences} from '@/hooks/useCoursePreferences';
import {toast} from 'sonner';
import {TimetableControls} from './TimetableControls';
import {CurrentTimeIndicator} from './CurrentTimeIndicator';
import {getFilterableClasses} from '@/utils/timetableFilters';
import PageHeader from '@/components/PageHeader.tsx';

const HOUR_HEIGHT = 64;
const DAY_START = 7;
const DAY_END = 21;
const hours = Array.from({length: DAY_END - DAY_START + 1}, (_, i) => i + DAY_START);

export function Timetable({
  courseId,
  headerTitle,
  onSelectionChange,
}: {
  courseId: number | null;
  headerTitle?: string;
  onSelectionChange: (grade: string, project: string) => void;
}) {
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

  const {events, loading, error, classes, groups, classGroupMappings, latestCheck} =
    useTimetableData({selectedView, selectedDay, selectedWeek, academicYear, courseId});

  const {
    groupFilter,
    setGroupFilter,
    filteredEvents,
    showFilterModal,
    setShowFilterModal,
    hasInitialFilters,
  } = useTimetableFilters(events);

  const [isDark, setIsDark] = useLocalStorageState<boolean>('themeV2', false, {
    legacyKeys: ['themeV1'],
    serialize: (v) => (v ? 'dark' : 'light'),
    deserialize: (s) => s === 'dark',
  });
  const {t} = useI18n();

  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(null);

  const {
    selectedGrade,
    selectedProject,
    handleGradeChange,
    handleProjectChange,
    availableProjects,
    formOptions,
  } = useCoursePreferences(onSelectionChange);

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
      params.set('w', String(selectedWeek));
      params.set('y', String(selectedAcademicYear));
    }
    if (selectedGrade) params.set('g', selectedGrade);
    if (selectedProject) params.set('p', selectedProject);
    window.history.replaceState(null, '', '?' + params.toString());
  }, [selectedView, selectedDay, selectedWeek, selectedAcademicYear, selectedGrade, selectedProject]);

  // Apply theme to <html> element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('themeV2', isDark ? 'dark' : 'light'); } catch { /* storage unavailable */ }
  }, [isDark]);

  // Persist filter changes
  useEffect(() => {
    try { localStorage.setItem('timetableGroupFilterV2', JSON.stringify(groupFilter)); } catch { /* storage unavailable */ }
  }, [groupFilter]);

  // Open onboarding modal if no filters are saved
  useEffect(() => {
    if (classes.length > 0 && !hasInitialFilters) {
      setShowFilterModal(true);
    }
  }, [classes, hasInitialFilters, setShowFilterModal]);

  // Warn when data is stale (> 30 min since last check)
  useEffect(() => {
    const checkStaleData = () => {
      if (latestCheck != null) {
        if (latestCheck < Date.now() - 30 * 60 * 1000) {
          toast.error(
            t.common.staleDataWarning ||
              'Data might not be up to date. Last update was more than 30 minutes ago.',
            {duration: Infinity, id: 'stale-data-warning'},
          );
        }
      }
    };
    checkStaleData();
    const interval = setInterval(checkStaleData, 60 * 1000);
    return () => clearInterval(interval);
  }, [latestCheck, t.common.staleDataWarning]);

  const handleResetToToday = () => {
    const today = new Date();
    if (selectedView === 'day') {
      setSelectedDay(today);
    } else {
      setSelectedWeek(getAcademicWeekNumber(today));
    }
  };

  const onPrev = () => {
    if (selectedView === 'day') {
      setSelectedDay((prev) => {
        if (!prev) return prev;
        const next = new Date(prev);
        next.setDate(prev.getDate() - 1);
        return next;
      });
    } else {
      setSelectedWeek((prev) => {
        const current = prev ?? 1;
        if (current > 1) return current - 1;
        setSelectedAcademicYear((ay) => ay - 1);
        return weeksInAcademicYear(selectedAcademicYear - 1);
      });
    }
  };

  const onNext = () => {
    if (selectedView === 'day') {
      setSelectedDay((prev) => {
        if (!prev) return prev;
        const next = new Date(prev);
        next.setDate(prev.getDate() + 1);
        return next;
      });
    } else {
      setSelectedWeek((prev) => {
        const current = prev ?? 1;
        const max = weeksInAcademicYear(selectedAcademicYear);
        if (current < max) return current + 1;
        setSelectedAcademicYear((ay) => ay + 1);
        return 1;
      });
    }
  };

  const filterableClasses = useMemo(
    () => getFilterableClasses(classes, groups, classGroupMappings),
    [classes, groups, classGroupMappings],
  );

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
        formOptions={formOptions}
        selectedGrade={selectedGrade}
        selectedProject={selectedProject}
        availableProjects={availableProjects}
        handleGradeChange={handleGradeChange}
        handleProjectChange={handleProjectChange}
        isDark={isDark}
        setIsDark={setIsDark}
        setShowFilterModal={setShowFilterModal}
        latestCheck={latestCheck}
      />

      {!selectedGrade || !selectedProject ? (
        <div className="mt-8 flex flex-col items-center gap-2 text-center text-muted-foreground">
          <p className="text-sm">
            {!selectedGrade ? t.common.selectYearAndProject : t.common.selectProject}
          </p>
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

          <OnboardingFiltersModal
            open={showFilterModal}
            classes={filterableClasses}
            groups={groups}
            classGroupMappings={classGroupMappings}
            initial={groupFilter}
            onClose={() => setShowFilterModal(false)}
            onSave={(sel) => {
              setGroupFilter(sel);
              setShowFilterModal(false);
            }}
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
