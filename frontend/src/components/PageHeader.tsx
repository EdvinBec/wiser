import { EventTypeIndicator } from "./EventTypeIndicator";

const PageHeader = ({ headerTitle }: { headerTitle?: string }) => {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-end gap-2">
        <a href="/" className="block" aria-label="wiseR home">
          <span className="text-xl font-semibold tracking-tight">
            urnik.live
          </span>
        </a>
        <span className="text-xs text-muted-foreground text-wrap break-words mb-1">
          {headerTitle}
        </span>
      </div>
      <div className="flex gap-2 items-center flex-wrap justify-start md:justify-end">
        <EventTypeIndicator type="Lecture" />
        <EventTypeIndicator type="ComputerExercise" />
        <EventTypeIndicator type="LabExercise" />
        <EventTypeIndicator type="SeminarExercise" />
      </div>
    </div>
  );
};

export default PageHeader;
