import {useState} from 'react';
import {Mail, Lock} from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function LoginForm({onSuccess, onError}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5013/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Login failed');
      }

      const {token} = await response.json();
      localStorage.setItem('authToken', token);
      onSuccess?.();
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-4'>
      <div>
        <label className='block text-sm font-medium mb-2'>Email</label>
        <div className='relative'>
          <Mail
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
            size={18}
          />
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className='w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring'
            placeholder='you@example.com'
          />
        </div>
      </div>

      <div>
        <label className='block text-sm font-medium mb-2'>Password</label>
        <div className='relative'>
          <Lock
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
            size={18}
          />
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className='w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring'
            placeholder='••••••••'
          />
        </div>
      </div>

      <button
        type='submit'
        disabled={loading}
        className='w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium'>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
