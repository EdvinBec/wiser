import { useMemo, useState } from "react";
import type { TimetableEvent } from "./ScheduleColumn";
import type { ClassInfo, GroupInfo } from "@/lib/api";

type Props = {
  events: TimetableEvent[];
  classes: ClassInfo[];
  groups: GroupInfo[];
  selected: Record<number, number[]>; // classId -> groupIds
  onChange: (next: Record<number, number[]>) => void;
};

export function Filters({ events, classes, groups, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const groupsByClassFromEvents = useMemo(() => {
    const map = new Map<number, { className: string; groups: { id: number; name: string }[] }>();
    const classNameById = new Map<number, string>();
    classes.forEach((c) => classNameById.set(c.id, c.name));
    const groupNameById = new Map<number, string>();
    groups.forEach((g) => groupNameById.set(g.id, g.name));

    const tmp = new Map<number, Map<number, string>>();
    for (const ev of events) {
      if (!tmp.has(ev.classId)) tmp.set(ev.classId, new Map());
      const inner = tmp.get(ev.classId)!;
      inner.set(ev.groupId, groupNameById.get(ev.groupId) ?? ev.groupName);
    }
    for (const [classId, groupMap] of tmp) {
      map.set(classId, {
        className: classNameById.get(classId) ?? events.find((e) => e.classId === classId)?.className ?? String(classId),
        groups: Array.from(groupMap.entries()).map(([id, name]) => ({ id, name })),
      });
    }
    return map;
  }, [events, classes, groups]);

  const toggleGroup = (classId: number, groupId: number) => {
    const current = selected[classId] ?? [];
    const nextSet = new Set(current);
    if (nextSet.has(groupId)) nextSet.delete(groupId);
    else nextSet.add(groupId);
    onChange({ ...selected, [classId]: Array.from(nextSet) });
  };

  const selectAllForClass = (classId: number, ids: number[]) => {
    onChange({ ...selected, [classId]: [...ids] });
  };

  const clearForClass = (classId: number) => {
    const copy = { ...selected };
    delete copy[classId];
    onChange(copy);
  };

  const clearAll = () => onChange({});

  return (
    <div className="w-full">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
        >
          {open ? "Hide Filters" : "Filters"}
        </button>
      </div>
      {open && (
        <div className="mt-3 border rounded-md p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Filter by class and group</h4>
            <button onClick={clearAll} className="text-xs text-blue-600 hover:underline">
              Clear all
            </button>
          </div>

          {Array.from(groupsByClassFromEvents.entries()).map(([classId, info]) => {
            const ids = info.groups.map((g) => g.id);
            const sel = new Set(selected[classId] ?? []);
            return (
              <div key={classId} className="py-2 border-t first:border-t-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{info.className}</div>
                  <div className="flex items-center gap-3">
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => selectAllForClass(classId, ids)}
                    >
                      Select all
                    </button>
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => clearForClass(classId)}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {info.groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={sel.has(g.id)}
                        onChange={() => toggleGroup(classId, g.id)}
                      />
                      <span>{g.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {groupsByClassFromEvents.size === 0 && (
            <div className="text-sm text-gray-500">No classes to filter for the current view.</div>
          )}
        </div>
      )}
    </div>
  );
}

