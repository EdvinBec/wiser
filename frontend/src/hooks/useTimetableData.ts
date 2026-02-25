import {useState, useEffect} from 'react';
import {
  fetchDayTimetable,
  fetchWeekTimetable,
  fetchClasses,
  fetchGroups,
  fetchLatestCheck,
  type ClassInfo,
  type GroupInfo,
} from '@/lib/api';
import type {TimetableEvent} from '@/types/TimetableEvent';
import {getAcademicWeekNumber} from '@/utils/academicCalendar';

interface UseTimetableDataParams {
  selectedView: 'day' | 'week';
  selectedDay: Date | null;
  selectedWeek: number | null;
  academicYear: number;
  courseId: number;
}

interface UseTimetableDataReturn {
  events: TimetableEvent[];
  loading: boolean;
  error: string | null;
  classes: ClassInfo[];
  groups: GroupInfo[];
  latestCheck: number | null;
}

/**
 * Custom hook for managing timetable data fetching.
 * Handles loading events, classes, and groups from the API.
 */
export function useTimetableData({
  selectedView,
  selectedDay,
  selectedWeek,
  academicYear,
  courseId,
}: UseTimetableDataParams): UseTimetableDataReturn {
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [latestCheck, setLatestCheck] = useState<number | null>(null);

  // Load events whenever the selection changes
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (selectedView === 'week') {
          const wk = selectedWeek ?? getAcademicWeekNumber(new Date());
          const data = await fetchWeekTimetable(
            academicYear,
            wk,
            courseId,
            controller.signal,
          );
          setEvents(data);
        } else if (selectedView === 'day' && selectedDay) {
          const month = selectedDay.getMonth() + 1;
          const day = selectedDay.getDate();
          // For day view, backend expects calendar year, not academic year
          const calendarYear = selectedDay.getFullYear();
          const data = await fetchDayTimetable(
            calendarYear,
            month,
            day,
            courseId,
            controller.signal,
          );
          setEvents(data);
        } else {
          setEvents([]);
        }
      } catch (e: any) {
        // Ignore abort errors triggered by effect cleanup
        const isAbort =
          e?.name === 'AbortError' || e?.message?.includes('aborted');
        if (!isAbort) {
          setError(e?.message ?? 'Failed to load timetable');
          setEvents([]);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [selectedView, selectedDay, selectedWeek, academicYear, courseId]);

  // Load classes and groups once on mount
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [cs, gs, lc] = await Promise.all([
          fetchClasses(courseId, controller.signal),
          fetchGroups(courseId, controller.signal),
          fetchLatestCheck(courseId, controller.signal),
        ]);
        setClasses(cs);
        setGroups(gs);
        setLatestCheck(lc);
      } catch (e) {
        // Ignore abort errors from cleanup
        if (e instanceof Error && e.name === 'AbortError') return;
        // Silently fail - filters will just show nothing
        console.warn('Failed to load classes/groups:', e);
      }
    })();
    return () => controller.abort();
  }, [courseId]);

  return {
    events,
    loading,
    error,
    classes,
    groups,
    latestCheck,
  };
}
