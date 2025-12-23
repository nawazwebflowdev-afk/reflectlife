import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CandleVideoModalProps {
  memorialId: string;
  memorialName: string;
}

// Generate or get session ID for anonymous users
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('candle_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('candle_session_id', sessionId);
  }
  return sessionId;
};

export const CandleVideoModal = ({ memorialId, memorialName }: CandleVideoModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [candleCount, setCandleCount] = useState(0);
  const [hasLit, setHasLit] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchCandleCount();
    checkIfUserLitCandle();
  }, [memorialId, user]);

  // Real-time subscription for candle updates
  useEffect(() => {
    const channel = supabase
      .channel(`candles-${memorialId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'memorial_candles',
        filter: `memorial_id=eq.${memorialId}`
      }, () => {
        fetchCandleCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memorialId]);

  const fetchCandleCount = async () => {
    const { count, error } = await supabase
      .from('memorial_candles')
      .select('*', { count: 'exact', head: true })
      .eq('memorial_id', memorialId);

    if (!error && count !== null) {
      setCandleCount(count);
    }
  };

  const checkIfUserLitCandle = async () => {
    const sessionId = getSessionId();
    
    const { data, error } = await supabase
      .from('memorial_candles')
      .select('id')
      .eq('memorial_id', memorialId)
      .or(user ? `user_id.eq.${user.id},session_id.eq.${sessionId}` : `session_id.eq.${sessionId}`)
      .limit(1);

    if (!error && data && data.length > 0) {
      setHasLit(true);
    }
  };

  const handleLightCandle = async () => {
    if (hasLit) return;

    const sessionId = getSessionId();
    
    const { error } = await supabase
      .from('memorial_candles')
      .insert({
        memorial_id: memorialId,
        user_id: user?.id || null,
        session_id: user ? null : sessionId,
      });

    if (!error) {
      setHasLit(true);
      setCandleCount(prev => prev + 1);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !hasLit) {
      handleLightCandle();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
        >
          <Flame className={`h-4 w-4 ${hasLit ? 'fill-amber-500 text-amber-500' : ''}`} />
          {candleCount > 0 ? `${candleCount} Candle${candleCount !== 1 ? 's' : ''}` : 'Light a Candle'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-amber-500/20">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-center text-amber-100 font-serif">
            In Memory of {memorialName}
          </DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video w-full">
          <video
            src="/videos/memorial-candle.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-center text-amber-100/80 text-sm italic mb-2">
              A light of remembrance burns eternal
            </p>
            <p className="text-center text-amber-400 text-xs">
              {candleCount} {candleCount === 1 ? 'candle' : 'candles'} lit in remembrance
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
