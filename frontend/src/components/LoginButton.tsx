import {useState} from 'react';
import {LogIn, LogOut, User} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext.shared';
import {AuthModal} from '@/components/AuthModal';

export function LoginButton() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const {user, logout, isAuthenticated} = useAuth();

  if (isAuthenticated && user) {
    return (
      <div className='flex items-center gap-1.5 sm:gap-2'>
        {/* Avatar - always visible */}
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName || user.email}
            className='w-7 h-7 sm:w-8 sm:h-8 rounded-full cursor-pointer hover:opacity-80 transition-opacity'
            title={user.displayName || user.email}
          />
        ) : (
          <div className='w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors'>
            <User size={14} />
          </div>
        )}

        {/* User name - hidden on small screens, visible when there's room */}
        <span className='hidden md:inline text-sm font-medium text-foreground'>
          {user.displayName || user.email.split('@')[0]}
        </span>

        {/* Logout button - icon only on mobile, with text on larger screens */}
        <button
          onClick={logout}
          className='flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md border border-border hover:bg-muted transition-colors text-xs sm:text-sm'
          aria-label='Logout'
          title='Logout'>
          <LogOut
            size={14}
            className='sm:w-4 sm:h-4'
          />
          <span className='hidden sm:inline'>Logout</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowAuthModal(true)}
        className='flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs sm:text-sm'
        aria-label='Login'
        title='Login'>
        <LogIn
          size={14}
          className='sm:w-4 sm:h-4'
        />
        <span>Login</span>
      </button>
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}
