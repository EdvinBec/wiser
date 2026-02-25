import './App.css';
import {useState, useCallback} from 'react';
import {Timetable} from './container/Timetable';
import {SiteHeader} from './components/SiteHeader';
import {WelcomeModal} from './components/WelcomeModal';
import {CourseSelector} from './components/CourseSelector';
import {fetchCourseId} from './utils/api';

function App() {
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseInfo, setCourseInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectionChange = useCallback(
    async (grade: string, project: string) => {
      console.log('Selection changed:', {grade, project});
      setIsLoading(true);
      try {
        const id = await fetchCourseId('BV20', grade, project);
        console.log('Course ID fetched:', id);
        setCourseId(id);
        setCourseInfo(`BV20 - Grade ${grade} - ${project}`);
      } catch (error) {
        console.error('Failed to get course ID:', error);
        setCourseId(null);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return (
    <>
      <SiteHeader />
      <WelcomeModal />

      {/* Selection at the top */}
      <CourseSelector onSelectionChange={handleSelectionChange} />

      {/* Loading state */}
      {isLoading && (
        <div className='w-full max-w-4xl mx-auto p-8 text-center'>
          <div className='bg-card border rounded-lg p-8'>
            <div className='animate-pulse text-muted-foreground'>
              Loading timetable...
            </div>
          </div>
        </div>
      )}

      {/* Timetable */}
      {!isLoading && courseId && (
        <Timetable
          courseId={courseId}
          headerTitle={courseInfo}
        />
      )}
    </>
  );
}

export default App;
