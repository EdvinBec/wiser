import {useState} from 'react';
import {Modal} from '@/components/Modal';
import {LoginForm} from '@/components/LoginForm';
import {RegisterForm} from '@/components/RegisterForm';
import {useI18n} from '@/lib/i18n';

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
  const {t} = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = () => onClose();
  const handleError = (msg: string) => setError(msg);
  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError(null);
  };

  return (
    <Modal open={open} onClose={onClose} showHeader={false} size='sm'>
      <div className='py-2 space-y-5'>

        {/* Heading */}
        <div className='space-y-1'>
          <h2 className='text-lg font-semibold tracking-tight'>
            {mode === 'login' ? t.auth.login : t.auth.register}
          </h2>
          <p className='text-sm text-muted-foreground'>
            {mode === 'login' ? t.auth.loginSubtitle : t.auth.registerSubtitle}
          </p>
        </div>

        {/* Google */}
        <button
          onClick={() => { window.location.href = 'http://localhost:5013/auth/google'; }}
          className='w-full flex items-center justify-center gap-3 py-2 px-4 border border-border text-sm font-medium hover:bg-muted transition-colors'>
          <svg className='w-4 h-4 flex-shrink-0' viewBox='0 0 24 24'>
            <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
            <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
            <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
            <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
          </svg>
          {t.auth.continueWithGoogle}
        </button>

        {/* Divider */}
        <div className='flex items-center gap-3'>
          <div className='flex-1 border-t border-border' />
          <span className='text-xs text-muted-foreground'>{t.auth.or}</span>
          <div className='flex-1 border-t border-border' />
        </div>

        {/* Error */}
        {error && (
          <p className='text-xs text-destructive -mt-1'>{error}</p>
        )}

        {/* Form */}
        {mode === 'login' ? (
          <LoginForm onSuccess={handleSuccess} onError={handleError} />
        ) : (
          <RegisterForm onSuccess={handleSuccess} onError={handleError} />
        )}

        {/* Mode switch */}
        <p className='text-xs text-center text-muted-foreground'>
          {mode === 'login' ? (
            <>
              {t.auth.noAccount}{' '}
              <button onClick={() => switchMode('register')} className='text-foreground hover:underline'>
                {t.auth.signUp}
              </button>
            </>
          ) : (
            <>
              {t.auth.haveAccount}{' '}
              <button onClick={() => switchMode('login')} className='text-foreground hover:underline'>
                {t.auth.signIn}
              </button>
            </>
          )}
        </p>

        {/* Guest */}
        <div className='border-t border-border pt-4'>
          <button
            onClick={onClose}
            className='w-full text-xs text-muted-foreground hover:text-foreground transition-colors'>
            {t.auth.continueAsGuest}
          </button>
        </div>

      </div>
    </Modal>
  );
}
