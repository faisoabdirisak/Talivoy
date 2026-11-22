import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Opportunity } from '@talivoy/shared';
import { USCareerPathway } from '../components/USCareerPathway';
import { listPathwayItems, savePathwayItem, addPathwayAction } from '../lib/api';

vi.mock('../lib/api', () => ({
  listPathwayItems: vi.fn(),
  savePathwayItem: vi.fn(),
  addPathwayAction: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const opportunity: Opportunity = {
  id: 'opp-1',
  title: 'Career exploration',
  category: 'career-pivot',
  summary: '',
  reasoning: '',
  feasibilityScore: 80,
  rank: 1,
  planItems: [],
};

it('saves a sourced checklist and requires review before adding a milestone', async () => {
  vi.mocked(listPathwayItems).mockResolvedValue([]);
  vi.mocked(savePathwayItem).mockImplementation(async (input) => ({
    ...input,
    id: 'step-1',
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    planItemId: null,
  }));
  const task = {
    id: 'pathway-task-step-1',
    title: 'Check your nursing application route',
    day: 30,
    week: 4,
    isCompleted: false,
  };
  vi.mocked(addPathwayAction).mockResolvedValue(task);
  const onAdded = vi.fn();
  render(
    <USCareerPathway
      opportunity={opportunity}
      profile={{ skills: 'Patient care' }}
      demo={false}
      onAdded={onAdded}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Explore My Pathway' }));
  await waitFor(() => expect(screen.getByLabelText('State you want to work in')).toBeEnabled());
  expect(screen.getByLabelText('Strengths, experience and qualifications')).toHaveValue(
    'Patient care'
  );
  fireEvent.change(screen.getByLabelText('State you want to work in'), { target: { value: 'IL' } });
  fireEvent.change(screen.getByLabelText('Career to explore'), {
    target: { value: 'registered-nurse' },
  });
  let card = screen
    .getByRole('heading', { name: 'Check your nursing application route' })
    .closest('article')!;
  expect(within(card).getByRole('link', { name: /Illinois IDFPR/ })).toHaveAttribute(
    'href',
    'https://idfpr.illinois.gov/profs/nursing.html'
  );
  fireEvent.change(within(card).getByLabelText('My checklist status'), {
    target: { value: 'Confirmed' },
  });
  fireEvent.change(within(card).getByLabelText('My notes'), {
    target: { value: 'Ask the board about my education.' },
  });
  expect(addPathwayAction).not.toHaveBeenCalled();
  fireEvent.click(within(card).getByRole('button', { name: 'Save Step' }));
  await waitFor(() =>
    expect(savePathwayItem).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityId: 'opp-1',
        state: 'IL',
        career: 'registered-nurse',
        status: 'Confirmed',
        notes: 'Ask the board about my education.',
      })
    )
  );
  await waitFor(() => {
    card = screen
      .getByRole('heading', { name: 'Check your nursing application route' })
      .closest('article')!;
    expect(within(card).getByRole('checkbox')).toBeEnabled();
  });
  expect(within(card).getByRole('button', { name: 'Add Reviewed Action' })).toBeDisabled();
  fireEvent.click(within(card).getByRole('checkbox'));
  fireEvent.click(within(card).getByRole('button', { name: 'Add Reviewed Action' }));
  await waitFor(() => expect(onAdded).toHaveBeenCalledWith('opp-1', task));
  expect(within(card).getByRole('button', { name: 'Added to plan' })).toBeDisabled();
});

it('restores the most recently saved state and career with its notes', async () => {
  vi.mocked(listPathwayItems).mockResolvedValue([
    {
      id: 'saved',
      opportunityId: 'opp-1',
      state: 'MN',
      career: 'software-developer',
      stepKey: 'role-requirements',
      status: 'Completed',
      notes: 'Reviewed two postings.',
      reviewedAt: '2026-11-22T12:00:00Z',
      updatedAt: '2026-11-22T12:00:00Z',
      planItemId: null,
    },
  ]);
  render(<USCareerPathway opportunity={opportunity} demo={false} onAdded={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Explore My Pathway' }));
  await waitFor(() => expect(screen.getByLabelText('State you want to work in')).toHaveValue('MN'));
  expect(screen.getByLabelText('Career to explore')).toHaveValue('software-developer');
  const card = screen
    .getByRole('heading', { name: 'Compare your background with software roles' })
    .closest('article')!;
  expect(within(card).getByLabelText('My notes')).toHaveValue('Reviewed two postings.');
  expect(within(card).getByLabelText('My checklist status')).toHaveValue('Completed');
});
