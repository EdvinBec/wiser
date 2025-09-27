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
};
