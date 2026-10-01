
import { tr } from "@/i18n/tr";export type CandlePlanKey = 'free' | 'monthly' | 'yearly';

export const CANDLE_PLAN_META: Record<CandlePlanKey, {
  title: string;
  price: string;
  duration: string;
  badge?: string;
}> = {
  free: { title: tr("a.75f527181b"), price: '€0', duration: 'Burns for 24 hours' },
  monthly: { title: tr("a.d31edb7b8a"), price: '€4.99', duration: 'Burns for 30 days' },
  yearly: { title: tr("a.7622eb5aa4"), price: '€49.99', duration: 'Burns for 365 days', badge: 'Best Value' },
};
