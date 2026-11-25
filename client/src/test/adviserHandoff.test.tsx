import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { createDemoOpportunities } from '@talivoy/shared';
import { DashboardPreview } from '../components/DashboardPreview';
import { restoreSession, listSkillsEvidence } from '../lib/api';

vi.mock('../lib/api', () => ({
  restoreSession: vi.fn(),
  listSkillsEvidence: vi.fn().mockResolvedValue([]),
}));
afterEach(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  vi.restoreAllMocks();
});

it('prints confirmed saved progress for the focused opportunity', async () => {
  const [focused, other] = createDemoOpportunities('james');
  const saved = {
    ...focused,
    planItems: focused.planItems.map((item, i) => ({ ...item, isCompleted: i === 0 })),
  };
  vi.mocked(restoreSession).mockResolvedValue({
    id: 'saved',
    createdAt: new Date(),
    updatedAt: new Date(),
    selectedOpportunityId: focused.id,
    opportunities: [saved, other],
  });
  vi.mocked(listSkillsEvidence).mockResolvedValue([
    {
      id: 'e1',
      opportunityId: focused.id,
      skill: 'Team leadership',
      source: 'work',
      evidence: 'I supervised six staff.',
      status: 'have-evidence',
      nextStep: 'Prepare an interview example',
      bullet: 'Supervised six staff.',
      bulletReviewedAt: new Date().toISOString(),
      revision: 'a'.repeat(64),
    },
    {
      id: 'e2',
      opportunityId: focused.id,
      skill: 'Private skill',
      source: 'education',
      evidence: 'PRIVATE UNSELECTED EXAMPLE',
      status: 'have-evidence',
      nextStep: '',
      bullet: 'Unapproved draft',
      bulletReviewedAt: null,
      revision: 'b'.repeat(64),
    },
  ]);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  render(
    <DashboardPreview
      opportunities={[focused, other]}
      selectedOpportunityId={focused.id}
      streak={0}
      onViewPlan={vi.fn()}
      onSelectOpp={vi.fn()}
      onStartOver={vi.fn()}
    />
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Print / Save as PDF' }));
  const report = within(await screen.findByRole('dialog', { name: 'Adviser handoff preview' }));
  expect(report.getByRole('heading', { name: focused.title })).toBeVisible();
  expect(report.getByText(/1 of 12 tasks completed \(8%\) · 11 remaining/)).toBeVisible();
  expect(report.queryByRole('heading', { name: other.title })).not.toBeInTheDocument();
  expect(report.queryByText('I supervised six staff.')).not.toBeInTheDocument();
  await user.click(report.getByRole('checkbox', { name: 'Team leadership · Self-reported' }));
  expect(report.getByText('I supervised six staff.')).toBeVisible();
  expect(report.queryByText('PRIVATE UNSELECTED EXAMPLE')).not.toBeInTheDocument();
  await user.click(report.getByRole('checkbox', { name: 'Private skill · Self-reported' }));
  expect(report.getByText('PRIVATE UNSELECTED EXAMPLE')).toBeVisible();
  expect(report.queryByText('Unapproved draft')).not.toBeInTheDocument();
  await user.click(report.getByRole('button', { name: 'Print / Save as PDF' }));
  expect(print).toHaveBeenCalledOnce();
});
