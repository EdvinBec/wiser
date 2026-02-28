import {useLocalStorageState} from './useLocalStorageState';
import {getAcademicWeekNumber} from '@/utils/academicCalendar';

const LS = {
  view: 'timetableSelectedViewV2',
  day: 'timetableSelectedDayV2',
  week: 'timetableSelectedWeekV2',
} as const;

interface UseTimetableNavigationReturn {
  selectedView: 'day' | 'week';
  setSelectedView: (
    view: 'day' | 'week' | ((prev: 'day' | 'week') => 'day' | 'week'),
  ) => void;
  selectedDay: Date | null;
  setSelectedDay: (
    day: Date | null | ((prev: Date | null) => Date | null),
  ) => void;
  selectedWeek: number | null;
  setSelectedWeek: (
    week: number | null | ((prev: number | null) => number | null),
  ) => void;
}

export function useTimetableNavigation(): UseTimetableNavigationReturn {
  const [selectedView, setSelectedView] = useLocalStorageState<'day' | 'week'>(
    LS.view,
    () => {
      // On first visit (no localStorage), still respect URL param
      const urlV = new URLSearchParams(window.location.search).get('v');
      if (urlV === 'day' || urlV === 'week') return urlV;
      return 'day';
    },
    {
      legacyKeys: ['timetableSelectedViewV1'],
      serialize: (v) => v,
      deserialize: (stored) => {
        // URL param takes priority over localStorage
        const urlV = new URLSearchParams(window.location.search).get('v');
        if (urlV === 'day' || urlV === 'week') return urlV;
        return stored === 'day' || stored === 'week' ? stored : 'day';
      },
    },
  );

  const [selectedDay, setSelectedDay] = useLocalStorageState<Date | null>(
    LS.day,
    () => {
      const urlD = new URLSearchParams(window.location.search).get('d');
      // Parse as local noon to avoid UTC midnight shifting the date across timezone boundaries
      if (urlD) return new Date(urlD + 'T12:00:00');
      return new Date();
    },
    {
      legacyKeys: ['timetableSelectedDayV1'],
      serialize: (d) => (d ? d.toISOString() : ''),
      deserialize: (_s) => {
        const urlD = new URLSearchParams(window.location.search).get('d');
        // Parse as local noon to avoid UTC midnight shifting the date across timezone boundaries
        if (urlD) return new Date(urlD + 'T12:00:00');
        return new Date();
      },
    },
  );

  const [selectedWeek, setSelectedWeek] = useLocalStorageState<number | null>(
    LS.week,
    () => {
      const urlW = new URLSearchParams(window.location.search).get('w');
      if (urlW) return Number(urlW);
      return getAcademicWeekNumber(new Date());
    },
    {
      legacyKeys: ['timetableSelectedWeekV1'],
      serialize: (n) => (n !== null ? String(n) : ''),
      deserialize: (_s) => {
        const urlW = new URLSearchParams(window.location.search).get('w');
        if (urlW) return Number(urlW);
        return getAcademicWeekNumber(new Date());
      },
    },
  );

  return {
    selectedView,
    setSelectedView,
    selectedDay,
    setSelectedDay,
    selectedWeek,
    setSelectedWeek,
  };
}
