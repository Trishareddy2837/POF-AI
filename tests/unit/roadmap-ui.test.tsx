import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../../src/app/AuthProvider';
import { CareerCataloguePage, RoadmapCreatePage } from '../../src/pages/RoadmapPages';

const auth = { session: null, user: null, loading: false };
describe('career and roadmap pages', () => {
  it('shows the 100-option public career catalogue and filters it', () => {
    render(<MemoryRouter><CareerCataloguePage /></MemoryRouter>);
    expect(screen.getByText('Showing 100 of 100 career options.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search careers'), { target: { value: 'battery' } });
    expect(screen.getByText(/Showing \d+ of 100 career options/)).toBeTruthy();
    expect(screen.getByText('EV Battery Systems Engineering')).toBeTruthy();
  });
  it('generates and previews an explicitly labelled demo roadmap', async () => {
    render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/roadmaps/create?careerId=data-analytics']}>
      <Routes><Route path="/roadmaps/create" element={<RoadmapCreatePage />} /></Routes>
    </MemoryRouter></AuthContext.Provider>);
    expect(screen.getByRole('combobox', { name: 'Career goal' })).toBeTruthy();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Generate roadmap preview' }) as HTMLButtonElement).disabled).toBe(false));
    const generate = screen.getByRole('button', { name: 'Generate roadmap preview' });
    fireEvent.click(generate);
    await waitFor(() => expect(screen.getByText(/Sample plan: built from this career’s curated learning pattern/)).toBeTruthy());
    expect(screen.getByText('Data Analytics learning roadmap')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in to save this roadmap' })).toBeTruthy();
  });
});
