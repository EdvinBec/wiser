import {useState, useEffect} from 'react';
import {fetchGroupsForGrade, type Group} from '@/lib/api';
import {Loader2, Filter} from 'lucide-react';

interface GroupFilterProps {
  courseId?: number;
  gradeId?: number;
  selectedGroupIds: number[];
  onGroupsChange: (groupIds: number[]) => void;
}

export function GroupFilter({
  courseId,
  gradeId,
  selectedGroupIds,
  onGroupsChange,
}: GroupFilterProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !gradeId) {
      setGroups([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchGroupsForGrade(courseId, gradeId, controller.signal)
      .then(setGroups)
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [courseId, gradeId]);

  const toggleGroup = (groupId: number) => {
    if (selectedGroupIds.includes(groupId)) {
      onGroupsChange(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      onGroupsChange([...selectedGroupIds, groupId]);
    }
  };

  const selectAll = () => {
    onGroupsChange(groups.map((g) => g.id));
  };

  const clearAll = () => {
    onGroupsChange([]);
  };

  if (!courseId || !gradeId) {
    return (
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Filter size={16} />
        <span>Select a course and grade to filter groups</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='flex items-center gap-2 text-muted-foreground'>
        <Loader2
          className='animate-spin'
          size={16}
        />
        <span>Loading groups...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-sm text-destructive'>
        Failed to load groups: {error}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className='text-sm text-muted-foreground'>
        No groups found for this course/grade
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <label className='text-sm font-medium flex items-center gap-2'>
          <Filter size={16} />
          Filter by Groups
        </label>
        <div className='flex gap-2'>
          <button
            onClick={selectAll}
            className='text-xs text-primary hover:underline'>
            Select All
          </button>
          <span className='text-xs text-muted-foreground'>|</span>
          <button
            onClick={clearAll}
            className='text-xs text-muted-foreground hover:text-foreground hover:underline'>
            Clear
          </button>
        </div>
      </div>

      <div className='flex flex-wrap gap-2'>
        {groups.map((group) => {
          const isSelected = selectedGroupIds.includes(group.id);
          return (
            <button
              key={group.id}
              onClick={() => toggleGroup(group.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}>
              {group.name}
            </button>
          );
        })}
      </div>

      {selectedGroupIds.length > 0 && (
        <div className='text-xs text-muted-foreground'>
          {selectedGroupIds.length} group
          {selectedGroupIds.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}
