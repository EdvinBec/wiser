import './App.css';
import {Timetable} from './container/Timetable';
import {WelcomeModal} from './components/WelcomeModal';

function App() {
  return (
    <>
      <WelcomeModal />

      {/* The timetable is assembled from the student's own subject selections, so there is no
          cohort to resolve up front. */}
      <Timetable />
    </>
  );
}

export default App;
