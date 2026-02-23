import {createRoot} from 'react-dom/client';
import {BrowserRouter, Route, Routes} from 'react-router';
import './index.css';
import App from './App.tsx';
import {I18nProvider} from '@/lib/i18n';
import {Toaster} from 'sonner';
import {AuthProvider} from './contexts/AuthContext.tsx';
import {AuthCallback} from './pages/AuthCallback.tsx';

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path='/'
            element={<App />}
          />
          <Route
            path='/auth/callback'
            element={<AuthCallback />}
          />
        </Routes>
      </BrowserRouter>
      <Toaster position='top-center' />
    </AuthProvider>
  </I18nProvider>,
);
