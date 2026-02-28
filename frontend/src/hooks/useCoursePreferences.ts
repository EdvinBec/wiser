import {useEffect, useState, useMemo, useCallback} from 'react';
import {fetchFormOptions} from '@/utils/api';
import type {FormOptions} from '@/types/FormOptions';
import {useAuth} from '@/contexts/AuthContext.shared';
import {getUserPreferences, saveUserPreferences} from '@/lib/api';

const STORAGE_KEY_GRADE = 'wiser_selected_grade';
const STORAGE_KEY_PROJECT = 'wiser_selected_project';

export function useCoursePreferences(
  onSelectionChange: (grade: string, project: string) => void,
) {
  const {user, isAuthenticated, token} = useAuth();

  // Capture URL params once at render time — never recomputed
  const urlGrade = useMemo(
    () => new URLSearchParams(window.location.search).get('g') ?? '',
    [],
  );
  const urlProject = useMemo(
    () => new URLSearchParams(window.location.search).get('p') ?? '',
    [],
  );
  const fromUrl = urlGrade !== '' && urlProject !== '';

  const [formOptions, setFormOptions] = useState<FormOptions | null>(null);
  // Initialise grade/project directly from URL so first render already has values
  const [selectedGrade, setSelectedGrade] = useState(urlGrade);
  const [selectedProject, setSelectedProject] = useState(urlProject);

  // Load form options once
  useEffect(() => {
    fetchFormOptions()
      .then(setFormOptions)
      .catch((err) => console.error('Failed to fetch form options:', err));
  }, []);

  // PATH A — URL provided values: trigger onSelectionChange once formOptions loads.
  // This effect is completely isolated from the preference-loading path.
  useEffect(() => {
    if (!fromUrl || !formOptions) return;
    const validProjects = formOptions.projectsByGrade[urlGrade] || [];
    if (validProjects.some((p) => p.value === urlProject)) {
      onSelectionChange(urlGrade, urlProject);
    }
  }, [fromUrl, urlGrade, urlProject, formOptions, onSelectionChange]);

  // PATH B — No URL values: load grade/project from server or localStorage.
  // Only runs when fromUrl is false so it can never overwrite URL-sourced state.
  useEffect(() => {
    if (fromUrl) return;

    async function loadPreferences() {
      let grade = '';
      let project = '';

      if (isAuthenticated && token) {
        try {
          const prefs = await getUserPreferences(token);
          grade = prefs.preferredGrade ?? '';
          project = prefs.preferredProject ?? '';
        } catch (err) {
          console.error('Failed to load user preferences:', err);
        }
      }

      // Always fall back to localStorage if we didn't get values from the server.
      // This handles: new accounts, server errors, and the race where auth resolves
      // after the user already selected grade/project in this session.
      if (!grade) grade = localStorage.getItem(STORAGE_KEY_GRADE) ?? '';
      if (!project) project = localStorage.getItem(STORAGE_KEY_PROJECT) ?? '';

      setSelectedGrade(grade);
      setSelectedProject(project);

      if (grade && project && formOptions) {
        const validProjects = formOptions.projectsByGrade[grade] || [];
        if (validProjects.some((p) => p.value === project)) {
          onSelectionChange(grade, project);
        }
      }
    }

    loadPreferences();
  }, [isAuthenticated, token, user?.id, fromUrl, formOptions, onSelectionChange]);

  const availableProjects = useMemo(() => {
    if (!selectedGrade || !formOptions) return [];
    return formOptions.projectsByGrade[selectedGrade] || [];
  }, [selectedGrade, formOptions]);

  const handleGradeChange = useCallback(
    (grade: string) => {
      setSelectedGrade(grade);
      setSelectedProject('');
      if (!isAuthenticated) {
        localStorage.setItem(STORAGE_KEY_GRADE, grade);
        localStorage.removeItem(STORAGE_KEY_PROJECT);
      }
    },
    [isAuthenticated],
  );

  const handleProjectChange = useCallback(
    async (project: string) => {
      setSelectedProject(project);
      if (selectedGrade && project) {
        onSelectionChange(selectedGrade, project);
        if (isAuthenticated && token) {
          try {
            await saveUserPreferences(token, selectedGrade, project);
          } catch (err) {
            console.error('Failed to save user preferences:', err);
          }
        } else {
          localStorage.setItem(STORAGE_KEY_GRADE, selectedGrade);
          localStorage.setItem(STORAGE_KEY_PROJECT, project);
        }
      }
    },
    [selectedGrade, onSelectionChange, isAuthenticated, token],
  );

  return {
    selectedGrade,
    selectedProject,
    handleGradeChange,
    handleProjectChange,
    availableProjects,
    formOptions,
  };
}
