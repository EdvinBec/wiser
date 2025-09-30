import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import type { ClassInfo, GroupInfo } from "@/lib/api";
import { ChevronDown, ChevronRight, Search, Check, Eraser } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  classes: ClassInfo[];
  groups: GroupInfo[];
  initial: Record<number, number[]>;
  onSave: (sel: Record<number, number[]>) => void;
  onClose: () => void;
};

export function OnboardingFiltersModal({
  open,
  classes,
  groups,
  initial,
  onSave,
  onClose,
}: Props) {
  const [sel, setSel] = useState<Record<number, number[]>>(initial);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const { t } = useI18n();

  useEffect(() => {
    if (open) {
      setSel(initial);
      setQuery("");
      const first = new Set<number>();
      for (let i = 0; i < Math.min(3, classes.length); i++)
        first.add(classes[i].id);
      setExpanded(first);
    }
  }, [open, initial, classes]);

  const groupOptions = useMemo(
    () =>
      groups
        .filter((g) => {
          const n = (g.name ?? "").trim();
          return n !== "" && n !== "RIT 2" && n !== "ITK 1";
        })
        .map((g) => ({ id: g.id, name: g.name })),
    [groups]
  );

  const toggle = (classId: number, groupId: number) => {
    const current = new Set(sel[classId] ?? []);
    if (current.has(groupId)) current.delete(groupId);
    else current.add(groupId);
    setSel({ ...sel, [classId]: Array.from(current) });
  };

  const selectAllFor = (classId: number) => {
    setSel({ ...sel, [classId]: groupOptions.map((g) => g.id) });
  };

  const clearFor = (classId: number) => {
    const copy = { ...sel };
    delete copy[classId];
    setSel(copy);
  };

  const clearAll = () => setSel({});

  const filteredClasses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => c.name.toLowerCase().includes(q));
  }, [classes, query]);

  const isExpanded = (id: number) => expanded.has(id);
  const toggleExpanded = (id: number) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  return (
    <Modal
      open={open}
      title={t.common.manageFiltersTitle}
      onClose={onClose}
      footer={
        <>
          <button
            className="px-3 py-2 text-sm border rounded-md"
            onClick={onClose}
          >
            {t.common.cancel}
          </button>
          <button
            className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white"
            onClick={() => onSave(sel)}
          >
            {t.common.save}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            {t.common.pickGroupsHelper}
          </p>
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={clearAll}
          >
            {t.common.clearAll}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.common.searchSubjectsPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-card placeholder:text-muted-foreground/70"
          />
        </div>

        {/* Class list */}
        <div className="space-y-3">
          {filteredClasses.map((c) => {
            const selected = new Set(sel[c.id] ?? []);
            const count = selected.size;
            const all = count === groupOptions.length && count > 0;
            return (
              <div key={c.id} className="border rounded-md p-3 bg-card">
                <button
                  className="w-full flex items-center justify-between text-left min-w-0"
                  onClick={() => toggleExpanded(c.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isExpanded(c.id) ? (
                      <ChevronDown
                        size={16}
                        className="text-muted-foreground"
                      />
                    ) : (
                      <ChevronRight
                        size={16}
                        className="text-muted-foreground"
                      />
                    )}
                    <span className="text-sm font-medium truncate">
                      {c.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {count > 0 && (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${
                          all
                            ? "bg-blue-600/20 text-blue-300"
                            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-200"
                        }`}
                      >
                        {all ? "Vse skupine" : `${count} izbranih`}
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded(c.id) && (
                  <div className="mt-3 border-t pt-3">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="text-xs text-muted-foreground min-w-0 truncate">
                        {t.common.pickGroupsHelper}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-transparent hover:border-border hover:bg-muted text-muted-foreground"
                          onClick={() => selectAllFor(c.id)}
                        >
                          <Check size={14} /> {t.common.selectAll}
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-transparent hover:border-border hover:bg-muted text-muted-foreground"
                          onClick={() => clearFor(c.id)}
                        >
                          <Eraser size={14} /> {t.common.clear}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {groupOptions.map((g) => {
                        const selectedThis = selected.has(g.id);
                        return (
                          <button
                            type="button"
                            key={g.id}
                            onClick={() => toggle(c.id, g.id)}
                            aria-pressed={selectedThis}
                            className={`inline-flex items-center justify-center px-2.5 py-1.5 text-sm rounded-md border transition-colors w-full truncate ${
                              selectedThis
                                ? "bg-blue-600/15 border-blue-600/30 text-blue-300"
                                : "bg-transparent border-border/60 hover:bg-muted"
                            }`}
                          >
                            <span className="truncate">{g.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredClasses.length === 0 && (
            <div className="text-sm text-muted-foreground">
              {t.common.noSubjectsMatch}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
