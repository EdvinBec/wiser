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

// Prefer displaying exactly the hour stored in DB for Europe/Ljubljana.
// Heuristic: if the timestamp has a real non-zero offset (e.g. +02:00), honor it.
// If it has Z/+00:00 (common mislabeling when DB stores local wall time), ignore
// the offset and interpret as Europe/Ljubljana wall time.
function parseLjubljanaLocalISO(raw: string): Date {
  // If there is a timezone designator and it's a non-zero offset, trust it
  const tzMatch = raw.match(/(Z|[+\-]\d{2}:?\d{2})$/i);
  if (tzMatch) {
    const tz = tzMatch[1].toUpperCase();
    const isZeroOffset =
      tz === "Z" || tz === "+00:00" || tz === "+0000" || tz === "-00:00" || tz === "-0000";
    if (!isZeroOffset) return new Date(raw);
  }

  // Extract Y-M-D H:m[:s] ignoring fractional seconds and any (possibly zero) TZ suffix
  const m = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+\-]\d{2}:?\d{2})?$/i
  );
  if (!m) return new Date(raw);

  const Y = Number(m[1]);
  const Mo = Number(m[2]);
  const D = Number(m[3]);
  const H = Number(m[4]);
  const Mi = Number(m[5]);
  const S = Number(m[6] ?? 0);

  // Start from the same wall time as if it were UTC
  const utcMs = Date.UTC(Y, Mo - 1, D, H, Mi, S);
  const probe = new Date(utcMs);

  // Derive GMT offset for Europe/Ljubljana at that moment, e.g. "GMT+2"
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Ljubljana",
    timeZoneName: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(probe);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const mOff = tzName.match(/GMT([+\-])(\d{1,2})(?::?(\d{2}))?/);
  let offsetMinutes = 0;
  if (mOff) {
    const sign = mOff[1] === "-" ? -1 : 1;
    const hh = Number(mOff[2] ?? 0);
    const mm = Number(mOff[3] ?? 0);
    offsetMinutes = sign * (hh * 60 + mm);
  }

  // Adjust the UTC timestamp backwards by the Ljubljana offset so that when
  // formatted in Europe/Ljubljana it shows the original wall time.
  return new Date(utcMs - offsetMinutes * 60_000);
}

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
    startAt: parseLjubljanaLocalISO(e.startAt),
    finishAt: parseLjubljanaLocalISO(e.finishAt),
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
  courseCode: number,
  signal?: AbortSignal
): Promise<TimetableEvent[]> {
  const url = `${API_BASE}/day/${academicYear}/${month}/${day}/${courseCode}`;
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
