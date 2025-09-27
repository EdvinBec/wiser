export const getDayOfWeekFromIndex = (index: number): string => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[index] || "";
};

export const changeDay = (currentDay: number, change: number): number => {
  let newDay = currentDay + change;
  if (newDay < 0) newDay = 6;
  if (newDay > 6) newDay = 0;
  return newDay;
};

export const ljTimeFmt = new Intl.DateTimeFormat("sl-SI", {
  timeZone: "Europe/Ljubljana",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const getLjHM = (d: Date): { h: number; m: number } => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Ljubljana",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { h, m };
};

export const toPxFromDate = (d: Date, dayStart: number, hourHeight: number) => {
  const { h, m } = getLjHM(d);
  const minutesFromStart = (h - dayStart) * 60 + m; // can be negative
  return (minutesFromStart / 60) * hourHeight;
};
