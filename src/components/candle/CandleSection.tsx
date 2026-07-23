import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CandleDisplay } from './CandleDisplay';
import { CandlePlanPicker } from './CandlePlanPicker';
import { DedicationList } from './DedicationList';
import { useCountdown } from '@/hooks/useCountdown';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Users, Clock } from 'lucide-react';
import type { CandlePlanKey } from './candlePlans';

interface Candle {
  id: string;
  memorial_id: string;
  status: 'inactive' | 'active' | 'expired';
  started_at: string | null;
  expires_at: string | null;
  current_plan: string | null;
}

interface Contribution {
  id: string;
  contributor_name: string | null;
  anonymous: boolean;
  message: string | null;
  plan: string;
  created_at: string;
}

interface Props { memorialId: string }

export function CandleSection({ memorialId }: Props) {
  const { toast } = useToast();
  const [candle, setCandle] = useState<Candle | null>(null);
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [contribCount, setContribCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showExtendForm, setShowExtendForm] = useState(false);
  const [defaultName, setDefaultName] = useState('');

  // Load initial data
  useEffect(() => {
    let mounted = true;
    (async () => {
      await supabase.rpc('expire_stale_candles');
      const [{ data: c }, { data: list, count }, { data: userData }] = await Promise.all([
        supabase.from('memorial_candles').select('*').eq('memorial_id', memorialId).maybeSingle(),
        supabase
          .from('candle_contributions')
          .select('id, contributor_name, anonymous, message, plan, created_at', { count: 'exact' })
          .eq('memorial_id', memorialId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.auth.getUser(),
      ]);
      if (!mounted) return;
      setCandle((c as Candle | null) ?? null);
      setContribs((list as Contribution[]) ?? []);
      setContribCount(count ?? 0);
      const meta = userData?.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      setDefaultName(meta?.full_name || meta?.name || '');
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [memorialId]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`candle-${memorialId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memorial_candles', filter: `memorial_id=eq.${memorialId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') setCandle(null);
          else setCandle(payload.new as Candle);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'candle_contributions', filter: `memorial_id=eq.${memorialId}` },
        (payload) => {
          const row = payload.new as Contribution;
          setContribs((prev) => [row, ...prev].slice(0, 5));
          setContribCount((n) => n + 1);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [memorialId]);

  const expiresAt = useMemo(
    () => (candle?.expires_at ? new Date(candle.expires_at) : null),
    [candle?.expires_at]
  );
  const countdown = useCountdown(expiresAt);
  const isLit = candle?.status === 'active' && !countdown.done;

  // Auto-expire when countdown hits zero
  useEffect(() => {
    if (candle?.status === 'active' && countdown.done && candle.expires_at) {
      supabase.rpc('expire_stale_candles');
    }
  }, [countdown.done, candle?.status, candle?.expires_at]);

  const handleSubmit = async (input: {
    plan: CandlePlanKey;
    contributor_name: string | null;
    anonymous: boolean;
    message: string | null;
  }) => {
    setSubmitting(true);
    try {
      const payload = { memorial_id: memorialId, ...input };
      if (input.plan === 'free') {
        const { data, error } = await supabase.functions.invoke('light-free-candle', { body: payload });
        if (error || (data && (data as any).error)) throw new Error((data as any)?.error || error?.message);
        toast({ title: 'The candle is lit', description: 'Thank you for this act of remembrance.' });
        setShowExtendForm(false);
      } else {
        const { data, error } = await supabase.functions.invoke('create-candle-checkout', { body: payload });
        if (error || !data?.url) throw new Error((data as any)?.error || error?.message || 'Checkout failed');
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast({ title: 'Something went wrong', description: e?.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="py-12 flex justify-center">
        <div className="h-64 w-full max-w-2xl rounded-2xl bg-muted/30 animate-pulse" />
      </section>
    );
  }

  return (
    <section className="py-14 px-4 gradient-subtle border-y border-border">
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-8">
        <CandleDisplay lit={isLit} />

        {isLit ? (
          <div className="text-center space-y-3">
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
              This candle is burning in loving memory
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {countdown.label} remaining
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Kept alive by {contribCount} {contribCount === 1 ? 'person' : 'people'}
              </span>
            </div>
            {expiresAt && (
              <p className="text-xs text-muted-foreground">
                Burning until {expiresAt.toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
              {candle?.status === 'expired'
                ? 'The candle has gone out'
                : 'Light a candle in memory of this loved one'}
            </h2>
            <p className="text-muted-foreground">
              A shared symbol of remembrance anyone can keep burning.
            </p>
          </div>
        )}

        {isLit && !showExtendForm ? (
          <Button size="lg" variant="secondary" onClick={() => setShowExtendForm(true)}>
            Extend the Candle
          </Button>
        ) : (
          <CandlePlanPicker
            mode={isLit ? 'extend' : 'light'}
            defaultName={defaultName}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        )}

        <DedicationList items={contribs} />
      </div>
    </section>
  );
}
