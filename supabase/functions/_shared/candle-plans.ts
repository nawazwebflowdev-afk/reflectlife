export type CandlePlan = 'free' | 'monthly' | 'yearly';

export const CANDLE_PLANS: Record<CandlePlan, {
  price_id: string | null;
  duration_seconds: number;
  amount: number;
  label: string;
}> = {
  free: {
    price_id: null,
    duration_seconds: 24 * 60 * 60,
    amount: 0,
    label: '24 hours',
  },
  monthly: {
    price_id: 'price_1TwQvvH4lK5aBXs2sLFckZZE',
    duration_seconds: 30 * 24 * 60 * 60,
    amount: 4.99,
    label: '30 days',
  },
  yearly: {
    price_id: 'price_1TwQxmH4lK5aBXs2tbReHen7',
    duration_seconds: 365 * 24 * 60 * 60,
    amount: 49.99,
    label: '365 days',
  },
};

export function sanitizeMessage(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const stripped = input.replace(/<[^>]*>/g, '').trim();
  if (!stripped) return null;
  return stripped.slice(0, 100);
}

export function sanitizeName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const stripped = input.replace(/<[^>]*>/g, '').trim();
  if (!stripped) return null;
  return stripped.slice(0, 80);
}
