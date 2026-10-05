import type { TimetableEventType } from "./TimetableEventType";

export type TimetableEvent = {
  id: string;
  classId: number;
  className: string;

  instructorId: number;
  instructorName: string;

  groupId: number;
  groupName: string;

  roomId: number;
  roomName: string;

  type: TimetableEventType;
  startAt: Date;
  finishAt: Date;

  /**
   * Set only for events that came from Wise. `type` is the mapped value the colour palette
   * understands; `wiseType` is the school's own label, which is what a student recognises —
   * FERI writes 28 of them, "RV-NA DALJAVO" and "SE (od A do G)" among them.
   */
  wiseType?: string;
  lecturers?: string[];
  groups?: string[];
};
