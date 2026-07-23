import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Flame } from 'lucide-react';

export default function CandleSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');

  useEffect(() => {
    const sessionId = params.get('session_id');
    const memorialId = params.get('memorial_id');
    if (!sessionId || !memorialId) {
      navigate('/', { replace: true });
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('confirm-candle-payment', {
          body: { session_id: sessionId },
        });
        if (error || (data as any)?.error) setStatus('error');
        else setStatus('ok');
      } catch {
        setStatus('error');
      }
      setTimeout(() => navigate(`/memorial/${memorialId}`, { replace: true }), 1500);
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      {status === 'pending' && <Loader2 className="w-8 h-8 animate-spin text-primary" />}
      {status === 'ok' && <Flame className="w-12 h-12 text-secondary" />}
      <h1 className="font-serif text-2xl text-foreground">
        {status === 'ok'
          ? 'Your candle is now burning'
          : status === 'error'
          ? 'We could not confirm your payment'
          : 'Confirming your candle…'}
      </h1>
      <p className="text-muted-foreground max-w-md">
        {status === 'ok'
          ? 'Thank you for keeping this memory alive. Returning to the memorial…'
          : status === 'error'
          ? 'If you were charged, please contact support. Returning you back…'
          : 'One moment while we light the flame.'}
      </p>
    </div>
  );
}
