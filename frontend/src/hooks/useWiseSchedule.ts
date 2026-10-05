import {useCallback, useEffect, useMemo, useState} from 'react';
import {useLocalStorageState} from './useLocalStorageState';
import {useAuth} from '@/contexts/AuthContext.shared';
import {getStoredSelections, saveStoredSelections} from '@/lib/api';
import {
  fetchPublishedAt,
  fetchWiseTimetable,
  type WiseSelection,
  type WiseSession,
} from '@/lib/wiseApi';
import type {TimetableEvent} from '@/types/TimetableEvent';
import type {TimetableEventType} from '@/types/TimetableEventType';
import {academicWeekStart, getAcademicWeekNumber} from '@/utils/academicCalendar';

const STORAGE_KEY = 'wiserSelectionsV1';

/**
 * Wise writes execution types as free text the school chooses — FERI uses 28 of them, not just
 * PR/RV/SV/LV. Map the ones we know onto the palette and let the rest fall through: the colour
 * helper already has a default, and the raw label is kept on the event for display.
 */
function mapType(executionType: string): TimetableEventType {
  const t = executionType.toUpperCase().trim();
  if (t.startsWith('PR')) return 'Lecture';
  if (t.startsWith('RV')) return 'ComputerExercise';
  if (t.startsWith('LV')) return 'LabExercise';
  if (t.startsWith('SV')) return 'SeminarExercise';
  if (t.startsWith('SE')) return 'Seminar';
  if (t.startsWith('AV')) return 'Exercise';
  if (t.startsWith('IZPIT') || t.startsWith('EXAM')) return 'Exam';
  return 'Exercise';
}

/**
 * Wise sends Ljubljana wall time with no offset. Parsing it as local would be wrong for anyone
 * whose device is in another zone, so the components are read out explicitly and rebuilt against
 * Ljubljana's offset at that instant.
 */
function parseLjubljana(raw: string): Date {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return new Date(raw);

  const utcMs = Date.UTC(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    Number(m[4]), Number(m[5]), Number(m[6] ?? 0),
  );

  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Ljubljana',
    timeZoneName: 'short',
  }).formatToParts(new Date(utcMs)).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';

  const off = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  const minutes = off
    ? (off[1] === '-' ? -1 : 1) * (Number(off[2] ?? 0) * 60 + Number(off[3] ?? 0))
    : 0;

  return new Date(utcMs - minutes * 60_000);
}

function toEvent(s: WiseSession): TimetableEvent {
  return {
    id: s.id,
    classId: s.subjectId,
    className: s.subject,
    instructorId: 0,
    instructorName: s.lecturers.join(', '),
    groupId: 0,
    groupName: s.groups.join(', '),
    roomId: 0,
    roomName: s.room,
    type: mapType(s.type),
    startAt: parseLjubljana(s.startAt),
    finishAt: parseLjubljana(s.finishAt),
    wiseType: s.type,
    lecturers: s.lecturers,
    groups: s.groups,
  };
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

type Params = {
  selectedView: 'day' | 'week';
  selectedDay: Date | null;
  selectedWeek: number | null;
  academicYear: number;
};

export function useWiseSchedule({
  selectedView,
  selectedDay,
  selectedWeek,
  academicYear,
}: Params) {
  const {isAuthenticated, token} = useAuth();

  const [selections, setSelectionsLocal] = useLocalStorageState<WiseSelection[]>(
    STORAGE_KEY,
    [],
    {
      deserialize: (s) => {
        try {
          const parsed = JSON.parse(s);
          return Array.isArray(parsed) ? (parsed as WiseSelection[]) : [];
        } catch {
          return [];
        }
      },
    },
  );

  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverLoaded, setServerLoaded] = useState(false);

  // Selections live in the existing GroupFilters column, tagged with a version so the old
  // per-class filter payload is still recognisable and simply ignored.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isAuthenticated && token) {
        try {
          const data = await getStoredSelections(token);
          const parsed = data.groupFilters ? JSON.parse(data.groupFilters) : null;
          if (!cancelled && parsed?.v === 2 && Array.isArray(parsed.selections)) {
            setSelectionsLocal(parsed.selections as WiseSelection[]);
          }
        } catch {
          // Keep whatever localStorage had; the timetable still works offline.
        }
      }
      if (!cancelled) setServerLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, setSelectionsLocal]);

  const persist = useCallback(
    (next: WiseSelection[]) => {
      setSelectionsLocal(next);
      if (isAuthenticated && token && serverLoaded) {
        saveStoredSelections(token, next).catch(() => {
          // Local copy already updated; a failed sync must not lose the edit.
        });
      }
    },
    [isAuthenticated, token, serverLoaded, setSelectionsLocal],
  );

  const addSelection = useCallback(
    (selection: WiseSelection) => {
      const next = selections.filter((s) => s.subjectId !== selection.subjectId);
      persist([...next, selection]);
    },
    [selections, persist],
  );

  const removeSelection = useCallback(
    (subjectId: number) => persist(selections.filter((s) => s.subjectId !== subjectId)),
    [selections, persist],
  );

  const updatePicks = useCallback(
    (subjectId: number, picks: Record<string, string>) =>
      persist(selections.map((s) => (s.subjectId === subjectId ? {...s, picks} : s))),
    [selections, persist],
  );

  const range = useMemo(() => {
    if (selectedView === 'day' && selectedDay) return {from: selectedDay, to: selectedDay};
    const week = selectedWeek ?? getAcademicWeekNumber(new Date());
    const monday = academicWeekStart(academicYear, week);
    return {from: monday, to: addDays(monday, 6)};
  }, [selectedView, selectedDay, selectedWeek, academicYear]);

  const selectionKey = useMemo(
    () => JSON.stringify(selections.map((s) => [s.subjectId, s.picks])),
    [selections],
  );

  useEffect(() => {
    if (selections.length === 0) {
      setEvents([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const sessions = await fetchWiseTimetable(
          range.from,
          range.to,
          selections,
          controller.signal,
        );
        setEvents(sessions.map(toEvent));
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Urnika ni bilo mogoče naložiti');
        // Previously loaded events stay on screen rather than blanking the grid.
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
    // selectionKey stands in for `selections` so re-ordering alone does not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, selectionKey]);

  // When the school last published. Wise sends no ETag on /web/, so this footer stamp is the
  // only honest "last updated" we can show.
  const [publishedAt, setPublishedAt] = useState<number | null>(null);
  useEffect(() => {
    const c = new AbortController();
    fetchPublishedAt(c.signal)
      .then(({publishedAt: raw}) => {
        if (!raw) return;
        const ms = Date.parse(raw);
        if (!Number.isNaN(ms)) setPublishedAt(ms);
      })
      .catch(() => {
        // Cosmetic only — a missing stamp must not surface as an error.
      });
    return () => c.abort();
  }, []);

  return {
    selections,
    addSelection,
    removeSelection,
    updatePicks,
    events,
    loading,
    error,
    publishedAt,
    hasSelections: selections.length > 0,
  };
}
