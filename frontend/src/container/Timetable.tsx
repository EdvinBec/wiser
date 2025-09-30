import { useEffect, useMemo, useState } from "react";
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
import {
  fetchDayTimetable,
  fetchWeekTimetable,
  fetchClasses,
  fetchGroups,
  type ClassInfo,
  type GroupInfo,
  fetchLatestCheck,
} from "@/lib/api";
import { OnboardingFiltersModal } from "./OnboardingFiltersModal";
import { useNow } from "@/lib/useNow";
import type { TimetableEvent } from "@/types/TimetableEvent.ts";
import { ScheduleColumn } from "./ScheduleColumn.tsx";
import { TimetableEventBlockDetails } from "./TimetableEventBlockDetailModal.tsx";
import { useI18n } from "@/lib/i18n";
import { EventTypeIndicator } from "@/components/EventTypeIndicator.tsx";

const LS = {
  view: "timetableSelectedViewV2",
  day: "timetableSelectedDayV2",
  week: "timetableSelectedWeekV2",
  ay: "timetableSelectedAYV2",
} as const;

export function Timetable({
  courseId,
  headerTitle,
}: {
  courseId: number;
  headerTitle?: string;
}) {
  const [selectedView, setSelectedView] = useState<"day" | "week">(() => {
    try {
      const raw =
        localStorage.getItem(LS.view) ||
        localStorage.getItem("timetableSelectedViewV1");
      if (raw === "day" || raw === "week") return raw;
    } catch {}
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches
    ) {
      return "week"; // default for larger screens
    }
    return "day"; // default for mobile
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => {
    try {
      const raw =
        localStorage.getItem(LS.day) ||
        localStorage.getItem("timetableSelectedDayV1");
      if (raw) return new Date(raw);
    } catch {}
    return new Date();
  });
  const [selectedWeek, setSelectedWeek] = useState<number | null>(() => {
    try {
      const raw =
        localStorage.getItem(LS.week) ||
        localStorage.getItem("timetableSelectedWeekV1");
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && n > 0) return n;
    } catch {}
    return null;
  });
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [latestCheck, setLatestCheck] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(
    null
  );
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved =
        localStorage.getItem("themeV2") || localStorage.getItem("themeV1");
      if (saved === "dark") return true;
      if (saved === "light") return false;
    } catch {}
    // Default to light theme when no preference is saved
    return false;
  });
  const [groupFilter, setGroupFilter] = useState<Record<number, number[]>>(
    () => {
      try {
        const raw = localStorage.getItem("timetableGroupFilterV2");
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, unknown>;
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
    }
  );
  const [showFilterModal, setShowFilterModal] = useState(false);
  const { t, locale, setLocale } = useI18n();

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

  // helpers for academic weeks (week 1 = week containing Oct 1)
  function toMonday(d: Date) {
    const day = d.getDay();
    const diff = (day + 6) % 7; // 0 for Mon
    const m = new Date(d);
    m.setDate(d.getDate() - diff);
    m.setHours(0, 0, 0, 0);
    return m;
  }
  function academicYearForDate(d: Date) {
    // Oct (9) to Dec => same year; Jan–Sep => previous year
    return d.getMonth() >= 9 ? d.getFullYear() : d.getFullYear() - 1;
  }
  function academicWeek1Monday(ay: number) {
    const oct1 = new Date(ay, 9, 1);
    return toMonday(oct1);
  }
  function getAcademicWeekNumber(d: Date) {
    const ay = academicYearForDate(d);
    const w1 = academicWeek1Monday(ay);
    const cur = toMonday(d);
    const diffDays = Math.floor((cur.getTime() - w1.getTime()) / 86400000);
    return Math.floor(diffDays / 7) + 1;
  }
  function weeksInAcademicYear(ay: number) {
    const w1 = academicWeek1Monday(ay);
    const nextW1 = academicWeek1Monday(ay + 1);
    const diffDays = Math.floor((nextW1.getTime() - w1.getTime()) / 86400000);
    return Math.round(diffDays / 7);
  }

  // academic week/year state
  const today = new Date();
  const initialAcademicYear = academicYearForDate(selectedDay ?? today);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number>(
    () => {
      try {
        const raw =
          localStorage.getItem(LS.ay) ||
          localStorage.getItem("timetableSelectedAYV1");
        const n = raw ? Number(raw) : NaN;
        if (Number.isFinite(n)) return n;
      } catch {}
      return initialAcademicYear;
    }
  );

  useEffect(() => {
    // initialize week from selectedDay on first mount
    if (selectedWeek == null && selectedDay) {
      setSelectedAcademicYear(academicYearForDate(selectedDay));
      setSelectedWeek(getAcademicWeekNumber(selectedDay));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist view/day/week/AY to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS.view, selectedView);
    } catch {}
  }, [selectedView]);
  useEffect(() => {
    try {
      if (selectedDay) localStorage.setItem(LS.day, selectedDay.toISOString());
    } catch {}
  }, [selectedDay]);
  useEffect(() => {
    try {
      if (selectedWeek != null)
        localStorage.setItem(LS.week, String(selectedWeek));
      localStorage.setItem(LS.ay, String(selectedAcademicYear));
    } catch {}
  }, [selectedWeek, selectedAcademicYear]);

  const academicYear = useMemo(() => {
    if (selectedView === "week") return selectedAcademicYear;
    const d = selectedDay ?? new Date();
    return academicYearForDate(d);
  }, [selectedView, selectedAcademicYear, selectedDay]);

  // Load data from API whenever the selection changes
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (selectedView === "week") {
          const wk = selectedWeek ?? getAcademicWeekNumber(new Date());
          const data = await fetchWeekTimetable(
            academicYear,
            wk,
            courseId,
            controller.signal
          );
          setEvents(data);
        } else if (selectedView === "day" && selectedDay) {
          const month = selectedDay.getMonth() + 1;
          const day = selectedDay.getDate();
          // For day view, backend expects calendar year, not academic year
          const calendarYear = selectedDay.getFullYear();
          const data = await fetchDayTimetable(
            calendarYear,
            month,
            day,
            courseId,
            controller.signal
          );
          setEvents(data);
        } else {
          setEvents([]);
        }
      } catch (e: any) {
        // Ignore abort errors triggered by effect cleanup
        const isAbort =
          e?.name === "AbortError" || e?.message?.includes("aborted");
        if (!isAbort) {
          setError(e?.message ?? "Failed to load timetable");
          setEvents([]);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [selectedView, selectedDay, selectedWeek, academicYear]);

  // Load classes and groups once
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
        // If no saved filters, open the onboarding modal once data is ready
        const hasSaved = (() => {
          try {
            const raw = localStorage.getItem("timetableGroupFilterV2");
            if (!raw) return false;
            const obj = JSON.parse(raw);
            return obj && Object.keys(obj).length > 0;
          } catch {
            return false;
          }
        })();
        if (!hasSaved) setShowFilterModal(true);
      } catch (e) {
        // ignore for now; filters will just show nothing
      }
    })();
    return () => controller.abort();
  }, []);

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

  const filteredByGroup = useMemo(() => {
    if (!events.length) return events;
    return events.filter((ev) => {
      // Always include all Lectures (not affected by filters)
      if (ev.type === "Lecture") return true;
      // Always include events for groups "RIT 2" and "ITK 1"
      if (ev.groupName === "RIT 2" || ev.groupName === "ITK 1") return true;
      const selected = groupFilter[ev.classId];
      if (!selected || selected.length === 0) return true;
      const selectedSet = new Set(selected.map((v) => Number(v)));
      return selectedSet.has(Number(ev.groupId));
    });
  }, [events, groupFilter]);

  const filteredDayEvents = selectedDay
    ? filteredByGroup.filter(
        (ev) =>
          ev.startAt.getFullYear() === selectedDay.getFullYear() &&
          ev.startAt.getMonth() === selectedDay.getMonth() &&
          ev.startAt.getDate() === selectedDay.getDate()
      )
    : filteredByGroup;

  return (
    <div className="px-6 md:px-10 lg:px-16 py-6 md:py-8 max-w-7xl mx-auto overflow-x-hidden">
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

      {/* Filters */}
      <div className="mt-2 flex items-center justify-start md:justify-end gap-2">
        <span>
          {latestCheck != null && (
            <span className="text-xs text-muted-foreground">
              {t.common.latestCheckLabel}: {new Intl.DateTimeFormat(t.locale, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(new Date(latestCheck))}
            </span>
          )}
        </span>
        <button
          onClick={() => setIsDark((v) => !v)}
          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted text-sm ${
            isDark ? "text-foreground" : "text-muted-foreground"
          }`}
          aria-label="Toggle theme"
          aria-pressed={isDark}
          title={isDark ? t.common.switchToLight : t.common.switchToDark}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          <span>{isDark ? t.common.themeLight : t.common.themeDark}</span>
        </button>
        <button
          onClick={() => setLocale(locale === "sl" ? "en" : "sl")}
          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted text-sm text-muted-foreground"
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
          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted text-sm text-muted-foreground"
          aria-haspopup="dialog"
        >
          <SlidersHorizontal size={16} />
          <span>{t.common.manageFilters}</span>
        </button>
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
            const columnHeight = (hours.length - 1) * HOUR_HEIGHT;
            const rawTop = nowTopPx() + 8; // +8 to account for column mt-2
            const top = Math.min(Math.max(rawTop, 8), columnHeight + 8); // clamp within visible area
            return (
              <div
                className="pointer-events-none absolute inset-x-0 z-30"
                style={{ top }}
              >
                <div className="absolute left-16 right-0 h-0 border-t-2 border-blue-500" />
                <div className="absolute left-0 w-16 -translate-y-1/2 text-xs font-semibold text-blue-600">
                  {nowLabel()}
                </div>
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
            events={filteredByGroup}
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
