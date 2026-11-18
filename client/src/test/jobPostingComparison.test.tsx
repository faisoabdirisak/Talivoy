import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { JobPostingComparison } from '../components/JobPostingComparison';
import { compareJob, addJobAction } from '../lib/api';
import type { Opportunity } from '@talivoy/shared';

vi.mock('../lib/api', () => ({ compareJob: vi.fn(), addJobAction: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const opportunity: Opportunity = {
  id: 'opp-1',
  title: 'Logistics coordinator',
  category: 'career-pivot',
  summary: '',
  reasoning: '',
  feasibilityScore: 80,
  rank: 1,
  planItems: [],
};
const result = {
  matches: [
    {
      requirement: 'Inventory',
      postingQuote: 'Inventory experience',
      profileQuote: 'Inventory',
      explanation: 'Relevant stated experience.',
    },
  ],
  gaps: [
    {
      requirement: 'Reporting',
      postingQuote: 'Reporting skills',
      question: 'Have you created reports?',
    },
  ],
  action: { title: 'Create a stock report', description: 'Practice spreadsheet reporting.' },
  actionToken: '{"token":"test","expires":123}',
};

it('requires comparison and explicit review before saving the suggested action', async () => {
  vi.mocked(compareJob).mockResolvedValue(result);
  const item = { id: 'task-1', ...result.action, day: 30, week: 4, isCompleted: false };
  vi.mocked(addJobAction).mockResolvedValue(item);
  const onAdded = vi.fn();
  render(
    <JobPostingComparison
      opportunity={opportunity}
      profile={{ skills: 'Inventory and team leadership', experience: '2 years' }}
      demo={false}
      onAdded={onAdded}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Compare a job' }));
  fireEvent.change(screen.getByLabelText('Job posting'), {
    target: {
      value: 'Inventory experience and reporting skills are required for this logistics job.',
    },
  });
  expect(compareJob).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Compare My Skills' }));
  expect(await screen.findByText('What you already bring')).toBeInTheDocument();
  expect(addJobAction).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Add to My 30-Day Plan' }));
  await waitFor(() => expect(onAdded).toHaveBeenCalledWith('opp-1', item));
  expect(screen.getByRole('button', { name: 'Added to your plan' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Job posting'), {
    target: { value: 'A different posting' },
  });
  expect(screen.queryByText('Create a stock report')).not.toBeInTheDocument();
});
