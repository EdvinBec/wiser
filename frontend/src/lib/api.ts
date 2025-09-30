import type { TimetableEvent } from "@/types/TimetableEvent";
import type { TimetableEventType } from "@/types/TimetableEventType";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const COURSE_CODE = 4; // fixed per requirements

type ApiEvent = {
  id: number;
  classId: number;
  className: string;
  instructorId: number;
  instructorName: string;
  roomId: number;
  roomName: string;
  type: TimetableEventType | string;
  groupId: number;
  groupName: string;
  startAt: string; // ISO
  finishAt: string; // ISO
};

function mapApiEvent(e: ApiEvent): TimetableEvent {
  return {
    id: String(e.id),
    classId: Number(e.classId),
    className: e.className,
    instructorId: Number(e.instructorId),
    instructorName: e.instructorName,
    roomId: Number(e.roomId),
    roomName: e.roomName,
    type: (e.type as TimetableEventType) ?? "Lecture",
    groupId: Number(e.groupId),
    groupName: e.groupName,
    startAt: new Date(e.startAt),
    finishAt: new Date(e.finishAt),
  };
}

export async function fetchWeekTimetable(
  academicYear: number,
  weekNumber: number,
  courseCode: number,
  signal?: AbortSignal
): Promise<TimetableEvent[]> {
  const url = `${API_BASE}/${academicYear}/${weekNumber}/${courseCode}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed week fetch: ${res.status}`);
  const data: ApiEvent[] = await res.json();
  return data.map(mapApiEvent);
}

export async function fetchDayTimetable(
  academicYear: number,
  month: number, // 1-12
  day: number, // 1-31
  signal?: AbortSignal
): Promise<TimetableEvent[]> {
  const url = `${API_BASE}/day/${academicYear}/${month}/${day}/${COURSE_CODE}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed day fetch: ${res.status}`);
  const data: ApiEvent[] = await res.json();
  return data.map(mapApiEvent);
}

export type ClassInfo = { id: number; name: string };
export type GroupInfo = { id: number; name: string };

export async function fetchClasses(
  courseId: number,
  signal?: AbortSignal
): Promise<ClassInfo[]> {
  const res = await fetch(`${API_BASE}/classes/${courseId}`, { signal });
  if (!res.ok) throw new Error(`Failed classes fetch: ${res.status}`);
  return res.json();
}

export async function fetchGroups(
  courseId: number,
  signal?: AbortSignal
): Promise<GroupInfo[]> {
  const res = await fetch(`${API_BASE}/groups/${courseId}`, { signal });
  if (!res.ok) throw new Error(`Failed groups fetch: ${res.status}`);
  return res.json();
}

export async function fetchLatestCheck(
  courseId: number,
  signal?: AbortSignal
): Promise<number | null> {
  const res = await fetch(`${API_BASE}/latestCheck/${courseId}`, { signal });
  if (!res.ok) throw new Error(`Failed latest check fetch: ${res.status}`);
  const data: any = await res.json();
  // Support both ASP.NET default camelCase and explicit PascalCase keys
  const raw = data?.latestCheck ?? data?.LatestCheck;
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}
