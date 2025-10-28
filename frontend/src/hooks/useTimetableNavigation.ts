import { useLocalStorageState } from "./useLocalStorageState";
import { getAcademicWeekNumber } from "@/utils/academicCalendar";

const LS = {
  view: "timetableSelectedViewV2",
  day: "timetableSelectedDayV2",
  week: "timetableSelectedWeekV2",
} as const;

interface UseTimetableNavigationReturn {
  selectedView: "day" | "week";
  setSelectedView: (view: "day" | "week" | ((prev: "day" | "week") => "day" | "week")) => void;
  selectedDay: Date | null;
  setSelectedDay: (day: Date | null | ((prev: Date | null) => Date | null)) => void;
  selectedWeek: number | null;
  setSelectedWeek: (week: number | null | ((prev: number | null) => number | null)) => void;
}

/**
 * Custom hook for managing timetable navigation state (view, day, week).
 * Handles view switching and date selection with localStorage persistence.
 *
 * Default behavior:
 * - View defaults to "day"
 * - Always resets to today's date/week on page load
 */
export function useTimetableNavigation(): UseTimetableNavigationReturn {
  // View preference persists (defaults to "day")
  const [selectedView, setSelectedView] = useLocalStorageState<"day" | "week">(
    LS.view,
    "day", // Always default to day view
    {
      legacyKeys: ["timetableSelectedViewV1"],
      serialize: (v) => v,
      deserialize: (v) => (v === "day" || v === "week" ? v : "day"),
    }
  );

  // Day always resets to today on page load (not persisted from localStorage)
  const [selectedDay, setSelectedDay] = useLocalStorageState<Date | null>(
    LS.day,
    () => new Date(), // Always start with today
    {
      legacyKeys: ["timetableSelectedDayV1"],
      serialize: (d) => (d ? d.toISOString() : ""),
      deserialize: (_s) => {
        // Ignore persisted value, always use today
        return new Date();
      },
    }
  );

  // Week always resets to current week on page load
  const [selectedWeek, setSelectedWeek] = useLocalStorageState<number | null>(
    LS.week,
    () => getAcademicWeekNumber(new Date()), // Always start with current week
    {
      legacyKeys: ["timetableSelectedWeekV1"],
      serialize: (n) => (n !== null ? String(n) : ""),
      deserialize: (_s) => {
        // Ignore persisted value, always use current week
        return getAcademicWeekNumber(new Date());
      },
    }
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
