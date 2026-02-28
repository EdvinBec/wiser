import {useState} from 'react';
import {useI18n} from '@/lib/i18n';
import {loginWithEmail} from '@/lib/api';

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function LoginForm({onSuccess, onError}: LoginFormProps) {
  const {t} = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {token} = await loginWithEmail(email, password);
      localStorage.setItem('authToken', token);
      onSuccess?.();
      window.location.reload();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40';

  return (
    <form onSubmit={handleSubmit} className='space-y-3'>
      <div className='space-y-1.5'>
        <label className='block text-sm font-medium'>{t.auth.email}</label>
        <input
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
          placeholder='you@example.com'
        />
      </div>
      <div className='space-y-1.5'>
        <label className='block text-sm font-medium'>{t.auth.password}</label>
        <input
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={inputClass}
          placeholder='••••••••'
        />
      </div>
      <button
        type='submit'
        disabled={loading}
        className='w-full py-2 px-4 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors'>
        {loading ? t.auth.signingIn : t.auth.continue}
      </button>
    </form>
  );
}
