import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../src/app/AuthProvider';
import { COURSES } from '../../src/data/courseCatalogue';
import { filterCourses } from '../../src/lib/courseDiscovery';
import { CoursesPage } from '../../src/pages/FeaturePages';
import { loadCourseProgress, setCourseProgress } from '../../src/services/courseProgress';

describe('course discovery', () => {
  it('keeps an official, dated catalogue with unique IDs and valid links', () => {
    expect(COURSES.length).toBeGreaterThanOrEqual(500);
    expect(new Set(COURSES.map(course => course.id)).size).toBe(COURSES.length);
    expect(COURSES.every(course => course.officialUrl.startsWith('https://') && course.source && course.verifiedOn)).toBe(true);
  });
  it('filters by query, category, skill, difficulty, provider, free price and duration', () => {
    expect(filterCourses(COURSES, { query: 'pandas' }).map(course => course.id)).toContain('kaggle-pandas');
    expect(filterCourses(COURSES, { category: 'Data', skill: 'sql', provider: 'Kaggle Learn', price: 'free', duration: 'short' }).map(course => course.id)).toEqual(['kaggle-sql']);
    expect(filterCourses(COURSES, { difficulty: 'intermediate', duration: 'unknown' }).map(course => course.id)).toContain('mit-python-cs');
  });
  it('stores course progress locally and labels completion as self-reported', async () => {
    localStorage.clear();
    await setCourseProgress('kaggle-python', 'saved');
    await setCourseProgress('kaggle-python', 'in_progress');
    const done = await setCourseProgress('kaggle-python', 'completed');
    expect(done[0].status).toBe('completed');
    expect(done[0].completion_source).toBe('self_reported');
    expect((await loadCourseProgress())[0].course_id).toBe('kaggle-python');
  });
  it('renders a searchable course marketplace with clear sample/live-data distinction', async () => {
    render(<MemoryRouter><AuthContext.Provider value={{ session: null, user: null, loading: false }}><CoursesPage /></AuthContext.Provider></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Learning marketplace' })).toBeTruthy();
    expect(screen.getByText(/organization-published courses/i)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search courses' }), { target: { value: 'pandas' } });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Pandas' })).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'CS50x: Introduction to Computer Science' })).toBeNull();
  });
});
