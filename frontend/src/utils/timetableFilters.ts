import type {ClassInfo, GroupInfo, ClassGroupMapping} from '@/lib/api';

function isValidGroupName(name: string): boolean {
  const n = (name ?? '').trim();
  if (n === '') return false;
  const nUpper = n.toUpperCase();
  if (nUpper === 'PR') return false;
  if (
    nUpper === 'RIT 2' ||
    nUpper === 'R_IT 2' ||
    nUpper === 'R-IT 2' ||
    nUpper === 'RIT2' ||
    nUpper === 'R_IT2' ||
    nUpper === 'R-IT2' ||
    nUpper.startsWith('RIT') ||
    nUpper.startsWith('R_IT') ||
    nUpper.startsWith('R-IT')
  )
    return false;
  return true;
}

/**
 * Returns only the classes that have at least 2 valid (filterable) groups.
 * Used to decide which classes should appear in the group filter modal.
 */
export function getFilterableClasses(
  classes: ClassInfo[],
  groups: GroupInfo[],
  classGroupMappings: ClassGroupMapping[],
): ClassInfo[] {
  return classes.filter((c) => {
    const mapping = classGroupMappings.find((m) => m.classId === c.id);
    if (!mapping) return false;
    const classGroups = groups.filter((g) => mapping.groupIds.includes(g.id));
    const validGroups = classGroups.filter((g) => isValidGroupName(g.name));
    return validGroups.length >= 2;
  });
}
