import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { AuthContext, type AuthState } from '../../src/app/AuthProvider';
import { ProtectedRoute } from '../../src/components/auth/RouteGuards';
import { DashboardPage } from '../../src/pages/StudentPages';
import { AppRoutes } from '../../src/app/App';
const guarded = (ctx: AuthState) => render(<AuthContext.Provider value={ctx}><MemoryRouter initialEntries={['/dashboard']}><Routes>
  <Route path="/login" element={<p>login page</p>} /><Route path="/dashboard" element={<ProtectedRoute><p>secret</p></ProtectedRoute>} /></Routes></MemoryRouter></AuthContext.Provider>);
describe('protected routes', () => {
  it('redirects signed-out visitors to login', () => { guarded({ session: null, user: null, loading: false }); expect(screen.getByText('login page')).toBeTruthy(); });
  it('shows a loading state while the session is checked', () => { guarded({ session: null, user: null, loading: true }); expect(screen.getByRole('status').textContent).toContain('Checking'); });
  it('renders content for signed-in students', () => { guarded({ session: {} as Session, user: {} as User, loading: false }); expect(screen.getByText('secret')).toBeTruthy(); });
});
describe('auth pages', () => {
  it('shows the setup notice when Supabase is not configured', () => { render(<MemoryRouter initialEntries={['/login']}><AppRoutes /></MemoryRouter>); expect(screen.getByRole('note').textContent).toContain('Supabase is not configured'); });
  it('shows registration validation errors', async () => { render(<MemoryRouter initialEntries={['/register']}><AppRoutes /></MemoryRouter>); fireEvent.click(screen.getByRole('button', { name: 'Create account' })); expect(await screen.findByText('Enter your full name.')).toBeTruthy(); expect(await screen.findByText('Accept the terms to continue.')).toBeTruthy(); });
  it('shows login validation errors', async () => { render(<MemoryRouter initialEntries={['/login']}><AppRoutes /></MemoryRouter>); fireEvent.click(screen.getByRole('button', { name: 'Sign in' })); expect(await screen.findByText('Enter a valid email address.')).toBeTruthy(); });
  it('redirects /profile to login when signed out', () => { render(<MemoryRouter initialEntries={['/profile']}><AppRoutes /></MemoryRouter>); expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy(); });
});
describe('dashboard', () => {
  it('greets the student and shows the new-student empty state', () => {
    const user = { id: 'u1', email: 'a@b.co', user_metadata: { full_name: 'Asha Rao' } } as unknown as User;
    render(<AuthContext.Provider value={{ session: {} as Session, user, loading: false }}><MemoryRouter><DashboardPage /></MemoryRouter></AuthContext.Provider>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome, Asha');
    expect(screen.getByText('Complete your profile to receive personalized recommendations.')).toBeTruthy();
  });
});
