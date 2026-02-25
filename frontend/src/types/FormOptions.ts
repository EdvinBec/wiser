export interface DropdownOption {
  value: string;
  label: string;
  selector: string;
}

export interface FormOptions {
  courseOptions: DropdownOption[];
  gradeOptions: DropdownOption[];
  projectOptions: DropdownOption[];
  projectsByGrade: Record<string, DropdownOption[]>; // grade value -> projects for that grade
}
