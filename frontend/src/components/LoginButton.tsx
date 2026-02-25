import {useState} from 'react';
import {LogIn, LogOut, User} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext.shared';
import {AuthModal} from '@/components/AuthModal';

export function LoginButton() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const {user, logout, isAuthenticated} = useAuth();

  if (isAuthenticated && user) {
    return (
      <div className='flex items-center gap-2 sm:gap-3'>
        {/* Avatar - always visible */}
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName || user.email}
            className='w-8 h-8 sm:w-9 sm:h-9 rounded-full cursor-pointer hover:opacity-80 transition-opacity'
            title='Settings (coming soon)'
          />
        ) : (
          <div className='w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors'>
            <User size={16} />
          </div>
        )}

        {/* Name - hidden on mobile */}
        <span className='hidden sm:inline font-medium text-foreground text-sm'>
          {user.displayName || user.email}
        </span>

        {/* Logout button */}
        <button
          onClick={logout}
          className='flex items-center gap-2 px-3 py-2 sm:px-4 rounded-lg border border-border hover:bg-muted transition-colors min-h-[44px]'
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
