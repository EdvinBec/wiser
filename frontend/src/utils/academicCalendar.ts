/**
 * Academic calendar utilities for FERI university.
 * Academic year starts in October (week 1 = week containing October 1).
 */

/**
 * Get the Monday of the week containing the given date.
 * Sets time to midnight (00:00:00.000).
 */
export function toMonday(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7; // 0 for Mon, 6 for Sun
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

/**
 * Determine the academic year for a given date.
 * Academic year runs from October to September.
 * @returns The starting calendar year (e.g., 2025 for AY 2025/26)
 */
export function academicYearForDate(d: Date): number {
  // Oct (month 9) to Dec => same year; Jan–Sep => previous year
  return d.getMonth() >= 9 ? d.getFullYear() : d.getFullYear() - 1;
}

/**
 * Get the Monday of week 1 for a given academic year.
 * Week 1 is defined as the week containing October 1.
 */
export function academicWeek1Monday(academicYear: number): Date {
  const oct1 = new Date(academicYear, 9, 1); // October 1
  return toMonday(oct1);
}

/**
 * Get the starting Monday for a specific academic week.
 * @param academicYear - Starting year of academic year (e.g., 2025 for AY 2025/26)
 * @param weekNumber - Week number (1-based)
 */
export function academicWeekStart(
  academicYear: number,
  weekNumber: number
): Date {
  const week1 = academicWeek1Monday(academicYear);
  const d = new Date(week1);
  d.setDate(week1.getDate() + (weekNumber - 1) * 7);
  return d;
}

/**
 * Calculate the academic week number for a given date.
 * @returns Week number (1-based)
 */
export function getAcademicWeekNumber(d: Date): number {
  const ay = academicYearForDate(d);
  const week1 = academicWeek1Monday(ay);
  const currentMonday = toMonday(d);
  const diffDays = Math.floor(
    (currentMonday.getTime() - week1.getTime()) / 86400000
  );
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Calculate the total number of weeks in an academic year.
 * This is the number of weeks from week 1 Monday of this year
 * to week 1 Monday of next year.
 */
export function weeksInAcademicYear(academicYear: number): number {
  const week1 = academicWeek1Monday(academicYear);
  const nextWeek1 = academicWeek1Monday(academicYear + 1);
  const diffDays = Math.floor(
    (nextWeek1.getTime() - week1.getTime()) / 86400000
  );
  return Math.round(diffDays / 7);
}

/**
 * Check if two dates are the same calendar day (ignoring time).
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
