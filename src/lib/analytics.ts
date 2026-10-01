/** Cookie-free Plausible events. No-op until the Plausible script has loaded. */
type Plausible = (event: string, opts?: { props?: Record<string, string | number> }) => void;

export type AnalyticsEvent =
  | "Memorial Created"
  | "Family Invited"
  | "Memory Added"
  | "Candle Lit"
  | "Donation Started"
  | "Donation Completed";

export function track(event: AnalyticsEvent, props?: Record<string, string | number>) {
  try {
    const w = window as unknown as { plausible?: Plausible & { q?: unknown[] } };
    if (!w.plausible) {
      // Queue until the script loads (Plausible's documented queue shim).
      const q: unknown[] = [];
      const shim = ((...args: unknown[]) => { q.push(args); }) as Plausible & { q?: unknown[] };
      shim.q = q;
      w.plausible = shim;
    }
    w.plausible(event, props ? { props } : undefined);
  } catch {
    /* analytics must never break the app */
  }
}
