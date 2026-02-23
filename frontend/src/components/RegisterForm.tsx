import {useState} from 'react';
import {Mail, Lock, User} from 'lucide-react';

interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function RegisterForm({onSuccess, onError}: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      onError?.('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      onError?.('Password must be at least 6 characters');
      return;
    }

    // Check password complexity (ASP.NET Identity default requirements)
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      onError?.(
        'Password must contain uppercase, lowercase, number, and special character',
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5013/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Registration failed');
      }

      const {token} = await response.json();
      localStorage.setItem('authToken', token);
      onSuccess?.();
      window.location.reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Registration failed';
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
        <label className='block text-sm font-medium mb-2'>Name</label>
        <div className='relative'>
          <User
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
            size={18}
          />
          <input
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className='w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring'
            placeholder='Your name'
          />
        </div>
      </div>

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
            minLength={6}
            className='w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring'
            placeholder='••••••••'
          />
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>
          Must include uppercase, lowercase, number & special character
        </p>
      </div>

      <div>
        <label className='block text-sm font-medium mb-2'>
          Confirm Password
        </label>
        <div className='relative'>
          <Lock
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
            size={18}
          />
          <input
            type='password'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className='w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring'
            placeholder='••••••••'
          />
        </div>
      </div>

      <button
        type='submit'
        disabled={loading}
        className='w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium'>
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
