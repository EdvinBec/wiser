import type { TimetableEventType } from "@/types/TimetableEventType";

export interface EventColorTheme {
  bg: string;
  text: string;
  darkBg: string;
  darkText: string;
}

/**
 * Color theme definitions for timetable event types.
 * Notion-like warm color palette with dark mode support.
 */
export const EVENT_COLORS: Record<TimetableEventType, EventColorTheme> = {
  Lecture: {
    bg: "bg-yellow-200",
    text: "text-yellow-900",
    darkBg: "dark:bg-yellow-900/30",
    darkText: "dark:text-yellow-200",
  },
  Tutorial: {
    bg: "bg-orange-200",
    text: "text-orange-900",
    darkBg: "dark:bg-orange-900/30",
    darkText: "dark:text-orange-200",
  },
  Lab: {
    bg: "bg-sky-200",
    text: "text-sky-900",
    darkBg: "dark:bg-sky-900/30",
    darkText: "dark:text-sky-200",
  },
  LabExercise: {
    bg: "bg-sky-200",
    text: "text-sky-900",
    darkBg: "dark:bg-sky-900/30",
    darkText: "dark:text-sky-200",
  },
  Seminar: {
    bg: "bg-stone-300",
    text: "text-stone-900",
    darkBg: "dark:bg-amber-950/30",
    darkText: "dark:text-stone-200",
  },
  SeminarExercise: {
    bg: "bg-green-200",
    text: "text-green-900",
    darkBg: "dark:bg-green-900/30",
    darkText: "dark:text-green-200",
  },
  Exercise: {
    bg: "bg-fuchsia-200",
    text: "text-fuchsia-900",
    darkBg: "dark:bg-fuchsia-900/30",
    darkText: "dark:text-fuchsia-200",
  },
  Exam: {
    bg: "bg-rose-200",
    text: "text-rose-900",
    darkBg: "dark:bg-rose-900/30",
    darkText: "dark:text-rose-200",
  },
  Consultation: {
    bg: "bg-cyan-200",
    text: "text-cyan-900",
    darkBg: "dark:bg-cyan-900/30",
    darkText: "dark:text-cyan-200",
  },
  ComputerExercise: {
    bg: "bg-pink-200",
    text: "text-pink-900",
    darkBg: "dark:bg-pink-900/30",
    darkText: "dark:text-pink-200",
  },
};

/**
 * Default fallback colors for unknown event types
 */
export const DEFAULT_EVENT_COLORS: EventColorTheme = {
  bg: "bg-neutral-200",
  text: "text-neutral-900",
  darkBg: "dark:bg-neutral-800/60",
  darkText: "dark:text-neutral-100",
};

/**
 * Get color theme for a given event type with fallback to default
 */
export function getEventColors(type: string): EventColorTheme {
  return EVENT_COLORS[type as TimetableEventType] ?? DEFAULT_EVENT_COLORS;
}
