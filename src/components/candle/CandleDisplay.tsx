import candleAsset from '@/assets/candle.png.asset.json';
import { CandleFlame } from './CandleFlame';
import { cn } from '@/lib/utils';

interface Props {
  lit: boolean;
  size?: 'md' | 'lg';
}

export function CandleDisplay({ lit, size = 'lg' }: Props) {
  const dims = size === 'lg' ? 'w-48 sm:w-56' : 'w-32';
  return (
    <div className={cn('relative flex flex-col items-center select-none pointer-events-none', dims)}>
      {/* Flame sits above the wick tip of the illustration */}
      <div className="relative h-24 w-full flex items-end justify-center">
        {lit ? (
          <CandleFlame />
        ) : (
          <div
            aria-hidden
            className="w-[3px] h-4 bg-neutral-900 rounded-t-sm"
            style={{ marginBottom: '-4px' }}
          />
        )}
      </div>
      <img
        src={candleAsset.url}
        alt="Memorial candle"
        className="w-full h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)]"
        draggable={false}
      />
      {lit && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 mx-auto rounded-full candle-halo"
          style={{ width: '110%', height: '110%' }}
        />
      )}
    </div>
  );
}
