import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { AuthContext } from '../../src/app/AuthProvider';
import { AnalysisContext, type AnalysisState } from '../../src/app/AnalysisProvider';
import { DashboardPage } from '../../src/pages/StudentPages';
import CareerAnalysisPage from '../../src/pages/CareerAnalysisPage';
import { MatchPie, matchShares } from '../../src/components/career/MatchPie';
import { CareerCard } from '../../src/components/career/CareerCard';
const user = { id: 'u1', email: 'a@b.co', user_metadata: { full_name: 'Asha Rao' } } as unknown as User;
const auth = { session: {} as Session, user, loading: false };
const path = { careerId: 'data-analytics', title: 'Data Analytics', industry: 'Analytics', fitScore: 64, fitExplanation: 'Explains why.', factors: [{ factor: 'Skills', points: 30, max: 50, note: 'n' }], requiredSkills: ['SQL'], matchingSkills: ['Excel'], missingSkills: ['SQL'], entryLevelTitles: ['Junior Analyst'], nextSteps: ['Do x'], confidence: 'low' as const };
const withAnalysis = (): AnalysisState => ({ latest: { id: 'a1', created_at: '2026-10-01T00:00:00Z', provider_mode: 'demo', result: { summary: 's', providerMode: 'demo', profileStrengths: [], skillGaps: [{ careerId: 'data-analytics', skill: 'sql', importance: 'high', status: 'not_yet_assessed', reason: 'r', recommendedActions: [] }], careerPaths: [path], recommendedJobRoles: [], recommendedProjects: [], recommendedLearning: [] } },
  actions: [{ id: 'x', analysis_id: 'a1', career_id: 'data-analytics', skill: 'sql', kind: 'learn', text: 'Learn SQL now', completed: false }], selected: { career_id: 'data-analytics', title: 'Data Analytics', analysis_id: 'a1', selected_at: '' }, loading: false, error: null, reload: async () => {} });
describe('dashboard integration', () => {
  it('shows onboarding for a student with no analysis', () => { render(<AuthContext.Provider value={auth}><MemoryRouter><DashboardPage /></MemoryRouter></AuthContext.Provider>); expect(screen.getByText(/Start your AI career analysis/)).toBeTruthy(); expect(screen.getByText('Complete your profile to receive personalized recommendations.')).toBeTruthy(); });
  it('shows the selected path, top paths, gaps and next actions after an analysis', () => {
    render(<AuthContext.Provider value={auth}><AnalysisContext.Provider value={withAnalysis()}><MemoryRouter><DashboardPage /></MemoryRouter></AnalysisContext.Provider></AuthContext.Provider>);
    expect(screen.getAllByText(/Data Analytics/).length).toBeGreaterThan(1); expect(screen.getByText(/about 64\/100/)).toBeTruthy(); expect(screen.getByText('Learn SQL now')).toBeTruthy(); expect(screen.getByText('sql')).toBeTruthy();
  });
});
describe('analysis page', () => {
  it('shows optional hints, interest chips and the demo-mode notice (no required fields)', () => {
    render(<AuthContext.Provider value={auth}><MemoryRouter><CareerAnalysisPage /></MemoryRouter></AuthContext.Provider>);
    expect(screen.getByText(/List a few skills/)).toBeTruthy(); expect(screen.getByText(/Demo mode:/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Computers and coding' })).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Computers and coding' })); expect(screen.getByRole('button', { name: 'Computers and coding' }).getAttribute('aria-pressed')).toBe('true'); expect(screen.getByText(/No analysis yet/)).toBeTruthy();
  });
});
describe('career card', () => {
  it('calls onSelect, and shows Selected (disabled) for the chosen path', () => {
    const onSelect = vi.fn(); const { rerender } = render(<CareerCard path={path} selected={false} open={false} busy={false} onDetails={() => {}} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select & build roadmap' })); expect(onSelect).toHaveBeenCalledTimes(1); expect(screen.getByText(/Low confidence/)).toBeTruthy();
    rerender(<CareerCard path={path} selected open busy={false} onDetails={() => {}} onSelect={onSelect} />); expect((screen.getByRole('button', { name: 'Selected' }) as HTMLButtonElement).disabled).toBe(true); expect(screen.getByText(/How the approximate score/)).toBeTruthy();
  });
});

describe('match pie chart', () => {
  const mk = (id: string, fitScore: number) => ({ ...path, careerId: id, title: id, fitScore });
  it('shows each career’s share of the combined match, including zero-score paths in the key', () => { const sh = matchShares([mk('a', 60), mk('b', 30), mk('c', 10), mk('d', 0)]); expect(sh.map(x => x.pct)).toEqual([60, 30, 10, 0]); render(<MatchPie paths={[mk('a', 60), mk('b', 30), mk('c', 10), mk('d', 0)]} />); expect(screen.getByRole('img').getAttribute('aria-label')).toContain('a 60 percent'); expect(screen.getByText(/not your chance of getting a job/)).toBeTruthy(); expect(screen.getByRole('button', { name: /d 0 0%/ })).toBeTruthy(); });
  it('supports twenty career choices from the match chart', () => { const paths = Array.from({ length: 20 }, (_, i) => mk(`career-${i + 1}`, 100 - i)); const onSelect = vi.fn(); render(<MatchPie paths={paths} selectedId="career-10" onSelect={onSelect} />); expect(screen.getAllByRole('button', { name: /career-/ })).toHaveLength(20); fireEvent.click(screen.getByRole('button', { name: /career-20/ })); expect(onSelect).toHaveBeenCalledWith('career-20'); });
  it('shows an explanation instead of an empty chart when nothing is scored', () => { render(<MatchPie paths={[mk('a', 0)]} />); expect(screen.getByText(/not enough profile information to show scored career shares/)).toBeTruthy(); });
});
