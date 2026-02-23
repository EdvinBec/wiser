import './App.css';
import {Timetable} from './container/Timetable';
import {SiteHeader} from './components/SiteHeader';
import {WelcomeModal} from './components/WelcomeModal';

function App() {
  return (
    <>
      <SiteHeader />
      <WelcomeModal />
      <Timetable
        courseId={1}
        headerTitle='RIT 2 VS'
      />
    </>
  );
}

export default App;
