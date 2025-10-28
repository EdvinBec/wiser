import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { RoundedButton } from "@/components/RoundedButton";
import { Brand } from "@/components/Brand";
import { TimetableHeader } from "./TimetableHeader.tsx";
import { TimeAxis } from "./TimeAxis.tsx";
import { WeekGrid } from "./WeekGrid";
import { OnboardingFiltersModal } from "./OnboardingFiltersModal";
import { useNow } from "@/lib/useNow";
import type { TimetableEvent } from "@/types/TimetableEvent.ts";
import { ScheduleColumn } from "./ScheduleColumn.tsx";
import { TimetableEventBlockDetails } from "./TimetableEventBlockDetailModal.tsx";
import { useI18n } from "@/lib/i18n";
import { EventTypeIndicator } from "@/components/EventTypeIndicator.tsx";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { weeksInAcademicYear } from "@/utils/academicCalendar";
import { useTimetableNavigation } from "@/hooks/useTimetableNavigation";
import { useAcademicCalendar } from "@/hooks/useAcademicCalendar";
import { useTimetableData } from "@/hooks/useTimetableData";
import { useTimetableFilters } from "@/hooks/useTimetableFilters";
import { useWinterQuirks } from "@/hooks/useWinterQuirks";
import { toast } from "sonner";

export function Timetable({
  courseId,
  headerTitle,
}: {
  courseId: number;
  headerTitle?: string;
}) {
  // Navigation state (view, day, week selection)
  const {
    selectedView,
    setSelectedView,
    selectedDay,
    setSelectedDay,
    selectedWeek,
    setSelectedWeek,
  } = useTimetableNavigation();

  // Academic calendar state
  const { selectedAcademicYear, setSelectedAcademicYear, academicYear } =
    useAcademicCalendar({
      selectedView,
      selectedDay,
    });

  // Data fetching
  const { events, loading, error, classes, groups, latestCheck } =
    useTimetableData({
      selectedView,
      selectedDay,
      selectedWeek,
      academicYear,
      courseId,
    });

  // Filtering
  const {
    groupFilter,
    setGroupFilter,
    filteredEvents,
    showFilterModal,
    setShowFilterModal,
    hasInitialFilters,
  } = useTimetableFilters(events);

  // Theme and i18n
  const [isDark, setIsDark] = useLocalStorageState<boolean>("themeV2", false, {
    legacyKeys: ["themeV1"],
    serialize: (v) => (v ? "dark" : "light"),
    deserialize: (s) => s === "dark",
  });
  const { t, locale, setLocale } = useI18n();

  // Selected event for detail modal
  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(
    null
  );

  // Winter quirks (scrolling tree, Friday snowflake cursor)
  useWinterQuirks();

  // layout constants
  const HOUR_HEIGHT = 64; // px per hour
  const DAY_START = 7;
  const DAY_END = 21;
  const hours = Array.from(
    { length: DAY_END - DAY_START + 1 },
    (_, i) => i + DAY_START
  );

  // Current time indicator helpers
  const now = useNow(30000);
  const ljParts = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Ljubljana",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
  const nowTopPx = () => {
    const parts = ljParts(now);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    const minutesFromStart = (h - DAY_START) * 60 + m;
    return (minutesFromStart / 60) * HOUR_HEIGHT;
  };
  const nowLabel = () =>
    new Intl.DateTimeFormat(t.locale, {
      timeZone: "Europe/Ljubljana",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);

  // Open onboarding modal if no filters are saved
  useEffect(() => {
    if (classes.length > 0 && !hasInitialFilters) {
      setShowFilterModal(true);
    }
  }, [classes, hasInitialFilters, setShowFilterModal]);

  // Check if data is stale (last check was more than 30 minutes ago)
  useEffect(() => {
    if (latestCheck != null) {
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000; // 30 minutes
      if (latestCheck < thirtyMinutesAgo) {
        toast.error(
          t.common.staleDataWarning ||
            "Data might not be up to date. Last update was more than 30 minutes ago.",
          {
            duration: Infinity, // Stays until manually dismissed
          }
        );
      }
    }
  }, [latestCheck, t.common.staleDataWarning]);

  // Apply theme to <html> element and persist
  useEffect(() => {
    try {
      const el = document.documentElement;
      el.classList.toggle("dark", isDark);
      localStorage.setItem("themeV2", isDark ? "dark" : "light");
    } catch {}
  }, [isDark]);

  // Persist filter changes
  useEffect(() => {
    try {
      localStorage.setItem(
        "timetableGroupFilterV2",
        JSON.stringify(groupFilter)
      );
    } catch {}
  }, [groupFilter]);

  const onPrev = () => {
    if (selectedView === "day") {
      setSelectedDay((prev) => {
        if (!prev) return prev;
        const next = new Date(prev);
        next.setDate(prev.getDate() - 1);
        return next;
      });
    } else {
      setSelectedWeek((prev) => {
        const current = prev ?? 1;
        if (current > 1) return current - 1;
        // wrap to previous academic year
        setSelectedAcademicYear((ay) => ay - 1);
        return weeksInAcademicYear(selectedAcademicYear - 1);
      });
    }
  };

  const onNext = () => {
    if (selectedView === "day") {
      setSelectedDay((prev) => {
        if (!prev) return prev;
        const next = new Date(prev);
        next.setDate(prev.getDate() + 1);
        return next;
      });
    } else {
      setSelectedWeek((prev) => {
        const current = prev ?? 1;
        const max = weeksInAcademicYear(selectedAcademicYear);
        if (current < max) return current + 1;
        // wrap to next academic year
        setSelectedAcademicYear((ay) => ay + 1);
        return 1;
      });
    }
  };

  // For day view, further filter to only show events on the selected day
  const filteredDayEvents = selectedDay
    ? filteredEvents.filter(
        (ev) =>
          ev.startAt.getFullYear() === selectedDay.getFullYear() &&
          ev.startAt.getMonth() === selectedDay.getMonth() &&
          ev.startAt.getDate() === selectedDay.getDate()
      )
    : filteredEvents;

  return (
    <div className="px-6 md:px-10 lg:px-16 py-6 md:py-8 max-w-7xl mx-auto overflow-x-hidden md:overflow-x-visible">
      <div className="mb-2 gap-4 flex items-center justify-between border-b pb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <Brand />
          <span className="text-sm text-muted-foreground text-nowrap">
            {headerTitle}
          </span>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <EventTypeIndicator type="Lecture" />
          <EventTypeIndicator type="ComputerExercise" />
          <EventTypeIndicator type="LabExercise" />
          <EventTypeIndicator type="SeminarExercise" />
        </div>
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <TimetableHeader
          selectedView={selectedView}
          selectedDay={selectedDay}
          selectedWeek={selectedWeek}
          onChangeView={(v) => setSelectedView(v)}
          leftButton={<RoundedButton onClick={onPrev} icon={ChevronLeft} />}
          rightButton={
            <div className="flex items-center gap-2">
              <RoundedButton onClick={onNext} icon={ChevronRight} />
            </div>
          }
        />
      </div>

      {/* Controls - reorganized for mobile */}
      <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Buttons - horizontal row, same line on all screens */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsDark((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted text-sm ${
              isDark ? "text-foreground" : "text-muted-foreground"
            }`}
            aria-label="Toggle theme"
            aria-pressed={isDark}
            title={isDark ? t.common.switchToLight : t.common.switchToDark}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span className="hidden sm:inline">
              {isDark ? t.common.themeLight : t.common.themeDark}
            </span>
          </button>
          <button
            onClick={() => setLocale(locale === "sl" ? "en" : "sl")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted text-sm text-muted-foreground"
            aria-label="Toggle language"
            title={
              locale === "sl" ? "Switch to English" : "Preklopi v slovenščino"
            }
          >
            <Globe size={16} />
            <span className="tabular-nums">{locale.toUpperCase()}</span>
          </button>
          <button
            onClick={() => setShowFilterModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted text-sm text-muted-foreground"
            aria-haspopup="dialog"
          >
            <SlidersHorizontal size={16} />
            <span>{t.common.manageFilters}</span>
          </button>
        </div>

        {/* Latest check - aligned properly */}
        {latestCheck != null && (
          <div className="text-xs text-muted-foreground flex items-center">
            {t.common.latestCheckLabel}:{" "}
            {new Intl.DateTimeFormat(t.locale, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date(latestCheck))}
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 text-sm text-muted-foreground">
          {t.common.loadingTimetable}
        </div>
      )}
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      {selectedView === "day" ? (
        <div className="relative flex h-full w-full mt-2 md:mt-4">
          <TimeAxis hours={hours} hourHeight={HOUR_HEIGHT} />
          <ScheduleColumn
            hours={hours}
            hourHeight={HOUR_HEIGHT}
            dayStart={DAY_START}
            events={filteredDayEvents}
            onEventClick={(ev) => setSelectedEvent(ev)}
          />
          {/* current time indicator for Day view (only when the selected day is today) */}
          {(() => {
            // Only show indicator if selected day is today
            if (!selectedDay) return null;
            const today = new Date();
            const isToday =
              selectedDay.getFullYear() === today.getFullYear() &&
              selectedDay.getMonth() === today.getMonth() &&
              selectedDay.getDate() === today.getDate();

            if (!isToday) return null;

            // Check if current time is within visible hours
            const parts = ljParts(now);
            const currentHour = Number(
              parts.find((p) => p.type === "hour")?.value ?? "0"
            );

            // Hide indicator if outside of visible hours (before 7 or after 21)
            if (currentHour < DAY_START || currentHour > DAY_END) {
              return null;
            }

            const columnHeight = (hours.length - 1) * HOUR_HEIGHT;
            const rawTop = nowTopPx() + 8; // +8 to account for column mt-2
            const top = Math.min(Math.max(rawTop, 8), columnHeight + 8); // clamp within visible area

            return (
              <div
                className="pointer-events-none absolute inset-x-0 z-30"
                style={{ top }}
              >
                {/* Red line across the schedule */}
                <div className="absolute left-12 md:left-16 right-0 h-0 border-t-2 border-red-500" />

                {/* Time label on the left - above time axis */}
                <div className="absolute left-0 w-12 md:w-16 -translate-y-1/2 flex items-center justify-center z-40">
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                    {nowLabel()}
                  </span>
                </div>

                {/* Red dot at the start of the line */}
                <div className="absolute left-12 md:left-16 w-2 h-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="w-full mt-2 md:mt-4">
          <WeekGrid
            academicYear={selectedAcademicYear}
            weekNumber={selectedWeek ?? 1}
            hours={hours}
            hourHeight={HOUR_HEIGHT}
            dayStart={DAY_START}
            events={filteredEvents}
            onEventClick={(ev) => setSelectedEvent(ev)}
          />
        </div>
      )}

      <TimetableEventBlockDetails
        open={!!selectedEvent}
        event={selectedEvent ?? undefined}
        onClose={() => setSelectedEvent(null)}
      />

      <OnboardingFiltersModal
        open={showFilterModal}
        classes={classes}
        groups={groups}
        initial={groupFilter}
        onClose={() => setShowFilterModal(false)}
        onSave={(sel) => {
          setGroupFilter(sel);
          setShowFilterModal(false);
        }}
      />

      {/* Footer disclaimer */}
      <div className="mt-10 pt-4 border-t text-xs text-muted-foreground text-center">
        {t.common.disclaimerPrefix}{" "}
        <a
          href="https://www.wise-tt.com/wtt_um_feri/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-transparent hover:decoration-inherit"
        >
          WISE
        </a>{" "}
        <span>{t.common.timetable} </span>
        <a
          href="https://github.com/EdvinBec/wiser"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-transparent hover:decoration-inherit p-0 block mt-1"
        >
          💻 EdvinBec
        </a>
      </div>
    </div>
  );
}
