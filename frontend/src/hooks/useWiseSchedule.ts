import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useLocalStorageState} from './useLocalStorageState';
import {useAuth} from '@/contexts/AuthContext.shared';
import {ApiError, getStoredSelections, saveStoredSelections} from '@/lib/api';
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

/**
 * Unions what the account holds with what this device holds, one entry per subject.
 *
 * Signing in used to REPLACE the device's list with the account's, and nothing ever pushed the
 * other way. Both halves of that were wrong, and between them they produced an account with a
 * row in it and no timetable on it: subjects picked before signing in were either overwritten
 * by the account's older list or left sitting on the one device, saved nowhere.
 *
 * `localWins` settles a subject the two disagree about. An edit made during this visit is the
 * student's latest intent and leads; an untouched local copy may be weeks stale, and then the
 * account leads. There are no timestamps to do better than that.
 */
function mergeSelections(
  server: WiseSelection[],
  local: WiseSelection[],
  localWins: boolean,
): WiseSelection[] {
  const bySubject = new Map<number, WiseSelection>();
  // Insertion order survives, so the leader's ordering is kept and the other side's extras are
  // appended after it.
  for (const s of localWins ? server : local) bySubject.set(s.subjectId, s);
  for (const s of localWins ? local : server) bySubject.set(s.subjectId, s);
  return [...bySubject.values()];
}

/**
 * Identity of a selection list, insensitive to ordering — of the subjects and of the keys inside
 * each one's picks. Used only to decide whether the account needs writing to, so a false
 * "different" costs one redundant request and a false "same" would cost a lost timetable.
 */
function fingerprint(list: WiseSelection[]): string {
  return JSON.stringify(
    list
      .map((s) => {
        const picks = s.picks ?? {};
        return [
          s.subjectId,
          Object.keys(picks)
            .sort()
            .map((k) => [k, picks[k]]),
        ] as const;
      })
      .sort((a, b) => a[0] - b[0]),
  );
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
  const {isAuthenticated, token, endSession} = useAuth();

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

  // Has this visit touched the selections? Decides who leads in mergeSelections.
  const editedHere = useRef(false);

  // The merge needs the current local list but must not re-run when it changes, or it would
  // fight its own result. A ref keeps the effect keyed on the session alone.
  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;

  // Selections live in the existing GroupFilters column, tagged with a version so the old
  // per-class filter payload is still recognisable and simply ignored.
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let cancelled = false;
    (async () => {
      let serverList: WiseSelection[] = [];
      try {
        const data = await getStoredSelections(token);
        const parsed = data.groupFilters ? JSON.parse(data.groupFilters) : null;
        if (parsed?.v === 2 && Array.isArray(parsed.selections)) {
          serverList = parsed.selections as WiseSelection[];
        }
      } catch (e) {
        // A 401 means this token is finished — past its thirty days, or signed with a key this
        // server no longer holds. Swallowing it is exactly what let the header show a name
        // while the timetable underneath stayed empty, with nothing on screen to explain why.
        if (e instanceof ApiError && e.status === 401) {
          if (!cancelled) endSession();
          return;
        }
        // Anything else is the server being unwell. Keep what the device has; the timetable
        // still works without an account.
        return;
      }
      if (cancelled) return;

      const merged = mergeSelections(
        serverList,
        selectionsRef.current,
        editedHere.current,
      );
      setSelectionsLocal(merged);

      // Push back whenever the device knew something the account did not. This is the step that
      // was missing altogether, and without it subjects picked before signing in never reached
      // the account — they stayed on one phone until its storage was cleared.
      if (fingerprint(merged) !== fingerprint(serverList)) {
        saveStoredSelections(token, merged).catch(() => {
          // Already on the device; a failed sync must not lose it.
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, endSession, setSelectionsLocal]);

  const persist = useCallback(
    (next: WiseSelection[]) => {
      editedHere.current = true;
      setSelectionsLocal(next);
      // Writes are no longer held back until the account's list has arrived. That gate dropped
      // the first picks made after signing in whenever the student reached the builder before
      // the response did — and the builder opens itself the moment the timetable is empty,
      // which makes that the common case, not the rare one. Writing straight away is safe
      // because the merge above unions rather than replaces.
      if (isAuthenticated && token) {
        saveStoredSelections(token, next).catch(() => {
          // Local copy already updated; a failed sync must not lose the edit.
        });
      }
    },
    [isAuthenticated, token, setSelectionsLocal],
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
