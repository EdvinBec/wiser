import {Moon, Sun, SlidersHorizontal} from 'lucide-react';
import {LoginButton} from '@/components/LoginButton';
import {useI18n} from '@/lib/i18n';

type Props = {
  isDark: boolean;
  setIsDark: (v: boolean | ((prev: boolean) => boolean)) => void;
  /** Opens the schedule builder, where subjects and groups are chosen. */
  setShowFilterModal: (show: boolean) => void;
  /** When the school last published the timetable, as epoch ms. */
  publishedAt: number | null | undefined;
};

export function TimetableControls({
  isDark,
  setIsDark,
  setShowFilterModal,
  publishedAt,
}: Props) {
  const {t, locale, setLocale} = useI18n();

  const publishedLabel =
    publishedAt != null
      ? new Intl.DateTimeFormat(t.locale, {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(publishedAt))
      : null;

  const themeButton = (
    <button
      onClick={() => setIsDark((v) => !v)}
      aria-label='Toggle theme'
      aria-pressed={isDark}
      title={isDark ? t.common.switchToLight : t.common.switchToDark}
      className='p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'>
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );

  const langButton = (
    <button
      onClick={() => setLocale(locale === 'sl' ? 'en' : 'sl')}
      aria-label='Toggle language'
      title={locale === 'sl' ? 'Switch to English' : 'Preklopi v slovenščino'}
      className='p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs font-medium tabular-nums'>
      {locale.toUpperCase()}
    </button>
  );

  const builderButton = (
    <button
      onClick={() => setShowFilterModal(true)}
      aria-haspopup='dialog'
      title={t.common.manageFilters}
      className='p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'>
      <SlidersHorizontal size={16} />
    </button>
  );

  const publishedStamp = publishedLabel && (
    <span
      className='text-xs text-muted-foreground tabular-nums'
      title='Urnik nazadnje objavljen'>
      {publishedLabel}
    </span>
  );

  return (
    <div className='mt-3 flex items-center justify-end gap-0.5 overflow-x-hidden'>
      {publishedStamp}
      {publishedStamp && <span className='w-1' />}
      {themeButton}
      {langButton}
      {builderButton}
      <div className='w-px h-4 bg-border mx-1' />
      <LoginButton />
    </div>
  );
}
