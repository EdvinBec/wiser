import {useState} from 'react';
import {useI18n} from '@/lib/i18n';
import {registerWithEmail} from '@/lib/api';

interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function RegisterForm({onSuccess, onError}: RegisterFormProps) {
  const {t} = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { onError?.('Passwords do not match'); return; }
    if (password.length < 6) { onError?.('Password must be at least 6 characters'); return; }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      onError?.('Password must contain uppercase, lowercase, number, and special character');
      return;
    }
    setLoading(true);
    try {
      const {token} = await registerWithEmail(name, email, password);
      localStorage.setItem('authToken', token);
      onSuccess?.();
      window.location.reload();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40';

  return (
    <form onSubmit={handleSubmit} className='space-y-3'>
      <div className='space-y-1.5'>
        <label className='block text-sm font-medium'>{t.auth.name}</label>
        <input
          type='text'
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
          placeholder={t.auth.namePlaceholder}
        />
      </div>
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
          minLength={6}
          className={inputClass}
          placeholder='••••••••'
        />
        <p className='text-xs text-muted-foreground'>{t.auth.passwordHint}</p>
      </div>
      <div className='space-y-1.5'>
        <label className='block text-sm font-medium'>{t.auth.confirmPassword}</label>
        <input
          type='password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className={inputClass}
          placeholder='••••••••'
        />
      </div>
      <button
        type='submit'
        disabled={loading}
        className='w-full py-2 px-4 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors'>
        {loading ? t.auth.creatingAccount : t.auth.continue}
      </button>
    </form>
  );
}
