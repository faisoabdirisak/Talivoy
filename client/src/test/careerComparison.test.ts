import { expect, it } from 'vitest';
import { createDemoOpportunities } from '@talivoy/shared';
import { compareCareerPreference, weeklyTimeFit } from '../lib/careerComparison';

it('preserves zero costs, handles ties and excludes unknown costs from preference cues', () => {
  const options = createDemoOpportunities('maria');
  options[0].explanation!.estimatedCostUSD = 0;
  options[1].explanation!.estimatedCostUSD = 0;
  options[2].explanation = null;
  expect(compareCareerPreference(options, 'cost', {})).toEqual({
    ids: [options[0].id, options[1].id],
    missing: 1,
  });
  expect(compareCareerPreference(options, 'physical', {})).toEqual({ ids: [], missing: 3 });
});

it('compares launch estimates without deriving weekly effort or mutating scores', () => {
  const options = createDemoOpportunities('james');
  options[0].explanation!.signals.launchTimeDays = 1;
  const before = JSON.stringify(options);
  expect(compareCareerPreference(options, 'speed', {}).ids).toEqual([options[0].id]);
  expect(weeklyTimeFit(undefined, '2')).toBe('Weekly effort not assessed');
  expect(weeklyTimeFit('1', '2')).toBe('Within your entered weekly time');
  expect(weeklyTimeFit('3', '2')).toBe('1 hours/week above your entered time');
  expect(weeklyTimeFit('Infinity', '2')).toContain('Enter weekly hours');
  expect(weeklyTimeFit('2', '0')).toContain('Enter weekly hours');
  expect(JSON.stringify(options)).toBe(before);
});
