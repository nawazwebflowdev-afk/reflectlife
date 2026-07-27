import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CandleCard, type MemorialCandle } from './CandleCard';
import { CandlePlanPicker } from './CandlePlanPicker';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flame } from 'lucide-react';
import type { CandlePlanKey } from './candlePlans';

const PAGE_SIZE = 100;

interface Props { memorialId: string }

export function CandleSection({ memorialId }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const [candles, setCandles] = useState<MemorialCandle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [defaultName, setDefaultName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialPlan, setInitialPlan] = useState<CandlePlanKey>('free');
  const [, setTick] = useState(0);

  const fetchCandles = useCallback(async (pageIndex: number, replace: boolean) => {
    const from = pageIndex * PAGE_SIZE;
    const { data, count } = await supabase
      .from('memorial_candles')
      .select('*', { count: 'exact' })
      .eq('memorial_id', memorialId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('started_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    const rows = (data ?? []) as unknown as MemorialCandle[];
    setTotal(count ?? rows.length);
    setCandles((prev) => (replace ? rows : [...prev, ...rows]));
  }, [memorialId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await supabase.rpc('expire_stale_candles');
      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserId(userData?.user?.id ?? null);
      const meta = userData?.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      setDefaultName(meta?.full_name || meta?.name || '');
      await fetchCandles(0, true);
      if (!mounted) return;
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [memorialId, fetchCandles]);

  // Realtime: new candles appear, expired ones disappear instantly
  useEffect(() => {
    const channel = supabase
      .channel(`candles-${memorialId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memorial_candles', filter: `memorial_id=eq.${memorialId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setCandles((prev) => prev.filter((c) => c.id !== (payload.old as { id: string }).id));
            setTotal((n) => Math.max(n - 1, 0));
            return;
          }
          const row = payload.new as unknown as MemorialCandle;
          const active = row.status === 'active' && !!row.expires_at && new Date(row.expires_at) > new Date();
          setCandles((prev) => {
            const without = prev.filter((c) => c.id !== row.id);
            const existed = without.length !== prev.length;
            if (!active) {
              if (existed) setTotal((n) => Math.max(n - 1, 0));
              return without;
            }
            if (!existed) setTotal((n) => n + 1);
            return [row, ...without].sort(
              (a, b) => new Date(b.started_at ?? 0).getTime() - new Date(a.started_at ?? 0).getTime()
            );
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [memorialId]);

  // Drop candles locally as they burn out (paused while the tab is hidden)
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      setTick((t) => t + 1);
      setCandles((prev) => {
        const now = Date.now();
        const next = prev.filter((c) => c.expires_at && new Date(c.expires_at).getTime() > now);
        if (next.length !== prev.length) setTotal((n) => Math.max(n - (prev.length - next.length), 0));
        return next.length === prev.length ? prev : next;
      });
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const myCandle = useMemo(
    () => (userId ? candles.find((c) => c.user_id === userId) ?? null : null),
    [candles, userId]
  );

  const requireAuth = () => {
    if (userId) return true;
    toast({
      title: 'Please sign in',
      description: 'Sign in or create an account to light your own candle.',
    });
    navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    return false;
  };

  const openPicker = (plan: CandlePlanKey = 'free') => {
    if (!requireAuth()) return;
    setInitialPlan(plan);
    setDialogOpen(true);
  };

  // Relight deep-link from the renewal email
  useEffect(() => {
    if (loading || !params.get('relight')) return;
    const plan = (params.get('plan') as CandlePlanKey) || 'free';
    document.getElementById('candles-of-remembrance')?.scrollIntoView({ behavior: 'smooth' });
    if (userId) {
      setInitialPlan(['free', 'monthly', 'yearly'].includes(plan) ? plan : 'free');
      setDialogOpen(true);
      const next = new URLSearchParams(params);
      next.delete('relight');
      setParams(next, { replace: true });
    } else {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    }
  }, [loading, params, userId, navigate, location, setParams]);

  const handleSubmit = async (input: {
    plan: CandlePlanKey;
    contributor_name: string | null;
    anonymous: boolean;
    message: string | null;
  }) => {
    if (!requireAuth()) return;
    setSubmitting(true);
    try {
      const payload = { memorial_id: memorialId, ...input };
      if (input.plan === 'free') {
        const { data, error } = await supabase.functions.invoke('light-free-candle', { body: payload });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        toast({ title: 'Your candle is lit', description: 'Thank you for this act of remembrance.' });
        setDialogOpen(false);
        await fetchCandles(0, true);
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

  const loadMore = async () => {
    const next = page + 1;
    setPage(next);
    await fetchCandles(next, false);
  };

  return (
    <section id="candles-of-remembrance" className="py-14 px-4 gradient-subtle border-y border-border">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground">Candles of Remembrance</h2>
          <p className="text-muted-foreground">
            Family and friends have lit these candles in loving memory.
          </p>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <Flame className="w-4 h-4" style={{ color: '#F5A83C' }} />
            {total} {total === 1 ? 'Candle' : 'Candles'} Currently Burning
          </p>
        </div>

        <Button
          size="lg"
          style={{ backgroundColor: '#4A324A' }}
          className="rounded-full px-8 py-6 font-semibold text-white hover:brightness-110 hover:scale-[1.02] transition-all"
          onClick={() => openPicker(myCandle ? ((myCandle.plan as CandlePlanKey) ?? 'free') : 'free')}
        >
          <Flame className="w-4 h-4 mr-2" style={{ color: '#FFE9A8' }} />
          {myCandle ? 'Extend Your Candle' : 'Light a Candle'}
        </Button>

        {loading ? (
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : candles.length === 0 ? (
          <p className="text-muted-foreground text-center">
            No candles are burning yet — be the first to light one.
          </p>
        ) : (
          <>
            <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {candles.map((c) => (
                <li key={c.id}>
                  <CandleCard
                    candle={c}
                    isMine={!!userId && c.user_id === userId}
                    onRelight={() => openPicker((c.plan as CandlePlanKey) ?? 'free')}
                  />
                </li>
              ))}
            </ul>
            {candles.length < total && (
              <Button variant="outline" className="rounded-full" onClick={loadMore}>
                Show more candles
              </Button>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {myCandle ? 'Keep your candle burning' : 'Light a candle'}
            </DialogTitle>
          </DialogHeader>
          <CandlePlanPicker
            mode={myCandle ? 'extend' : 'light'}
            initialPlan={initialPlan}
            defaultName={defaultName}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
