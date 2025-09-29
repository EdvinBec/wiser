import { ljTimeFmt } from "@/Helpers/DateHelpers";
import type { LaidOut } from "@/types/LaidOut";
import { Clock, GraduationCap, MapPin, UsersRound, Tags } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type TimetableEventBlockProps = {
  ev: LaidOut;
  leftPct: number;
  widthPct: number;
  onClick?: (ev: LaidOut) => void;
};

export function TimetableEventBlock({
  ev,
  leftPct,
  widthPct,
  onClick,
}: TimetableEventBlockProps) {
  const { t } = useI18n();
  const byType: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
    // Warmer Notion-like defaults per session type
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
      bg: "bg-neutral-200",
      text: "text-neutral-900",
      darkBg: "dark:bg-neutral-800/60",
      darkText: "dark:text-neutral-100",
    },
    ComputerExercise: {
      bg: "bg-pink-200",
      text: "text-pink-900",
      darkBg: "dark:bg-pink-900/30",
      darkText: "dark:text-pink-200",
    },
  };
  const c = byType[String(ev.type)] ?? {
    bg: "bg-neutral-200",
    text: "text-neutral-900",
    darkBg: "dark:bg-neutral-800/60",
    darkText: "dark:text-neutral-100",
  };
  return (
    <div
      key={ev.id}
      className="absolute rounded-md p-1 font-inter cursor-pointer"
      style={{
        top: ev.__top,
        height: ev.__height,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
      }}
      title={`${ljTimeFmt.format(ev.startAt)}–${ljTimeFmt.format(ev.finishAt)}`}
      onClick={() => onClick?.(ev)}
    >
      <div
        className={`w-full h-full p-2 space-y-1 rounded-sm hover:brightness-95 transition-all overflow-hidden ${c.bg} ${c.text} ${c.darkBg} ${c.darkText}`}
      >
        <h2 className="text-sm font-bold line-clamp-2">
          {ev.className}
        </h2>
        <div className="flex items-center gap-1 text-xs font-medium truncate">
          <Tags size={16} strokeWidth={1.5} />
          <p className="truncate">{t.types[ev.type]}</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-light truncate">
          <Clock size={16} strokeWidth={1.5} />
          <p>
            {ljTimeFmt.format(ev.startAt)}–{ljTimeFmt.format(ev.finishAt)}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs font-light truncate">
          <GraduationCap size={16} strokeWidth={1.5} />
          <p>{ev.instructorName}</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-light truncate">
          <MapPin size={16} strokeWidth={1.5} />
          <p>{ev.roomName}</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-light truncate">
          <UsersRound size={16} strokeWidth={1.5} />
          <p>{ev.groupName}</p>
        </div>
      </div>
    </div>
  );
}
