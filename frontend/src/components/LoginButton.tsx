import {useState} from 'react';
import {LogIn, LogOut} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext.shared';
import {AuthModal} from '@/components/AuthModal';
import {useI18n} from '@/lib/i18n';

export function LoginButton() {
  const {t} = useI18n();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const {user, logout, isAuthenticated} = useAuth();

  if (isAuthenticated && user) {
    const name = user.displayName || user.email.split('@')[0];
    return (
      <div className='flex items-center gap-1.5'>
        <span className='text-xs font-semibold text-foreground max-w-[100px] truncate'>{name}</span>
        <button
          onClick={logout}
          aria-label={t.auth.signIn}
          title={t.auth.signIn}
          className='p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors'>
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowAuthModal(true)}
        aria-label={t.auth.signIn}
        title={t.auth.signIn}
        className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs text-primary hover:bg-primary/10 transition-colors'>
        <LogIn size={14} />
        <span>{t.auth.signIn}</span>
      </button>
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}
