import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { Loader2, Flame, Sparkles } from 'lucide-react';
import type { CandlePlanKey } from './candlePlans';
import { CANDLE_PLAN_META } from './candlePlans';

interface Props {
  mode: 'light' | 'extend';
  defaultName?: string;
  submitting: boolean;
  onSubmit: (input: {
    plan: CandlePlanKey;
    contributor_name: string | null;
    anonymous: boolean;
    message: string | null;
  }) => void;
}

export function CandlePlanPicker({ mode, defaultName = '', submitting, onSubmit }: Props) {
  const [plan, setPlan] = useState<CandlePlanKey>('free');
  const [name, setName] = useState(defaultName);
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(CANDLE_PLAN_META) as CandlePlanKey[]).map((key) => {
          const meta = CANDLE_PLAN_META[key];
          const selected = plan === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => setPlan(key)}
              className={cn(
                'group relative rounded-2xl border p-5 text-left transition-all',
                selected
                  ? 'border-primary bg-primary/5 shadow-elegant'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              {meta.badge && (
                <span className="absolute -top-2 right-3 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground shadow-sm">
                  {meta.badge}
                </span>
              )}
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{meta.title}</div>
              <div className="mt-1 text-2xl font-serif text-foreground">{meta.price}</div>
              <div className="mt-1 text-sm text-muted-foreground">{meta.duration}</div>
            </button>
          );
        })}
      </div>

      <Card className="p-5 space-y-4 bg-card/70">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Your name (optional)
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 80))}
              placeholder="A friend"
              disabled={anonymous}
            />
          </div>
          <div className="flex items-center gap-2 sm:mt-6">
            <Checkbox
              id="candle-anon"
              checked={anonymous}
              onCheckedChange={(v) => setAnonymous(Boolean(v))}
            />
            <label htmlFor="candle-anon" className="text-sm text-foreground cursor-pointer">
              Contribute anonymously
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Dedication (optional, max 100 characters)
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 100))}
            placeholder="Forever in our hearts…"
            rows={2}
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {message.length}/100
          </div>
        </div>
      </Card>

      <Button
        size="lg"
        className="w-full text-base"
        disabled={submitting}
        onClick={() =>
          onSubmit({
            plan,
            contributor_name: anonymous ? null : name.trim() || null,
            anonymous,
            message: message.trim() || null,
          })
        }
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : mode === 'light' ? (
          <Flame className="w-4 h-4 mr-2" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {mode === 'light' ? 'Light This Candle' : 'Extend the Candle'}
        {plan !== 'free' && ` — ${CANDLE_PLAN_META[plan].price}`}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Secure payments powered by Stripe. Free lightings burn for 24 hours.
      </p>
    </div>
  );
}
