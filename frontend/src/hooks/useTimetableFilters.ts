import {useState, useMemo, useEffect} from 'react';
import {useLocalStorageState} from './useLocalStorageState';
import {useAuth} from '@/contexts/AuthContext.shared';
import {getUserFilters, saveUserFilters} from '@/lib/api';
import type {TimetableEvent} from '@/types/TimetableEvent';

interface UseTimetableFiltersReturn {
  groupFilter: Record<number, number[]>;
  setGroupFilter: (
    filter:
      | Record<number, number[]>
      | ((prev: Record<number, number[]>) => Record<number, number[]>),
  ) => void;
  filteredEvents: TimetableEvent[];
  showFilterModal: boolean;
  setShowFilterModal: (show: boolean) => void;
  hasInitialFilters: boolean;
}

export function useTimetableFilters(
  events: TimetableEvent[],
): UseTimetableFiltersReturn {
  const {isAuthenticated, token} = useAuth();
  const [groupFilter, setGroupFilterState] = useLocalStorageState<
    Record<number, number[]>
  >(
    'timetableGroupFilterV2',
    {},
    {
      deserialize: (s) => {
        try {
          const parsed = JSON.parse(s) as Record<string, unknown>;
          const normalized: Record<number, number[]> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (Array.isArray(v)) {
              const nums = v
                .map((x) => Number(x))
                .filter((n) => Number.isFinite(n));
              normalized[Number(k)] = nums;
            }
          }
          return normalized;
        } catch {
          return {};
        }
      },
    },
  );

  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    async function loadFilters() {
      if (isAuthenticated && token) {
        try {
          const data = await getUserFilters(token);
          if (data.groupFilters) {
            const parsed = JSON.parse(data.groupFilters);
            setGroupFilterState(parsed);
          }
        } catch (err) {
          console.error('Failed to load user filters:', err);
        }
      }
      setFiltersLoaded(true);
    }
    loadFilters();
  }, [isAuthenticated]);

  const setGroupFilter = (
    filter:
      | Record<number, number[]>
      | ((prev: Record<number, number[]>) => Record<number, number[]>),
  ) => {
    const newFilter =
      typeof filter === 'function' ? filter(groupFilter) : filter;
    setGroupFilterState(newFilter);

    if (isAuthenticated && filtersLoaded && token) {
      saveUserFilters(token, newFilter).catch((err) => {
        console.error('Failed to save user filters:', err);
      });
    }
  };

  const hasInitialFilters = useMemo(() => {
    return Object.keys(groupFilter).length > 0;
  }, [groupFilter]);

  const filteredEvents = useMemo(() => {
    if (!events.length) return events;
    return events.filter((ev) => {
      if (ev.type === 'Lecture') return true;
      if (ev.groupName === 'RIT 2') return true;
      const selected = groupFilter[ev.classId];
      if (!selected || selected.length === 0) return true;
      const selectedSet = new Set(selected.map((v) => Number(v)));
      return selectedSet.has(Number(ev.groupId));
    });
  }, [events, groupFilter]);

  return {
    groupFilter,
    setGroupFilter,
    filteredEvents,
    showFilterModal,
    setShowFilterModal,
    hasInitialFilters,
  };
}
