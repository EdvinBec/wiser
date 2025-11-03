export const SESSION_TYPES = [
  "lecture",
  "compExercise",
  "labExcercise",
  "seminarExcercise",
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  lecture: "Predavanje",
  compExercise: "Računalniške vaje",
  labExcercise: "Laboratorijske vaje",
  seminarExcercise: "Seminarske vaje",
};

export const SESSION_TYPE_COLORS: Record<
  SessionType,
  { bg: string; text: string }
> = {
  lecture: { bg: "bg-lecture", text: "bg-lecture-text" },
  compExercise: { bg: "bg-compExercise", text: "bg-compExercise-text" },
  labExcercise: { bg: "bg-labExcercise", text: "bg-labExcercise-text" },
  seminarExcercise: {
    bg: "bg-seminarExcercise",
    text: "bg-seminarExcercise-text",
  },
};
export const DEFAULT_SESSION_COLOR = { bg: "bg-gray-200", text: "bg-gray-800" };
