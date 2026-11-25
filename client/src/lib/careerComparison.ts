import type { Opportunity } from '@talivoy/shared';
export type CareerPreference = 'balanced' | 'cost' | 'speed' | 'physical';
export type OptionReview = {
  physical?: 'low' | 'medium' | 'high';
  hours?: string;
  skills?: string;
  training?: string;
  career?: '' | 'registered-nurse' | 'software-developer';
};
/** Highlight one factor without replacing fit scores or treating missing values as zero. */
export function compareCareerPreference(
  opportunities: Opportunity[],
  preference: CareerPreference,
  reviews: Record<string, OptionReview>
) {
  if (preference === 'balanced') return { ids: [], missing: 0 };
  const values = opportunities
    .map((option) => {
      const physical = reviews[option.id]?.physical;
      const value =
        preference === 'cost'
          ? option.explanation?.estimatedCostUSD
          : preference === 'speed'
            ? option.explanation?.signals.launchTimeDays
            : physical
              ? { low: 1, medium: 2, high: 3 }[physical]
              : undefined;
      return { id: option.id, value };
    })
    .filter((entry): entry is { id: string; value: number } => entry.value != null);
  const minimum = values.length ? Math.min(...values.map((entry) => entry.value)) : undefined;
  return {
    ids: values.filter((entry) => entry.value === minimum).map((entry) => entry.id),
    missing: opportunities.length - values.length,
  };
}
export function weeklyTimeFit(estimate: string | undefined, available: string) {
  if (!estimate?.trim() || !available.trim()) return 'Weekly effort not assessed';
  const hours = Number(estimate),
    capacity = Number(available);
  if (
    !Number.isFinite(hours) ||
    hours <= 0 ||
    !Number.isFinite(capacity) ||
    capacity <= 0 ||
    hours > 168 ||
    capacity > 168
  )
    return 'Enter weekly hours between 0 and 168';
  return hours <= capacity
    ? 'Within your entered weekly time'
    : `${hours - capacity} hours/week above your entered time`;
}
