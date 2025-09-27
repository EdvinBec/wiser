type Props = {
  hours: number[];
  hourHeight: number;
};

export function TimeAxis({ hours, hourHeight }: Props) {
  return (
    <div className="w-16 flex flex-col">
      {hours.map((h) => (
        <div
          key={h}
          className="flex items-start"
          style={{ height: hourHeight }}
        >
          <span className="text-sm text-gray-400 tabular-nums">
            {String(h).padStart(2, "0")}:00
          </span>
        </div>
      ))}
    </div>
  );
}
