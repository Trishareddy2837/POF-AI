import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoadmapGallery } from '../../src/components/career/RoadmapGallery';
import { ROADMAP_OPTIONS } from '../../src/data/roadmapCatalogue';

describe('homepage career roadmap gallery', () => {
  it('provides 500 career and focus-track combinations', () => {
    expect(ROADMAP_OPTIONS).toHaveLength(500);
  });
  it('makes 500 roadmap tracks searchable and filterable', () => {
    render(<MemoryRouter><RoadmapGallery /></MemoryRouter>);
    expect(screen.getByText(/Browse 500 of 500 roadmap tracks/)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search career roadmaps' }), { target: { value: 'robotics' } });
    expect(screen.getAllByRole('heading', { name: 'Robotics' })).toHaveLength(5);
    expect(screen.getByText(/Browse \d+ of 500 roadmap tracks/)).toBeTruthy();
  });
  it('shows more roadmap cards without leaving the homepage gallery', () => {
    render(<MemoryRouter><RoadmapGallery /></MemoryRouter>);
    expect(screen.getAllByRole('link', { name: /Build this roadmap/ })).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: /Show more paths/ }));
    expect(screen.getAllByRole('link', { name: /Build this roadmap/ })).toHaveLength(24);
  });
});
