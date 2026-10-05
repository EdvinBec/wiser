import {useCallback, useEffect, useMemo, useState} from 'react';
import {Modal} from '@/components/Modal';
import {
  applyChoice,
  autoPicks,
  fetchBranches,
  fetchProgrammes,
  fetchSubjectShape,
  fetchSubjects,
  fetchYears,
  groupChoices,
  missingPicks,
  shortenGroupLabels,
  type WiseBranch,
  type WiseChoice,
  type WiseProgramme,
  type WiseSelection,
  type WiseSubject,
  type WiseSubjectShape,
} from '@/lib/wiseApi';
import {ArrowLeft, Check, Loader2, Plus, Search, Trash2} from 'lucide-react';

type Props = {
  open: boolean;
  selections: WiseSelection[];
  onAdd: (selection: WiseSelection) => void;
  onRemove: (subjectId: number) => void;
  onUpdatePicks: (subjectId: number, picks: Record<string, string>) => void;
  onClose: () => void;
};

type Step = 'list' | 'subject' | 'groups';

const btn = 'inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition-colors';
const btnGhost = `${btn} border border-border/60 hover:bg-muted`;
const btnPrimary = `${btn} bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50`;

export function ScheduleBuilderModal({
  open,
  selections,
  onAdd,
  onRemove,
  onUpdatePicks,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('list');

  const [programmes, setProgrammes] = useState<WiseProgramme[]>([]);
  const [prog, setProg] = useState<number | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [branches, setBranches] = useState<WiseBranch[]>([]);
  const [branch, setBranch] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<WiseSubject[]>([]);
  const [query, setQuery] = useState('');

  const [shape, setShape] = useState<WiseSubjectShape | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(selections.length === 0 ? 'subject' : 'list');
    setError(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Programmes are the entry point and never change mid-session.
  useEffect(() => {
    if (!open || programmes.length > 0) return;
    const c = new AbortController();
    setBusy(true);
    fetchProgrammes(c.signal)
      .then(setProgrammes)
      .catch((e) => !c.signal.aborted && setError(describe(e)))
      .finally(() => !c.signal.aborted && setBusy(false));
    return () => c.abort();
  }, [open, programmes.length]);

  const pickProgramme = useCallback(async (id: number) => {
    setProg(id);
    setYear(null);
    setBranch(null);
    setBranches([]);
    setSubjects([]);
    setError(null);
    setBusy(true);
    try {
      setYears(await fetchYears(id));
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const pickYear = useCallback(
    async (y: number) => {
      if (prog == null) return;
      setYear(y);
      setBranch(null);
      setSubjects([]);
      setError(null);
      setBusy(true);
      try {
        const bs = await fetchBranches(prog, y);
        setBranches(bs);
        // A programme year with a single branch is not a choice — skip the step.
        const only = bs.length === 1 ? branchIdOf(bs[0]) : null;
        setBranch(only);
        setSubjects(await fetchSubjects(prog, y, only));
      } catch (e) {
        setError(describe(e));
      } finally {
        setBusy(false);
      }
    },
    [prog],
  );

  const pickBranch = useCallback(
    async (id: number | null) => {
      if (prog == null || year == null) return;
      setBranch(id);
      setError(null);
      setBusy(true);
      try {
        setSubjects(await fetchSubjects(prog, year, id));
      } catch (e) {
        setError(describe(e));
      } finally {
        setBusy(false);
      }
    },
    [prog, year],
  );

  const openSubject = useCallback(
    async (subject: WiseSubject, existing?: WiseSelection) => {
      setError(null);
      setBusy(true);
      setEditing(Boolean(existing));
      try {
        const s = await fetchSubjectShape(subject.id);
        setShape(s);
        setPicks(existing ? {...existing.picks} : autoPicks(s));
        setStep('groups');
      } catch (e) {
        setError(describe(e));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const needed = useMemo(
    () => (shape ? missingPicks(shape, picks) : []),
    [shape, picks],
  );

  // One question per distinct group set, so RV and RV-NA DALJAVO are asked once, not twice.
  const choices: WiseChoice[] = useMemo(
    () => (shape ? groupChoices(shape) : []),
    [shape],
  );

  const save = useCallback(() => {
    if (!shape || needed.length > 0) return;
    const subject = subjects.find((s) => s.id === shape.subjectId);
    const previous = selections.find((s) => s.subjectId === shape.subjectId);

    if (editing && previous) onUpdatePicks(shape.subjectId, picks);
    else
      onAdd({
        subjectId: shape.subjectId,
        name: shape.name || subject?.name || previous?.name || '',
        code: subject?.code ?? previous?.code ?? null,
        picks,
      });

    setShape(null);
    setStep('list');
  }, [shape, needed, picks, subjects, selections, editing, onAdd, onUpdatePicks]);

  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code ?? '').toLowerCase().includes(q),
    );
  }, [subjects, query]);

  const chosen = new Set(selections.map((s) => s.subjectId));

  return (
    <Modal
      open={open}
      title='Moj urnik'
      onClose={onClose}
      footer={
        step === 'groups' ? (
          <>
            <button className={btnGhost} onClick={() => setStep(editing ? 'list' : 'subject')}>
              <ArrowLeft size={15} /> Nazaj
            </button>
            <button className={btnPrimary} onClick={save} disabled={needed.length > 0}>
              <Check size={15} /> {editing ? 'Shrani' : 'Dodaj na urnik'}
            </button>
          </>
        ) : (
          <button className={btnGhost} onClick={onClose}>
            Zapri
          </button>
        )
      }>
      {error && (
        <div className='mb-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300'>
          {error}
        </div>
      )}

      {/* ── My subjects ─────────────────────────────────────────────── */}
      {step === 'list' && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between gap-2 flex-wrap'>
            <p className='text-sm text-muted-foreground'>
              Predmeti na tvojem urniku. Predavanja so skupna, skupino izbereš le tam, kjer se
              izvedba deli.
            </p>
            <button className={btnPrimary} onClick={() => setStep('subject')}>
              <Plus size={15} /> Dodaj predmet
            </button>
          </div>

          {selections.length === 0 && (
            <p className='text-sm text-muted-foreground'>Urnik je še prazen.</p>
          )}

          <ul className='space-y-2'>
            {selections.map((s) => (
              <li key={s.subjectId} className='rounded-md border bg-card p-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='text-sm font-medium'>{s.name}</p>
                    {s.code && (
                      <p className='text-xs text-muted-foreground font-mono'>{s.code}</p>
                    )}
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                      {summarisePicks(s.picks).map(({types, group}) => (
                        <span
                          key={types}
                          className='inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs bg-muted text-muted-foreground'>
                          <b className='font-mono font-medium'>{types}</b>
                          <span className='truncate max-w-[16rem]'>{group}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className='flex shrink-0 items-center gap-1'>
                    <button
                      className='px-2 py-1 text-xs rounded-md border border-transparent hover:border-border hover:bg-muted text-muted-foreground'
                      onClick={() => openSubject({id: s.subjectId, name: s.name, code: s.code}, s)}>
                      Skupine
                    </button>
                    <button
                      className='p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-rose-500'
                      aria-label={`Odstrani ${s.name}`}
                      onClick={() => onRemove(s.subjectId)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Programme → year → branch → subject ─────────────────────── */}
      {step === 'subject' && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-sm text-muted-foreground'>
              Izberi smer in predmet. Predmete lahko jemlješ iz različnih smeri in letnikov.
            </p>
            {selections.length > 0 && (
              <button className={btnGhost} onClick={() => setStep('list')}>
                <ArrowLeft size={15} /> Moj urnik
              </button>
            )}
          </div>

          <Row label='Program'>
            <select
              className='w-full rounded-md border bg-card px-2 py-2 text-sm'
              value={prog ?? ''}
              onChange={(e) => pickProgramme(Number(e.target.value))}>
              <option value=''>Izberi program…</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.code ? ` (${p.code})` : ''}
                </option>
              ))}
            </select>
          </Row>

          {years.length > 0 && (
            <Row label='Letnik'>
              <div className='flex flex-wrap gap-2'>
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => pickYear(y)}
                    aria-pressed={year === y}
                    className={`${btn} ${
                      year === y
                        ? 'bg-blue-600/15 border border-blue-600/40 text-blue-700 dark:text-blue-300'
                        : 'border border-border/60 hover:bg-muted'
                    }`}>
                    {y}.
                  </button>
                ))}
              </div>
            </Row>
          )}

          {branches.length > 1 && (
            <Row label='Smer'>
              <div className='flex flex-wrap gap-2'>
                {branches.map((b) => {
                  const id = branchIdOf(b);
                  return (
                    <button
                      key={b.key}
                      onClick={() => pickBranch(id)}
                      aria-pressed={branch === id}
                      className={`${btn} ${
                        branch === id
                          ? 'bg-blue-600/15 border border-blue-600/40 text-blue-700 dark:text-blue-300'
                          : 'border border-border/60 hover:bg-muted'
                      }`}>
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </Row>
          )}

          {busy && (
            <p className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Loader2 size={15} className='animate-spin' /> Nalagam…
            </p>
          )}

          {subjects.length > 0 && (
            <Row label='Predmet'>
              <div className='relative mb-2'>
                <Search
                  size={15}
                  className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='Išči predmete…'
                  className='w-full rounded-md border bg-card py-2 pl-9 pr-3 text-sm'
                />
              </div>
              <ul className='space-y-1'>
                {filteredSubjects.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => openSubject(s)}
                      className='flex w-full items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-left text-sm hover:border-border hover:bg-muted'>
                      <span className='min-w-0'>
                        <span className='block truncate'>{s.name}</span>
                        {s.code && (
                          <span className='block font-mono text-xs text-muted-foreground'>
                            {s.code}
                          </span>
                        )}
                      </span>
                      {chosen.has(s.id) ? (
                        <span className='shrink-0 text-xs text-muted-foreground'>na urniku</span>
                      ) : (
                        <Plus size={15} className='shrink-0 text-muted-foreground' />
                      )}
                    </button>
                  </li>
                ))}
                {filteredSubjects.length === 0 && (
                  <li className='text-sm text-muted-foreground'>
                    Noben predmet ne ustreza iskanju.
                  </li>
                )}
              </ul>
            </Row>
          )}
        </div>
      )}

      {/* ── Per-type group choice ───────────────────────────────────── */}
      {step === 'groups' && shape && (
        <div className='space-y-4'>
          <div>
            <p className='text-sm font-medium'>{shape.name}</p>
            <p className='text-sm text-muted-foreground'>
              Pri izvedbah, ki se delijo na skupine, izberi svojo. Ostale se dodajo same.
            </p>
          </div>

          {choices.map((choice) => {
            const label = choice.executionTypes.join(' · ');
            const current = picks[choice.executionTypes[0]];
            const shortOptions = shortenGroupLabels(choice.options.map((o) => o.label));
            return (
              <div key={label} className='rounded-md border bg-card p-3'>
                <div className='mb-2 flex items-center justify-between gap-2'>
                  <span className='font-mono text-sm font-medium'>{label}</span>
                  <span className='text-xs text-muted-foreground'>
                    {choice.needsChoice
                      ? `${choice.options.length} skupin — izberi eno`
                      : 'skupno, brez izbire'}
                  </span>
                </div>

                {choice.needsChoice ? (
                  <div className='grid gap-2 sm:grid-cols-2'>
                    {choice.options.map((o, i) => {
                      const active = current === o.key;
                      return (
                        <button
                          key={o.key}
                          onClick={() => setPicks((p) => applyChoice(p, choice, o.key))}
                          aria-pressed={active}
                          className={`${btn} w-full justify-between ${
                            active
                              ? 'bg-blue-600/15 border border-blue-600/40 text-blue-700 dark:text-blue-300'
                              : 'border border-border/60 hover:bg-muted'
                          }`}>
                          <span className='truncate text-left'>{shortOptions[i]}</span>
                          <span className='shrink-0 text-xs text-muted-foreground'>
                            {o.occurrences}×
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    {choice.options[0]?.label ?? '—'}
                  </p>
                )}
              </div>
            );
          })}

          {needed.length > 0 && (
            <p className='text-sm text-amber-700 dark:text-amber-300'>
              Izberi še skupino za: {needed.join(', ')}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

/**
 * Collapses the saved picks back into one chip per group, so a subject whose RV and
 * RV-NA DALJAVO both point at "1. sk" reads as one line rather than two identical ones.
 */
function summarisePicks(picks: Record<string, string>): Array<{types: string; group: string}> {
  const byGroup = new Map<string, string[]>();
  for (const [type, group] of Object.entries(picks)) {
    const list = byGroup.get(group);
    if (list) list.push(type);
    else byGroup.set(group, [type]);
  }
  return [...byGroup.entries()].map(([group, types]) => ({
    types: types.join(' · '),
    group,
  }));
}

/** Upstream failures surface as a status code; say something a student can act on. */
function describe(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  return /\b(5\d\d|failed to fetch|networkerror)\b/i.test(message)
    ? 'Wise trenutno ni dosegljiv. Poskusi znova.'
    : message;
}

function Row({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div>
      <p className='mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      {children}
    </div>
  );
}

/** Branch keys arrive as "prog-year-branch"; the picker only needs the branch id. */
function branchIdOf(b: WiseBranch): number | null {
  const last = b.key.split('-').pop();
  const n = Number(last);
  return Number.isFinite(n) ? n : null;
}

/**
 * Group labels repeat the whole programme name on every option — "R-IT 3 VS RV - 1. sk".
 * Inside one subject that prefix is the same everywhere, so only the tail distinguishes them.
 */
