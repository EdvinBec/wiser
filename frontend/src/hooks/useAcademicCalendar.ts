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
        const urlY = new URLSearchParams(window.location.search).get('y');
        if (urlY) {
          const n = Number(urlY);
          if (Number.isFinite(n)) return n;
        }
        const n = Number(s);
        return Number.isFinite(n) ? n : initialAcademicYear;
      },
    });

  const academicYear = useMemo(() => {
    if (selectedView === 'week') return selectedAcademicYear;
    const d = selectedDay ?? new Date();
    return academicYearForDate(d);
  }, [selectedView, selectedAcademicYear, selectedDay]);

  return {selectedAcademicYear, setSelectedAcademicYear, academicYear};
}
