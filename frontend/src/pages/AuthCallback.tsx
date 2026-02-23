import {useEffect} from 'react';
import {useSearchParams} from 'react-router';
import {SiteHeader} from '@/components/SiteHeader';
import {TimetableSkeleton} from '@/components/TimetableSkeleton';

export function AuthCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      localStorage.setItem('authToken', token);
    }

    // Redirect to home with hard reload to reinitialize auth context
    window.location.href = '/';
  }, [searchParams]);

  return (
    <div className='min-h-screen bg-background'>
      <SiteHeader skeleton />
      <TimetableSkeleton />
    </div>
  );
}
