import { CandleDisplay } from './CandleDisplay';
import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/utils/cn';

export interface MemorialCandle {
  id: string;
  memorial_id: string;
  user_id: string | null;
  contributor_name: string | null;
  anonymous: boolean;
  message: string | null;
  plan: string | null;
  status: string;
  started_at: string | null;
  expires_at: string | null;
}

function formatRemaining(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${Math.max(minutes, 1)}m remaining`;
}

interface Props {
  candle: MemorialCandle;
  isMine?: boolean;
  onExpired?: (id: string) => void;
  onRelight?: () => void;
}

export function CandleCard({ candle, isMine, onRelight }: Props) {
  const expiresAt = candle.expires_at ? new Date(candle.expires_at) : null;
  const countdown = useCountdown(expiresAt);
  const lit = candle.status === 'active' && !countdown.done;
  const name = candle.anonymous || !candle.contributor_name ? 'Anonymous' : candle.contributor_name;
  const litDate = candle.started_at ? new Date(candle.started_at) : null;
  const remaining = expiresAt ? formatRemaining(expiresAt.getTime() - Date.now()) : '';

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`Candle lit by ${name}${litDate ? ` on ${litDate.toLocaleDateString()}` : ''}. ${remaining}`}
      className={cn(
        'flex flex-col items-center gap-1 rounded-2xl border border-border bg-card/50 px-2 py-4 text-center',
        'transition-all animate-fade-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isMine && 'ring-2 ring-[#8FC49A] ring-offset-2 ring-offset-background'
      )}
    >
      <CandleDisplay lit={lit} size="md" />
      <p className="text-sm font-medium text-foreground leading-tight">
        {isMine ? 'Your candle' : `Lit by ${name}`}
      </p>
      {litDate && (
        <p className="text-xs text-muted-foreground">{litDate.toLocaleDateString()}</p>
      )}
      <p className="text-xs text-muted-foreground">{lit ? remaining : 'Gone out'}</p>
      {candle.message && (
        <p className="mt-1 line-clamp-3 px-1 text-xs italic text-foreground/70">"{candle.message}"</p>
      )}
      {isMine && onRelight && (
        <button
          type="button"
          onClick={onRelight}
          className="mt-2 rounded-full px-3 py-1 text-xs font-semibold text-white transition-all hover:brightness-110"
          style={{ backgroundColor: '#4A324A' }}
        >
          {lit ? 'Extend' : 'Relight'}
        </button>
      )}
    </div>
  );
}
