import type { TimetableEvent } from "./TimetableEvent";

export type LaidOut = TimetableEvent & {
  __top: number;
  __bottom: number;
  __height: number;
  __colIndex: number;
  __colCount: number;
};
