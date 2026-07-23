export type CandlePlanKey = 'free' | 'monthly' | 'yearly';

export const CANDLE_PLAN_META: Record<CandlePlanKey, {
  title: string;
  price: string;
  duration: string;
  badge?: string;
}> = {
  free: { title: 'Free', price: '€0', duration: 'Burns for 24 hours' },
  monthly: { title: 'Monthly', price: '€4.99', duration: 'Burns for 30 days' },
  yearly: { title: 'Yearly', price: '€49.99', duration: 'Burns for 365 days', badge: 'Best Value' },
};
