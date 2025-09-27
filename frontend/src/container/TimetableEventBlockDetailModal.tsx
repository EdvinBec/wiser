import { Modal } from "@/components/Modal";
import { ljTimeFmt } from "@/Helpers/DateHelpers";
import type { TimetableEvent } from "@/types/TimetableEvent";
import { Clock, GraduationCap, MapPin, Users, Tags } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type TimetableEventBlockDetailsProps = {
  open: boolean;
  event?: TimetableEvent;
  onClose: () => void;
};

export function TimetableEventBlockDetails({
  open,
  event,
  onClose,
}: TimetableEventBlockDetailsProps) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} showHeader={false}>
      {!event ? (
        <div className="text-sm text-muted-foreground">{t.common.noEventSelected}</div>
      ) : (
        <div className="space-y-6 px-4 sm:px-6 py-4">
          {/* Large title like previous design */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight break-words">
            {event.className}
          </h1>

          {/* Meta list with original properties */}
          <div className="space-y-3">
            {/* Type */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:h-9 gap-1 sm:gap-0">
              <div className="flex items-center gap-2 text-muted-foreground sm:w-36 w-full">
                <Tags size={16} />
                <span className="text-sm text-muted-foreground">{t.details.type}</span>
              </div>
              <div className="sm:ml-2 min-w-0">
                <span className="inline-flex items-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2 py-0.5 font-medium">
                  {t.types[event.type]}
                </span>
              </div>
            </div>

            {/* Time */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:h-9 gap-1 sm:gap-0">
              <div className="flex items-center gap-2 text-muted-foreground sm:w-36 w-full">
                <Clock size={16} />
                <span className="text-sm text-muted-foreground">{t.details.time}</span>
              </div>
              <div className="sm:ml-2 text-foreground font-medium min-w-0 truncate">
                {ljTimeFmt.format(event.startAt)}–
                {ljTimeFmt.format(event.finishAt)}
              </div>
            </div>

            {/* Instructor */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:h-9 gap-1 sm:gap-0">
              <div className="flex items-center gap-2 text-muted-foreground sm:w-36 w-full">
                <GraduationCap size={16} />
                <span className="text-sm text-muted-foreground">{t.details.instructor}</span>
              </div>
              <div className="sm:ml-2 text-foreground min-w-0 truncate" title={event.instructorName || undefined}>
                {event.instructorName || "N/A"}
              </div>
            </div>

            {/* Room */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:h-9 gap-1 sm:gap-0">
              <div className="flex items-center gap-2 text-muted-foreground sm:w-36 w-full">
                <MapPin size={16} />
                <span className="text-sm text-muted-foreground">{t.details.room}</span>
              </div>
              <div className="sm:ml-2 min-w-0">
                <span className="inline-flex items-center rounded-md bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 text-xs px-2 py-0.5 font-medium">
                  {event.roomName || "N/A"}
                </span>
              </div>
            </div>

            {/* Group */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:h-9 gap-1 sm:gap-0">
              <div className="flex items-center gap-2 text-muted-foreground sm:w-36 w-full">
                <Users size={16} />
                <span className="text-sm text-muted-foreground">{t.details.group}</span>
              </div>
              <div className="sm:ml-2 text-foreground min-w-0 truncate" title={event.groupName || undefined}>
                {event.groupName || "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
