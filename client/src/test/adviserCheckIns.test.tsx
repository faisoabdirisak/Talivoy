import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Opportunity } from '@talivoy/shared';
import { AdviserResponseForm } from '../components/AdviserResponseForm';
import { PrivateAdviserFeedback } from '../components/PrivateAdviserFeedback';
import { WeeklyCheckIns } from '../components/WeeklyCheckIns';
import {
  submitAdviserFeedback,
  listAdviserFeedback,
  acceptAdviserFeedback,
  listCheckIns,
  saveCheckIn,
  refineCheckIn,
} from '../lib/api';

vi.mock('../lib/api', () => ({
  submitAdviserFeedback: vi.fn(),
  listAdviserFeedback: vi.fn(),
  acceptAdviserFeedback: vi.fn(),
  listCheckIns: vi.fn(),
  saveCheckIn: vi.fn(),
  refineCheckIn: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const opportunity: Opportunity = {
  id: 'opp-1',
  title: 'Logistics coordinator',
  category: 'career-pivot',
  summary: 'Summary',
  reasoning: 'Reasoning',
  feasibilityScore: 80,
  rank: 1,
  planItems: [
    {
      id: 'task-1',
      title: 'Practice reports',
      description: 'Original guidance',
      day: 7,
      week: 1,
      isCompleted: false,
    },
  ],
};

it('sends private adviser feedback only after form submission', async () => {
  vi.mocked(submitAdviserFeedback).mockResolvedValue({ submitted: true });
  render(<AdviserResponseForm token={'a'.repeat(64)} />);
  fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: 'Fictional Lecturer' } });
  fireEvent.change(screen.getByLabelText(/Your role/), { target: { value: 'Lecturer' } });
  fireEvent.change(screen.getByLabelText(/How practical/), {
    target: { value: 'Practice reporting first.' },
  });
  fireEvent.change(screen.getByLabelText(/One recommended next step/), {
    target: { value: 'Build a sample report' },
  });
  expect(submitAdviserFeedback).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Send Feedback to Worker' }));
  expect(await screen.findByText('Feedback sent to the worker')).toBeInTheDocument();
  expect(submitAdviserFeedback).toHaveBeenCalledWith(
    expect.objectContaining({
      reviewerName: 'Fictional Lecturer',
      nextStep: 'Build a sample report',
      token: 'a'.repeat(64),
    })
  );
});

it('requires worker confirmation before accepting adviser advice', async () => {
  const feedback = {
    id: 'feedback-1',
    opportunityId: 'opp-1',
    reviewerName: 'Fictional Lecturer',
    reviewerRole: 'Lecturer',
    practicality: 'Practical' as const,
    assessment: 'A useful direction.',
    milestoneSuggestion: 'Practice with a small dataset.',
    nextStep: 'Build a sample report',
    nextStepDetails: 'Use fictional stock data.',
    createdAt: new Date().toISOString(),
    acceptedAt: null,
  };
  vi.mocked(listAdviserFeedback).mockResolvedValue([feedback]);
  const task = { id: 'new-task', title: feedback.nextStep, day: 30, week: 4, isCompleted: false };
  vi.mocked(acceptAdviserFeedback).mockResolvedValue(task);
  const onAdded = vi.fn();
  render(<PrivateAdviserFeedback opportunity={opportunity} demo={false} onAdded={onAdded} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review feedback' }));
  expect(await screen.findByText('Build a sample report')).toBeInTheDocument();
  const accept = screen.getByRole('button', { name: 'Add Reviewed Next Step' });
  expect(accept).toBeDisabled();
  expect(acceptAdviserFeedback).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', { name: /reviewed this next step/ }));
  fireEvent.click(accept);
  await waitFor(() => expect(onAdded).toHaveBeenCalledWith('opp-1', task));
  expect(screen.getByRole('button', { name: 'Added to plan' })).toBeDisabled();
});

it('saves a check-in and waits for reviewed preview confirmation before applying', async () => {
  vi.mocked(listCheckIns).mockResolvedValue([]);
  const entry = {
    id: 'checkin-1',
    opportunityId: 'opp-1',
    completedWork: 'Practiced reports',
    blockers: 'Limited time',
    budget: 0,
    hours: 2,
    createdAt: new Date().toISOString(),
    appliedAt: null,
  };
  vi.mocked(saveCheckIn).mockResolvedValue(entry);
  const refined = {
    ...opportunity,
    planItems: [
      { ...opportunity.planItems[0], description: 'Use free resources in short sessions.' },
    ],
  };
  vi.mocked(refineCheckIn).mockResolvedValue({
    original: opportunity,
    refined,
    revision: 'a'.repeat(64),
  });
  const onApply = vi.fn();
  render(<WeeklyCheckIns opportunity={opportunity} demo={false} onApply={onApply} />);
  fireEvent.click(screen.getByRole('button', { name: 'Check In This Week' }));
  fireEvent.change(screen.getByLabelText(/What did you complete/), {
    target: { value: 'Practiced reports' },
  });
  fireEvent.change(screen.getByLabelText(/What got in the way/), {
    target: { value: 'Limited time' },
  });
  fireEvent.change(screen.getByLabelText(/Hours available/), { target: { value: '2' } });
  expect(saveCheckIn).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Save Weekly Check-In' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Review Proposed Adjustments' }));
  expect(await screen.findByText('Review proposed guidance')).toBeInTheDocument();
  expect(onApply).not.toHaveBeenCalled();
  const apply = screen.getByRole('button', { name: 'Apply Reviewed Adjustments' });
  expect(apply).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /reviewed these changes/ }));
  fireEvent.click(apply);
  await waitFor(() => expect(onApply).toHaveBeenCalledWith(refined));
  expect(refineCheckIn).toHaveBeenLastCalledWith('checkin-1', 'a'.repeat(64));
  expect(screen.getByRole('button', { name: 'Guidance applied' })).toBeDisabled();
});
