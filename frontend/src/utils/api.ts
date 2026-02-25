import type {FormOptions} from '@/types/FormOptions';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5013';

export async function fetchFormOptions(): Promise<FormOptions> {
  const response = await fetch(`${API_BASE_URL}/api/form/options`);
  if (!response.ok) {
    throw new Error('Failed to fetch form options');
  }
  return response.json();
}

export async function fetchCourseId(
  code: string,
  grade: string,
  project: string,
): Promise<number> {
  // First try to get existing course
  let response = await fetch(
    `${API_BASE_URL}/api/form/course?code=${encodeURIComponent(code)}&grade=${encodeURIComponent(grade)}&project=${encodeURIComponent(project)}`,
  );

  if (response.ok) {
    return response.json();
  }

  // If not found, try to ensure it exists
  console.log('Course not found, ensuring it exists...');
  const ensureResponse = await fetch(
    `${API_BASE_URL}/api/debug/courses/ensure/${encodeURIComponent(code)}/${encodeURIComponent(grade)}/${encodeURIComponent(project)}`,
  );

  if (!ensureResponse.ok) {
    throw new Error('Failed to fetch or create course');
  }

  const data = await ensureResponse.json();
  return data.courseId;
}
