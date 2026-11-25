import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi, beforeEach } from 'vitest';
import { MySkillsEvidence } from '../components/MySkillsEvidence';
import { listSkillsEvidence, saveSkillsEvidence, suggestSkillsWording } from '../lib/api';
import type { SkillEvidence } from '@talivoy/shared';
vi.mock('../lib/api', () => ({
  listSkillsEvidence: vi.fn(),
  saveSkillsEvidence: vi.fn(),
  suggestSkillsWording: vi.fn(),
  deleteSkillsEvidence: vi.fn(),
}));
const item: SkillEvidence = {
  id: 'skill-1',
  opportunityId: 'opp-1',
  skill: 'Team leadership',
  source: 'work',
  evidence: 'I supervised six warehouse staff.',
  status: 'have-evidence',
  nextStep: 'Prepare an interview example',
  bullet: '',
  bulletReviewedAt: null,
  revision: 'a'.repeat(64),
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listSkillsEvidence).mockResolvedValue([item]);
});

it('requires wording review, resets approval on edits, and saves only after confirmation', async () => {
  const user = userEvent.setup();
  vi.mocked(suggestSkillsWording).mockResolvedValue({
    bullet: 'Supervised six warehouse staff.',
    item,
    source: 'template',
    requiresConfirmation: true,
  });
  vi.mocked(saveSkillsEvidence).mockResolvedValue({
    ...item,
    bullet: 'Supervised six warehouse staff.',
    bulletReviewedAt: new Date().toISOString(),
  });
  render(<MySkillsEvidence opportunityId="opp-1" demo={false} />);
  await user.click(screen.getByRole('button', { name: 'Build My Skills Evidence' }));
  await screen.findByRole('article', { name: 'Evidence for Team leadership' });
  expect(screen.getByRole('button', { name: 'Ask AI to rephrase' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Draft from my example' }));
  await screen.findByLabelText('Résumé wording to review');
  await user.click(screen.getByRole('button', { name: 'Save Reviewed Evidence' }));
  expect(saveSkillsEvidence).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Review and confirm wording');
  const confirmation = screen.getByLabelText(/I checked this wording against my example/);
  await user.click(confirmation);
  expect(confirmation).toBeChecked();
  await user.type(screen.getByLabelText('Résumé wording to review'), ' ');
  expect(confirmation).not.toBeChecked();
  await user.click(confirmation);
  await user.click(screen.getByRole('button', { name: 'Save Reviewed Evidence' }));
  await waitFor(() =>
    expect(saveSkillsEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ confirmWording: true, bullet: 'Supervised six warehouse staff.' }),
      item.id
    )
  );
  expect(suggestSkillsWording).toHaveBeenCalledWith(item.id, 'template');
});

it('keeps development goals valid without invented evidence and isolates fictional demo saves', async () => {
  const user = userEvent.setup();
  render(<MySkillsEvidence opportunityId="demo-opp" demo={true} />);
  await user.click(screen.getByRole('button', { name: 'Build My Skills Evidence' }));
  await user.type(screen.getByLabelText('Skill *'), 'Data analysis');
  await user.type(screen.getByLabelText('My next step'), 'Complete a small practice project');
  await user.click(screen.getByRole('button', { name: 'Save Skill Evidence' }));
  expect(
    await screen.findByRole('article', { name: 'Evidence for Data analysis' })
  ).toHaveTextContent('No evidence added yet.');
  expect(saveSkillsEvidence).not.toHaveBeenCalled();
  expect(listSkillsEvidence).not.toHaveBeenCalled();
});

it('lets a demo worker review and save wording after creating an example', async () => {
  const user = userEvent.setup();
  render(<MySkillsEvidence opportunityId="demo-opp" demo={true} />);
  await user.click(screen.getByRole('button', { name: 'Build My Skills Evidence' }));
  await user.type(screen.getByLabelText('Skill *'), 'Team leadership');
  await user.selectOptions(screen.getByLabelText('My skill status'), 'have-evidence');
  await user.type(screen.getByLabelText(/My example/), 'I supervised six warehouse staff.');
  await user.click(screen.getByRole('button', { name: 'Save Skill Evidence' }));
  await user.click(await screen.findByRole('button', { name: 'Draft from my example' }));
  await user.click(screen.getByLabelText(/I checked this wording against my example/));
  await user.click(screen.getByRole('button', { name: 'Save Reviewed Evidence' }));
  expect(await screen.findByText('Supervised six warehouse staff.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(saveSkillsEvidence).not.toHaveBeenCalled();
});
