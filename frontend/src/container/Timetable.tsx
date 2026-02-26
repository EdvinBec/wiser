import {useEffect, useState, useMemo, useRef, useCallback} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import {RoundedButton} from '@/components/RoundedButton';
import {Brand} from '@/components/Brand';
import {LoginButton} from '@/components/LoginButton';
import {TimetableHeader} from './TimetableHeader.tsx';
import {TimeAxis} from './TimeAxis.tsx';
import {WeekGrid} from './WeekGrid';
import {OnboardingFiltersModal} from './OnboardingFiltersModal';
import {useNow} from '@/lib/useNow';
import type {TimetableEvent} from '@/types/TimetableEvent.ts';
import {ScheduleColumn} from './ScheduleColumn.tsx';
import {TimetableEventBlockDetails} from './TimetableEventBlockDetailModal.tsx';
import {useI18n} from '@/lib/i18n';
import {EventTypeIndicator} from '@/components/EventTypeIndicator.tsx';
import {useLocalStorageState} from '@/hooks/useLocalStorageState';
import {weeksInAcademicYear} from '@/utils/academicCalendar';
import {useTimetableNavigation} from '@/hooks/useTimetableNavigation';
import {useAcademicCalendar} from '@/hooks/useAcademicCalendar';
import {useTimetableData} from '@/hooks/useTimetableData';
import {useTimetableFilters} from '@/hooks/useTimetableFilters';
import {toast} from 'sonner';
import {CustomDropdown} from '@/components/CustomDropdown';
import {fetchFormOptions} from '@/utils/api';
import type {FormOptions} from '@/types/FormOptions';
import {useAuth} from '@/contexts/AuthContext.shared';

export function Timetable({
  courseId,
  headerTitle,
  onSelectionChange,
}: {
  courseId: number | null;
  headerTitle?: string;
  onSelectionChange: (grade: string, project: string) => void;
}) {
  // Navigation state (view, day, week selection)
  const {
    selectedView,
    setSelectedView,
    selectedDay,
    setSelectedDay,
    selectedWeek,
    setSelectedWeek,
  } = useTimetableNavigation();

  // Academic calendar state
  const {selectedAcademicYear, setSelectedAcademicYear, academicYear} =
    useAcademicCalendar({
      selectedView,
      selectedDay,
    });

  // Data fetching
  const {
    events,
    loading,
    error,
    classes,
    groups,
    classGroupMappings,
    latestCheck,
  } = useTimetableData({
    selectedView,
    selectedDay,
    selectedWeek,
    academicYear,
    courseId,
  });

  // Filtering
  const {
    groupFilter,
    setGroupFilter,
    filteredEvents,
    showFilterModal,
    setShowFilterModal,
    hasInitialFilters,
  } = useTimetableFilters(events);

  // Theme and i18n
  const [isDark, setIsDark] = useLocalStorageState<boolean>('themeV2', false, {
    legacyKeys: ['themeV1'],
    serialize: (v) => (v ? 'dark' : 'light'),
    deserialize: (s) => s === 'dark',
  });
  const {t, locale, setLocale} = useI18n();
  const {user, isAuthenticated, token} = useAuth();

  // Selected event for detail modal
  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(
    null,
  );

  // Grade/Project selection state with database persistence when authenticated
  const STORAGE_KEY_GRADE = 'wiser_selected_grade';
  const STORAGE_KEY_PROJECT = 'wiser_selected_project';
  const STORAGE_KEY_LAST_USER = 'wiser_last_user_id';
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const hasTriggeredInitialLoad = useRef(false);
  const authInitialized = useRef(false);

  // Load preferences on mount and when auth state changes
  useEffect(() => {
    const lastUserId = localStorage.getItem(STORAGE_KEY_LAST_USER);
    const currentUserId = user?.id || null;

    async function loadPreferences() {
      // On first render or user change, mark as initialized
      if (!authInitialized.current) {
        authInitialized.current = true;
      }

      // Check if user changed
      const userChanged = lastUserId !== currentUserId;
      if (userChanged) {
        hasTriggeredInitialLoad.current = false;

        // Update last user tracker
        if (currentUserId) {
          localStorage.setItem(STORAGE_KEY_LAST_USER, currentUserId);
        } else {
          localStorage.removeItem(STORAGE_KEY_LAST_USER);
        }
      }

      // Load preferences based on auth state
      if (isAuthenticated && token) {
        // Load from database for authenticated users
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5013'}/user/preferences`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          if (response.ok) {
            const prefs = await response.json();
            const loadedGrade = prefs.preferredGrade || '';
            const loadedProject = prefs.preferredProject || '';
            setSelectedGrade(loadedGrade);
            setSelectedProject(loadedProject);

            // If both grade and project exist, trigger the selection immediately
            if (loadedGrade && loadedProject && formOptions) {
              const validProjects =
                formOptions.projectsByGrade[loadedGrade] || [];
              if (validProjects.some((p) => p.value === loadedProject)) {
                onSelectionChange(loadedGrade, loadedProject);
              }
            }
          } else {
            // Fallback to empty if API fails
            setSelectedGrade('');
            setSelectedProject('');
          }
        } catch (err) {
          console.error('Failed to load user preferences from database:', err);
          setSelectedGrade('');
          setSelectedProject('');
        }
      } else {
        // Load from localStorage for guest users
        const storedGrade = localStorage.getItem(STORAGE_KEY_GRADE) || '';
        const storedProject = localStorage.getItem(STORAGE_KEY_PROJECT) || '';
        setSelectedGrade(storedGrade);
        setSelectedProject(storedProject);

        // If both grade and project exist, trigger the selection immediately
        if (storedGrade && storedProject && formOptions) {
          const validProjects = formOptions.projectsByGrade[storedGrade] || [];
          if (validProjects.some((p) => p.value === storedProject)) {
            onSelectionChange(storedGrade, storedProject);
          }
        }
      }
    }

    loadPreferences();
  }, [user?.id, isAuthenticated, token, formOptions, onSelectionChange]);

  // Load form options on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const options = await fetchFormOptions();
        setFormOptions(options);
        setPreferencesLoaded(true);
      } catch (err) {
        console.error('Failed to fetch form options:', err);
        setPreferencesLoaded(true);
      }
    }
    loadOptions();
  }, []);

  // Auto-trigger selection if both grade and project are loaded from localStorage (only once on mount)
  useEffect(() => {
    if (
      preferencesLoaded &&
      !hasTriggeredInitialLoad.current &&
      selectedGrade &&
      selectedProject &&
      formOptions
    ) {
      // Verify the project is valid for the selected grade
      const validProjects = formOptions.projectsByGrade[selectedGrade] || [];
      if (validProjects.some((p) => p.value === selectedProject)) {
        hasTriggeredInitialLoad.current = true;
        onSelectionChange(selectedGrade, selectedProject);
      }
    }
  }, [
    preferencesLoaded,
    selectedGrade,
    selectedProject,
    formOptions,
    onSelectionChange,
  ]);

  // Get available projects for selected grade
  const availableProjects = useMemo(() => {
    if (!selectedGrade || !formOptions) return [];
    return formOptions.projectsByGrade[selectedGrade] || [];
  }, [selectedGrade, formOptions]);

  // Handle grade selection
  const handleGradeChange = useCallback(
    (grade: string) => {
      setSelectedGrade(grade);
      setSelectedProject(''); // Reset project when grade changes

      // Save to localStorage for guest users
      if (!isAuthenticated) {
        localStorage.setItem(STORAGE_KEY_GRADE, grade);
        localStorage.removeItem(STORAGE_KEY_PROJECT);
      }
    },
    [isAuthenticated],
  );

  // Handle project selection
  const handleProjectChange = useCallback(
    async (project: string) => {
      setSelectedProject(project);

      if (selectedGrade && project) {
        onSelectionChange(selectedGrade, project);

        // Save preferences
        if (isAuthenticated && token) {
          // Save to database for authenticated users
          try {
            await fetch(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5013'}/user/preferences`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  preferredGrade: selectedGrade,
                  preferredProject: project,
                }),
              },
            );
          } catch (err) {
            console.error('Failed to save user preferences to database:', err);
          }
        } else {
          // Save to localStorage for guest users
          localStorage.setItem(STORAGE_KEY_GRADE, selectedGrade);
          localStorage.setItem(STORAGE_KEY_PROJECT, project);
        }
      }
    },
    [selectedGrade, onSelectionChange, isAuthenticated, token],
  );

  // layout constants
  const HOUR_HEIGHT = 64; // px per hour
  const DAY_START = 7;
  const DAY_END = 21;
  const hours = Array.from(
    {length: DAY_END - DAY_START + 1},
    (_, i) => i + DAY_START,
  );

  // Current time indicator helpers
  const now = useNow(30000);
  const ljParts = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Ljubljana',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
  const nowTopPx = () => {
    const parts = ljParts(now);
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    const minutesFromStart = (h - DAY_START) * 60 + m;
    return (minutesFromStart / 60) * HOUR_HEIGHT;
  };
  const nowLabel = () =>
    new Intl.DateTimeFormat(t.locale, {
      timeZone: 'Europe/Ljubljana',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

  // Open onboarding modal if no filters are saved
  useEffect(() => {
    if (classes.length > 0 && !hasInitialFilters) {
      setShowFilterModal(true);
    }
  }, [classes, hasInitialFilters, setShowFilterModal]);

  // Check if data is stale (last check was more than 30 minutes ago)
  // Re-check every minute to catch when data becomes stale
  useEffect(() => {
    const checkStaleData = () => {
      if (latestCheck != null) {
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000; // 30 minutes
        if (latestCheck < thirtyMinutesAgo) {
          toast.error(
            t.common.staleDataWarning ||
              'Data might not be up to date. Last update was more than 30 minutes ago.',
            {
              duration: Infinity, // Stays until manually dismissed
              id: 'stale-data-warning', // Prevent duplicate toasts
            },
          );
        }
      }
    };

    // Check immediately
    checkStaleData();

    // Then check every minute
    const interval = setInterval(checkStaleData, 60 * 1000);

    return () => clearInterval(interval);
  }, [latestCheck, t.common.staleDataWarning]);

  // Apply theme to <html> element and persist
  useEffect(() => {
    try {
      const el = document.documentElement;
      el.classList.toggle('dark', isDark);
      localStorage.setItem('themeV2', isDark ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  // Persist filter changes
  useEffect(() => {
    try {
      localStorage.setItem(
        'timetableGroupFilterV2',
        JSON.stringify(groupFilter),
      );
    } catch {}
  }, [groupFilter]);

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
        // wrap to previous academic year
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
        // wrap to next academic year
        setSelectedAcademicYear((ay) => ay + 1);
        return 1;
      });
    }
  };

  // For day view, further filter to only show events on the selected day
  const filteredDayEvents = selectedDay
    ? filteredEvents.filter(
        (ev) =>
          ev.startAt.getFullYear() === selectedDay.getFullYear() &&
          ev.startAt.getMonth() === selectedDay.getMonth() &&
          ev.startAt.getDate() === selectedDay.getDate(),
      )
    : filteredEvents;

  return (
    <div className='px-4 md:px-10 lg:px-16 py-4 md:py-8 max-w-7xl mx-auto overflow-x-hidden overflow-y-visible'>
      {/* Header with brand and title */}
      <div className='mb-2 flex flex-col gap-3 border-b pb-4'>
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          <div className='flex flex-col md:flex-row md:items-center gap-2 min-w-0 flex-1'>
            <Brand />
            <span className='text-sm text-muted-foreground text-wrap break-words'>
              {headerTitle}
            </span>
          </div>
          {/* Login button in top right - subtle placement */}
          <div className='flex items-center'>
            <LoginButton />
          </div>
        </div>

        {/* Event type indicators - separate row on mobile, same line on larger screens */}
        <div className='flex gap-2 items-center flex-wrap justify-start md:justify-end'>
          <EventTypeIndicator type='Lecture' />
          <EventTypeIndicator type='ComputerExercise' />
          <EventTypeIndicator type='LabExercise' />
          <EventTypeIndicator type='SeminarExercise' />
        </div>
      </div>
      <div className='flex flex-col gap-4 overflow-x-hidden'>
        <TimetableHeader
          selectedView={selectedView}
          selectedDay={selectedDay}
          selectedWeek={selectedWeek}
          onChangeView={(v) => setSelectedView(v)}
          leftButton={
            <RoundedButton
              onClick={onPrev}
              icon={ChevronLeft}
            />
          }
          rightButton={
            <div className='flex items-center gap-2'>
              <RoundedButton
                onClick={onNext}
                icon={ChevronRight}
              />
            </div>
          }
        />
      </div>

      {/* Controls - reorganized for mobile */}
      <div className='mt-3 flex flex-col gap-3 overflow-x-hidden'>
        {/* Buttons - wrap on small screens */}
        <div className='flex items-center gap-2 flex-wrap min-w-0'>
          {/* Grade and Project Dropdowns */}
          {formOptions && (
            <>
              <CustomDropdown
                value={selectedGrade}
                options={formOptions.gradeOptions}
                onChange={handleGradeChange}
                placeholder='Select Year'
              />
              <CustomDropdown
                value={selectedProject}
                options={availableProjects}
                onChange={handleProjectChange}
                placeholder='Select Project'
                disabled={!selectedGrade || availableProjects.length === 0}
              />
              {/* Separator */}
              <div className='hidden sm:block w-px h-6 bg-border' />
            </>
          )}
          <button
            onClick={() => setIsDark((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted text-sm ${
              isDark ? 'text-foreground' : 'text-muted-foreground'
            }`}
            aria-label='Toggle theme'
            aria-pressed={isDark}
            title={isDark ? t.common.switchToLight : t.common.switchToDark}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span className='hidden sm:inline whitespace-nowrap'>
              {isDark ? t.common.themeLight : t.common.themeDark}
            </span>
          </button>
          <button
            onClick={() => setLocale(locale === 'sl' ? 'en' : 'sl')}
            className='inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted text-sm text-muted-foreground'
            aria-label='Toggle language'
            title={
              locale === 'sl' ? 'Switch to English' : 'Preklopi v slovenščino'
            }>
            <Globe size={16} />
            <span className='tabular-nums whitespace-nowrap'>
              {locale.toUpperCase()}
            </span>
          </button>
          <button
            onClick={() => setShowFilterModal(true)}
            className='inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted text-sm text-muted-foreground'
            aria-haspopup='dialog'>
            <SlidersHorizontal size={16} />
            <span className='whitespace-nowrap'>{t.common.manageFilters}</span>
          </button>
        </div>

        {/* Latest check */}
        {latestCheck != null && (
          <div className='text-xs text-muted-foreground break-words'>
            {t.common.latestCheckLabel}:{' '}
            {new Intl.DateTimeFormat(t.locale, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).format(new Date(latestCheck))}
          </div>
        )}
      </div>

      {loading && (
        <div className='mt-4 text-sm text-muted-foreground'>
          {t.common.loadingTimetable}
        </div>
      )}
      {error && (
        <div className='mt-4 text-sm text-red-600 break-words'>{error}</div>
      )}

      {selectedView === 'day' ? (
        <div className='relative flex h-full w-full mt-2 md:mt-4 overflow-x-auto overflow-y-visible'>
          <TimeAxis
            hours={hours}
            hourHeight={HOUR_HEIGHT}
          />
          <ScheduleColumn
            hours={hours}
            hourHeight={HOUR_HEIGHT}
            dayStart={DAY_START}
            events={filteredDayEvents}
            onEventClick={(ev) => setSelectedEvent(ev)}
          />
          {/* current time indicator for Day view (only when the selected day is today) */}
          {(() => {
            // Only show indicator if selected day is today
            if (!selectedDay) return null;
            const today = new Date();
            const isToday =
              selectedDay.getFullYear() === today.getFullYear() &&
              selectedDay.getMonth() === today.getMonth() &&
              selectedDay.getDate() === today.getDate();

            if (!isToday) return null;

            // Check if current time is within visible hours
            const parts = ljParts(now);
            const currentHour = Number(
              parts.find((p) => p.type === 'hour')?.value ?? '0',
            );

            // Hide indicator if outside of visible hours (before 7 or after 21)
            if (currentHour < DAY_START || currentHour > DAY_END) {
              return null;
            }

            const columnHeight = (hours.length - 1) * HOUR_HEIGHT;
            const rawTop = nowTopPx() + 8; // +8 to account for column mt-2
            const top = Math.min(Math.max(rawTop, 8), columnHeight + 8); // clamp within visible area

            return (
              <div
                className='pointer-events-none absolute inset-x-0 z-50 overflow-visible'
                style={{top, transform: 'translateY(-50%)'}}>
                {/* Red line across the schedule */}
                <div className='absolute left-12 md:left-16 right-0 h-0 border-t-2 border-red-500 z-30' />

                {/* Time label on the left - centered on the line */}
                <div className='absolute left-0 top-px w-12 md:w-16 -translate-y-1/2 flex items-center justify-center z-40'>
                  <span className='bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg'>
                    {nowLabel()}
                  </span>
                </div>

                {/* Red dot at the start of the line - positioned to be centered on the 2px border */}
                <div className='absolute left-12 md:left-16 top-px w-2 h-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 z-[100]' />
              </div>
            );
          })()}
        </div>
      ) : (
        <div className='w-full mt-2 md:mt-4 overflow-x-auto'>
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

      {/* Filter modal for group selection */}
      {useMemo(() => {
        // Filter classes to only show those with multiple valid groups
        const filterableClasses = classes.filter((c) => {
          const mapping = classGroupMappings.find((m) => m.classId === c.id);
          if (!mapping) return false;

          // Get the actual group names for this class
          const classGroups = groups.filter((g) =>
            mapping.groupIds.includes(g.id),
          );

          // Filter out invalid groups (empty, PR, RIT variations)
          const validGroups = classGroups.filter((g) => {
            const name = (g.name ?? '').trim();
            if (name === '') return false;

            const nameUpper = name.toUpperCase();

            // Filter out PR
            if (nameUpper === 'PR') return false;

            // Filter out RIT 2 variations
            const isRIT2 =
              nameUpper === 'RIT 2' ||
              nameUpper === 'R_IT 2' ||
              nameUpper === 'R-IT 2' ||
              nameUpper === 'RIT2' ||
              nameUpper === 'R_IT2' ||
              nameUpper === 'R-IT2' ||
              nameUpper.startsWith('RIT') ||
              nameUpper.startsWith('R_IT') ||
              nameUpper.startsWith('R-IT');
            if (isRIT2) return false;

            return true;
          });

          // Only show classes with 2+ valid groups
          return validGroups.length >= 2;
        });

        return (
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
        );
      }, [
        showFilterModal,
        classes,
        groups,
        classGroupMappings,
        groupFilter,
        setGroupFilter,
        setShowFilterModal,
      ])}

      {/* Footer disclaimer */}
      <div className='mt-10 pt-4 border-t text-xs text-muted-foreground text-center'>
        {t.common.disclaimerPrefix}{' '}
        <a
          href='https://www.wise-tt.com/wtt_um_feri/'
          target='_blank'
          rel='noopener noreferrer'
          className='underline decoration-transparent hover:decoration-inherit'>
          WISE
        </a>{' '}
        <span>{t.common.timetable} </span>
        <a
          href='https://github.com/EdvinBec/wiser'
          target='_blank'
          rel='noopener noreferrer'
          className='underline decoration-transparent hover:decoration-inherit p-0 block mt-1'>
          💻 EdvinBec
        </a>
      </div>
    </div>
  );
}
