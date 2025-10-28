import { useMemo } from "react";
import { useLocalStorageState } from "./useLocalStorageState";
import { academicYearForDate } from "@/utils/academicCalendar";

interface UseAcademicCalendarParams {
  selectedView: "day" | "week";
  selectedDay: Date | null;
}

interface UseAcademicCalendarReturn {
  selectedAcademicYear: number;
  setSelectedAcademicYear: (year: number | ((prev: number) => number)) => void;
  academicYear: number;
}

/**
 * Custom hook for managing academic calendar state.
 * Handles academic year selection and synchronization with day/week views.
 */
export function useAcademicCalendar({
  selectedView,
  selectedDay,
}: UseAcademicCalendarParams): UseAcademicCalendarReturn {
  const today = new Date();
  const initialAcademicYear = academicYearForDate(selectedDay ?? today);

  const [selectedAcademicYear, setSelectedAcademicYear] =
    useLocalStorageState<number>(
      "timetableSelectedAYV2",
      initialAcademicYear,
      {
        legacyKeys: ["timetableSelectedAYV1"],
        serialize: (n) => String(n),
        deserialize: (s) => {
          const n = Number(s);
          return Number.isFinite(n) ? n : initialAcademicYear;
        },
      }
    );

  // The effective academic year based on current view
  const academicYear = useMemo(() => {
    if (selectedView === "week") return selectedAcademicYear;
    const d = selectedDay ?? new Date();
    return academicYearForDate(d);
  }, [selectedView, selectedAcademicYear, selectedDay]);

  return {
    selectedAcademicYear,
    setSelectedAcademicYear,
    academicYear,
  };
}
