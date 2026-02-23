import {Brand} from '@/components/Brand';
import {LoginButton} from '@/components/LoginButton';
import {Skeleton} from '@/components/ui/skeleton';

interface SiteHeaderProps {
  skeleton?: boolean;
}

export function SiteHeader({skeleton = false}: SiteHeaderProps) {
  return (
    <header className='w-full border-b border-border bg-background'>
      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 py-4'>
        <div className='flex items-center justify-between'>
          {/* Left: Brand/Logo */}
          <div className='flex items-center'>
            {skeleton ? <Skeleton className='h-7 w-16' /> : <Brand />}
          </div>

          {/* Right: Login Button */}
          <div className='flex items-center'>
            {skeleton ? (
              <Skeleton className='h-10 w-24 rounded-lg' />
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
