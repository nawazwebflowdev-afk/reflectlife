import { cn } from '@/utils/cn';

interface Props {
  lit: boolean;
  size?: 'md' | 'lg';
}

export function CandleDisplay({ lit, size = 'lg' }: Props) {
  const width = size === 'lg' ? 120 : 80;
  const height = size === 'lg' ? 252 : 168;
  const glowSize = size === 'lg' ? 220 : 150;

  return (
    <div
      className={cn('relative flex items-center justify-center select-none pointer-events-none')}
      style={{ width, height: height + 40 }}
    >
      {lit && (
        <div
          aria-hidden
          className="candle-glow"
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: glowSize,
            height: glowSize,
            transform: 'translateX(-50%)',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(250,200,120,0.55) 0%, rgba(250,200,120,0) 70%)',
            pointerEvents: 'none',
            animation: 'candleGlowPulse 2.6s ease-in-out infinite',
          }}
        />
      )}
      <svg
        viewBox="0 0 200 420"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'relative', display: 'block', width, height }}
      >
        {/* Candle body */}
        <ellipse cx="100" cy="141" rx="61" ry="13" fill="#F7B454" />
        <rect x="40" y="140" width="120" height="252" rx="30" fill="#F5A83C" />
        <rect x="54" y="146" width="14" height="238" rx="7" fill="#FFFFFF" opacity="0.16" />
        <rect x="96" y="122" width="8" height="20" rx="3" fill="#4A3728" />
        {/* Decorations */}
        <g>
          <path d="M65 190 C50 182 42 170 46 158 C58 160 68 170 70 184 Z" fill="#8FC49A" />
          <path d="M135 190 C150 182 158 170 154 158 C142 160 132 170 130 184 Z" fill="#8FC49A" />
          <path
            d="M100 175 C97 170 95 174 96 179 C97 184 100 186 100 186 C100 186 103 184 104 179 C105 174 103 170 100 175 Z"
            fill="#6FA97F"
          />
        </g>
        <g>
          <ellipse cx="100" cy="188" rx="13" ry="21" fill="#A9D9EA" />
          <ellipse cx="100" cy="188" rx="13" ry="21" fill="#A9D9EA" transform="rotate(60 100 188)" />
          <ellipse cx="100" cy="188" rx="13" ry="21" fill="#A9D9EA" transform="rotate(120 100 188)" />
          <ellipse cx="100" cy="188" rx="13" ry="21" fill="#A9D9EA" transform="rotate(180 100 188)" />
          <ellipse cx="100" cy="188" rx="13" ry="21" fill="#A9D9EA" transform="rotate(240 100 188)" />
          <ellipse cx="100" cy="188" rx="13" ry="21" fill="#A9D9EA" transform="rotate(300 100 188)" />
          <circle cx="100" cy="188" r="9" fill="#FCE87A" />
        </g>
        <path
          d="M100 278 C100 278 76 262 76 244 C76 232 86 226 100 236 C114 226 124 232 124 244 C124 262 100 278 100 278 Z"
          fill="#F4A6BE"
        />
        <g>
          <path d="M66 320 C50 313 42 300 46 288 C58 290 68 300 70 314 Z" fill="#8FC49A" />
          <path d="M134 320 C150 313 158 300 154 288 C142 290 132 300 130 314 Z" fill="#8FC49A" />
        </g>
        <g fill="#F0A8C0">
          <circle cx="66" cy="358" r="4.5" />
          <circle cx="82" cy="362" r="4.5" />
          <circle cx="100" cy="364" r="4.5" />
          <circle cx="118" cy="362" r="4.5" />
          <circle cx="134" cy="358" r="4.5" />
        </g>
        {/* Flame */}
        {lit && (
          <g
            id="flameGroup"
            style={{
              transformOrigin: '100px 138px',
              animation: 'candleFlicker 2.2s ease-in-out infinite',
            }}
          >
            <path
              d="M100 15 C78 48 66 76 66 98 C66 122 81 138 100 138 C119 138 134 122 134 98 C134 76 122 48 100 15 Z"
              fill="#F5A9A0"
            />
            <path
              d="M100 38 C86 60 79 80 79 96 C79 114 88 126 100 126 C112 126 121 114 121 96 C121 80 114 60 100 38 Z"
              fill="#FBCE8E"
            />
            <path
              d="M100 60 C92 74 88 86 88 96 C88 108 93 116 100 116 C107 116 112 108 112 96 C112 86 108 74 100 60 Z"
              fill="#FDEFC6"
              style={{
                transformOrigin: '100px 118px',
                animation: 'candleFlickerInner 1.7s ease-in-out infinite',
              }}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
