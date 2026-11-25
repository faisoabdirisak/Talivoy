import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { createDemoOpportunities } from '@talivoy/shared';
import { OpportunityComparison } from '../components/OpportunityComparison';

it('compares estimates against the budget and lets the worker focus a lower-cost option', async () => {
  const [first, second, third] = createDemoOpportunities('james');
  const higher = { ...first, explanation: { ...first.explanation!, estimatedCostUSD: 450 } };
  const lower = { ...second, explanation: { ...second.explanation!, estimatedCostUSD: 50 } };
  const unknown = { ...third, explanation: null };
  const onFocus = vi.fn().mockResolvedValue(undefined);
  const { container } = render(
    <OpportunityComparison
      opportunities={[higher, lower, unknown]}
      budget={200}
      focusedId={null}
      onFocus={onFocus}
      error={null}
    />
  );
  const dialog = document.body.querySelector('dialog')!;
  dialog.showModal = () => {
    dialog.setAttribute('open', '');
  };
  const user = userEvent.setup();
  await user.click(within(container).getByRole('button', { name: 'Compare My Career Options' }));
  expect(screen.getByText('$250.00 over budget')).toBeVisible();
  expect(screen.getByText('Within budget')).toBeVisible();
  await user.click(screen.getByRole('button', { name: `Focus on ${lower.title}` }));
  expect(onFocus).toHaveBeenCalledWith(lower.id);
  expect(screen.getByText('Cost unknown')).toBeVisible();
});

it('explains preferences without changing saved scores, progress or the selected plan', async () => {
  const opportunities = createDemoOpportunities('james');
  const original = JSON.stringify(opportunities);
  const onFocus = vi.fn();
  render(
    <OpportunityComparison
      opportunities={opportunities}
      focusedId={null}
      onFocus={onFocus}
      error={null}
    />
  );
  const dialog = document.body.querySelector('dialog')!;
  dialog.showModal = () => dialog.setAttribute('open', '');
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Compare My Career Options' }));
  expect(screen.getAllByRole('article')).toHaveLength(3);
  await user.click(screen.getByRole('button', { name: 'Less physical work' }));
  expect(screen.getByRole('status')).toHaveTextContent('Not enough information yet');
  await user.selectOptions(
    screen.getByLabelText(`My reviewed physical demands for ${opportunities[1].title}`),
    'low'
  );
  expect(screen.getByRole('status')).toHaveTextContent(opportunities[1].title);
  expect(screen.getByRole('status')).toHaveTextContent('not a complete ranking');
  expect(onFocus).not.toHaveBeenCalled();
  expect(JSON.stringify(opportunities)).toBe(original);
});

it('compares entered weekly effort and shows sources only after explicit catalog selection', async () => {
  const opportunities = createDemoOpportunities('maria');
  render(
    <OpportunityComparison
      opportunities={opportunities}
      focusedId={null}
      onFocus={vi.fn()}
      error={null}
    />
  );
  const dialog = document.body.querySelector('dialog')!;
  dialog.showModal = () => dialog.setAttribute('open', '');
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Compare My Career Options' }));
  await user.type(screen.getByLabelText('My available hours per week'), '2');
  await user.type(
    screen.getByLabelText(`My estimated weekly hours for ${opportunities[0].title}`),
    '4'
  );
  expect(screen.getByText(/2 hours\/week above your entered time/)).toBeVisible();
  expect(screen.queryByRole('link', { name: /Illinois IDFPR/ })).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('State for entry sources'), 'IL');
  await user.selectOptions(
    screen.getByLabelText(`Matching catalog career for ${opportunities[0].title}`),
    'registered-nurse'
  );
  const sources = screen.getAllByRole('link', { name: /Illinois IDFPR/ });
  expect(sources[0]).toHaveAttribute('href', 'https://idfpr.illinois.gov/profs/nursing.html');
});
