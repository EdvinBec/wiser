import {useState, useMemo, useEffect} from 'react';
import {useLocalStorageState} from './useLocalStorageState';
import {useAuth} from '@/contexts/AuthContext.shared';
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5013';

/**
 * Custom hook for managing timetable event filters.
 * Handles group filtering with localStorage (unauthenticated) or server (authenticated) persistence.
 */
export function useTimetableFilters(
  events: TimetableEvent[],
): UseTimetableFiltersReturn {
  const {isAuthenticated} = useAuth();
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

  // Load filters from server for authenticated users
  useEffect(() => {
    async function loadFilters() {
      if (isAuthenticated) {
        try {
          const response = await fetch(`${API_BASE}/user/filters`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.groupFilters) {
              const parsed = JSON.parse(data.groupFilters);
              setGroupFilterState(parsed);
            }
          }
        } catch (err) {
          console.error('Failed to load user filters:', err);
        }
      }
      setFiltersLoaded(true);
    }
    loadFilters();
  }, [isAuthenticated]);

  // Wrapper function that saves to server for authenticated users
  const setGroupFilter = (
    filter:
      | Record<number, number[]>
      | ((prev: Record<number, number[]>) => Record<number, number[]>),
  ) => {
    const newFilter =
      typeof filter === 'function' ? filter(groupFilter) : filter;
    setGroupFilterState(newFilter);

    // Save to server for authenticated users
    if (isAuthenticated && filtersLoaded) {
      fetch(`${API_BASE}/user/filters`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          groupFilters: JSON.stringify(newFilter),
        }),
      }).catch((err) => {
        console.error('Failed to save user filters:', err);
      });
    }
  };

  // Check if user has saved filters (to determine if onboarding modal should show)
  const hasInitialFilters = useMemo(() => {
    return Object.keys(groupFilter).length > 0;
  }, [groupFilter]);

  // Apply group filters to events
  const filteredEvents = useMemo(() => {
    if (!events.length) return events;
    return events.filter((ev) => {
      // Always include all Lectures (not affected by filters)
      if (ev.type === 'Lecture') return true;
      // Always include events for group "RIT 2"
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
