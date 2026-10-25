import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/aiProvider', () => ({ invokeCareerAnalysis: invoke }));
import { suggestResumeEdits } from '../../src/services/resumeAssistant';

describe('AI resume suggestions', () => {
  beforeEach(() => invoke.mockReset());

  it('keeps suggestions grounded in the matching resume section', async () => {
    invoke.mockResolvedValue({ data: { suggestions: [
      { field: 'summary', original: 'Built web apps', proposed: 'Developed web applications', reason: 'Clearer wording' },
      { field: 'experience', original: 'Built web apps', proposed: 'Led a team of 12', reason: 'Not supported by experience evidence' },
    ] } });
    await expect(suggestResumeEdits({ summary: 'Built web apps', experience: ['Assisted testing'], projects: [] })).resolves.toEqual([
      { field: 'summary', original: 'Built web apps', proposed: 'Developed web applications', reason: 'Clearer wording' },
    ]);
  });

  it('rejects new numbers in a rewrite', async () => {
    invoke.mockResolvedValue({ data: { suggestions: [
      { field: 'projects', original: 'Created a dashboard', proposed: 'Created a dashboard used by 500 people', reason: 'Stronger impact' },
    ] } });
    await expect(suggestResumeEdits({ summary: '', experience: [], projects: ['Created a dashboard'] })).resolves.toEqual([]);
  });
});
