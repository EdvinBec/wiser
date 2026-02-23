import {Skeleton} from '@/components/ui/skeleton';

export function TimetableSkeleton() {
  return (
    <main className='max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6'>
      {/* Timetable Header Skeleton */}
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full'>
        {/* Left: icon + title */}
        <div className='flex items-center gap-3'>
          <Skeleton className='hidden sm:block h-10 w-10 rounded-md' />
          <div className='space-y-2'>
            <Skeleton className='h-9 w-48' />
            <Skeleton className='h-4 w-32' />
          </div>
        </div>

        {/* Right: view toggle + nav buttons */}
        <div className='flex items-center gap-3 flex-wrap'>
          <Skeleton className='h-10 w-40 rounded-md' />
          <div className='flex gap-2'>
            <Skeleton className='h-10 w-10 rounded-full' />
            <Skeleton className='h-10 w-10 rounded-full' />
          </div>
        </div>
      </div>

      {/* Controls Row (filters, theme, language) */}
      <div className='flex items-center justify-between'>
        <Skeleton className='h-10 w-32' />
        <div className='flex gap-2'>
          <Skeleton className='h-10 w-10 rounded-full' />
          <Skeleton className='h-10 w-10 rounded-full' />
          <Skeleton className='h-10 w-10 rounded-full' />
        </div>
      </div>

      {/* Event Type Legend */}
      <div className='flex gap-4 flex-wrap'>
        {Array.from({length: 4}).map((_, idx) => (
          <div
            key={idx}
            className='flex items-center gap-2'>
            <Skeleton className='h-3 w-3 rounded-sm' />
            <Skeleton className='h-4 w-20' />
          </div>
        ))}
      </div>

      {/* Timetable Grid - Week View with Time Axis */}
      <div className='flex gap-4'>
        {/* Time axis on the left */}
        <div className='hidden md:block space-y-16 pt-12'>
          {Array.from({length: 8}).map((_, idx) => (
            <Skeleton
              key={idx}
              className='h-4 w-12'
            />
          ))}
        </div>

        {/* Schedule columns for each day */}
        <div className='flex-1 grid grid-cols-1 md:grid-cols-5 gap-4'>
          {Array.from({length: 5}).map((_, colIdx) => (
            <div
              key={colIdx}
              className='flex flex-col gap-3'>
              {/* Day header */}
              <Skeleton className='h-10 rounded-md' />

              {/* Event blocks at different positions/heights */}
              <div className='space-y-2 mt-8'>
                <Skeleton
                  className='h-20 rounded-md'
                  style={{animationDelay: `${colIdx * 100}ms`}}
                />
                <Skeleton
                  className='h-16 rounded-md'
                  style={{animationDelay: `${colIdx * 100 + 50}ms`}}
                />
              </div>

              <div className='space-y-2 mt-12'>
                <Skeleton
                  className='h-24 rounded-md'
                  style={{animationDelay: `${colIdx * 100 + 100}ms`}}
                />
              </div>

              <div className='space-y-2 mt-8'>
                <Skeleton
                  className='h-16 rounded-md'
                  style={{animationDelay: `${colIdx * 100 + 150}ms`}}
                />
                <Skeleton
                  className='h-20 rounded-md'
                  style={{animationDelay: `${colIdx * 100 + 200}ms`}}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
