import {useMemo} from 'react';
import {useLocalStorageState} from './useLocalStorageState';
import {academicYearForDate} from '@/utils/academicCalendar';

interface UseAcademicCalendarParams {
  selectedView: 'day' | 'week';
  selectedDay: Date | null;
}

interface UseAcademicCalendarReturn {
  selectedAcademicYear: number;
  setSelectedAcademicYear: (year: number | ((prev: number) => number)) => void;
  academicYear: number;
}

export function useAcademicCalendar({
  selectedView,
  selectedDay,
}: UseAcademicCalendarParams): UseAcademicCalendarReturn {
  const today = new Date();
  const initialAcademicYear = academicYearForDate(selectedDay ?? today);

  const [selectedAcademicYear, setSelectedAcademicYear] =
    useLocalStorageState<number>('timetableSelectedAYV2', initialAcademicYear, {
      legacyKeys: ['timetableSelectedAYV1'],
      serialize: (n) => String(n),
      deserialize: (s) => {
        // An explicit ?y= is someone opening a shared link; honour it.
        const urlY = new URLSearchParams(window.location.search).get('y');
        if (urlY) {
          const n = Number(urlY);
          if (Number.isFinite(n)) return n;
        }

        // A STORED year is only honoured while it is still the current one. The week number
        // beside it does not persist at all — useTimetableNavigation always re-derives it from
        // today's date — so a year left over from a previous session pairs last year's October
        // with this week's number and the grid renders a week that no longer has data. That is
        // not a stale label the user can see and correct; it is an empty timetable with no
        // explanation. Falling back to the current year keeps the two in step.
        const stored = Number(s);
        return Number.isFinite(stored) && stored === initialAcademicYear
          ? stored
          : initialAcademicYear;
      },
    });

  const academicYear = useMemo(() => {
    if (selectedView === 'week') return selectedAcademicYear;
    const d = selectedDay ?? new Date();
    return academicYearForDate(d);
  }, [selectedView, selectedAcademicYear, selectedDay]);

  return {selectedAcademicYear, setSelectedAcademicYear, academicYear};
}
