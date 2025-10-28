import { useState, useMemo } from "react";
import { useLocalStorageState } from "./useLocalStorageState";
import type { TimetableEvent } from "@/types/TimetableEvent";

interface UseTimetableFiltersReturn {
  groupFilter: Record<number, number[]>;
  setGroupFilter: (filter: Record<number, number[]> | ((prev: Record<number, number[]>) => Record<number, number[]>)) => void;
  filteredEvents: TimetableEvent[];
  showFilterModal: boolean;
  setShowFilterModal: (show: boolean) => void;
  hasInitialFilters: boolean;
}

/**
 * Custom hook for managing timetable event filters.
 * Handles group filtering with localStorage persistence.
 */
export function useTimetableFilters(
  events: TimetableEvent[]
): UseTimetableFiltersReturn {
  const [groupFilter, setGroupFilter] = useLocalStorageState<
    Record<number, number[]>
  >("timetableGroupFilterV2", {}, {
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
  });

  const [showFilterModal, setShowFilterModal] = useState(false);

  // Check if user has saved filters (to determine if onboarding modal should show)
  const hasInitialFilters = useMemo(() => {
    return Object.keys(groupFilter).length > 0;
  }, [groupFilter]);

  // Apply group filters to events
  const filteredEvents = useMemo(() => {
    if (!events.length) return events;
    return events.filter((ev) => {
      // Always include all Lectures (not affected by filters)
      if (ev.type === "Lecture") return true;
      // Always include events for group "RIT 2"
      if (ev.groupName === "RIT 2") return true;
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
