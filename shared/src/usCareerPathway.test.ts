import { expect, it } from 'vitest';
import { getPathwaySteps, PathwayItemInputSchema } from './usCareerPathway.js';

it('uses state-specific nursing authorities with reviewed official resources', () => {
  const illinois = getPathwaySteps('IL', 'registered-nurse');
  const minnesota = getPathwaySteps('MN', 'registered-nurse');
  expect(illinois[0].sourceUrl).toContain('idfpr.illinois.gov');
  expect(minnesota[0].sourceUrl).toContain('mn.gov/boards/nursing');
  for (const step of [...illinois, ...minnesota]) {
    expect(step.sourceReviewed).toBe('2026-11-22');
    expect(new URL(step.sourceUrl).protocol).toBe('https:');
    expect(step.question.length).toBeGreaterThan(0);
  }
});

it('validates checklist keys against the selected career', () => {
  const input = {
    opportunityId: 'opp',
    state: 'MN',
    career: 'software-developer',
    stepKey: 'role-requirements',
    status: 'To check',
    notes: '',
  };
  expect(PathwayItemInputSchema.safeParse(input).success).toBe(true);
  expect(PathwayItemInputSchema.safeParse({ ...input, stepKey: 'licensure-route' }).success).toBe(
    false
  );
  expect(PathwayItemInputSchema.safeParse({ ...input, state: 'NY' }).success).toBe(false);
});
