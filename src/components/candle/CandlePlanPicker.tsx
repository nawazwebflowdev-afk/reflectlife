import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/utils/cn';
import { Loader2, Flame, Sparkles } from 'lucide-react';
import type { CandlePlanKey } from './candlePlans';
import { CANDLE_PLAN_META } from './candlePlans';
import { PRAYERS } from './prayers';

type DedicationMode = 'none' | 'preset' | 'custom';


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
  const [dedicationMode, setDedicationMode] = useState<DedicationMode>('none');
  const [presetId, setPresetId] = useState<number>(1);
  const [customMessage, setCustomMessage] = useState('');

  const selectedPreset = PRAYERS.find((p) => p.id === presetId) ?? PRAYERS[0];
  const finalMessage =
    dedicationMode === 'preset'
      ? selectedPreset.text
      : dedicationMode === 'custom'
      ? customMessage.trim()
      : '';


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
              style={{ backgroundColor: '#4A324A' }}
              className={cn(
                'group relative rounded-3xl p-5 text-left transition-all text-white',
                'hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(74,50,74,0.35)]',
                selected
                  ? 'ring-2 ring-offset-2 ring-offset-background ring-[#8FC49A] shadow-elegant'
                  : 'ring-1 ring-white/10'
              )}
            >
              {meta.badge && (
                <span
                  className="absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide shadow-sm"
                  style={{ backgroundColor: '#8FC49A', color: '#1E3A29' }}
                >
                  {meta.badge}
                </span>
              )}
              <div className="text-xs uppercase tracking-wide text-white/70">{meta.title}</div>
              <div className="mt-1 text-2xl font-serif text-white">{meta.price}</div>
              <div className="mt-1 text-sm text-white/75">{meta.duration}</div>
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
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground block">
            Dedication (optional)
          </label>
          <RadioGroup
            value={dedicationMode}
            onValueChange={(v) => setDedicationMode(v as DedicationMode)}
            className="grid gap-2 sm:grid-cols-3"
          >
            {(['none', 'preset', 'custom'] as DedicationMode[]).map((m) => (
              <label
                key={m}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors',
                  dedicationMode === m ? 'border-primary bg-primary/5' : 'border-border'
                )}
              >
                <RadioGroupItem value={m} />
                <span className="capitalize">
                  {m === 'none' ? 'No dedication' : m === 'preset' ? 'Prayer or poem' : 'Custom message'}
                </span>
              </label>
            ))}
          </RadioGroup>

          {dedicationMode === 'preset' && (
            <div className="space-y-2">
              <Select value={String(presetId)} onValueChange={(v) => setPresetId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a prayer or poem" />
                </SelectTrigger>
                <SelectContent>
                  {PRAYERS.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm italic text-foreground/80">
                "{selectedPreset.text}"
              </p>
            </div>
          )}

          {dedicationMode === 'custom' && (
            <div>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value.slice(0, 100))}
                placeholder="Forever in our hearts…"
                rows={2}
              />
              <div className="text-xs text-muted-foreground text-right mt-1">
                {customMessage.length}/100
              </div>
            </div>
          )}
        </div>

      </Card>

      <Button
        size="lg"
        style={{ backgroundColor: '#4A324A' }}
        className="w-full text-base rounded-full py-6 font-semibold text-white hover:brightness-110 hover:scale-[1.02] hover:shadow-[0_4px_16px_rgba(74,50,74,0.35)] transition-all"
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
          <Flame className="w-4 h-4 mr-2" style={{ color: '#FFE9A8' }} />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" style={{ color: '#FFE9A8' }} />
        )}
        {mode === 'light' ? 'Light a Candle' : 'Extend the Candle'}
        {plan !== 'free' && ` — ${CANDLE_PLAN_META[plan].price}`}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Secure payments powered by Stripe. Free lightings burn for 24 hours.
      </p>
    </div>
  );
}
