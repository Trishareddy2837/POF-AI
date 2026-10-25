import type { CourseRecord } from '../data/courseCatalogue';

export interface CourseFilters { query?: string; category?: string; skill?: string; difficulty?: string; provider?: string; price?: string; duration?: string }
export const courseDurationGroup = (hours: number | null) => hours === null ? 'unknown' : hours <= 5 ? 'short' : hours <= 20 ? 'medium' : 'long';
export function filterCourses(courses: CourseRecord[], filters: CourseFilters): CourseRecord[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  return courses.filter(course => {
    const searchable = `${course.title} ${course.description} ${course.provider} ${course.category} ${course.relatedSkills.join(' ')}`.toLowerCase();
    return searchable.includes(query) && (!filters.category || filters.category === 'all' || course.category === filters.category) &&
      (!filters.skill || filters.skill === 'all' || course.relatedSkills.includes(filters.skill)) &&
      (!filters.difficulty || filters.difficulty === 'all' || course.difficulty === filters.difficulty) &&
      (!filters.provider || filters.provider === 'all' || course.provider === filters.provider) &&
      (!filters.price || filters.price === 'all' || (filters.price === 'free' ? course.price === 'free' : course.price === 'unknown')) &&
      (!filters.duration || filters.duration === 'all' || courseDurationGroup(course.estimatedHours) === filters.duration);
  });
}
