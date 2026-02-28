import {Moon, Sun, SlidersHorizontal} from 'lucide-react';
import {LoginButton} from '@/components/LoginButton';
import {CustomDropdown} from '@/components/CustomDropdown';
import {useI18n} from '@/lib/i18n';
import type {FormOptions} from '@/types/FormOptions';

type Props = {
  formOptions: FormOptions | null;
  selectedGrade: string;
  selectedProject: string;
  availableProjects: Array<{value: string; label: string}>;
  handleGradeChange: (grade: string) => void;
  handleProjectChange: (project: string) => void;
  isDark: boolean;
  setIsDark: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowFilterModal: (show: boolean) => void;
  latestCheck: number | null | undefined;
};

export function TimetableControls({
  formOptions,
  selectedGrade,
  selectedProject,
  availableProjects,
  handleGradeChange,
  handleProjectChange,
  isDark,
  setIsDark,
  setShowFilterModal,
  latestCheck,
}: Props) {
  const {t, locale, setLocale} = useI18n();

  const lastCheckLabel =
    latestCheck != null
      ? new Intl.DateTimeFormat(t.locale, {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(latestCheck))
      : null;

  const themeButton = (
    <button
      onClick={() => setIsDark((v) => !v)}
      aria-label="Toggle theme"
      aria-pressed={isDark}
      title={isDark ? t.common.switchToLight : t.common.switchToDark}
      className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );

  const langButton = (
    <button
      onClick={() => setLocale(locale === 'sl' ? 'en' : 'sl')}
      aria-label="Toggle language"
      title={
        locale === 'sl' ? 'Switch to English' : 'Preklopi v slovenščino'
      }
      className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs font-medium tabular-nums">
      {locale.toUpperCase()}
    </button>
  );

  const filterButton = (
    <button
      onClick={() => setShowFilterModal(true)}
      aria-haspopup="dialog"
      title={t.common.manageFilters}
      className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
      <SlidersHorizontal size={16} />
    </button>
  );

  return (
    <div className="mt-3 flex flex-col gap-2 overflow-x-hidden">
      {/* Row 1: dropdowns (mobile) / dropdowns + controls (desktop) */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Left: course selection */}
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
          {formOptions && (
            <>
              <CustomDropdown
                value={selectedGrade}
                options={formOptions.gradeOptions}
                onChange={handleGradeChange}
                label={t.header.year}
                placeholder={t.common.select}
                className="flex-1 sm:flex-none max-w-none sm:max-w-[200px]"
              />
              <CustomDropdown
                value={selectedProject}
                options={availableProjects}
                onChange={handleProjectChange}
                label={t.header.project}
                placeholder={t.common.select}
                disabled={!selectedGrade || availableProjects.length === 0}
                className="flex-1 sm:flex-none max-w-none sm:max-w-[200px]"
              />
            </>
          )}
        </div>

        {/* Right: utility controls — hidden on mobile, visible on sm+ */}
        <div className="hidden sm:flex items-center gap-0.5 shrink-0">
          {lastCheckLabel && (
            <span className="text-xs text-muted-foreground tabular-nums mr-1">
              {lastCheckLabel}
            </span>
          )}
          {themeButton}
          {langButton}
          {filterButton}
          <div className="w-px h-4 bg-border mx-1" />
          <LoginButton />
        </div>
      </div>

      {/* Row 2: utility controls on mobile only */}
      <div className="flex sm:hidden items-center justify-between gap-1">
        <div className="flex items-center gap-0.5">
          {themeButton}
          {langButton}
          {filterButton}
        </div>
        <div className="flex items-center gap-1">
          {lastCheckLabel && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {lastCheckLabel}
            </span>
          )}
          <div className="w-px h-4 bg-border mx-0.5" />
          <LoginButton />
        </div>
      </div>
    </div>
  );
}
