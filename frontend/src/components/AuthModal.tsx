import {useState} from 'react';
import {Modal} from '@/components/Modal';
import {LoginForm} from '@/components/LoginForm';
import {RegisterForm} from '@/components/RegisterForm';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export function AuthModal({
  open,
  onClose,
  defaultMode = 'login',
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = () => {
    onClose();
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5013/auth/google';
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title='Welcome to Wiser'>
      <div className='space-y-6'>
        {/* Tab Switcher */}
        <div className='flex gap-2 p-1 bg-muted rounded-lg'>
          <button
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            Login
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'register'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            Register
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className='p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive'>
            {error}
          </div>
        )}

        {/* Forms */}
        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleSuccess}
            onError={handleError}
          />
        ) : (
          <RegisterForm
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}

        {/* Divider */}
        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-border' />
          </div>
          <div className='relative flex justify-center text-xs'>
            <span className='px-2 bg-background text-muted-foreground'>
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          className='w-full flex items-center justify-center gap-2 py-2 px-4 border border-border rounded-md hover:bg-muted transition-colors'>
          <svg
            className='w-5 h-5'
            viewBox='0 0 24 24'>
            <path
              fill='#4285F4'
              d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
            />
            <path
              fill='#34A853'
              d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
            />
            <path
              fill='#FBBC05'
              d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
            />
            <path
              fill='#EA4335'
              d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
            />
          </svg>
          Continue with Google
        </button>

        {/* Continue as Guest */}
        <button
          onClick={onClose}
          className='w-full text-sm text-center text-muted-foreground hover:text-foreground transition-colors'>
          Continue as guest
        </button>
      </div>
    </Modal>
  );
}
