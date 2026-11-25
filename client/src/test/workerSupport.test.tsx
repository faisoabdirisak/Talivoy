import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Opportunity } from '@talivoy/shared';
import { AdviserReviewLink } from '../components/AdviserReviewLink';
import { AdviserReviewPage } from '../components/AdviserReviewPage';
import { MilestoneReminders } from '../components/MilestoneReminders';
import {
  createAdviserShare,
  listAdviserShares,
  listReminders,
  saveReminder,
  readAdviserShare,
  listSkillsEvidence,
} from '../lib/api';

vi.mock('../lib/api', () => ({
  createAdviserShare: vi.fn(),
  listAdviserShares: vi.fn(),
  revokeAdviserShare: vi.fn(),
  listReminders: vi.fn(),
  saveReminder: vi.fn(),
  removeReminder: vi.fn(),
  readAdviserShare: vi.fn(),
  listSkillsEvidence: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const opportunity: Opportunity = {
  id: 'opp-1',
  title: 'Logistics coordinator',
  category: 'career-pivot',
  summary: 'Private summary',
  reasoning: 'Private reasoning',
  feasibilityScore: 80,
  rank: 1,
  planItems: [
    {
      id: 'task-1',
      title: 'Practice spreadsheet reports',
      description: 'Build a small stock report.',
      day: 7,
      week: 1,
      isCompleted: false,
    },
  ],
};

it('creates a review link only after the worker chooses the shared fields', async () => {
  vi.mocked(listAdviserShares).mockResolvedValue([]);
  vi.mocked(createAdviserShare).mockResolvedValue({
    id: 'share-1',
    token: 'a'.repeat(64),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  });
  render(<AdviserReviewLink opportunity={opportunity} demo={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Choose details to share' }));
  expect(createAdviserShare).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Opportunity title'));
  fireEvent.click(screen.getByLabelText(/Week 1/));
  fireEvent.click(screen.getByRole('button', { name: 'Create Review Link' }));
  await waitFor(() =>
    expect(createAdviserShare).toHaveBeenCalledWith({
      opportunityId: 'opp-1',
      includeTitle: false,
      includeSummary: false,
      includeReasoning: false,
      includeProgress: false,
      taskIds: ['task-1'],
      expiresInDays: 7,
    })
  );
  expect(
    ((await screen.findByLabelText('Your adviser review link')) as HTMLInputElement).value
  ).toContain('#adviser-review=');
});

it('saves a milestone reminder with a UTC timestamp after explicit submission', async () => {
  vi.mocked(listReminders).mockResolvedValue([]);
  vi.mocked(saveReminder).mockImplementation(async (planItemId, dueAt) => ({
    id: 'reminder-1',
    planItemId,
    dueAt,
  }));
  render(<MilestoneReminders opportunity={opportunity} demo={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Set a reminder' }));
  fireEvent.change(screen.getByLabelText('Milestone'), { target: { value: 'task-1' } });
  fireEvent.change(screen.getByLabelText(/Reminder date and time/), {
    target: { value: '2027-01-20T09:30' },
  });
  expect(saveReminder).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Save Reminder' }));
  await waitFor(() =>
    expect(saveReminder).toHaveBeenCalledWith('task-1', new Date('2027-01-20T09:30').toISOString())
  );
  expect(
    await screen.findByRole('button', { name: 'Download calendar reminder' })
  ).toBeInTheDocument();
});

it('renders a shared plan without requesting the adviser guest session', async () => {
  vi.mocked(readAdviserShare).mockResolvedValue({
    snapshot: { tasks: [{ title: 'Shared milestone', description: null, day: 7, week: 1 }] },
    expiresAt: '2027-01-01T00:00:00Z',
  });
  render(<AdviserReviewPage token={'a'.repeat(64)} />);
  expect(await screen.findByText('Shared milestone')).toBeInTheDocument();
  expect(screen.queryByText('Private summary')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

it('keeps skills evidence unselected until the worker explicitly includes it in a share', async () => {
  vi.mocked(listAdviserShares).mockResolvedValue([]);
  vi.mocked(listSkillsEvidence).mockResolvedValue([
    {
      id: 'evidence-1',
      opportunityId: opportunity.id,
      skill: 'Team leadership',
      source: 'work',
      evidence: 'I supervised six staff.',
      status: 'have-evidence',
      nextStep: 'Practice an interview example',
      bullet: 'Supervised six staff.',
      bulletReviewedAt: '2026-11-25T12:00:00Z',
      revision: 'a'.repeat(64),
    },
  ]);
  vi.mocked(createAdviserShare).mockResolvedValue({
    id: 'share-1',
    token: 'a'.repeat(64),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  render(<AdviserReviewLink opportunity={opportunity} demo={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Choose details to share' }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose saved skills evidence' }));
  const selection = await screen.findByLabelText('Team leadership · Self-reported');
  expect(selection).not.toBeChecked();
  expect(screen.queryByText('I supervised six staff.')).not.toBeInTheDocument();
  fireEvent.click(selection);
  expect(screen.getByText('I supervised six staff.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create Review Link' }));
  await waitFor(() =>
    expect(createAdviserShare).toHaveBeenCalledWith(
      expect.objectContaining({ evidenceIds: ['evidence-1'] })
    )
  );
});
