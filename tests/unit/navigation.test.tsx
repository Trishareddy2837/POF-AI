import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../src/app/App';
const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
describe('public site', () => {
  it('renders the POF-AI homepage headline and CTAs', () => { at('/'); expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Your future has a path'); expect(screen.getAllByText('Get Started').length).toBeGreaterThan(0); });
  it('header links point at real routes', () => { at('/'); const nav = within(screen.getByRole('navigation', { name: 'Main' })); expect(nav.getByText('Jobs').getAttribute('href')).toBe('/jobs'); expect(nav.getByText('Resume Builder').getAttribute('href')).toBe('/resume-builder'); });
  it('toggles the mobile menu', () => { at('/'); const b = screen.getByRole('button', { name: 'Open menu' }); fireEvent.click(b); expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeTruthy(); expect(b.getAttribute('aria-expanded')).toBe('true'); });
  it('filters jobs and shows an empty state', () => { at('/jobs'); fireEvent.change(screen.getByLabelText('Search opportunities'), { target: { value: 'zzzz' } }); expect(screen.getByText(/No records match these filters/)).toBeTruthy(); });
  it('keeps the quiz experience out of this release while it is being rebuilt', () => { at('/quizzes'); expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy(); });
});
