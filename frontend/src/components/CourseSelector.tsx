import {useEffect, useState} from 'react';
import {fetchFormOptions} from '@/utils/api';
import type {FormOptions, DropdownOption} from '@/types/FormOptions';
import {useAuth} from '@/contexts/AuthContext.shared';

interface CourseSelectorProps {
  onSelectionChange: (grade: string, project: string) => void;
}

const STORAGE_KEY_GRADE = 'wiser_selected_grade';
const STORAGE_KEY_PROJECT = 'wiser_selected_project';

export function CourseSelector({onSelectionChange}: CourseSelectorProps) {
  const {isAuthenticated, user, token} = useAuth();
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    async function loadPreferences() {
      if (isAuthenticated) {
        // Load from server for authenticated users
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5013'}/user/preferences`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          if (response.ok) {
            const prefs = await response.json();
            if (prefs.preferredGrade) setSelectedGrade(prefs.preferredGrade);
            if (prefs.preferredProject)
              setSelectedProject(prefs.preferredProject);
          }
        } catch (err) {
          console.error('Failed to load user preferences:', err);
        }
      } else {
        // Load from localStorage for non-authenticated users
        const savedGrade = localStorage.getItem(STORAGE_KEY_GRADE);
        const savedProject = localStorage.getItem(STORAGE_KEY_PROJECT);
        if (savedGrade) setSelectedGrade(savedGrade);
        if (savedProject) setSelectedProject(savedProject);
      }
      setPreferencesLoaded(true);
    }
    loadPreferences();
  }, [isAuthenticated]);

  // Auto-trigger selection if both grade and project are loaded
  useEffect(() => {
    if (preferencesLoaded && selectedGrade && selectedProject) {
      onSelectionChange(selectedGrade, selectedProject);
    }
  }, [preferencesLoaded, selectedGrade, selectedProject, onSelectionChange]);

  useEffect(() => {
    async function loadOptions() {
      try {
        setLoading(true);
        setError(null);
        const options = await fetchFormOptions();
        setFormOptions(options);
      } catch (err) {
        console.error('Failed to fetch options from API:', err);
        setError(err instanceof Error ? err.message : 'Failed to load options');
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, []);

  const handleGradeSelect = (grade: string) => {
    setSelectedGrade(grade);
    setSelectedProject(''); // Reset project when grade changes

    // Save to localStorage for non-authenticated users
    if (!isAuthenticated) {
      if (grade) {
        localStorage.setItem(STORAGE_KEY_GRADE, grade);
      } else {
        localStorage.removeItem(STORAGE_KEY_GRADE);
      }
      localStorage.removeItem(STORAGE_KEY_PROJECT); // Clear project when grade changes
    }
  };

  const handleProjectSelect = async (project: string) => {
    setSelectedProject(project);
    if (selectedGrade && project) {
      onSelectionChange(selectedGrade, project);

      // Save preferences
      if (isAuthenticated) {
        // Save to server for authenticated users
        try {
          await fetch(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5013'}/user/preferences`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                preferredGrade: selectedGrade,
                preferredProject: project,
              }),
            },
          );
        } catch (err) {
          console.error('Failed to save user preferences:', err);
        }
      } else {
        // Save to localStorage for non-authenticated users
        localStorage.setItem(STORAGE_KEY_GRADE, selectedGrade);
        localStorage.setItem(STORAGE_KEY_PROJECT, project);
      }
    }
  };

  if (loading) {
    return (
      <div className='px-4 md:px-10 lg:px-16 py-4 md:py-8 max-w-7xl mx-auto'>
        <div className='bg-card border rounded-lg p-4 md:p-6 text-center'>
          <div className='animate-pulse text-muted-foreground text-sm md:text-base'>
            Loading options...
          </div>
        </div>
      </div>
    );
  }

  if (error || !formOptions) {
    return (
      <div className='px-4 md:px-10 lg:px-16 py-4 md:py-8 max-w-7xl mx-auto'>
        <div className='bg-destructive/10 border border-destructive rounded-lg p-4 md:p-6 text-center'>
          <p className='text-destructive text-sm md:text-base break-words'>
            {error || 'Failed to load selector options'}
          </p>
        </div>
      </div>
    );
  }

  // Get projects for the selected grade
  const availableProjects =
    selectedGrade && formOptions.projectsByGrade[selectedGrade]
      ? formOptions.projectsByGrade[selectedGrade]
      : [];

  return (
    <div className='px-4 md:px-10 lg:px-16 py-4 md:py-8 max-w-7xl mx-auto'>
      <div className='bg-card border rounded-lg p-4 md:p-6 overflow-hidden'>
        <div className='flex flex-col gap-4'>
          {/* Dropdowns row - stack on mobile, horizontal on desktop */}
          <div className='flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4'>
            {/* Grade Dropdown */}
            <div className='flex flex-col gap-2 flex-1 min-w-0'>
              <label
                htmlFor='grade-select'
                className='text-sm font-semibold text-foreground/80'>
                Select Year
              </label>
              <select
                id='grade-select'
                value={selectedGrade}
                onChange={(e) => handleGradeSelect(e.target.value)}
                className='w-full px-3 md:px-4 py-2.5 bg-background border-2 border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all truncate'>
                <option value=''>Choose year...</option>
                {formOptions.gradeOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Dropdown - only enabled when grade is selected */}
            <div className='flex flex-col gap-2 flex-1 min-w-0'>
              <label
                htmlFor='project-select'
                className='text-sm font-semibold text-foreground/80'>
                Select Project
              </label>
              <select
                id='project-select'
                value={selectedProject}
                onChange={(e) => handleProjectSelect(e.target.value)}
                disabled={!selectedGrade || availableProjects.length === 0}
                className='w-full px-3 md:px-4 py-2.5 bg-background border-2 border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed truncate'>
                <option value=''>
                  {!selectedGrade
                    ? 'Choose year first...'
                    : availableProjects.length === 0
                      ? 'No projects available'
                      : 'Choose project...'}
                </option>
                {availableProjects.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selection Summary - full width on mobile */}
          {selectedGrade && selectedProject && (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t'>
              <div className='text-sm text-muted-foreground'>Selected:</div>
              <div className='px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md w-fit'>
                <span className='text-sm font-semibold text-primary break-words'>
                  {
                    formOptions.gradeOptions.find(
                      (g) => g.value === selectedGrade,
                    )?.label
                  }{' '}
                  - {selectedProject}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
