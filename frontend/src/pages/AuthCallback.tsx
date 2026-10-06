import {useEffect} from 'react';
import {useSearchParams} from 'react-router';
import {SiteHeader} from '@/components/SiteHeader';
import {TimetableSkeleton} from '@/components/TimetableSkeleton';
import {useAuth} from '@/contexts/AuthContext.shared';
import {useI18n} from '@/lib/i18n';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const {login} = useAuth();
  const {t} = useI18n();

  // The server sends us here with a reason when the handshake fails rather than throwing a bare
  // 500 at the visitor. A dropped correlation cookie is the common one, and it is recoverable:
  // trying again normally works, which is worth saying out loud instead of bouncing someone
  // back to an empty timetable with no explanation for why they are still signed out.
  const error = searchParams.get('error');

  useEffect(() => {
    if (error) return;

    const token = searchParams.get('token');
    if (token) {
      try {
        localStorage.setItem('authToken', token);
      } catch {
        // Private mode or blocked site data. The redirect below still lands on a working
        // timetable; it just will not remember the account.
      }
    }

    // Hard reload, so the auth context re-reads the token it was just handed.
    window.location.href = '/';
  }, [searchParams, error]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-4 px-4 text-center">
          <p className="text-sm font-medium text-foreground">
            {t.auth.signInFailed}
          </p>
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            onClick={login}>
            {t.auth.continueWithGoogle}
          </button>
          <a
            href="/"
            className="text-xs text-muted-foreground underline decoration-transparent hover:decoration-inherit">
            {t.auth.continueAsGuest}
          </a>
          {/* Kept visible on purpose: when somebody reports that sign-in will not work, this
              line is the difference between guessing and knowing which step broke. */}
          <p className="mt-2 break-words text-[11px] text-muted-foreground opacity-70">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader skeleton />
      <TimetableSkeleton />
    </div>
  );
}
