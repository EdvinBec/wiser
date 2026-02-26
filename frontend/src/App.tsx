import './App.css';
import {useState, useCallback} from 'react';
import {Timetable} from './container/Timetable';
import {SiteHeader} from './components/SiteHeader';
import {WelcomeModal} from './components/WelcomeModal';
import {fetchCourseId} from './utils/api';

function App() {
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseInfo, setCourseInfo] = useState<string>('');

  const handleSelectionChange = useCallback(
    async (grade: string, project: string) => {
      console.log('Selection changed:', {grade, project});
      try {
        const id = await fetchCourseId('BV20', grade, project);
        console.log('Course ID fetched:', id);
        setCourseId(id);
        setCourseInfo(`BV20 - Grade ${grade} - ${project}`);
      } catch (error) {
        console.error('Failed to get course ID:', error);
        setCourseId(null);
      }
    },
    [],
  );

  return (
    <>
      <SiteHeader />
      <WelcomeModal />

      {/* Timetable with integrated selection */}
      <Timetable
        courseId={courseId}
        headerTitle={courseInfo}
        onSelectionChange={handleSelectionChange}
      />
    </>
  );
}

export default App;
