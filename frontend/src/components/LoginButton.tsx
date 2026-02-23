import {useState} from 'react';
import {LogIn, LogOut, User} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext.shared';
import {AuthModal} from '@/components/AuthModal';

export function LoginButton() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const {user, logout, isAuthenticated} = useAuth();

  if (isAuthenticated && user) {
    return (
      <div className='flex items-center gap-3'>
        <div className='hidden sm:flex items-center gap-2 text-sm'>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.email}
              className='w-8 h-8 rounded-full'
            />
          ) : (
            <div className='w-8 h-8 rounded-full bg-muted flex items-center justify-center'>
              <User size={16} />
            </div>
          )}
          <span className='font-medium text-foreground'>
            {user.displayName || user.email}
          </span>
        </div>
        <button
          onClick={logout}
          className='flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors'
          aria-label='Logout'>
          <LogOut size={18} />
          <span className='hidden sm:inline'>Logout</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowAuthModal(true)}
        className='flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
        aria-label='Login'>
        <LogIn size={18} />
        <span>Login</span>
      </button>
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}
